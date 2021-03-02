import type {CommandModule, Argv} from 'yargs';

export class UpgradeCmd implements CommandModule {
  aliases = ['u', 'upgrade'];
  describe = 'install latest bit version from the server, update the current version, and delete the previous installed version';
  command = [
    'upgrade'
  ];
  builder(yargs: Argv) {
    yargs
    .example('$0 upgrade', 'install latest bit version from the server, update the current version, and delete the previous installed version')
    return yargs;
  }
  handler(args) {
    return console.log(`run upgrade command`);
  };
}

export const command =  new UpgradeCmd();