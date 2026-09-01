import chalk from "chalk";
import util from "util";
import { exec } from "child_process";
import semver from "semver";
const execP = util.promisify(exec);

const BVM_PACKAGE_NAME = "@teambit/bvm";

export async function getBvmLocalVersion(): Promise<string | undefined> {
  // Invoke the currently-running bvm script directly (by its own resolved path) rather than
  // looking up "bvm" on the PATH: under `npx @teambit/bvm ...`, bvm isn't installed/linked onto
  // the PATH yet, so "bvm local-version" would fail even though we're already running it.
  const selfInvocation = process.argv[1]
    ? `"${process.execPath}" "${process.argv[1]}" local-version`
    : "bvm local-version";
  try {
    const {stdout } = await execP(selfInvocation);
    const stdoutString = stdout.toString().trim();
    return semver.valid(stdoutString) ? stdoutString : undefined;
  } catch {
    // This check is best-effort, so don't let a failure here fail the calling command.
    return undefined;
  }
}

export async function getBvmRemoteVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execP("npm view @teambit/bvm version");
    return stdout.toString().trim();
  } catch {
    return undefined;
  }
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
