import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import { Config } from "@teambit/bvm.config";
import { linkDefault, LinkResult} from '@teambit/bvm.link';

export class UseCmd implements CommandModule {
  aliases = ['use'];
  describe = 'switch used bit version';
  command = [
    'use [bit-version]'
  ];
  builder(yargs: Argv) {
    yargs.positional('bit-version', {
      describe: 'version to use',
      type: 'string'
    })
    .example('$0 use', 'show currently used version of bit')
    .example('$0 use 1.7.5', 'switch to version 1.7.5 of bit')
    .example('$0 use stable', 'switch to latest installed stable version')
    .example('$0 use latest', 'switch to latest installed version')
    return yargs;
  }
  async handler(args) {
    let results;
    if (!args.bitVersion) {
      const config = Config.load();
      const currentVersion = config.getDefaultLinkVersion();
      return console.log(chalk.cyan(`currently use ${currentVersion} version`));
    }
    results = [await linkDefault(args.bitVersion, {addToConfig: true})];
    printOutput(results, args.verbose);
    return;
  };
}

function formatOutput(linkResults: LinkResult[], verbose = false): string {
  const links = linkResults.map(result => {
    const linkTarget = verbose ? chalk.cyan(`(${result.generatedLink.target})`) : '';
    const linkSource = verbose ? chalk.cyan(`(${result.generatedLink.source})`) : '';

    return(`name ${chalk.green(result.linkName)}${linkTarget} points to version ${chalk.green(result.version)}${linkSource}`);
  });

  const summery = `successfully linked binaries`;
  return [links, summery].filter(msg => msg).join('\n');
}

function printOutput(linkResults: LinkResult[], verbose = false): string {
  const output = formatOutput(linkResults, verbose);
  console.log(output);
  return output;
}

export const command =  new UseCmd();