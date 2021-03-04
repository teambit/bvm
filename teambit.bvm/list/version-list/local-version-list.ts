import {LocalVersion } from '../version';
import {VersionList} from './version-list';

export class LocalVersionList extends VersionList {
  constructor(public entries: LocalVersion[]){
    super(entries);
  };

  sortBySemver(order: 'asc' | 'desc' = 'desc'): LocalVersionList {
    const sorted = VersionList.sortList<LocalVersion>(this.entries, order);
    return new LocalVersionList(sorted);
  }
}