import { Version } from './version';

export class RemoteVersion extends Version {
  constructor(public version: string, public url: string, public md5Hash: string, public released: string, public stable: boolean) {
    super(version);
  }
}
