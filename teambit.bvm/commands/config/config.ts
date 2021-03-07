import type {CommandModule, Argv} from 'yargs';
import {Config} from '@teambit/bvm.config';
import { BvmError } from '@teambit/bvm.error';

const config = Config.load();

export class ConfigCmd implements CommandModule {
  aliases = ['c', 'config'];
  describe = 'configure bvm';
  command = [
    'config [sub-command] [key] [value]'
  ];
  builder(yargs: Argv) {
    yargs.positional('sub-command', {
      choices: ['set', 'get', 'del'],
      type: 'string',
      describe: 'sub command'
    })
    .positional('key', {
      type: 'string',
      describe: 'key to get/set/delete'
    })
    .option({
      persisted: {
        describe: 'show all keys stored in the config file (no defaults)',
        type: 'boolean',
        conflicts: ['sub-command', 'key', 'value']
      }
    })
    .option({
      path: {
        describe: 'show config file path location',
        type: 'boolean',
        conflicts: ['persisted', 'sub-command', 'key', 'value']
      }
    })
    .example('$0 config', 'list all configured keys')
    .example('$0 config --persisted', 'show all keys stored in the config file (no defaults)')
    .example('$0 config --path', 'show config file path location')
    .example('$0 config get BVM_DIR', 'show the root bvm dir')
    .example('$0 config set BVM_DIR some-path', 'set the root bvm dir to be some-path')
    .example('$0 config del BVM_DIR', 'delete the root bvm dir from config (will fallback to default location)')
    return yargs;
  }
  async handler(args) {
    if (args.subCommand){
      return handleSubCommand(args);
    }
    if (args.path){
      console.log(config.path());
      return;
    }
    const list = config.list(args.persisted);
    console.log(list);
  };
}

function handleSubCommand(args: any): void {
  switch (args.subCommand) {
    case 'get':{
      if (!args.key) throw new BvmError('must provide a key');
      const val = config.get(args.key);
      console.log(val);
      return;
    }
    case 'set':{
      if (!args.key) throw new BvmError('must provide a key');
      if (!args.value) throw new BvmError('must provide a value');
      config.set(args.key, args.value);
      console.log('set successfully');
      return;
    }
    case 'del':{
      if (!args.key) throw new BvmError('must provide a key');
      const val = config.del(args.key);
      console.log('deleted successfully');
      return;
    }
    default:
      throw new BvmError(`sub command ${args.subCommand} is invalid`);
  }
}

export const command =  new ConfigCmd();