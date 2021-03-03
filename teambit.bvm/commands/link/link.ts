import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import {linkAll, linkOne} from '@teambit/bvm.link';

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
      results = [await linkOne(args.name, args.bitVersion)]
    }
    results.map(result => {
      console.log(`name ${chalk.green(result.linkName)} points to version ${chalk.green(result.version)}`);
    })
    console.log(`successfully linked binaries`);
    return;
  };
}

export const command =  new LinkCmd();