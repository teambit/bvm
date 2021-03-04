import fs from 'fs-extra';
import {fetch, FetchOpts} from '@teambit/bvm.fetch';
import {untar} from '@teambit/toolbox.fs.untar';
import ora from 'ora';
import { timeFormat } from '@teambit/time.time-format';
import { Config } from '@teambit/bvm.config';
import {linkOne} from '@teambit/bvm.link';

export type InstallOpts = {
  override?: boolean,
  replace?: boolean
}

type InstallResults = {
  installedVersion: string,
  downloadRequired: boolean,
  replacedCurrent: boolean,
  versionPath: string
}

const defaultOpts = {
  override: false,
  replace: false
}

const loader = ora();

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<InstallResults>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const fetchOpts: FetchOpts = {
    override: concreteOpts.override
  }
  const downloadResults = await fetch(version, fetchOpts);
  // version already exists, return it's location
  if (downloadResults.downloadedFile) {
    const tarFile = downloadResults.downloadedFile;
    await untar(tarFile);
    await removeWithLoader(tarFile);
  }
  const replacedCurrent = await replaceCurrentIfNeeded(opts.replace, downloadResults.resolvedVersion);
  loader.stop();
  return {
    downloadRequired: !!downloadResults.downloadedFile,
    installedVersion: downloadResults.resolvedVersion,
    replacedCurrent,
    versionPath: downloadResults.versionDir
  }
}

async function removeWithLoader(tarFile: string) {
  const removeLoaderText = `removing ${tarFile}`;
  loader.start(removeLoaderText);
  const removeStartTime = Date.now();
  await fs.remove(tarFile);
  const removeEndTime = Date.now();
  const removeTimeDiff = timeFormat(removeEndTime - removeStartTime);
  loader.succeed(`${removeLoaderText} in ${removeTimeDiff}`);
}

async function replaceCurrentIfNeeded(forceReplace: boolean, version: string): Promise<boolean> {
  const config = getConfig();
  const currentLink = config.getDefaultLinkVersion();
  if (forceReplace || !currentLink){
    await linkOne(config.getDefaultLinkName(), version);
    return true;
  }
  return false;
}

function getConfig(): Config {
  const config = Config.load();
  return config;
}