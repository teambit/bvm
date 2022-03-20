import { VersionManifestEntry } from './version-manifest-entry';

export class VersionManifest {
  constructor(readonly entries: VersionManifestEntry[]) {}
  filter() {
    return this.entries.filter;
  }

  byDate() {}
  byRealseType() {}
  byVersionId() {}

  sortByDate() {}

  toJson() {}

  static fromArray(entries: VersionManifestEntry[]) {}
  static fromJson() {}
}
