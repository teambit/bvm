import { RemoteVersionList } from "@teambit/bvm.list.api";
import { Storage, Bucket } from "@google-cloud/storage";
import { Version } from "./version";

export class RemoteVersions {
  constructor(private bucket: Bucket, private prefix = "versions") {}

  async list(releaseType = "dev") {
    const prefix = `${this.prefix}/${releaseType}/bit-`;
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map((file) => {
      const version = new Version(file.metadata.name, file.bucket.name);
      return version.toObject();
    });
  }

  static create(bucketName = "bvm.bit.dev") {
    return new RemoteVersions(new Storage().bucket(bucketName));
  }
}
