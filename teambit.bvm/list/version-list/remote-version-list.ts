import {RemoteVersion } from '../version';
import {VersionList} from './version-list';

export class RemoteVersionList extends VersionList {
  constructor(public entries: RemoteVersion[]){
    super(entries);
  };

  sortBySemver(order: 'asc' | 'desc' = 'desc'): RemoteVersionList {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries, order);
    return new RemoteVersionList(sorted);
  }
}