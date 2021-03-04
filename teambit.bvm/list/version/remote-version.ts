import {Version} from './version';

export class RemoteVersion extends Version {
  constructor(public version: string, public url: string){
    super(version);
  }
}