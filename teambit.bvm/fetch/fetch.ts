import path from 'path';
import fs from 'fs-extra';
import { listRemote } from '@teambit/bvm.list';
import { Config } from '@teambit/bvm.config';
import { download as fileDownload } from '@teambit/toolbox.network.progress-bar-file-downloader';
import ora from 'ora';
import { timeFormat } from '@teambit/toolbox.time.time-format';
import { BvmError } from '@teambit/bvm.error';

const config = Config.load();

export type FetchOpts = {
  override?: boolean;
  overrideDir?: boolean;
  destination: string;
};

const defaultOpts = {
  override: false,
  overrideDir: false,
};

const loader = ora();

export type FetchResults = {
  resolvedVersion: string;
  downloadedFile?: string;
};

export async function fetch(version: string, opts: FetchOpts): Promise<FetchResults> {
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const remoteVersionList = await listRemote();
  let resolvedVersion;
  if (!version || version === 'latest') {
    resolvedVersion = remoteVersionList.latest();
  } else {
    resolvedVersion = remoteVersionList.find(version);
  }

  if (!resolvedVersion) {
    throw new BvmError(`version ${version} not found on remote, use bvm list --remote to see available versions`);
  }

  const url = resolvedVersion.url;
  // const { versionDir, exists } = config.getSpecificVersionDir(resolvedVersion.version);
  const fileName = url.split('/').pop();
  const destination = opts.destination;
  const destinationDir = path.dirname(destination);
  const destinationDirExists = await fs.pathExists(destinationDir);
  if (destinationDirExists) {
    if (concreteOpts.overrideDir) {
      await fs.remove(destinationDir);
    }
  }
  const destinationExists = await fs.pathExists(destination);
  if (destinationExists) {
    if (!concreteOpts.override) {
      throw new BvmError(`the destination location at ${destination} already exist`);
    }
    await fs.remove(destination);
  }
  const downloadLoaderText = `downloading version ${resolvedVersion.version}`;
  const downloadStartTime = Date.now();
  const progressBarOpts = {
    format: `downloading version ${resolvedVersion.version} [{bar}] {percentage}% | ETA: {etah} | Speed: {speed}`,
  }
  await fileDownload(url, destination, {}, progressBarOpts, config.proxyConfig());
  const downloadEndTime = Date.now();
  const downloadTimeDiff = timeFormat(downloadEndTime - downloadStartTime);
  loader.succeed(`${downloadLoaderText} in ${downloadTimeDiff}`);
  return { downloadedFile: destination, resolvedVersion: resolvedVersion.version };
}