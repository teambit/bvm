import { GcpStorage } from '@teambit/gcp.storage';
import { GcpVersion } from './gcp-version';
import { RemoteVersionList } from '../version-list';

const bucketName = 'bvm.bit.dev';
const prefix = 'versions';

export class GcpList {
  constructor(private gcpStorage: GcpStorage, private osType = 'Darwin', private arch = 'x64', private releaseType = 'dev') { }

  async list(): Promise<RemoteVersionList> {
    const files = (await this.rawFiles()).filter(file => file.contentType === 'application/x-tar');
    const remoteVersions = files.map((file) => {
      const gcpVersion = new GcpVersion(file.name, file.bucket, file.md5Hash, file.timeCreated, file.metadata);
      return gcpVersion.toRemoteVersion();
    });
    return new RemoteVersionList(remoteVersions);
  }

  async rawFiles() {
    let filesPrefix = `${prefix}/${this.releaseType}/${this.osType}/`;
    if (this.osType === 'Darwin' && this.arch === 'arm64'){
      filesPrefix = `${prefix}/${this.releaseType}/${this.osType}-${this.arch}/`;
    }
    return this.gcpStorage.getFiles({ prefix: filesPrefix });
  }

  static create(releaseType = 'dev', osType = 'Darwin', arch = 'x64', proxyConfig?: {}) {
    const gcpStorage = GcpStorage.create(bucketName, proxyConfig);
    return new GcpList(gcpStorage, osType, arch, releaseType);
  }
}
