import fs from 'fs-extra';
import {download, DownloadOpts} from '@teambit/bvm.download.api';
import {untar} from '@teambit/toolbox.fs.untar';
import ora from 'ora';
import { timeFormat } from '@teambit/time.time-format';
import { Config } from '@teambit/bvm.config.api';
import {linkOne} from '@teambit/bvm.link.api';

export type InstallOpts = {
  override?: boolean,
  replace?: boolean
}

const defaultOpts = {
  override: false
}

const loader = ora();

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<string>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const downloadOpts: DownloadOpts = {
    override: concreteOpts.override
  }
  const downloadResults = await download(version, downloadOpts);
  // version already exists, return it's location
  if (!downloadResults.downloadedFile) return downloadResults.versionDir;
  const tarFile = downloadResults.downloadedFile;
  await untarWithLoader(tarFile);
  await removeWithLoader(tarFile);
  await replaceCurrentIfNeeded(opts.replace, downloadResults.resolvedVersion);
  loader.stop();
  return downloadResults.versionDir;
}

async function untarWithLoader(tarFile: string) {
  const untarLoaderText = `untarring ${tarFile}`;
  loader.start(untarLoaderText);
  const untarStartTime = Date.now();
  await untar(tarFile);
  const untarEndTime = Date.now();
  const untarTimeDiff = timeFormat(untarEndTime - untarStartTime);
  loader.succeed(`${untarLoaderText} in ${untarTimeDiff}`);
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

async function replaceCurrentIfNeeded(forceReplace: boolean, version: string): boolean {
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