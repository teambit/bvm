import {Version} from './version';

export class LocalVersion extends Version {
  constructor(public version: string, public path: string){
    super(version);
  }
}