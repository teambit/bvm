import { GcpStorage } from '@teambit/gcp.storage';
import {GcpVersion} from './gcp-version';
import {RemoteVersionList} from '../version-list';

const bucketName = "bvm.bit.dev";
const prefix = "versions";

export class GcpList {
  constructor(private gcpStorage: GcpStorage) {}

  async list(releaseType = "dev"): Promise<RemoteVersionList> {
    const [files] = await this.rawFiles(releaseType);
    const remoteVersions = files.map((file) => {
      const gcpVersion = new GcpVersion(file.metadata.name, file.bucket.name);
      return gcpVersion.toRemoteVersion();
    });
    return new RemoteVersionList(remoteVersions);
  }

  async rawFiles(releaseType = "dev") {
    const filesPrefix = `${prefix}/${releaseType}/bit-`;
    return this.gcpStorage.getFiles({prefix: filesPrefix});
  }

  static create(releaseType = "dev") {
    const gcpStorage = GcpStorage.create(bucketName);
    return new GcpList(gcpStorage);
  }
}