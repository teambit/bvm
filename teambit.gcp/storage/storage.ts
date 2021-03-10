import fetch from "node-fetch";

export class GcpStorage {
  constructor(
    private bucketName: string,
    private storageAPI = "https://storage.googleapis.com"
  ) {}

  async getFiles(opts: { prefix: string }) {
    const res = await fetch(`${this.storageAPI}/storage/v1/b/${this.bucketName}/o?prefix=${opts.prefix}`);
    const json = await res.json();
    return json.items;
  }

  static create(bucketName: string) {
    return new GcpStorage(bucketName);
  }
}
