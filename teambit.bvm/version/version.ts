import chalk from "chalk";
import util from "util";
import { exec } from "child_process";
import semver from "semver";
const execP = util.promisify(exec);

const BVM_PACKAGE_NAME = "@teambit/bvm";

export async function getBvmLocalVersion(): Promise<string | undefined> {
  const {stdout } = await execP("bvm local-version");
  const stdoutString = stdout.toString().trim();
  const result = semver.valid(stdoutString) ? stdoutString : undefined;
  return result;
}

export async function getBvmRemoteVersion(): Promise<string | undefined> {
  const { stdout } = await execP("npm view @teambit/bvm version");
  return stdout.toString().trim();
}

export function getNewerBvmAvailableOutput(
  currentBvmVersion?: string,
  latestBvmRemoteVersion?: string
): string | undefined {
  if (!currentBvmVersion || !latestBvmRemoteVersion) {
    return undefined;
  }
  if (semver.gt(latestBvmRemoteVersion, currentBvmVersion)) {
    const npmCommand = chalk.cyan(`npm install -g ${BVM_PACKAGE_NAME}`);
    const pnpmCommand = chalk.cyan(`pnpm add -g ${BVM_PACKAGE_NAME}`);
    const yarnCommand = chalk.cyan(`yarn global add ${BVM_PACKAGE_NAME}`);
    return `new version of ${chalk.cyan(
      "bvm"
    )} is available (${latestBvmRemoteVersion}), upgrade your ${chalk.cyan(
      "bvm"
    )} by running "${npmCommand}", "${pnpmCommand}" or "${yarnCommand}"\n`;
  }
}
