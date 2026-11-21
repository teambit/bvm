import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import {linkAll, linkAllBitx, linkBitx, linkOne, LinkResult} from '@teambit/bvm.link';
import { BvmError } from '@teambit/bvm.error';
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
      next: {
        alias: ['bitx'],
        describe: 'link bitx (the next Bit CLI) instead of bit. without a name, relinks only the bitx links',
        default: false,
        type: 'boolean',
      },
    })
    .option({
      'skip-update-path': {
        describe: "don't add the bvm directory to the system PATH",
        default: false,
        type: 'boolean',
      }
    })
    .option({
      'use-system-node': {
        describe: "use the Node.js installed on the system to run Bit CLI",
        default: false,
        type: 'boolean'
      }
    })
    .positional('bit-version', {
      describe: 'version to link',
      type: 'string',
      implies: ['name']
    })
    .example('$0 link', 'link all names to versions')
    .example('$0 link bit175 1.7.5', 'link bit175 to version 1.7.5 of bit')
    .example('$0 link --next bitx-alpha1 0.1.0-alpha.1', 'link bitx-alpha1 to version 0.1.0-alpha.1 of bitx (the next Bit CLI)')
    return yargs;
  }
  async handler(args) {
    let results;
    const linkOpts = {
      addToPathIfMissing: !args.skipUpdatePath,
      useSystemNode: args.useSystemNode,
    };
    if (args.next) {
      if (!args.name) {
        results = await linkAllBitx(linkOpts);
      } else if (!args.bitVersion) {
        throw new BvmError('a bitx version is required when linking bitx with a name');
      } else {
        results = [await linkBitx(args.name, args.bitVersion, { addToConfig: true, ...linkOpts })];
      }
      printOutput(results, args.verbose);
      return;
    }
    if (!args.name){
      results = await linkAll(linkOpts);
      // bitx links are relinked too, but a broken bitx installation must not fail relinking bit
      try {
        results.push(...(await linkAllBitx(linkOpts)));
      } catch (err: any) {
        console.log(chalk.yellow(`failed to relink bitx: ${err?.message}`));
      }
    } else {
      results = [await linkOne(args.name, args.bitVersion, {
        addToConfig: true,
        addToPathIfMissing: !args.skipUpdatePath,
        useSystemNode: args.useSystemNode,
      })]
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
