import type { CommandModule, Argv } from "yargs";
import { installVersion, InstallResults } from "@teambit/bvm.install";
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
    const upgradeResults = await installVersion("latest", {
      override: false,
      replace: true,
      useSystemNode: args.useSystemNode,
      extractMethod: args.extractMethod,
      addToPathIfMissing: !args.skipUpdatePath,
      os: args.os,
      arch: args.arch,
    });
    return printOutput(upgradeResults);
  }
}

export const command = new UpgradeCmd();

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
