import { Version } from '../version';
import semver from 'semver';
import {desc as semverSortDesc, asc as semverSortAsc} from 'semver-sort';

export class VersionList {
  constructor(public entries: Version[]){};

  latest(): Version {
    const sorted = this.sortBySemver('desc');
    return sorted.entries[0];
  }

  stable(): Version | undefined {
    const sorted = this.sortBySemver('desc');
    return sorted.entries.find(version => version.releaseType === 'stable');
  }

  find(version: string): Version | undefined {
    return this.entries.find(entry => entry.version === version);
  }

  toVersionsStringArray(){
    return this.entries.map(entry => entry.version);
  }

  toMap(){
    return new Map(this.entries.map(e => [e.version, e.releaseType]));
  }

  sortBySemver(order: 'asc' | 'desc' = 'desc'): VersionList {
    let sorted = VersionList.sortList(this.entries, order);   
    return new VersionList(sorted)
  }

  static sortList<T extends Version>(list: T[], order: 'asc' | 'desc' = 'desc'): T[] {
    let sorted;
    if (order === 'asc'){
      sorted = list.sort((entry1, entry2) => {
        return semver.compare(entry1.version, entry2.version);
      })
    } else {
      sorted = list.sort((entry1, entry2) => {
        return semver.rcompare(entry1.version, entry2.version);
      })
    }
    return sorted;
  }

}