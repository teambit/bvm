import { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import { Config } from "@teambit/bvm.config";
import { getBvmRemoteVersion, getNewerBvmAvailableOutput, getBvmLocalVersion} from "@teambit/bvm.version";
import { listLocal, listRemote, ReleaseType, ReleaseTypeFilter, Version } from "@teambit/bvm.list";
import semver from "semver";

export type VersionsResult = {
  currentBvmVersion?: string;
  latestBvmRemoteVersion?: string;
  currentVersion?: Version;
  latestRemoteStableVersion?: Version;
  latestRemoteNightlyVersion?: Version;
  latestInstalledVersion?: Version;
};

export type ShowVersionsOptions = {
  includeRemote?: boolean,
  overrideLocalVersion?: string
}

const defaultShowVersionOptions = {
  includeRemote: true
}

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

export async function showAllVersions(options: ShowVersionsOptions = defaultShowVersionOptions): Promise<string> {
  const actualOpts = Object.assign({}, defaultShowVersionOptions, options);
  const config = Config.load();
  const currentBvmVersion = actualOpts.overrideLocalVersion ? actualOpts.overrideLocalVersion : await getBvmLocalVersion();
  const latestBvmRemoteVersion = actualOpts.includeRemote
    ? await getBvmRemoteVersion()
    : undefined;
    
  const remoteVersionsList = await listRemote({releaseType: ReleaseTypeFilter.ALL});
  const remoteVersionsListMap = remoteVersionsList.toMap();
  const currentVersionString = config.getDefaultLinkVersion();
  const currentVersion = currentVersionString ? new Version( currentVersionString, remoteVersionsListMap.get(currentVersionString)) : undefined;
  const releaseType = config.getReleaseType();
  const latestInstalledVersion = (await listLocal()).latest();
  const latestRemoteStableVersion = actualOpts.includeRemote
    ? remoteVersionsList.versionsByReleaseType([ReleaseType.STABLE]).latest()
    : undefined;
  const latestRemoteNightlyVersion = releaseType === ReleaseTypeFilter.NIGHTLY 
    ? remoteVersionsList.versionsByReleaseType([ReleaseType.NIGHTLY]).latest() 
    : undefined;

  const output = formatOutput({
    currentBvmVersion,
    latestBvmRemoteVersion,
    currentVersion,
    latestInstalledVersion,
    latestRemoteStableVersion,
    latestRemoteNightlyVersion
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
    ? `current (used) bit version: ${chalk.green(
      `${versions.currentVersion.version} (${versions.currentVersion.releaseType?.toString() ?? 'stable'})`
      )}`
    : undefined;
  const latestInstalled = versions.latestInstalledVersion
    ? `latest installed bit version: ${chalk.green(
        `${versions.latestInstalledVersion.version} (${versions.latestInstalledVersion.releaseType?.toString() ?? 'stable'})`
      )}`
    : undefined;
  const latestRemoteStable = versions.latestRemoteStableVersion
    ? `latest available stable bit version: ${chalk.green(
        versions.latestRemoteStableVersion.version
      )}`
    : undefined;
  const latestRemoteNightly = versions.latestRemoteNightlyVersion
    ? `latest available nightly bit version: ${chalk.green(
        versions.latestRemoteNightlyVersion.version
      )}`
    : undefined;

  const newerBvmOutput = getNewerBvmAvailableOutput(
    versions.currentBvmVersion,
    versions.latestBvmRemoteVersion
  );
  const newerBitOutput = getNewerBitAvailableOutput(
    versions.currentVersion?.version,
    versions.latestInstalledVersion?.version,
    versions.latestRemoteStableVersion,
    versions.latestRemoteNightlyVersion
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
  currentVersion?: string,
  latestInstalledVersion?: string,
  latestRemoteStableVersion?: Version,
  latestRemoteNightlyVersion?: Version
): string | undefined {
  if (!currentVersion) {
    return undefined;
  }
  if (!latestInstalledVersion && !latestRemoteStableVersion && !latestRemoteNightlyVersion) {
    return undefined;
  }
  function newVersionAvailableText(versionToCheck?: Version){
    if (!versionToCheck) return undefined;

    const commandToRun = versionToCheck.releaseType === ReleaseType.STABLE ?
      `bvm install ${versionToCheck.version}`
      : "bvm upgrade"
    
    if (
      semver.gt(latestInstalledVersion || "0.0.0", currentVersion || "0.0.0") ||
      (versionToCheck.version && semver.gt(versionToCheck.version, currentVersion || "0.0.0"))
    )
    {
      return `new ${versionToCheck.releaseType?.toString() ?? ""} version (${versionToCheck.version}) of ${chalk.cyan("bit")} `+
           `is available, upgrade your ${chalk.cyan("bit")} by running "${chalk.cyan(commandToRun)}"\n`;
    }
  }
  latestRemoteStableVersion = undefined;
  const output = [newVersionAvailableText(latestRemoteStableVersion), newVersionAvailableText(latestRemoteNightlyVersion)].join("");
    
  return output;
}
