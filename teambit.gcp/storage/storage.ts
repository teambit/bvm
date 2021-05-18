import fetch from 'node-fetch';
import { getAgent } from '@teambit/network.agent';


export class GcpStorage {
  constructor(
    private bucketName: string,
    private proxyConfig?: {},
    private storageAPI = 'https://storage.googleapis.com'
  ) {}

  async getFiles(opts: { prefix: string }) {
    const res = await fetch(`${this.storageAPI}/storage/v1/b/${this.bucketName}/o?prefix=${opts.prefix}`, {
      agent: getAgent(this.storageAPI, this.proxyConfig),
    });
    const json = await res.json();
    return json.items;
  }

  static create(bucketName: string, proxyConfig?: {}) {
    return new GcpStorage(bucketName, proxyConfig);
  }
}
