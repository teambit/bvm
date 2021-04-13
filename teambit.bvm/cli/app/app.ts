#!/usr/bin/env node
import yargs from "yargs/yargs";
import chalk from "chalk";
import { hideBin } from "yargs/helpers";
import { installCmd } from "@teambit/bvm.commands.install";
import { removeCmd } from "@teambit/bvm.commands.remove";
import { listCmd } from "@teambit/bvm.commands.list";
import { upgradeCmd } from "@teambit/bvm.commands.upgrade";
import { configCmd } from "@teambit/bvm.commands.config";
import { linkCmd } from "@teambit/bvm.commands.link";
import { versionCmd, showAllVersions } from "@teambit/bvm.commands.version";
import { localVersionCmd } from "./local-version";

const argv = yargs(hideBin(process.argv))
  .scriptName("bvm")
  .usage("Usage: $0 <cmd> [options]") // usage string of application.
  .version()
  .completion()
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
  // .showVersion(showVersion)
  .command(versionCmd)
  .command(localVersionCmd)
  .command(upgradeCmd)
  .command(installCmd)
  .command(listCmd)
  .command(linkCmd)
  .command(removeCmd)
  .command(configCmd)
  .example(
    "$0 version",
    "show used (current) version, latest installed version and latest remote version (bit and bvm)"
  )
  .example("$0 upgrade", "install the latest version of bit")
  .example("$0 install 0.0.200", "install version 0.0.200 of bit")
  .example("$0 list", "show all installed versions")
  .example(
    "$0 remove all --keep-latest-versions 3",
    "remove all installed versions except the last 3 installed versions"
  )
  // Show help when there is no args
  .demandCommand(1, "")
  .epilog(
    "for more information visit https://harmony-docs.bit.dev/docs/getting-started/install-bit"
  )
  .fail(handleError).argv;

function handleError(msg, err, yargs) {
  if (!msg && !err) {
    return yargs.showHelp();
  }
  console.log(chalk.red(err?.message || msg));

  if (!err?.bvm || argv.verbose) {
    console.log(err?.stack);
  }
}

async function showVersion(currentVersion: string) {
  const allVersions = await showAllVersions({
    overrideLocalVersion: currentVersion,
    includeRemote: true,
  });
  console.log(allVersions);
}
