#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {installCmd} from '@teambit/bvm.commands.install';
import {removeCmd} from '@teambit/bvm.commands.remove';
import {listCmd} from '@teambit/bvm.commands.list';
import {upgradeCmd} from '@teambit/bvm.commands.upgrade';
import {configCmd} from '@teambit/bvm.commands.config';
import {linkCmd} from '@teambit/bvm.commands.link';
import {versionCmd} from '@teambit/bvm.commands.version';

yargs(hideBin(process.argv))
  .scriptName('bvm')
  .usage('Usage: $0 <cmd> [options]') // usage string of application.
  .version()
  .option('h', {
    alias: 'help',
    description: 'display help message'
  })
  .alias('v', 'version')
  .command(versionCmd)
  .command(upgradeCmd)
  .command(installCmd)
  .command(listCmd)
  .command(linkCmd)
  .command(removeCmd)
  .command(configCmd)
  .example('$0 version', 'show used (current) version, latest installed version and latest remote version')
  .example('$0 upgrade', 'install the latest version of bit')
  .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
  .example('$0 list', 'show all installed versions')
  .example('$0 remove all --keep-latest-versions 3', 'remove all installed versions except the last 3 installed versions')
  // Show help when there is no args
  .demandCommand(1, '')
  .epilog('for more information visit https://harmony-docs.bit.dev/docs/getting-started/install-bit')
  .argv