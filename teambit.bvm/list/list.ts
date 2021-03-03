import { RemoteVersions} from '@teambit/gcp.storage';
import {Config} from '@teambit/bvm.config';
import semver from 'semver';
import fs from 'fs-extra';

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

export async function latestLocal(): Promise<string | undefined> {
  const allVersions = await listLocal();
  if (!allVersions || !allVersions.length) return undefined;
  return latestFromArray(allVersions);
}

export async function latestRemote(): Promise<string> {
  const allVersions = await listRemote();
  const allVersionsSemvers = allVersions.map(entry => entry.version);
  return latestFromArray(allVersionsSemvers)
}

export function latestFromArray(versions: string[]): string {
  const latest = semver.maxSatisfying(versions, '*');
  return latest;
}