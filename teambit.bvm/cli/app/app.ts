#!/usr/bin/env node
import yargs from 'yargs/yargs';
import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import {installCmd} from '@teambit/bvm.commands.install';
import {removeCmd} from '@teambit/bvm.commands.remove';
import {listCmd} from '@teambit/bvm.commands.list';
import {upgradeCmd} from '@teambit/bvm.commands.upgrade';
import {configCmd} from '@teambit/bvm.commands.config';
import {linkCmd} from '@teambit/bvm.commands.link';
import {useCmd} from '@teambit/bvm.commands.use';
import {versionCmd, showAllVersions} from '@teambit/bvm.commands.version';
import {releaseCmd} from '@teambit/bvm.commands.release';
import {localVersionCmd} from './local-version';

let argv;
async function main() {

  argv = await yargs(hideBin(process.argv))
    .scriptName("bvm")
    .usage("Usage: $0 <cmd> [options]") // usage string of application.
    .version()
    .option("h", {
      alias: "help",
      description: "display help message",
    })
    .option("verbose", {
      description: "show verbose output",
    })
    .alias("v", "version")
    // TODO: this is a new feature merged recently- https://github.com/yargs/yargs/commit/1a1e2d554dca3566bc174584394419be0120d207
    // TODO: once it's officially released, uncomment, and test it with bvm -v | --version (should be part of v17.0.0 of yargs)
    // TODO: add back once it supports async function see here - https://github.com/yargs/yargs/issues/1955
    // .showVersion(showVersion)
    .command(versionCmd)
    .command(localVersionCmd)
    .command(upgradeCmd)
    .command(installCmd)
    .command(listCmd)
    .command(linkCmd)
    .command(useCmd)
    .command(removeCmd)
    .command(configCmd)
    .command(releaseCmd)
    .example(
      "$0 version",
      "show used (current) version, latest installed version and latest remote version (bit and bvm)"
    )
    .example("$0 upgrade", "install the latest version of bit")
    .example("$0 install 0.0.200", "install version 0.0.200 of bit")
    .example("$0 list", "show all installed versions")
    .example("$0 use 0.0.522", "switch to version 0.0522 of bit")
    .example(
      "$0 remove --all --keep-latest-versions 3",
      "remove all installed versions except the last 3 installed versions"
    )
    .completion()

    // Show help when there is no args
    .demandCommand(1, "")
    .wrap(yargs().terminalWidth())
    .epilog(
      "for more information visit https://harmony-docs.bit.dev/docs/getting-started/install-bit"
    )
    .fail(handleError).argv;

  function handleError(msg, err, yargs) {
    const verbose = process.argv.includes('--verbose');
    if (!msg && !err) {
      return yargs.showHelp();
    }
    console.log(chalk.red(err?.message || msg));

    if (!err?.bvm || verbose) {
      console.log(err?.stack);
    }
  }

  async function showVersion(currentVersion: string) {
    const allVersions = await showAllVersions({ overrideLocalVersion: currentVersion, includeRemote: true });
    console.log(allVersions);
  }
}

main().then().catch((e) => {})
