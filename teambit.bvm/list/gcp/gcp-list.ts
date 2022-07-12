import { GcpStorage } from '@teambit/gcp.storage';
import { getAgent } from '@teambit/toolbox.network.agent';
import fetch from 'node-fetch';
import { GcpVersion } from './gcp-version';
import { RemoteVersionList } from '../version-list';
import { RemoteVersion } from '../version';

const BIT_INDEX_JSON = 'https://bvm.bit.dev/bit/index.json';
const bucketName = 'bvm.bit.dev';
const prefix = 'versions';

export enum ReleaseType {
  NIGHTLY_FROM_OLD_LOCATION = 'nightly-from-old-location',
  DEV = 'dev',
  NIGHTLY = 'nightly',
  STABLE = 'stable',
}

export type Release = {
  version: string;
  date: string;
} & Partial<Record<ReleaseType, true>>

export class GcpList {
  constructor(
    private gcpStorage: GcpStorage,
    private proxyConfig = {},
    private osType = 'Darwin',
    private arch = 'x64',
    private releaseType: ReleaseType = ReleaseType.NIGHTLY_FROM_OLD_LOCATION,
  ) { }

  async list(): Promise<RemoteVersionList> {
    if (this.releaseType !== ReleaseType.NIGHTLY_FROM_OLD_LOCATION) {
      const releases = await this._fetchReleasesList();
      const remoteVersions = releases
        .filter((release) => release[this.releaseType] === true)
        .map((release) => this._createRemoteVersion(release));
      return new RemoteVersionList(remoteVersions);
    }
    const files = (await this.rawFiles()).filter(file => file.contentType === 'application/x-tar');
    const remoteVersions = files.map((file) => {
      const gcpVersion = new GcpVersion(getVersionFromFileName(file.name), file.name, file.bucket, file.md5Hash, file.timeCreated, file.metadata);
      return gcpVersion.toRemoteVersion();
    });
    return new RemoteVersionList(remoteVersions);
  }

  async _fetchReleasesList(): Promise<Release[]> {
    const response = await fetch(BIT_INDEX_JSON, {
      agent: getAgent(BIT_INDEX_JSON, this.proxyConfig),
    });
    return await response.json() as Release[];
  }

  _createRemoteVersion(release: Release): RemoteVersion {
    const osCode = this.osType === 'Windows_NT' ? 'win' : this.osType.toLowerCase();
    const fileName = `bit/versions/${release.version}/bit-${release.version}-${osCode}-${this.arch}.tar.gz`;
    const gcpVersion = new GcpVersion(release.version, fileName, bucketName, '', release.date, {});
    return gcpVersion.toRemoteVersion();
  }

  async rawFiles() {
    let filesPrefix = `${prefix}/dev/${this.osType}/`;
    if (this.osType === 'Darwin' && this.arch === 'arm64'){
      filesPrefix = `${prefix}/dev/${this.osType}-${this.arch}/`;
    }
    return this.gcpStorage.getFiles({ prefix: filesPrefix });
  }

  static create(releaseType: ReleaseType = ReleaseType.NIGHTLY_FROM_OLD_LOCATION, osType = 'Darwin', arch = 'x64', proxyConfig?: {}) {
    const gcpStorage = GcpStorage.create(bucketName, proxyConfig);
    return new GcpList(gcpStorage, proxyConfig, osType, arch, releaseType);
  }
}

function getVersionFromFileName(fileName: string) {
  return fileName
    .split('/')[4]
    .replace(/\.[^/.]+$/, '')
    .replace(/\.[^/.]+$/, '')
    .split('-')[1];
}
