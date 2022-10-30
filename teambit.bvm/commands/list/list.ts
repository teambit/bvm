import Table from 'tty-table';
import type { CommandModule, Argv } from 'yargs';
import { listRemote, listLocal, RemoteVersionList } from '@teambit/bvm.list';

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
      .example('$0 list --remote', 'show all versions available for install');
    return yargs;
  }
  async handler(args) {
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

function localListOutput(versions: string[]): string {
  if (!versions || !versions.length) {
    return 'there are no installed version, use bvm install to install new versions';
  }
  return versions.join('\n');
}

function formatStableGreen(value: string): string {
  return value === 'stable' ? this.style(value, "green", "bold") : value
}