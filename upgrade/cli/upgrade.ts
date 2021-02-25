import type {CommandModule, Argv} from 'yargs';

export class UpgradeCmd implements CommandModule {
  aliases = ['u', 'upgrade'];
  describe = 'install latest bit version from the server and delete the previous installed version';
  command = [
    'list'
  ];
  builder(yargs: Argv) {
    yargs
    .example('$0 upgrade', 'install latest bit version from the server and delete the previous installed version')
    return yargs;
  }
  handler(args) {
    return console.log(`run list command with remote ${args.remote}`);
  };
}

export const command =  new UpgradeCmd();