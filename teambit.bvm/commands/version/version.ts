import { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import { Config } from "@teambit/bvm.config";
import {
  getBvmRemoteVersion,
  getNewerBvmAvailableOutput,
  getBvmLocalVersion,
} from "@teambit/bvm.version";
import {
  listLocal,
  listRemote,
  ReleaseType,
  ReleaseTypeFilter,
  Version,
} from "@teambit/bvm.list";
import semver from "semver";

export type LocalBitVersions = {
  currentVersion?: Version;
  latestInstalledVersion?: Version;
};

export type RemoteBitVersions = {
  latestRemoteStableVersion?: Version;
  latestRemoteNightlyVersion?: Version;
};

export type VersionsResult = {
  currentBvmVersion?: string;
  latestBvmRemoteVersion?: string;
  localBitVersions: LocalBitVersions;
  remoteBitVersions: RemoteBitVersions;
};

export type ShowVersionsOptions = {
  includeRemote?: boolean;
  overrideLocalVersion?: string;
};

const defaultShowVersionOptions = {
  includeRemote: true,
};

export class VersionCmd implements CommandModule {
  aliases = ["version", "versions"];
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

export async function showAllVersions(
  options: ShowVersionsOptions = defaultShowVersionOptions
): Promise<string> {
  const actualOpts = Object.assign({}, defaultShowVersionOptions, options);
  const config = Config.load();
  const currentBvmVersion = actualOpts.overrideLocalVersion
    ? actualOpts.overrideLocalVersion
    : await getBvmLocalVersion();
  const latestBvmRemoteVersion = actualOpts.includeRemote
    ? await getBvmRemoteVersion()
    : undefined;

  const remoteVersionsList = await listRemote({
    releaseType: ReleaseTypeFilter.ALL,
  });
  const remoteVersionsListMap = remoteVersionsList.toMap();
  const currentVersionString = config.getDefaultLinkVersion();
  const currentVersion = currentVersionString
    ? new Version(
        currentVersionString,
        remoteVersionsListMap.get(currentVersionString)
      )
    : undefined;
  const releaseType = config.getReleaseType();
  const latestInstalledVersion = (await listLocal()).latest();
  const latestRemoteStableVersion = actualOpts.includeRemote
    ? remoteVersionsList.versionsByReleaseType([ReleaseType.STABLE]).latest()
    : undefined;
  let latestRemoteNightlyVersion =
    actualOpts.includeRemote && releaseType === ReleaseTypeFilter.NIGHTLY
      ? remoteVersionsList.versionsByReleaseType([ReleaseType.NIGHTLY]).latest()
      : undefined;

  // latest nightly should be latest stable if stable is more recent
  if (
    latestRemoteNightlyVersion?.version &&
    latestRemoteStableVersion?.version &&
    semver.lt(
      latestRemoteNightlyVersion.version,
      latestRemoteStableVersion.version
    )
  ) {
    latestRemoteNightlyVersion = latestRemoteStableVersion;
  }

  const localBitVersions: LocalBitVersions = {
    currentVersion,
    latestInstalledVersion,
  };

  const remoteBitVersions: RemoteBitVersions = {
    latestRemoteStableVersion,
    latestRemoteNightlyVersion,
  };

  const output = formatOutput({
    currentBvmVersion,
    latestBvmRemoteVersion,
    localBitVersions,
    remoteBitVersions,
  });
  return output;
}

function formatOutput(versions: VersionsResult): string {
  // BVM versions
  const currentBvmVersionOutput = versions.currentBvmVersion
    ? `current (used) bvm version: ${chalk.green(versions.currentBvmVersion)}`
    : `current (used) bvm version: ${chalk.red("unknown")}`;
  const latestRemoteBvmOutput = versions.latestBvmRemoteVersion
    ? `latest available bvm version: ${chalk.green(
        versions.latestBvmRemoteVersion
      )}`
    : undefined;

  // Bit versions - local then remote
  const { currentVersion, latestInstalledVersion } = versions.localBitVersions;
  const currentVersionOutput = currentVersion
    ? `current (used) bit version: ${chalk.green(
        `${currentVersion.version} (${
          currentVersion.releaseType?.toString() ?? "stable"
        })`
      )}`
    : undefined;
  const latestInstalled = latestInstalledVersion
    ? `latest installed bit version: ${chalk.green(
        `${latestInstalledVersion.version} (${
          latestInstalledVersion.releaseType?.toString() ?? "stable"
        })`
      )}`
    : undefined;

  const { latestRemoteNightlyVersion, latestRemoteStableVersion } =
    versions.remoteBitVersions;

  const latestRemoteStable = latestRemoteStableVersion
    ? `latest available stable bit version: ${chalk.green(
        latestRemoteStableVersion.version
      )}`
    : undefined;
  const latestRemoteNightly = latestRemoteNightlyVersion
    ? `latest available nightly bit version: ${chalk.green(
        latestRemoteNightlyVersion.version
      )}`
    : undefined;

  const newerBvmOutput = getNewerBvmAvailableOutput(
    versions.currentBvmVersion,
    versions.latestBvmRemoteVersion
  );
  const newerBitOutput = getNewerBitAvailableOutput(
    versions.localBitVersions,
    versions.remoteBitVersions
  );

  const outputs = [
    currentBvmVersionOutput,
    latestRemoteBvmOutput,
    currentVersionOutput,
    latestInstalled,
    latestRemoteStable,
    latestRemoteNightly,
    "\n",
    newerBvmOutput,
    newerBitOutput,
  ].filter((output) => output);
  return outputs.join("\n");
}

function getNewerBitAvailableOutput(
  localVersions: LocalBitVersions,
  remoteVersions: RemoteBitVersions
): string | undefined {
  const { currentVersion, latestInstalledVersion } = localVersions;
  const { latestRemoteNightlyVersion, latestRemoteStableVersion } =
    remoteVersions;

  if (!currentVersion) {
    return undefined;
  }
  if (
    !latestInstalledVersion &&
    !latestRemoteStableVersion &&
    !latestRemoteNightlyVersion
  ) {
    return undefined;
  }

  const moreRecentLocalVersionOutput =
    latestInstalledVersion &&
    semver.gt(latestInstalledVersion.version, currentVersion.version)
      ? `\nNOTE: you have a more recent version of bit (${
          latestInstalledVersion.version
        }) installed - run "${chalk.cyan(
          `bvm use ${latestInstalledVersion.version}`
        )}" to use your latest installed version`
      : undefined;

  function newVersionAvailableText(versionToCheck?: Version) {
    if (!versionToCheck) return undefined;
    const { version, releaseType } = versionToCheck;

    const commandToRun =
      versionToCheck.releaseType === ReleaseType.STABLE
        ? `bvm install ${version}`
        : "bvm upgrade";

    if (version && semver.gt(version, currentVersion!.version)) {
      return (
        `${chalk.greenBright("new")} ${
          releaseType?.toString() ?? ""
        } version (${version}) of ${chalk.cyan("bit")} ` +
        `is available, upgrade ${chalk.cyan(
          "bit"
        )} to the latest version by running "${chalk.cyan(commandToRun)}"\n`
      );
    }
  }
  const bitVersionsGhLink = "\nhttps://github.com/teambit/bit/releases";

  const output = [
    newVersionAvailableText(latestRemoteStableVersion),
    newVersionAvailableText(latestRemoteNightlyVersion),
    moreRecentLocalVersionOutput,
    bitVersionsGhLink,
  ].join("");

  return output;
}
