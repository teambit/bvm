import fs, { MoveOptions } from 'fs-extra';
import path from 'path';
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
}

export type InstallResults = {
  installedVersion: string,
  downloadRequired: boolean,
  replacedCurrent: boolean,
  previousCurrentVersion?: string
  versionPath: string,
  pathExtenderReport?: PathExtenderReport,
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
      });
      return {
        downloadRequired: false,
        installedVersion: resolvedVersion,
        replacedCurrent: replacedCurrentResult.replaced,
        previousCurrentVersion: replacedCurrentResult.previousCurrentVersion,
        pathExtenderReport: replacedCurrentResult.pathExtenderReport,
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
  const replacedCurrentResult = await replaceCurrentIfNeeded(concreteOpts.replace, fsTarVersion.version);
  loader.stop();
  return {
    downloadRequired: !!fsTarVersion.path,
    installedVersion: fsTarVersion.version,
    replacedCurrent: replacedCurrentResult.replaced,
    previousCurrentVersion: replacedCurrentResult.previousCurrentVersion,
    pathExtenderReport: replacedCurrentResult.pathExtenderReport,
    versionPath: versionDir
  }
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
  previousCurrentVersion?: string
}

async function replaceCurrentIfNeeded(forceReplace: boolean, version: string, opts: { addToPathIfMissing?: boolean }): Promise<ReplaceCurrentResult> {
  const config = getConfig();
  const currentLink = config.getDefaultLinkVersion();
  if (forceReplace || !currentLink){
    const {previousLinkVersion, pathExtenderReport} = await linkOne(config.getDefaultLinkName(), version, {
      addToConfig: true,
      addToPathIfMissing: opts.addToPathIfMissing,
    });
    return {
      replaced: true,
      previousCurrentVersion: previousLinkVersion,
      pathExtenderReport,
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
