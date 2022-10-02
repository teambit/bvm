import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallResults} from '@teambit/bvm.install';
import chalk from 'chalk';
import { updateReleaseEntry } from '@teambit/bvm.release';
import { Release } from '@teambit/bvm.list';

export class ReleaseSetCmd implements CommandModule {
  aliases = ['set'];
  describe = 'set release metadata for a specific version';
  command = [
    'set <bit-version>'
  ];
  builder(yargs: Argv) {
    yargs
    .option({
      'stable': {
        describe: "set the version as stable",
        type: 'boolean',
      }
    })
    .example('$0 set 0.0.800 --stable', 'set version 0.0.800 as stable')
    .example('$0 set 0.0.800 --stable false', 'set version 0.0.800 as not stable')
    return yargs;
  }
  async handler(args) {
    if (!args.bitVersion) throw new Error('must provide a version');
    if (args.stable === undefined) throw new Error('must provide stable flag');
    const result = await updateReleaseEntry(args.bitVersion, {stable: args.stable});
    printOutput(result);
  };
}

export const releaseSetCommand =  new ReleaseSetCmd();

function formatOutput(updateResult: Release): string {
  const stableText = updateResult.stable ? 'stable' : 'not stable';
  const text = `version ${chalk.green(updateResult.version)} is now ${chalk.green(stableText)}`;
  return text;
}

function printOutput(updateResult: Release): string {
  const output = formatOutput(updateResult);
  console.log(output);
  return output;
}
