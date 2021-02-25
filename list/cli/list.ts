import type {CommandModule, Argv} from 'yargs';
import {listRemote} from '@teambit/bvm.list.api';

export class ListCmd implements CommandModule {
  aliases = ['l', 'list'];
  describe = 'list installed bit versions';
  command = [
    'list'
  ];
  builder(yargs: Argv) {
    yargs
    .option({
      remote: {
        alias: ['r'],
        describe: 'show versions exist in the remote server',
        default: false,
        type: 'boolean'
      }
    })
    .example('$0 list', 'show all installed versions')
    .example('$0 list --remote', 'show all versions available for install')
    return yargs;
  }
  async handler(args) {
    if (args.remote){
      const list = await listRemote();
      console.log(list);
      return;
    }
    return console.log(`run list command with remote ${args.remote}`);
  };
}

export const command =  new ListCmd();