import type {CommandModule, Argv} from '@types/yargs';
import { type } from 'os';

export class InstallCmd implements CommandModule {
  aliases = ['i', 'install'];
  describe = 'install command';
  command = [
    'install [version]'
  ];
  builder(yargs: Argv) {
    yargs.positional('version', {
      describe: 'version to install',
      type: 'string',
      default: 'latest'
    })
    .option({
      replace: {
        describe: 'replace current version',
        default: true,
        type: 'boolean'
      }
    })
    return yargs;
  }
  handler(args) {
    return console.log(`run install command with version ${args.version}`);
  };
}

export const command =  new InstallCmd();