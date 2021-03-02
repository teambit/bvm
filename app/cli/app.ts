#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {installCmd} from '@teambit/bvm.install.cli';
import {removeCmd} from '@teambit/bvm.remove.cli';
import {listCmd} from '@teambit/bvm.list.cli';
import {upgradeCmd} from '@teambit/bvm.upgrade.cli';
import {configCmd} from '@teambit/bvm.config.cli';
import {linkCmd} from '@teambit/bvm.link.cli';

yargs(hideBin(process.argv))
  .scriptName('bvm')
  .usage('Usage: $0 <cmd> [options]') // usage string of application.
  .version()
  .option('h', {
    alias: 'help',
    description: 'display help message'
  })
  .alias('v', 'version')
  .command(upgradeCmd)
  .command(installCmd)
  .command(listCmd)
  .command(linkCmd)
  .command(removeCmd)
  .command(configCmd)
  .example('$0 upgrade', 'install the latest version of bit')
  .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
  .example('$0 list', 'show all installed versions')
  .example('$0 remove all --keep-latest-versions 3', 'remove all installed versions except the last 3 installed versions')
  // Show help when there is no args
  .demandCommand(1, '')
  .epilog('for more information visit https://harmony-docs.bit.dev/docs/getting-started/install-bit')
  .argv