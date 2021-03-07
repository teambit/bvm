import type {CommandModule, Argv} from 'yargs';
import {removeVersions, removeAll, RemoveResults} from '@teambit/bvm.remove';
import { BvmError } from '@teambit/bvm.error';
import chalk from 'chalk';
import ora from 'ora';

const loader = ora();
export class RemoveCmd implements CommandModule {
  aliases = ['r', 'remove'];
  describe = 'remove installed bit versions';
  command = [
    'remove [versions..]'
  ];
  builder(yargs: Argv) {
    yargs.positional('versions', {
      describe: 'bit versions to remove'
    })
    .option({
      all: {
        alias: ['a'],
        describe: 'remove all installed versions',
        default: false,
        type: 'boolean'
      },
      'keep-versions': {
        describe: 'keep specific versions',
        array: true,
        type: 'string',
        requiresArg: true
      },
      'keep-latest-versions': {
        describe: 'keep the last <number> of versions',
        type: 'number',
        requiresArg: true
      }
    })
    .example('$0 remove 0.0.200', 'remove version 0.0.200 of bit')
    .example('$0 remove latest', 'remove the latest version that already installed')
    .example('$0 remove --all', 'remove all installed versions')
    .example('$0 remove --all --keep-versions 0.0.200', 'remove all installed versions except v0.0.200')
    .example('$0 remove --all --keep-latest-versions 3', 'remove all installed versions except the last 3 installed versions')
    return yargs;
  }
  async handler(args) {
    let res;
    const loaderText = 'removing versions from the file system';
    if (args.versions && args.versions.length){
      loader.start(loaderText);
      res = await removeVersions(args.versions);
      loader.stop();
      return printOutput(res);
    } 
    if (args.all){
      loader.start(loaderText);
      res = await removeAll(args.keepVersions, args.keepLatestVersions);
      loader.stop();
      return printOutput(res);
    }
    throw new BvmError('no versions marked to be removed');
  };
}

export const command =  new RemoveCmd();

function formatOutput(removeResults: RemoveResults): string {
  const removedOutput = removeResults.removedVersions.length ? `the following versions removed from the file system: ${chalk.cyan(removeResults.removedVersions)}`: undefined;
  const missingOutput = removeResults.missingVersions.length ? `the following versions are missing in the file system: ${chalk.cyan(removeResults.missingVersions)}`: undefined;
  return [removedOutput, missingOutput].filter(msg => msg).join('\n');
}

function printOutput(removeResults: RemoveResults): string {
  const output = formatOutput(removeResults);
  console.log(output);
  return output;
}