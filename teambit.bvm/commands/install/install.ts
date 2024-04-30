import util from 'util';
import type {CommandModule, Argv} from 'yargs';
import {installVersion, InstallOpts} from '@teambit/bvm.install';
import { timeFormat } from '@teambit/toolbox.time.time-format';
import { renderPathExtenderReport } from '@teambit/bvm.reporter';
import { getBvmLocalVersion, getBvmRemoteVersion, getNewerBvmAvailableOutput } from '@teambit/bvm.version';

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
      'extract-method': {
        describe: 'EXPERIMENTAL. change the extraction method',
        type: 'string',
        choices: ['default', 'child-process'],
      }
    })
    .option({
      'use-system-node': {
        describe: "use the Node.js installed on the system to run Bit CLI",
        default: false,
        type: 'boolean'
      }
    })
    .option({
      'skip-update-check': {
        describe: "skip checking for a newer version of BVM",
        default: false,
        type: 'boolean'
      }
    })
    .option({
      os: {
        describe: 'override the os type',
        type: 'string',
        choices: ['linux', 'darwin', 'win'],
      },
      arch: {
        describe: 'override the arch type',
        type: 'string',
        choices: ['x64', 'arm64'],
      },
    })
    .example('$0 install 0.0.200', 'install version 0.0.200 of bit')
    .example('$0 install -f "/tmp/bit-0.0.740.tar.gz"', 'install version 0.0.740 of bit from a tar file')
    return yargs;
  }
  async handler(args) {
    try {
      if (!args.skipUpdateCheck) {
        const currentBvmVersion = await getBvmLocalVersion();
        const latestBvmRemoteVersion = await getBvmRemoteVersion();
        const upgradeBvmMsg = getNewerBvmAvailableOutput(currentBvmVersion, latestBvmRemoteVersion);
        if (upgradeBvmMsg){
          console.log(chalk.yellow(upgradeBvmMsg));
        }
      }
      const opts: InstallOpts = {
        addToPathIfMissing: !args.skipUpdatePath,
        override: args.override,
        replace: args.replace,
        extractMethod: args.extractMethod,
        file: args.file,
        useSystemNode: args.useSystemNode,
        os: args.os,
        arch: args.arch,
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
    } catch (error) {
      if (util.types.isNativeError(error) && error.message.includes('unable to verify the first certificate')) {
        console.log(chalk.red(`Error: ${error.message}

You must configure BVM with the right network settings to fix this issue.
See related docs: https://bit.dev/reference/reference/config/network-config/
`));
        process.exit(1);
      }
      throw error;
    }
  };
}

export const command =  new InstallCmd();
