import path from 'path';
import fs from 'fs-extra';
import {listRemote} from '@teambit/bvm.list.api';
import {Config} from '@teambit/bvm.config.api';
import { download as fileDownload } from '@teambit/toolbox.network.file-downloader';
import semver from 'semver';
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
  downloadedFile?: string
}

export async function download(version: string, opts: DownloadOpts = defaultOpts): Promise<DownloadResults> {
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const allVersions = await listRemote();
  let resolvedVersion = version;
  if (!version || version === 'latest'){
    const allVersionsSemvers = allVersions.map(entry => entry.version);
    resolvedVersion = semver.maxSatisfying(allVersionsSemvers, '*');
  }
  const entry = allVersions.find((versionEntry) => {
    return versionEntry.version === resolvedVersion;
  });
  if (!entry){
    throw new Error(`version ${version} not found on remote, use bvm list --remote to see available versions`);
  }
  const url = entry.url;
  const versionsDir = config.getBitVersionsDir();
  const versionDir = path.join(versionsDir, entry.version);
  const exists = await fs.pathExists(versionDir);
  if (exists){
    if (!concreteOpts.override){
      return {versionDir};
    }
    await fs.remove(versionDir);
  }
  const fileName = url.split('/').pop();
  const destination = path.join(versionDir, fileName);
  const loaderText = `downloading version ${entry.version} from ${url}`;
  loader.start(loaderText);
  const downloadStartTime = Date.now();
  await fileDownload(url, destination);
  const downloadEndTime = Date.now();
  const downloadTimeDiff = timeFormat(downloadEndTime - downloadStartTime);
  loader.succeed(`${loaderText} in ${downloadTimeDiff}`);
  loader.stop();
  return {versionDir, downloadedFile: destination};
}
