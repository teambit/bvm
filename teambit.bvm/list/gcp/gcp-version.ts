import {RemoteVersion} from '../version';

export class GcpVersion {
  constructor(
    private fileName: string,
    private host: string,
    private protocol = "https"
  ) {}

  get version() {
    return this.fileName
      .split("/")[4]
      .replace(/\.[^/.]+$/, "")
      .replace(/\.[^/.]+$/, "")
      .split("-")[1];
  }

  get url() {
    return `${this.protocol}://${this.host}/${this.fileName}`;
  }

  toRemoteVersion(): RemoteVersion {
    return new RemoteVersion(this.version, this.url);
  }

  toObject() {
    return {
      url: this.url,
      version: this.version,
    };
  }
}
