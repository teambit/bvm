import Table from 'tty-table';
import { RemoteVersion } from '../version';
import { VersionList } from './version-list';

export class RemoteVersionList extends VersionList {
  constructor(public entries: RemoteVersion[]) {
    super(entries);
  }

  toTable() {
    const options = {
      borderStyle: 'solid',
      paddingBottom: 0,
      headerAlign: 'center',
      align: 'left',
      headerColor: 'cyan',
    };

    const versions = VersionList.sortList<RemoteVersion>(this.entries);
    const headers = [
      {
        value: 'version',
        item: 'version',
        width: 35,
      },
      {
        value: 'stable',
        item: 'stable',
        width: 8,
        formatter: function (value) {
          if (value == true) return this.style(value, 'green');
          return 'false';
        },
      },
    ];

    // @ts-ignore
    const table = new Table(headers, versions, options);
    return table.render();
  }

  stableVersions() {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries);
    const stableVersions = sorted.filter((version) => version.stable);
    return new RemoteVersionList(stableVersions);
  }

  sortBySemver(order: 'asc' | 'desc' = 'desc'): RemoteVersionList {
    const sorted = VersionList.sortList<RemoteVersion>(this.entries, order);
    return new RemoteVersionList(sorted);
  }
}
