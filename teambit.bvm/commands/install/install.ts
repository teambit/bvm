import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallOpts} from '@teambit/bvm.install';
import { timeFormat } from '@teambit/toolbox.time.time-format';
import { renderPathExtenderReport } from '@teambit/bvm.reporter';
import chalk from 'chalk';
export class InstallCmd implements CommandModule {
  aliases = ['i', 'install'];
  describe = 'install specific bit version';
  command = [
    'install [bit-version]'
  ];
  builder(yargs: Argv) {
    yargs.positional('bit-version', {
      describe: 'version to install',
      default: 'latest',
      type: 'string'
    })
    .option({
      'skip-update-path': {
        describe: "don't add the bvm directory to the system PATH",
        default: false,
        type: 'boolean',
      }
    })
    .option({
      override: {
        describe: 'download the version again even if it is already exist in file system',
        default: false,
        type: 'boolean'
      }
    })
    .option({
      file: {
        alias: ['f'],
        describe: 'install a version from a path to a file',
        type: 'string'
      }
    })
    .option({
      replace: {
        describe: 'replace current version',
        default: true,
        type: 'boolean'
      }
    })
    .option({
      'use-system-node': {
        describe: "use the Node.js installed on the system to run Bit CLI",
        default: false,
        type: 'boolean'
      }
    })
    .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
    .example('$0 install -f "/tmp/bit-0.0.740.tar.gz"', 'install version 0.0.740 of bit from a tar file')
    return yargs;
  }
  async handler(args) {
    const opts: InstallOpts = {
      addToPathIfMissing: !args.skipUpdatePath,
      override: args.override,
      replace: args.replace,
      file: args.file,
      useSystemNode: args.useSystemNode,
    }
    const installStartTime = Date.now();
    const {versionPath, installedVersion, pathExtenderReport, warnings} = await installVersion(args.bitVersion, opts);
    const installEndTime = Date.now();
    const installTimeDiff = timeFormat(installEndTime - installStartTime);
    console.log(`version ${chalk.green(installedVersion)} installed on ${chalk.green(versionPath)} in ${chalk.cyan(installTimeDiff)}`);
    if (warnings && warnings.length) {
      console.log(chalk.yellowBright(warnings.join('\n')));
    }
    if (!pathExtenderReport) return; 
    const output = renderPathExtenderReport(pathExtenderReport);
    if (output) {
      console.log(`\n${output}`);
    }
  };
}

export const command =  new InstallCmd();
