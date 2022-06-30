import fs, { MoveOptions } from 'fs-extra';
import path from 'path';
import { createFetchFromRegistry } from '@pnpm/fetch';
import { fetchNode } from '@pnpm/node.fetcher';
import {fetch, FetchOpts} from '@teambit/bvm.fetch';
import {extract} from '@teambit/toolbox.fs.progress-bar-file-extractor';
import ora from 'ora';
import { timeFormat } from '@teambit/toolbox.time.time-format';
import { Config } from '@teambit/bvm.config';
import {linkOne, PathExtenderReport} from '@teambit/bvm.link';
import { listRemote } from '@teambit/bvm.list';
import { FsTarVersion } from '@teambit/bvm.fs-tar-version';

export type InstallOpts = {
  addToPathIfMissing?: boolean,
  override?: boolean,
  replace?: boolean,
  file?: string
  useSystemNode?: boolean
}

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

const loader = ora();

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<InstallResults>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const config = getConfig();
  const remoteVersionList = await listRemote();

  let resolvedVersion = version;
  if (!version || version === 'latest') {
    resolvedVersion = remoteVersionList.latest().version;
  }
  const { versionDir, exists } = config.getSpecificVersionDir(resolvedVersion);
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
      destinationDir: tempDir
    }
    fsTarVersion = await fetch(resolvedVersion, fetchOpts);
    // TODO: check if version already exists, return it's location
  }

  if (fsTarVersion.path) {
    const tarFile = fsTarVersion.path;
    await extractWithLoader(fsTarVersion.path, fsTarVersion.version);
    await removeWithLoader(tarFile);
  }

  await moveWithLoader(tempDir, versionDir, {overwrite: true});
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

/**
 * Install the given Node.js version to the bvm directory if it is wasn't installed yet.
 */
async function installNode(config: Config, version: string): Promise<string> {
  const { versionDir, exists } = config.getSpecificNodeVersionDir(version);
  if (exists) return versionDir;
  const proxyConfig = config.proxyConfig();
  const fetch = createFetchFromRegistry({
    ...proxyConfig,
    strictSsl: proxyConfig.strictSSL,
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

async function extractWithLoader(filePath: string, version) {
  const extractLoaderText = `extracting version ${version}`;
  const extractStartTime = Date.now();
  const progressBarOpts = {
    format: `extracting version ${version} [{bar}] {percentage}% | ETA: {etah} | Speed: {speed}`,
  }
  await extract(filePath, undefined, {}, progressBarOpts);
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
