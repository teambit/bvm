import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallResults} from '@teambit/bvm.install';
import {releaseSetCommand} from './set'
import chalk from 'chalk';

export class ReleaseCmd implements CommandModule {
  aliases = ['release'];
  describe = false as const;
  command = [
    'release'
  ];
  builder(yargs: Argv) {
    yargs
    .command(releaseSetCommand)
    .example('$0 release set', 'set a release metadata for a specific version')
    return yargs;
  }
  async handler(args) {
    throw new Error('must provide a sub-command');
  };
}

export const command =  new ReleaseCmd();

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
