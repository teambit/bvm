import { GcpStorage } from '@teambit/gcp.storage';
import { getAgent } from '@teambit/toolbox.network.agent';
import {compare} from 'semver';
import fetch from 'node-fetch';
import { GcpVersion } from './gcp-version';
import { RemoteVersionList } from '../version-list';
import { RemoteVersion } from '../version';

const BIT_INDEX_JSON_OBJECT = 'bit/index.json';
// const BIT_INDEX_JSON_OBJECT = 'bit/index-test.json';
const BIT_INDEX_JSON = `https://bvm.bit.dev/${BIT_INDEX_JSON_OBJECT}`;
const bucketName = 'bvm.bit.dev';
const prefix = 'versions';

export enum ReleaseTypeFilter {
  NIGHTLY_FROM_OLD_LOCATION = 'nightly-from-old-location',
  // TODO: merge this with the ReleaseType properly
  DEV = 'dev',
  NIGHTLY = 'nightly',
  STABLE = 'stable',
  ALL = 'all'
}

export enum ReleaseType {
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
    private releaseTypeFilter: ReleaseTypeFilter = ReleaseTypeFilter.STABLE,
  ) { }

  async list(): Promise<RemoteVersionList> {
    if (this.releaseTypeFilter !== ReleaseTypeFilter.NIGHTLY_FROM_OLD_LOCATION) {
      const releases = await this.fetchIndex();
      const filteredReleases = this.releaseTypeFilter === ReleaseTypeFilter.ALL 
        ? releases 
        : releases.filter((release) => release[this.releaseTypeFilter] === true)

      const remoteVersions = filteredReleases.map((release) => this._createRemoteVersion(release));
      return new RemoteVersionList(remoteVersions);
    }
    const files = (await this.rawFiles()).filter(file => file.contentType === 'application/x-tar');
    const remoteVersions = files.map((file) => {
      const gcpVersion = new GcpVersion(getVersionFromFileName(file.name), file.name, file.bucket, file.md5Hash, file.timeCreated, file.metadata, undefined);
      return gcpVersion.toRemoteVersion();
    });
    return new RemoteVersionList(remoteVersions);
  }

  getIndexJsonUrl(): string {
    const random = Math.floor(Math.random() * 10000000);
    return `${BIT_INDEX_JSON}?random=${random}`;
  }

  async fetchIndex(): Promise<Release[]> {
    const url = this.getIndexJsonUrl();
    const response = await fetch(url, {
      agent: getAgent(url, this.proxyConfig),
    });
    return await response.json() as Release[];
  }

  async updateReleaseEntry(version: string, releaseTypeUpdates: Partial<Record<ReleaseType, boolean>>): Promise<Release> {
    const index = await this.fetchIndex();
    const release = index.find((release) => release.version === version);
    if (!release){
      throw new Error(`version ${version} not found in index.json`);
    }
    Object.entries(releaseTypeUpdates).forEach(([releaseType, value]) => {
      if (value){
        release[releaseType] = value;
      } else {
        delete release[releaseType];
      }
    });
    const newIndex = index.filter((release) => release.version !== version)
    newIndex.push(release);
    const sortedIndex = newIndex.sort(compareReleases);
    const metadata = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    }
    await this.gcpStorage.putFile(BIT_INDEX_JSON_OBJECT, JSON.stringify(sortedIndex, null, 2), metadata);
    return release;
  }

  _createRemoteVersion(release: Release): RemoteVersion {
    const fileName = `bit/versions/${release.version}/bit-${release.version}-${this.osType}-${this.arch}.tar.gz`;
    const releaseType = release[ReleaseType.STABLE] ? ReleaseType.STABLE : ReleaseType.NIGHTLY;
    const gcpVersion = new GcpVersion(release.version, fileName, bucketName, '', release.date, {}, undefined, releaseType);
    return gcpVersion.toRemoteVersion();
  }

  async rawFiles() {
    // The old location names were capitalized, so we need to get them as well
    // The old name of win was Windows_NT
    const osType = this.osType === 'win' ? 'Windows_NT' : this.osType.charAt(0).toUpperCase() + this.osType.slice(1);
    let filesPrefix = `${prefix}/dev/${this.osType}/`;
    if ((osType === 'Darwin' || osType === 'Linux') && this.arch === 'arm64'){
      filesPrefix = `${prefix}/dev/${osType}-${this.arch}/`;
    }
    return this.gcpStorage.getFiles({ prefix: filesPrefix });
  }

  static create(releaseTypeFilter: ReleaseTypeFilter = ReleaseTypeFilter.STABLE, osType = 'darwin', arch = 'x64', proxyConfig?: {}, accessKey?: string, secretKey?: string) {
    const gcpStorage = GcpStorage.create(bucketName, proxyConfig, accessKey, secretKey);
    return new GcpList(gcpStorage, proxyConfig, osType, arch, releaseTypeFilter);
  }
}

function getVersionFromFileName(fileName: string) {
  return fileName
    .split('/')[4]
    .replace(/\.[^/.]+$/, '')
    .replace(/\.[^/.]+$/, '')
    .split('-')[1];
}

function compareReleases(v1: Release, v2: Release) {
  try {
    return compare(v1.version, v2.version);
  } catch (err) {
    // in case one of them is a snap
    return 0;
  }
}