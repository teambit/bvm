import fetch from 'node-fetch';
import { getAgent } from '@teambit/toolbox.network.agent';


export class GcpStorage {
  constructor(
    private bucketName: string,
    private proxyConfig?: {},
    private storageAPI = 'https://storage.googleapis.com'
  ) {}

  async getFiles(opts: { prefix: string }) {
    const agent = getAgent(this.storageAPI, this.proxyConfig);
    const res = await fetch(
      `${this.storageAPI}/storage/v1/b/${this.bucketName}/o?prefix=${opts.prefix}`,
      {
        agent,
      }
    );
    const json = await res.json();
    return json.items;
  }

  static create(bucketName: string, proxyConfig?: {}) {
    return new GcpStorage(bucketName, proxyConfig);
  }
}
