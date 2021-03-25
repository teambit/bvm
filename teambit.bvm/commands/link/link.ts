import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import {linkAll, linkOne, LinkResult} from '@teambit/bvm.link';

export class LinkCmd implements CommandModule {
  aliases = ['link'];
  describe = 'link binaries from path';
  command = [
    'link [name] [bit-version]'
  ];
  builder(yargs: Argv) {
    yargs.positional('name', {
      describe: 'name of the link',
      type: 'string'
    })
    .positional('bit-version', {
      describe: 'version to link',
      type: 'string',
      implies: ['name']
    })
    .example('$0 link', 'link all names to versions')
    .example('$0 link bit175 1.7.5', 'link bit175 to version 1.7.5 of bit')
    return yargs;
  }
  async handler(args) {
    let results;
    if (!args.name){
      results = await linkAll();
    } else {
      results = [await linkOne(args.name, args.bitVersion, true)]
    }
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

export const command =  new LinkCmd();