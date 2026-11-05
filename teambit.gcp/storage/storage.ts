import fetch from 'node-fetch';
import { getAgent } from '@teambit/toolbox.network.agent';
import aws4 from 'aws4';

export type GcpStorageObject = {
  name: string;
  bucket: string;
  md5Hash: string;
  timeCreated: string;
  contentType: string;
  metadata: Record<string, string>;
};

export class GcpStorage {
  constructor(
    private bucketName: string,
    private proxyConfig?: {},
    private storageAPI = 'storage.googleapis.com',
    private accessKey?: string,
    private secretKey?: string
  ) {}

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
    const json = await res.json() as { items?: GcpStorageObject[] };
    return json.items ?? [];
  }

  /**
   * upload a file through the XML API of GCP storage, signed with the HMAC keys (AWS signature v4).
   * the metadata is sent as headers, e.g. Content-Type and Cache-Control.
   */
  async putFile(objectName: string, content: string | Buffer, metadata: Record<string, string> = {}): Promise<void> {
    if (!this.accessKey || !this.secretKey) {
      throw new Error('accessKey and secretKey are required for GCP storage');
    }
    const url = new URL(`${this.getStorageAPIUrl()}/${this.bucketName}/${objectName}`);
    const signed = aws4.sign(
      {
        host: url.host,
        path: url.pathname,
        method: 'PUT',
        service: 's3',
        region: 'auto',
        headers: { ...metadata },
        body: content,
      },
      { accessKeyId: this.accessKey, secretAccessKey: this.secretKey }
    );
    const res = await fetch(url.toString(), {
      method: 'PUT',
      headers: signed.headers as Record<string, string>,
      body: content,
      agent: getAgent(url.toString(), this.proxyConfig || {}),
    });
    if (!res.ok) {
      throw new Error(`failed uploading ${objectName} to ${this.bucketName}: ${res.status} ${await res.text()}`);
    }
  }

  static create(bucketName: string, proxyConfig?: {}, accessKey?: string, secretKey?: string) {
    return new GcpStorage(bucketName, proxyConfig, undefined, accessKey, secretKey);
  }
}
