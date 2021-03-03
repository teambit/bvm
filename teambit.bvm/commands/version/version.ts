import type {CommandModule, Argv} from 'yargs';
import {getVersions, GetVersionsResult} from '@teambit/bvm.version';
import chalk from 'chalk';

export class VersionCmd implements CommandModule {
  aliases = ['version'];
  describe = 'show used (current) version, latest installed version and latest remote version';
  command = [
    'version'
  ];
  builder(yargs: Argv) {
    yargs
    .option({
      'include-remote': {
        describe: 'show latest remote version',
        default: true,
        type: 'boolean'
      }
    })
    .example('$0 version', 'show used (current) version, latest installed version and latest remote version')
    .example('$0 version --include-remote false', 'show used (current) version and latest installed version (without latest remote version)')
    return yargs;
  }
  async handler(args) {
    const versions = await getVersions({
      showCurrentVersion: true,
      showLatestInstalledVersion: true,
      showLatestRemoteVersion: args.includeRemote
    });
    const output = formatOutput(versions);
    return console.log(output);
  };
}

export const command =  new VersionCmd();

function formatOutput(versions: GetVersionsResult): string {
  const currentVersionOutput = versions.currentVersion ? `current (used) version: ${chalk.green(versions.currentVersion)}` : undefined;
  const latestInstalled = versions.latestInstalledVersion ? `latest installed version: ${chalk.green(versions.latestInstalledVersion)}` : undefined;
  const latestRemote = versions.latestRemoteVersion ? `latest remote version: ${chalk.green(versions.latestRemoteVersion)}` : undefined;
  const outputs = [currentVersionOutput,
    latestInstalled,
    latestRemote].filter(output => output);
  return outputs.join('\n');
}