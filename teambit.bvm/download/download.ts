import path from 'path';
import fs from 'fs-extra';
import {listRemote } from '@teambit/bvm.list';
import {Config} from '@teambit/bvm.config';
import { download as fileDownload } from '@teambit/toolbox.network.file-downloader';
import ora from 'ora';
import { timeFormat } from '@teambit/time.time-format';

const config = Config.load();

export type DownloadOpts = {
  override?: boolean
}

const defaultOpts = {
  override: false
}

const loader = ora();

export type DownloadResults = {
  versionDir: string, 
  resolvedVersion: string,
  downloadedFile?: string
}

export async function download(version: string, opts: DownloadOpts = defaultOpts): Promise<DownloadResults> {
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const remoteVersionList = await listRemote();
  let resolvedVersion;
  if (!version || version === 'latest'){
    resolvedVersion = remoteVersionList.latest();
  } else {
    resolvedVersion = remoteVersionList.find(version);
  }

  if (!resolvedVersion){
    throw new Error(`version ${version} not found on remote, use bvm list --remote to see available versions`);
  }
  const url = resolvedVersion.url;
  const {versionDir, exists} = config.getSpecificVersionDir(resolvedVersion.version);
  if (exists){
    if (!concreteOpts.override){
      return {versionDir, resolvedVersion: resolvedVersion.version};
    }
    await fs.remove(versionDir);
  }
  const fileName = url.split('/').pop();
  const destination = path.join(versionDir, fileName);
  const loaderText = `downloading version ${resolvedVersion.version} from ${url}`;
  loader.start(loaderText);
  const downloadStartTime = Date.now();
  await fileDownload(url, destination);
  const downloadEndTime = Date.now();
  const downloadTimeDiff = timeFormat(downloadEndTime - downloadStartTime);
  loader.succeed(`${loaderText} in ${downloadTimeDiff}`);
  loader.stop();
  return {versionDir, downloadedFile: destination, resolvedVersion: resolvedVersion.version};
}
