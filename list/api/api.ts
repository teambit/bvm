import {listVersions as artifactoryListVersions} from '@teambit/bvm.artifactory.list';
import {Config} from '@teambit/bvm.config.api';
import fs from 'fs-extra';

export type RemoteVersion = {
  version: string,
  url: string
}
export type RemoteVersionList = Array<RemoteVersion>

const config = Config.load();

export async function listRemote(): Promise<RemoteVersionList> {
  return artifactoryListVersions('dev');
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