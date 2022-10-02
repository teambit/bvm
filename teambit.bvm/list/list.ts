import os from 'os';
import { GcpList, ReleaseType, ReleaseTypeFilter } from './gcp';
import { Config } from '@teambit/bvm.config';
import semver from 'semver';
import fs from 'fs-extra';
import { LocalVersionList, RemoteVersionList } from './version-list';
import { LocalVersion } from './version';

export type GcpListOptions = {
  releaseType?: ReleaseTypeFilter;
}
export type ListOptions = GcpListOptions & {
  limit?: number;
};

const config = Config.load();

export function getGcpList(options?: GcpListOptions): GcpList {
  const releaseType = options?.releaseType ?? config.getReleaseType();
  const {accessKey, secretKey} = config.gcpConfig();
  const gcpList = GcpList.create(releaseType, os.type(), process.arch, {
    ...config.networkConfig(),
    ...config.proxyConfig(),
  }, accessKey, secretKey);
  return gcpList;
}

export async function listRemote(options?: ListOptions): Promise<RemoteVersionList> {
  const gcpList = getGcpList(options);
  const list = await gcpList.list();
  if (!options?.limit) return list;
  return list.slice(options?.limit);
  // return options['release-type'] === ReleaseType.STABLE ? list.sortBySemver('desc') : list;
}

export async function listLocal(): Promise<LocalVersionList> {
  const versionsDir = config.getBitVersionsDir();
  const exists = await fs.pathExists(versionsDir);
  if (!exists) return new LocalVersionList([]);
  const dirEntries = await fs.readdir(versionsDir, { withFileTypes: true });
  const versions = dirEntries
    .filter((dirent) => {
      return (dirent.isDirectory() || dirent.isSymbolicLink()) && semver.valid(dirent.name);
    })
    .map((dirent) => {
      const version = dirent.name;
      const { versionDir } = config.getSpecificVersionDir(version);
      const localVersion = new LocalVersion(version, versionDir);
      return localVersion;
    });
  return new LocalVersionList(versions);
}

export function latestFromArray(versions: string[]): string {
  const latest = semver.maxSatisfying(versions, '*');
  return latest;
}
