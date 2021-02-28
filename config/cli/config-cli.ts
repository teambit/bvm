import type {CommandModule, Argv} from 'yargs';
import {Config} from '@teambit/bvm.config.api';

const config = Config.load();

export class ConfigCmd implements CommandModule {
  aliases = ['c', 'config'];
  describe = 'configure bvm';
  command = [
    'config'
  ];
  builder(yargs: Argv) {
    yargs
    .option({
      persisted: {
        describe: 'show all keys stored in the config file (no defaults)',
        type: 'boolean'
      }
    })
    .option({
      path: {
        describe: 'show config file path location',
        type: 'boolean',
        conflicts: ['persisted']
      }
    })
    .example('$0 config', 'list all configured keys')
    .example('$0 config --persisted', 'show all keys stored in the config file (no defaults)')
    .example('$0 config --path', 'show config file path location')
    return yargs;
  }
  async handler(args) {
    if (args.path){
      console.log(config.path());
      return;
    }
    const list = config.list(args.persisted);
    console.log(list);
    return console.log(`run config command with remote`);
  };
}

export const command =  new ConfigCmd();