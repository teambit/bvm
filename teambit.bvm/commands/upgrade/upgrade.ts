import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallResults} from '@teambit/bvm.install';
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
    const upgradeResults = await installVersion('latest', {override: false, replace: true});
    return printOutput(upgradeResults);
  };
}

export const command =  new UpgradeCmd();

function formatOutput(upgradeResults: InstallResults): string {
  const replacedText = upgradeResults.previousCurrentVersion ? `upgraded from version ${chalk.green(upgradeResults.previousCurrentVersion)}`: undefined;
  const currentText = `current is now linked to version ${chalk.green(upgradeResults.installedVersion)} in path ${chalk.green(upgradeResults.versionPath)}`;

  return [replacedText, currentText].filter(msg => msg).join('\n');
}

function printOutput(upgradeResults: InstallResults): string {
  const output = formatOutput(upgradeResults);
  console.log(output);
  return output;
}