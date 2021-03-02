import type {CommandModule, Argv} from 'yargs';
import {upgrade} from '@teambit/bvm.upgrade.api';
import chalk from 'chalk';
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
  async handler(args) {
    const upgradeResults = await upgrade();
    return console.log(`current is now linked to version ${chalk.green(upgradeResults.installedVersion)} in path ${chalk.green(upgradeResults.versionPath)}`);
  };
}

export const command =  new UpgradeCmd();