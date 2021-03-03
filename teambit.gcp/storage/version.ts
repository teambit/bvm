export class Version {
  constructor(
    private fileName: string,
    private host: string,
    private protocol = "https"
  ) {}

  get version() {
    return this.fileName
      .split("/")[2]
      .replace(/\.[^/.]+$/, "")
      .replace(/\.[^/.]+$/, "")
      .split("-")[1];
  }

  get url() {
    return `${this.protocol}://${this.host}/${this.fileName}`;
  }

  toObject() {
    return {
      url: this.url,
      version: this.version,
    };
  }
}
