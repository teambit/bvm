import { RemoteVersion } from '../version';
import { ReleaseType } from './gcp-list';

export class GcpVersion {
  constructor(
    public version: string,
    private fileName: string,
    private host: string,
    private md5hash: string,
    private timeCreated: string,
    private metadata: { [key: string]: string },
    private protocol = 'https',
    private releaseType?: ReleaseType
  ) { }

  get url() {
    return `${this.protocol}://${this.host}/${this.fileName}`;
  }

  /** is version is stable version  */
  get calculatedReleaseType() {
    const type = this.metadata?.stable ? ReleaseType.STABLE : this.releaseType ?? ReleaseType.NIGHTLY; // TODO @giladshoam what's the metadata doing here? Can we get rid of it and just use releaseType when storing the version?
    return type;
  }

  toRemoteVersion(): RemoteVersion {
    return new RemoteVersion(this.version, this.url, this.md5hash, this.timeCreated, this.calculatedReleaseType);
  }

  toObject() {
    return {
      url: this.url,
      version: this.version,
    };
  }
}
