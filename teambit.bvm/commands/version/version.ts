import { CommandModule, Argv, boolean } from "yargs";
import chalk from "chalk";
import util from "util";
import { Config } from "@teambit/bvm.config";
import { listLocal, listRemote } from "@teambit/bvm.list";
import { exec } from "child_process";
import path from 'path';
import semver from "semver";
const execP = util.promisify(exec);

const BVM_PACKAGE_NAME = "@teambit/bvm";

export type VersionsResult = {
  currentBvmVersion?: string;
  latestBvmRemoteVersion?: string;
  currentVersion?: string;
  latestRemoteVersion?: string;
  latestInstalledVersion?: string;
};

export type ShowVersionsOptions = {
  includeRemote?: boolean,
  overrideLocalVersion?: string
}

const defaultShowVersionOptions = {
  includeRemote: true
}

export class VersionCmd implements CommandModule {
  aliases = ["version"];
  describe =
    "show used (current) version, latest installed version and latest remote version (bit and bvm)";
  command = ["version"];
  builder(yargs: Argv) {
    yargs
      .option({
        "include-remote": {
          describe: "show latest remote version",
          default: true,
          type: "boolean",
        },
      })
      .example(
        "$0 version",
        "show used (current) version, latest installed version and latest remote version"
      )
      .example(
        "$0 version --include-remote false",
        "show used (current) version and latest installed version (without latest remote version)"
      );
    return yargs;
  }
  async handler(args) {
    const output = await showAllVersions(args);
    return console.log(output);
  }
}

export const command = new VersionCmd();

export async function showAllVersions(options: ShowVersionsOptions = defaultShowVersionOptions): Promise<string> {
  const actualOpts = Object.assign({}, defaultShowVersionOptions, options);
  const config = Config.load();
  const currentBvmVersion = actualOpts.overrideLocalVersion ? actualOpts.overrideLocalVersion : await getBvmLocalVersion();
  const latestBvmRemoteVersion = actualOpts.includeRemote
    ? await getBvmRemoteVersion()
    : undefined;

  const currentVersion = config.getDefaultLinkVersion();
  const latestInstalledVersion = (await listLocal()).latest().version;
  const latestRemoteVersion = actualOpts.includeRemote
    ? (await listRemote()).latest().version
    : undefined;

  const output = formatOutput({
    currentBvmVersion,
    latestBvmRemoteVersion,
    currentVersion,
    latestInstalledVersion,
    latestRemoteVersion,
  });
  return output;
}

function formatOutput(versions: VersionsResult): string {
  const currentBvmVersionOutput = versions.currentBvmVersion
    ? `current (used) bvm version: ${chalk.green(versions.currentBvmVersion)}`
    : `current (used) bvm version: ${chalk.red('unknown')}`;
  const latestRemoteBvmOutput = versions.latestBvmRemoteVersion
    ? `latest available bvm version: ${chalk.green(
        versions.latestBvmRemoteVersion
      )}`
    : undefined;

  const currentVersionOutput = versions.currentVersion
    ? `current (used) bit version: ${chalk.green(versions.currentVersion)}`
    : undefined;
  const latestInstalled = versions.latestInstalledVersion
    ? `latest installed bit version: ${chalk.green(
        versions.latestInstalledVersion
      )}`
    : undefined;
  const latestRemote = versions.latestRemoteVersion
    ? `latest available bit version: ${chalk.green(
        versions.latestRemoteVersion
      )}`
    : undefined;

  const newerBvmOutput = getNewerBvmAvailableOutput(
    versions.currentBvmVersion,
    versions.latestBvmRemoteVersion
  );
  const newerBitOutput = getNewerBitAvailableOutput(
    versions.currentVersion,
    versions.latestInstalledVersion,
    versions.latestRemoteVersion
  );

  const outputs = [
    currentBvmVersionOutput,
    latestRemoteBvmOutput,
    currentVersionOutput,
    latestInstalled,
    latestRemote,
    "\n",
    newerBvmOutput,
    newerBitOutput,
  ].filter((output) => output);
  return outputs.join("\n");
}

function getNewerBvmAvailableOutput(
  currentBvmVersion?: string,
  latestBvmRemoteVersion?: string
): string | undefined {
  if (!currentBvmVersion || !latestBvmRemoteVersion) {
    return undefined;
  }
  if (semver.gt(latestBvmRemoteVersion, currentBvmVersion)) {
    const npmCommand = chalk.cyan(`npm install -g ${BVM_PACKAGE_NAME}`);
    const yarnCommand = chalk.cyan(`yarn global add ${BVM_PACKAGE_NAME}`);
    return `new version of ${chalk.cyan(
      "bvm"
    )} is available, upgrade your ${chalk.cyan(
      "bvm"
    )} by running "${npmCommand}" or "${yarnCommand}"`;
  }
}

function getNewerBitAvailableOutput(
  currentVersion?: string,
  latestInstalledVersion?: string,
  latestRemoteVersion?: string
): string {
  if (!currentVersion) {
    return undefined;
  }
  if (!latestInstalledVersion && !latestRemoteVersion) {
    return undefined;
  }
  if (
    semver.gt(latestInstalledVersion, currentVersion) ||
    (latestRemoteVersion && semver.gt(latestRemoteVersion, currentVersion))
  ) {
    return `new version of ${chalk.cyan(
      "bit"
    )} is available, upgrade your ${chalk.cyan("bit")} by running "${chalk.cyan(
      "bvm upgrade"
    )}"`;
  }
}

async function getBvmLocalVersion(): Promise<string | undefined> {
  const {stdout } = await execP("bvm local-version");
  const stdoutString = stdout.toString().trim();
  const result = semver.valid(stdoutString) ? stdoutString : undefined;
  return result;
}

async function getBvmRemoteVersion(): Promise<string | undefined> {
  const { stdout } = await execP("npm view @teambit/bvm version");
  return stdout.toString();
}
