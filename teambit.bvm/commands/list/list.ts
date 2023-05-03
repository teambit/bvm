import { Table } from 'voici.js';
import type { CommandModule, Argv } from 'yargs';
import { listRemote, listLocal, RemoteVersionList } from '@teambit/bvm.list';

export class ListCmd implements CommandModule {
  aliases = ['l', 'list'];
  describe = 'list installed bit versions';
  command = ['list'];
  static toTable(list: RemoteVersionList): string {
    const entries: Array<{
      version: string;
      url: string;
      released: string;
      releaseType: string;
    }> = list.entries.map((entry) => {
      return {
        version: entry.version,
        url: entry.url,
        released: entry.released,
        releaseType: entry.releaseType,
      }
    });

    // TODO: bold for highlight, column widths
    const table = new Table(entries, {
      header: {
        width: 'auto',
        order: ['version', 'url', 'released', 'releaseType'],
        displayNames: {
          releaseType: 'release-type',
        }
      },
      body: {
        highlightCell: {
          textColor: 'green',
          func: (cell, _, col) => {
            // console.log(cell, _, col)
            return cell === "stable" && col === "releaseType"
          }
        }
      }
    });

    return table.toString();
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
