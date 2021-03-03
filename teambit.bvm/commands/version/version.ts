import type {CommandModule, Argv} from 'yargs';
import chalk from 'chalk';
import { Config } from "@teambit/bvm.config";
import { latestLocal, latestRemote } from "@teambit/bvm.list";

export type VersionsResult = {
  currentVersion?: string;
  latestRemoteVersion?: string;
  latestInstalledVersion?: string;
};

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
    const config = Config.load();
    const currentVersion = config.getDefaultLinkVersion();
    const latestInstalledVersion = await latestLocal();
    const latestRemoteVersion = args.includeRemote ?  await latestRemote() : undefined;
    
    const output = formatOutput({currentVersion,
      latestInstalledVersion,
      latestRemoteVersion
      });
    return console.log(output);
  };
}

export const command =  new VersionCmd();

function formatOutput(versions: VersionsResult): string {
  const currentVersionOutput = versions.currentVersion ? `current (used) version: ${chalk.green(versions.currentVersion)}` : undefined;
  const latestInstalled = versions.latestInstalledVersion ? `latest installed version: ${chalk.green(versions.latestInstalledVersion)}` : undefined;
  const latestRemote = versions.latestRemoteVersion ? `latest remote version: ${chalk.green(versions.latestRemoteVersion)}` : undefined;
  const outputs = [currentVersionOutput,
    latestInstalled,
    latestRemote].filter(output => output);
  return outputs.join('\n');
}