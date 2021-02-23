#!/usr/bin/env node
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import {installCmd} from '@teambit/bvm.cli.install';

yargs(hideBin(process.argv))
  .usage('Usage: $0 <cmd> [options]') // usage string of application.
  .version()
  .option('h', {
    alias: 'help',
    description: 'display help message'
  })
  .alias('v', 'version')
  .command(installCmd)
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  })
  .example('$0 upgrade', 'install the latest version of bit')
  .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
  .epilog('for more information visit https://harmony-docs.bit.dev/docs/getting-started/install-bit')
  .argv