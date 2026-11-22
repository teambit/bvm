import type { CommandModule, Argv } from "yargs";
import { installVersion, InstallResults, InstallationMethods, InstallationMethod } from "@teambit/bvm.install";
import { removeVersions } from "@teambit/bvm.remove";
import { installBitx, removeBitxVersions, validateNoBitOnlyFlags } from "@teambit/bvm.bitx";
import chalk from "chalk";
import {
  getBvmLocalVersion,
  getBvmRemoteVersion,
  getNewerBvmAvailableOutput,
} from "@teambit/bvm.version";

export class UpgradeCmd implements CommandModule {
  aliases = ["u", "upgrade"];
  describe =
    "install latest bit version from the server, update the current version, and delete the previous installed version";
  command = ["upgrade"];
  builder(yargs: Argv) {
    yargs
      .option({
        next: {
          alias: ["bitx"],
          describe: 'upgrade bitx (the next Bit CLI) to the version of its dist-tag (default "next") instead of bit',
          default: false,
          type: "boolean",
        },
      })
      .option({
        "skip-update-path": {
          describe: "don't add the bvm directory to the system PATH",
          default: false,
          type: "boolean",
        },
      })
      .option({
        "use-system-node": {
          describe: "use the Node.js installed on the system to run Bit CLI",
          default: false,
          type: "boolean",
        },
      })
      .option({
        "skip-update-check": {
          describe: "skip checking for a newer version of BVM",
          default: false,
          type: "boolean",
        },
      })
      .option({
        'extract-method': {
          describe: 'EXPERIMENTAL. change the extraction method',
          type: 'string',
          choices: ['default', 'child-process'],
        }
      })
      .option({
        'method': {
          describe: 'change the installation method',
          type: 'string',
          default: 'package-manager' satisfies InstallationMethod,
          choices: InstallationMethods,
        }
      })
      .option({
        'lockfile-path': {
          describe: 'install from registry using the lockfile at the specified path',
          type: 'string'
        }
      })
      .option({
        os: {
          describe: "override the os type",
          type: "string",
          choices: ["linux", "darwin", "win"],
        },
        arch: {
          describe: "override the arch type",
          type: "string",
          choices: ["x64", "arm64"],
        },
      })
      .example(
        "$0 upgrade",
        "install latest bit version from the server, update the current version, and delete the previous installed version"
      )
      .example(
        "$0 upgrade --next",
        "install the latest bitx (the next Bit CLI), link it as bitx, and delete the previously linked bitx version"
      );
    return yargs;
  }
  async handler(args) {
    if (!args.skipUpdateCheck) {
      const currentBvmVersion = await getBvmLocalVersion();
      const latestBvmRemoteVersion = await getBvmRemoteVersion();
      const upgradeBvmMsg = getNewerBvmAvailableOutput(
        currentBvmVersion,
        latestBvmRemoteVersion
      );
      if (upgradeBvmMsg) {
        console.log(chalk.yellow(upgradeBvmMsg));
      }
    }
    if (args.next) {
      await upgradeNextBit(args);
      return;
    }
    const upgradeResults = await installVersion("latest", {
      override: false,
      replace: true,
      useSystemNode: args.useSystemNode,
      extractMethod: args.extractMethod,
      addToPathIfMissing: !args.skipUpdatePath,
      os: args.os,
      arch: args.arch,
      method: args.method,
      lockfilePath: args.lockfilePath,
    });
    if (
      upgradeResults.previousCurrentVersion &&
      upgradeResults.previousCurrentVersion !== upgradeResults.installedVersion
    ) {
      await removeVersions([upgradeResults.previousCurrentVersion]);
    }
    printOutput(upgradeResults);
  }
}

export const command = new UpgradeCmd();

async function upgradeNextBit(args) {
  validateNoBitOnlyFlags(args, ["extractMethod", "lockfilePath", "os", "arch"]);
  const results = await installBitx(undefined, {
    override: false,
    replace: true,
    useSystemNode: args.useSystemNode,
    addToPathIfMissing: !args.skipUpdatePath,
    verbose: args.verbose,
  });
  if (results.previousCurrentVersion && results.previousCurrentVersion !== results.installedVersion) {
    await removeBitxVersions([results.previousCurrentVersion]);
  }
  const output = [
    results.previousCurrentVersion ? `bitx upgraded from version ${chalk.green(results.previousCurrentVersion)}` : undefined,
    `${chalk.cyan(results.linkName)} is now linked to version ${chalk.green(results.installedVersion)} in path ${chalk.green(results.versionPath)}`,
    results.warnings.length ? chalk.yellowBright(results.warnings.join("\n")) : undefined,
  ].filter((msg) => msg);
  console.log(output.join("\n"));
}

function formatOutput(upgradeResults: InstallResults): string {
  const replacedText = upgradeResults.previousCurrentVersion
    ? `upgraded from version ${chalk.green(
        upgradeResults.previousCurrentVersion
      )}`
    : undefined;
  const currentText = `current is now linked to version ${chalk.green(
    upgradeResults.installedVersion
  )} in path ${chalk.green(upgradeResults.versionPath)}`;

  return [replacedText, currentText].filter((msg) => msg).join("\n");
}

function printOutput(upgradeResults: InstallResults): string {
  const output = formatOutput(upgradeResults);
  console.log(output);
  return output;
}
