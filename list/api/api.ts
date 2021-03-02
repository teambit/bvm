import { RemoteVersions} from '@teambit/bvm.gcloud-storage';
import {Config} from '@teambit/bvm.config.api';
import fs from 'fs-extra';
import { version } from 'process';

export type RemoteVersion = {
  version: string,
  url: string
}
export type RemoteVersionList = Array<RemoteVersion>

const config = Config.load();

export async function listRemote(): Promise<RemoteVersionList> {
  const remote = RemoteVersions.create();
  return remote.list('dev')
}

export async function listLocal(): Promise<string[]> {
  const versionsDir = config.getBitVersionsDir();
  const exists = fs.pathExists(versionsDir);
  if (!exists) return [];
  const dirEntries = await fs.readdir(versionsDir, { withFileTypes: true });
  const versions = dirEntries.filter((dirent) => {
    return dirent.isDirectory() || dirent.isSymbolicLink();
  })
  .map((dirent) => dirent.name);
  return versions;
}