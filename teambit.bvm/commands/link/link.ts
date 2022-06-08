import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import {linkAll, linkOne, LinkResult} from '@teambit/bvm.link';
import { renderPathExtenderReport } from '@teambit/bvm.reporter';

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
    .option({
      updatePath: {
        describe: 'add the bvm directory to the system PATH',
        default: true,
        type: 'boolean',
      }
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
      results = await linkAll({ updatePath: args.updatePath });
    } else {
      results = [await linkOne(args.name, args.bitVersion, { addToConfig: true, updatePath: args.updatePath })]
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
  links.push(`successfully linked binaries\n`)

  const pathExtenderReport = linkResults.find((result) => result.pathExtenderReport)?.pathExtenderReport
  if (pathExtenderReport) {
    const output = renderPathExtenderReport(pathExtenderReport)
    if (output) {
      links.push(output)
    }
  }
  return links.filter(msg => msg).join('\n');
}

function printOutput(linkResults: LinkResult[], verbose = false): string {
  const output = formatOutput(linkResults, verbose);
  console.log(output);
  return output;
}

export const command =  new LinkCmd();
