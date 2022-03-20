import { Version } from './version';

export class RemoteVersion extends Version {
  constructor(
    public version: string,
    public url: string,
    public md5Hash: string,
    public releaseDate: Date,
    public releaseType: string[]
  ) {
    super(version);
  }
}
