import os from 'os';
import { GcpList, ReleaseType, ReleaseTypeFilter } from './gcp';
import { Config } from '@teambit/bvm.config';
import semver from 'semver';
import fs from 'fs-extra';
import { LocalVersionList, RemoteVersionList } from './version-list';
import { LocalVersion } from './version';

export type GcpListOptions = {
  releaseType?: ReleaseTypeFilter;
  os?: 'linux' | 'darwin' | 'win' | 'Windows_NT' | 'Linux' | 'Darwin';
  arch?: 'x64' | 'arm64';
}
export type ListOptions = GcpListOptions & {
  limit?: number;
};

export const supportedPlatforms = {
  'linux': ['x64'],
  'win': ['x64'],
  'darwin': ['x64', 'arm64'],
}

export const OS_TYPES = {
  'linux': 'linux',
  'windows_nt': 'win',
  'win': 'win',
  'darwin': 'darwin'
}

const config = Config.load();

export function getGcpList(options?: GcpListOptions): GcpList {
  const releaseType = options?.releaseType ?? config.getReleaseType();
  const {accessKey, secretKey} = config.gcpConfig();
  const osType = options?.os ? OS_TYPES[options?.os.toLowerCase()] : OS_TYPES[os.type().toLowerCase()];
  const arch = options?.arch ?? process.arch;
  validatePlatform(osType, arch);
  const gcpList = GcpList.create(releaseType, osType, arch, {
    ...config.networkConfig(),
    ...config.proxyConfig(),
  }, accessKey, secretKey);
  return gcpList;
}


/**
 * It throws an error if the given platform is not supported
 * @param {string} osType - The operating system type.
 * @param {string} arch - The architecture of the target platform.
 */
export function validatePlatform(osType: string, arch: string) {
  if (!supportedPlatforms[osType]) {
    throw new Error(`unsupported platform ${osType}`);
  }
  if (!supportedPlatforms[osType].includes(arch)) {
    throw new Error(`unsupported platform ${osType} ${arch}`);
  }
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
  const gcpList = getGcpList();
  const versionsMap = (await gcpList.list()).toMap();
  const versions = dirEntries
    .filter((dirent) => {
      return (dirent.isDirectory() || dirent.isSymbolicLink()) && semver.valid(dirent.name);
    })
    .map((dirent) => {
      const version = dirent.name;
      const { versionDir } = config.getSpecificVersionDir(version);
      const releaseType = versionsMap.get(version);
      const localVersion = new LocalVersion(version, versionDir, releaseType);
      return localVersion;
    });
  return new LocalVersionList(versions);
}

export function latestFromArray(versions: string[]): string {
  const latest = semver.maxSatisfying(versions, '*');
  return latest;
}
