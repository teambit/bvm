import { ReleaseType } from '../gcp';
import { RemoteVersion } from '../version';
import { VersionList } from './version-list';

export class RemoteVersionList extends VersionList {
  constructor(public entries: RemoteVersion[]) {
    super(entries);
  }

  versionsByReleaseType(releaseTypes: ReleaseType[]) {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries);
    const requestedVersions = sorted.filter((version) => releaseTypes.some(rt => rt as ReleaseType === version.releaseType as ReleaseType));
    return new RemoteVersionList(requestedVersions);
  }

  slice(limit: number = 20, offset: number = 0): RemoteVersionList {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries);
    return new RemoteVersionList(sorted.slice(offset, limit));
  }

  sortBySemver(order: 'asc' | 'desc' = 'desc'): RemoteVersionList {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries, order);
    return new RemoteVersionList(sorted);
  }
}
