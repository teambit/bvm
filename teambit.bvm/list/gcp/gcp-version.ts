import { RemoteVersion } from '../version';

export class GcpVersion {
  constructor(
    private fileName: string,
    private host: string,
    private md5hash: string,
    private timeCreated: string,
    private metadata: { [key: string]: string },
    private protocol = 'https'
  ) { }

  get version() {
    return this.fileName
      .split('/')[4]
      .replace(/\.[^/.]+$/, '')
      .replace(/\.[^/.]+$/, '')
      .split('-')[1];
  }

  get url() {
    return `${this.protocol}://${this.host}/${this.fileName}`;
  }

  /** is version is stable version  */
  get stable() {
    if (this.metadata?.stable) return true;
    return false;
  }

  toRemoteVersion(): RemoteVersion {
    return new RemoteVersion(this.version, this.url, this.md5hash, this.timeCreated, this.stable);
  }

  toObject() {
    return {
      url: this.url,
      version: this.version,
    };
  }
}
