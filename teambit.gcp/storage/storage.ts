import fetch from 'node-fetch';
import { getAgent } from '@teambit/toolbox.network.agent';
import { Client as MinioClient, BucketItem, BucketStream } from 'minio';


export class GcpStorage {
  private minioClient: MinioClient

  constructor(
    private bucketName: string,
    private proxyConfig?: {},
    private storageAPI = 'storage.googleapis.com',
    private accessKey?: string,
    private secretKey?: string
  ) {}

  private getMinioClient() {
    if (this.minioClient) return this.minioClient;
    if (!this.accessKey || !this.secretKey) {
      throw new Error('accessKey and secretKey are required for GCP storage');
    }
    this.minioClient = new MinioClient({
      endPoint: this.storageAPI,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });
    return this.minioClient;
  }

  private getStorageAPIUrl() {
    if (!this.storageAPI.startsWith('https:')){
      return `https://${this.storageAPI}`;
    }
    return this.storageAPI;
  }

  async getFiles(opts: { prefix: string }) {
    const agent = getAgent(this.getStorageAPIUrl(), this.proxyConfig || {});
    const res = await fetch(
      `${this.getStorageAPIUrl()}/storage/v1/b/${this.bucketName}/o?prefix=${opts.prefix}`,
      {
        agent,
      }
    );
    const json = await res.json();
    return json.items;
  }

  async putFile(objectName: string, content: string | Buffer, metadata: Record<string, any> = {}) {
    const size = content.length;
    const minioClient = this.getMinioClient();
    const res = await minioClient.putObject(this.bucketName, objectName, content, size, metadata);
    return res;
  }

  static create(bucketName: string, proxyConfig?: {}, accessKey?: string, secretKey?: string) {
    return new GcpStorage(bucketName, proxyConfig, undefined, accessKey, secretKey);
  }
}
