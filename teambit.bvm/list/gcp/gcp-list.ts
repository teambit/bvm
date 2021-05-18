import { GcpStorage } from '@teambit/gcp.storage';
import { GcpVersion } from './gcp-version';
import { RemoteVersionList } from '../version-list';

const bucketName = 'bvm.bit.dev';
const prefix = 'versions';

export class GcpList {
  constructor(private gcpStorage: GcpStorage, private osType = 'Darwin', private releaseType = 'dev') {}

  async list(): Promise<RemoteVersionList> {
    const files = await this.rawFiles();
    const remoteVersions = files.map((file) => {
      const gcpVersion = new GcpVersion(file.name, file.bucket, file.md5Hash);
      return gcpVersion.toRemoteVersion();
    });
    return new RemoteVersionList(remoteVersions);
  }

  async rawFiles() {
    const filesPrefix = `${prefix}/${this.releaseType}/${this.osType}/`;
    return this.gcpStorage.getFiles({ prefix: filesPrefix });
  }

  static create(releaseType = 'dev', osType = 'Darwin', proxyConfig?: {}) {
    const gcpStorage = GcpStorage.create(bucketName, proxyConfig);
    return new GcpList(gcpStorage, osType, releaseType);
  }
}
