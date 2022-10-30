import { ReleaseType } from '../gcp';
import { Version } from './version';

export class LocalVersion extends Version {
  constructor(public version: string, public path: string, releaseType?: ReleaseType){
    super(version, releaseType);
  }
}