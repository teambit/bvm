import Table from 'tty-table';
import type { CommandModule, Argv } from 'yargs';
import { listRemote, listLocal, RemoteVersionList } from '@teambit/bvm.list';
import { listLocalBitx, listRemoteBitx, BitxRemoteVersion } from '@teambit/bvm.bitx';
import { Config } from '@teambit/bvm.config';

export class ListCmd implements CommandModule {
  aliases = ['l', 'list'];
  describe = 'list installed bit versions';
  command = ['list'];
  static toTable(list: RemoteVersionList) {
    const options = {
      borderStyle: 'solid',
      paddingBottom: 0,
      headerAlign: 'center',
      align: 'left',
      headerColor: 'cyan',
    };
    const headers = [
      {
        value: 'version',
        item: 'version',
        width: 10,
      },
      {
        value: 'url',
        item: 'url',
        width: 70,
        // formatter: function (value) {
        //   if (value == true) return this.style(value, 'green');
        //   return 'false';
        // },
      },
      { value: 'released', item: 'released' },
      { value: 'releaseType', item: 'releaseType', alias: 'release-type', formatter: formatStableGreen},
      // {
      //   value: 'md5Hash',
      //   item: 'md5Hash',
      //   width: 20,
      // },
      // {
      //   value: 'stable',
      //   item: 'stable',
      //   width: 8,
      //   formatter: function (value) {
      //     if (value == true) return this.style(value, 'green');
      //     return 'false';
      //   },
      // },
    ];

    // @ts-ignore
    const table = new Table(headers, list.entries, options);
    return table.render();
  }

  builder(yargs: Argv) {
    yargs
      .option({
        next: {
          alias: ['bitx'],
          describe: 'list bitx (the next Bit CLI) versions instead of bit versions',
          default: false,
          type: 'boolean',
        },
        remote: {
          alias: ['r'],
          describe: 'show versions exist in the remote server',
          default: false,
          type: 'boolean',
        },
        limit: {
          alias: ['l'],
          describe: 'limit the number shown bit version',
          default: 20,
          type: 'number',
        },
        os: {
          describe: 'override the os type',
          type: 'string',
          choices: ['linux', 'darwin', 'win'],
        },
        arch: {
          describe: 'override the arch type',
          type: 'string',
          choices: ['x64', 'arm64'],
        },
      })
      .example('$0 list', 'show all installed versions')
      .example('$0 list --remote', 'show all versions available for install')
      .example('$0 list --next', 'show installed bitx (the next Bit CLI) versions')
      .example('$0 list --next --remote', 'show bitx versions available for install');
    return yargs;
  }
  async handler(args) {
    if (args.next) {
      await listNextBit(args);
      return;
    }
    if (args.remote) {
      const list = await listRemote({ 'limit': args['limit'], 'os': args['os'], 'arch': args['arch'] });
      console.log(ListCmd.toTable(list));
      return;
    }
    const list = await listLocal();
    console.log(localListOutput(list.toVersionsStringArray()));
    return;
  }
}

export const command = new ListCmd();

async function listNextBit(args) {
  if (args.remote) {
    const versions = await listRemoteBitx(args.limit);
    console.log(bitxRemoteTable(versions));
    return;
  }
  const versions = (await listLocalBitx()).toVersionsStringArray();
  if (!versions.length) {
    console.log('bitx is not installed, use "bvm install --next" to install it');
    return;
  }
  const linked = Config.load().getBitxLinkVersion();
  console.log(versions.map((version) => (version === linked ? `${version} (linked)` : version)).join('\n'));
}

function bitxRemoteTable(versions: BitxRemoteVersion[]) {
  const headers = [
    { value: 'version', item: 'version', width: 20 },
    { value: 'released', item: 'released', width: 30 },
    { value: 'tags', item: 'tags', width: 20 },
  ];
  const rows = versions.map((version) => ({ ...version, released: version.released ?? '', tags: version.tags.join(', ') }));
  // @ts-ignore
  const table = new Table(headers, rows, {
    borderStyle: 'solid',
    paddingBottom: 0,
    headerAlign: 'center',
    align: 'left',
    headerColor: 'cyan',
  });
  return table.render();
}

function localListOutput(versions: string[]): string {
  if (!versions || !versions.length) {
    return 'there are no installed version, use bvm install to install new versions';
  }
  return versions.join('\n');
}

function formatStableGreen(value: string): string {
  return value === 'stable' ? this.style(value, "green", "bold") : value
}