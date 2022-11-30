import execa from 'execa';
import os from 'os';
import fs, { MoveOptions } from 'fs-extra';
import path from 'path';
import semver from 'semver';
import { createFetchFromRegistry } from '@pnpm/fetch';
import { fetchNode } from '@pnpm/node.fetcher';
import {fetch, FetchOpts} from '@teambit/bvm.fetch';
import {extract} from '@teambit/toolbox.fs.progress-bar-file-extractor';
import ora from 'ora';
import { timeFormat } from '@teambit/toolbox.time.time-format';
import { Config } from '@teambit/bvm.config';
import { BvmError } from '@teambit/bvm.error';
import {linkOne, PathExtenderReport} from '@teambit/bvm.link';
import { GcpListOptions, getOsType, listRemote } from '@teambit/bvm.list';
import { FsTarVersion } from '@teambit/bvm.fs-tar-version';

export type InstallOpts = GcpListOptions & {
  addToPathIfMissing?: boolean,
  override?: boolean,
  replace?: boolean,
  file?: string,
  extractMethod?: ExtractMethod,
  useSystemNode?: boolean
}

export type ExtractMethod = 'default' | 'child-process';

export type InstallResults = {
  installedVersion: string,
  downloadRequired: boolean,
  replacedCurrent: boolean,
  previousCurrentVersion?: string
  versionPath: string,
  pathExtenderReport?: PathExtenderReport,
  warnings?: string[],
}

const defaultOpts = {
  override: false,
  replace: false
}

const OS_DEFAULT_EXTRACT_METHOD = {
  'linux': 'default',
  'win': 'child-process',
  'darwin': 'default'
}

const loader = ora();

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<InstallResults>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const config = getConfig();

  let resolvedVersion = version;
  if (!version || version === 'latest') {
    if (opts.file) {
      const versionFromFileName = getBitVersionFromFilePath(opts.file);
      if (!versionFromFileName) {
        throw new BvmError(`Could not detect bit version from file name "${opts.file}"`);
      }
      resolvedVersion = versionFromFileName;
    } else {
      const remoteVersionList = await listRemote({os: opts.os, arch: opts.arch});
      resolvedVersion = remoteVersionList.latest().version;
    }
  }
  const { versionDir, exists } = config.getSpecificVersionDir(resolvedVersion);
  const skipTempDir = config.getSkipTempDir();
  const extractDir = skipTempDir ? versionDir : undefined;
  if (exists) {
    if (!concreteOpts.override){
      const replacedCurrentResult = await replaceCurrentIfNeeded(concreteOpts.replace, resolvedVersion, {
        addToPathIfMissing: opts.addToPathIfMissing,
        useSystemNode: opts.useSystemNode,
      });
      return {
        downloadRequired: false,
        installedVersion: resolvedVersion,
        replacedCurrent: replacedCurrentResult.replaced,
        previousCurrentVersion: replacedCurrentResult.previousCurrentVersion,
        pathExtenderReport: replacedCurrentResult.pathExtenderReport,
        warnings: replacedCurrentResult.warnings,
        versionPath: versionDir
      }
    }
    await removeWithLoader(versionDir);
  }
  const tempDir = config.getTempDir();
  let fsTarVersion;
  if (opts.file){
    fsTarVersion = new FsTarVersion(opts.file);
    fsTarVersion = await fsTarVersion.copyToDir(tempDir, {loader});
  } else {
    const fetchOpts: FetchOpts = {
      overrideDir: true,
      destinationDir: tempDir,
      os: opts.os, 
      arch: opts.arch
    }
    fsTarVersion = await fetch(resolvedVersion, fetchOpts);
    // TODO: check if version already exists, return it's location
  }

  if (fsTarVersion.path) {
    const tarFile = fsTarVersion.path;
    const extractMethod = getExtractMethod(opts.extractMethod, opts.os);
    if (!extractMethod || extractMethod === 'default') {
      await extractWithLoader(fsTarVersion.path, fsTarVersion.version, extractDir);
    } else {
      const extractFlags = ['-xf', path.basename(fsTarVersion.path)];
      if (extractDir){
        fs.ensureDir(extractDir)
        extractFlags.push('-C', extractDir);
      }
      const extractMsg = `extracting version ${fsTarVersion.version} using ${extractMethod} method`;
      loader.start(extractMsg);
      const extractStartTime = Date.now();
      try {
        /* Extracting the tar file. */
        await execa('tar', extractFlags, {cwd: tempDir});
        const extractEndTime = Date.now();
        const extractTimeDiff = timeFormat(extractEndTime - extractStartTime);
        loader.succeed(`extracting version ${fsTarVersion.version} in ${extractTimeDiff}`);
      } catch (e){
        console.log('failed to extract, error: ', e.message || '');
        throw (e);
      }
    }

    await removeWithLoader(tarFile);
  }

  if (!extractDir){
    await moveWithLoader(tempDir, versionDir, {overwrite: true});
  }

  let useSystemNode = opts.useSystemNode;
  if (!useSystemNode) {
    const wantedNodeVersion = config.getWantedNodeVersion(path.join(versionDir, `bit-${resolvedVersion}`));
    if (wantedNodeVersion) {
      // If Node.js installation doesn't succeed, we'll use the system default Node.js instead.
      useSystemNode = !(await installNode(config, wantedNodeVersion));
    }
  }
  const replacedCurrentResult = await replaceCurrentIfNeeded(concreteOpts.replace, fsTarVersion.version, {
    addToPathIfMissing: opts.addToPathIfMissing,
    useSystemNode,
  });
  loader.stop();
  return {
    downloadRequired: !!fsTarVersion.path,
    installedVersion: fsTarVersion.version,
    replacedCurrent: replacedCurrentResult.replaced,
    previousCurrentVersion: replacedCurrentResult.previousCurrentVersion,
    pathExtenderReport: replacedCurrentResult.pathExtenderReport,
    warnings: replacedCurrentResult.warnings,
    versionPath: versionDir
  }
}

function getExtractMethod(extractMethod?: ExtractMethod, osName?: string): ExtractMethod {
  const validExtractMethods: ExtractMethod[] = ['default', 'child-process'];
  const extractMethodOrFromConfig = extractMethod || getConfig().getExtractMethod() as ExtractMethod;

  if (extractMethodOrFromConfig && validExtractMethods.includes(extractMethodOrFromConfig)) {
    return extractMethodOrFromConfig;
  }
  const osType = getOsType(osName);
  return (OS_DEFAULT_EXTRACT_METHOD[osType] || 'default') as ExtractMethod;
}

/*
 * Reads Bit's version from a tarball filename like "bit-0.0.778-linux-x64.tar.gz"
 * Returns null if a version is not found.
 */
function getBitVersionFromFilePath(filePath: string): string | null {
  const fileName = path.basename(filePath);
  const parts = fileName.split('-');
  if (parts.length < 4) return null;
  const versionParts = parts.slice(1, parts.length - 2);
  const version = versionParts.join('');
  if (!semver.valid(version)) return null;
  return version;
}

/**
 * Install the given Node.js version to the bvm directory if it is wasn't installed yet.
 */
async function installNode(config: Config, version: string): Promise<string> {
  const { versionDir, exists } = config.getSpecificNodeVersionDir(version);
  if (exists) return versionDir;
  const networkConfig = config.networkConfig();
  const fetch = createFetchFromRegistry({
    ...networkConfig,
    ...config.proxyConfig(),
    strictSsl: networkConfig.strictSSL,
  });
  const cafsDir = config.getCafsDir();
  const loaderText = `downloading Node.js ${version}`
  loader.start(loaderText);
  try {
    await fetchNode(fetch, version, versionDir, { cafsDir });
  } catch (err) {
    loader.fail('Could not install Node.js, using the system Node.js instead');
    return undefined;
  }
  loader.succeed(loaderText);
  return versionDir;
}

async function extractWithLoader(filePath: string, version: string, targetDir?: string): Promise<void> {
  const extractLoaderText = `extracting version ${version}`;
  const extractStartTime = Date.now();
  const progressBarOpts = {
    format: `extracting version ${version} [{bar}] {percentage}% | ETA: {etah} | Speed: {speed}`,
  }
  await extract(filePath, targetDir, {ensureDir: true}, progressBarOpts);
  const extractEndTime = Date.now();
  const extractTimeDiff = timeFormat(extractEndTime - extractStartTime);
  loader.succeed(`${extractLoaderText} in ${extractTimeDiff}`);
}

async function removeWithLoader(filePath: string) {
  const removeLoaderText = `removing ${filePath}`;
  loader.start(removeLoaderText);
  const removeStartTime = Date.now();
  await fs.remove(filePath);
  const removeEndTime = Date.now();
  const removeTimeDiff = timeFormat(removeEndTime - removeStartTime);
  loader.succeed(`${removeLoaderText} in ${removeTimeDiff}`);
}

async function moveWithLoader(src: string, target: string, opts: MoveOptions): Promise<void> {
  const moveLoaderText = `moving from temp folder to final location`;
  loader.start(moveLoaderText);
  const moveStartTime = Date.now();
  await fs.move(src, target, opts);
  const moveEndTime = Date.now();
  const moveTimeDiff = timeFormat(moveEndTime - moveStartTime);
  loader.succeed(`${moveLoaderText} in ${moveTimeDiff}`);
}

type ReplaceCurrentResult = {
  replaced: boolean,
  pathExtenderReport?: PathExtenderReport,
  previousCurrentVersion?: string,
  warnings?: string[],
}

async function replaceCurrentIfNeeded(forceReplace: boolean, version: string, opts: { addToPathIfMissing?: boolean, useSystemNode?: boolean }): Promise<ReplaceCurrentResult> {
  const config = getConfig();
  const currentLink = config.getDefaultLinkVersion();
  if (forceReplace || !currentLink){
    const {previousLinkVersion, pathExtenderReport, warnings} = await linkOne(config.getDefaultLinkName(), version, {
      addToConfig: true,
      addToPathIfMissing: opts.addToPathIfMissing,
      useSystemNode: opts.useSystemNode,
    });
    return {
      replaced: true,
      previousCurrentVersion: previousLinkVersion,
      pathExtenderReport,
      warnings,
    };
  }
  return {
    replaced: false
  };
}

function getConfig(): Config {
  const config = Config.load();
  return config;
}
