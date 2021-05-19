import os from 'os';
import { GcpList } from './gcp';
import { Config,  } from '@teambit/bvm.config';
import semver from 'semver';
import fs from 'fs-extra';
import { LocalVersionList, RemoteVersionList } from './version-list';
import { LocalVersion } from './version';

const config = Config.load();

export async function listRemote(): Promise<RemoteVersionList> {
  const proxyConfig = config.proxyConfig();
  const gcpList = GcpList.create('dev', os.type(), proxyConfig);
  return gcpList.list();
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
