import { Storage, Bucket, GetFilesOptions } from "@google-cloud/storage";

export class GcpStorage {
  constructor(private bucket: Bucket) {}

  async getFiles(opts: GetFilesOptions) {
    return this.bucket.getFiles(opts);
  }

  static create(bucketName: string) {
    return new GcpStorage(new Storage().bucket(bucketName));
  }
}
