import fs from 'fs-extra';
import {download, DownloadOpts} from '@teambit/bvm.download.api';
import {untar} from '@teambit/toolbox.fs.untar';
import ora from 'ora';

export type InstallOpts = {
  override?: boolean
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
  const untarLoaderText = `untarring ${tarFile}`;
  loader.start(untarLoaderText);
  await untar(tarFile);
  loader.succeed(untarLoaderText);
  const removeLoaderText = `removing ${tarFile}`;
  loader.start(removeLoaderText);
  await fs.remove(tarFile);
  loader.succeed(removeLoaderText);
  loader.stop();
  return downloadResults.versionDir;
}