import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import nodeFetch from 'node-fetch';
import ora from 'ora';
import semver from 'semver';
import pathTemp from 'path-temp';
import { sync as renameOverwrite } from 'rename-overwrite';
import { sync as rimraf } from 'rimraf';
import { getAgent } from '@teambit/toolbox.network.agent';
import { Config } from '@teambit/bvm.config';
import { BvmError } from '@teambit/bvm.error';
import { installNode, installPackagesWithPnpm, getRegistryAuthHeader, networkOpts } from '@teambit/bvm.install';
import {
  BITX_METADATA_FILE,
  BitxMetadata,
  getBitxExecutableName,
  linkBitx,
  LinkResult,
  PathExtenderReport,
  readBitxMetadata,
} from '@teambit/bvm.link';
import { LocalVersion, LocalVersionList } from '@teambit/bvm.list';
import {
  BitxPackument,
  BitxRemoteVersion,
  getBitxPlatformPackage,
  getPackumentUrl,
  listVersionsFromPackument,
  resolveBitxVersionFromPackument,
} from './packument';

const execFileP = util.promisify(execFile);

const loader = ora();

export type BitxInstallOpts = {
  addToPathIfMissing?: boolean;
  override?: boolean;
  replace?: boolean;
  useSystemNode?: boolean;
  verbose?: boolean;
};

export type BitxInstallResults = {
  installedVersion: string;
  downloadRequired: boolean;
  replacedCurrent: boolean;
  previousCurrentVersion?: string;
  versionPath: string;
  linkName: string;
  pathExtenderReport?: PathExtenderReport;
  warnings: string[];
};

export type BitxRemoveResults = {
  removedVersions: string[];
  missingVersions: string[];
};

/**
 * Fails when options that only apply to installing Bit (not bitx) were passed along with --next.
 * `args` are the parsed yargs arguments (camelCase keys).
 */
export function validateNoBitOnlyFlags(args: Record<string, any>, flags: string[]) {
  const used = flags.filter((flag) => args[flag] !== undefined);
  if (args.method && args.method !== 'package-manager') used.push('method');
  if (used.length) {
    const toKebab = (flag: string) => flag.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    throw new BvmError(`the following options are not supported with --next: ${used.map((flag) => `--${toKebab(flag)}`).join(', ')}`);
  }
}

export async function fetchBitxPackument(config: Config = Config.load()): Promise<BitxPackument> {
  const registry = config.getRegistry();
  const packageName = config.getBitxPackage();
  const url = getPackumentUrl(registry, packageName);
  const { networkConfig, proxyConfig } = networkOpts(config);
  const headers: Record<string, string> = { accept: 'application/json' };
  const authHeader = getRegistryAuthHeader(registry, config.getBvmDirectory());
  if (authHeader) headers.authorization = authHeader;
  const response = await nodeFetch(url, {
    headers,
    agent: getAgent(url, { ...networkConfig, ...proxyConfig }),
  });
  if (!response.ok) {
    throw new BvmError(`failed to fetch the bitx versions from ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function resolveBitxVersion(spec?: string, config: Config = Config.load()): Promise<string> {
  const packument = await fetchBitxPackument(config);
  return resolveBitxVersionFromPackument(packument, spec, config.getBitxDistTag());
}

export async function listRemoteBitx(limit?: number): Promise<BitxRemoteVersion[]> {
  const versions = listVersionsFromPackument(await fetchBitxPackument());
  return limit ? versions.slice(0, limit) : versions;
}

/**
 * Installed bitx versions. Interrupted installations (no metadata file) are not listed.
 */
export async function listLocalBitx(): Promise<LocalVersionList> {
  const config = Config.load();
  const versionsDir = config.getBitxVersionsDir();
  if (!(await fs.pathExists(versionsDir))) return new LocalVersionList([]);
  const dirEntries = await fs.readdir(versionsDir, { withFileTypes: true });
  const versions = dirEntries
    .filter((dirent) => dirent.isDirectory() && semver.valid(dirent.name))
    .map((dirent) => config.getSpecificBitxVersionDir(dirent.name).versionDir)
    .filter((versionDir) => readBitxMetadata(versionDir))
    .map((versionDir) => new LocalVersion(path.basename(versionDir), versionDir));
  return new LocalVersionList(versions).sortBySemver('desc');
}

export async function installBitx(spec: string | undefined, opts: BitxInstallOpts = {}): Promise<BitxInstallResults> {
  const config = Config.load();
  const packageName = config.getBitxPackage();
  const platformPackage = getBitxPlatformPackage(packageName);
  const version = await resolveBitxVersion(spec, config);
  const { versionDir, exists } = config.getSpecificBitxVersionDir(version);
  const warnings: string[] = [];

  const existingMetadata = readBitxMetadata(versionDir);
  if (existingMetadata && !opts.override) {
    let useSystemNode = opts.useSystemNode;
    if (!useSystemNode && existingMetadata.node) {
      useSystemNode = !(await installNode(config, existingMetadata.node));
    }
    loader.stop();
    const linkResult = await linkIfNeeded(version, { ...opts, useSystemNode });
    return toInstallResults(version, versionDir, false, linkResult, warnings);
  }
  if (exists) {
    await fs.remove(versionDir);
  }

  const versionsDir = config.getBitxVersionsDir();
  await fs.ensureDir(versionsDir);
  const tempDir = pathTemp(versionsDir);
  try {
    const downloadText = `downloading bitx ${version}`;
    loader.start(downloadText);
    await installPackagesWithPnpm(tempDir, { [packageName]: version }, {
      registry: config.getRegistry(),
      ...networkOpts(config),
    });
    loader.succeed(downloadText);

    const executableName = getBitxExecutableName();
    const installedExecutable = path.join(tempDir, 'node_modules', platformPackage, 'bin', executableName);
    if (!(await fs.pathExists(installedExecutable))) {
      throw new BvmError(`bitx ${version} has no executable for ${process.platform}-${process.arch} (expected ${platformPackage}${opts.verbose ? ` at ${installedExecutable}` : ''})`);
    }
    const wantedNodeVersion = readWantedNodeVersion(path.join(tempDir, 'node_modules', packageName)) ?? config.getBitxNodeVersion();

    let nodeVersion: string | undefined;
    if (!opts.useSystemNode) {
      // If Node.js installation doesn't succeed, bitx uses the Node.js it finds on the system.
      nodeVersion = (await installNode(config, wantedNodeVersion)) ? wantedNodeVersion : undefined;
      if (!nodeVersion) {
        warnings.push(`bitx will use the Node.js found on the system, as Node.js ${wantedNodeVersion} could not be installed`);
      }
    }

    // Assemble the version directory next to its final location, then move it there in one step,
    // so an interrupted installation never leaves a version directory with a metadata file.
    const stageDir = path.join(tempDir, 'stage');
    await fs.ensureDir(path.join(stageDir, 'bin'));
    const executable = path.join(stageDir, 'bin', executableName);
    await fs.move(installedExecutable, executable);
    if (process.platform !== 'win32') await fs.chmod(executable, 0o755);
    const metadata: BitxMetadata = {
      version,
      package: packageName,
      platformPackage,
      node: nodeVersion,
      installedAt: new Date().toISOString(),
    };
    await fs.writeJson(path.join(stageDir, BITX_METADATA_FILE), metadata, { spaces: 2 });
    renameOverwrite(stageDir, versionDir);
  } catch (err) {
    loader.stop();
    throw err;
  } finally {
    try {
      rimraf(tempDir);
    } catch {
      // ignore
    }
  }

  const versionWarning = await checkExecutableVersion(versionDir, version);
  if (versionWarning) warnings.push(versionWarning);
  const linkResult = await linkIfNeeded(version, opts);
  return toInstallResults(version, versionDir, true, linkResult, warnings);
}

export async function removeBitxVersions(versions: string[]): Promise<BitxRemoveResults> {
  const config = Config.load();
  const localVersions = (await listLocalBitx()).toVersionsStringArray();
  const resolvedVersions = versions.map((version) => (version === 'latest' ? localVersions[0] : version)).filter(Boolean);
  const removedVersions = resolvedVersions.filter((version) => localVersions.includes(version));
  const missingVersions = resolvedVersions.filter((version) => !localVersions.includes(version));
  await Promise.all(removedVersions.map((version) => fs.remove(config.getSpecificBitxVersionDir(version).versionDir)));
  return { removedVersions, missingVersions };
}

export async function removeAllBitx(versionsToKeep: string[] = [], numberOfLatestToKeep = 0): Promise<BitxRemoveResults> {
  // listLocalBitx() is sorted newest first
  let versionsToRemove = (await listLocalBitx()).toVersionsStringArray().filter((version) => !versionsToKeep.includes(version));
  if (numberOfLatestToKeep > 0) {
    versionsToRemove = versionsToRemove.slice(numberOfLatestToKeep);
  }
  return removeBitxVersions(versionsToRemove);
}

/**
 * Links the default bitx link name to an installed bitx version.
 * `latest` (or no version) is the newest installed bitx version.
 */
export async function useBitx(version: string | undefined, opts: { addToPathIfMissing?: boolean; useSystemNode?: boolean } = {}): Promise<LinkResult> {
  let concreteVersion = version;
  if (!concreteVersion || concreteVersion === 'latest') {
    concreteVersion = (await listLocalBitx()).latest()?.version;
    if (!concreteVersion) throw new BvmError('bitx is not installed. run "bvm install --next" to install it');
  }
  return linkBitx(undefined, concreteVersion, { addToConfig: true, ...opts });
}

export type BitxVersionsInfo = {
  currentVersion?: string;
  latestInstalledVersion?: string;
  distTag: string;
  latestRemoteVersion?: string;
};

/**
 * bitx versions for `bvm version`. Returns undefined when bitx was never installed,
 * so users of Bit alone see no change and no extra network request is made.
 */
export async function getBitxVersionsInfo(includeRemote = true): Promise<BitxVersionsInfo | undefined> {
  const config = Config.load();
  const currentVersion = config.getBitxLinkVersion();
  const latestInstalledVersion = (await listLocalBitx()).latest()?.version;
  if (!currentVersion && !latestInstalledVersion) return undefined;
  const distTag = config.getBitxDistTag();
  let latestRemoteVersion: string | undefined;
  if (includeRemote) {
    try {
      latestRemoteVersion = (await fetchBitxPackument(config))['dist-tags']?.[distTag];
    } catch {
      // best effort
    }
  }
  return { currentVersion, latestInstalledVersion, distTag, latestRemoteVersion };
}

async function linkIfNeeded(version: string, opts: BitxInstallOpts): Promise<LinkResult | undefined> {
  const config = Config.load();
  const replace = opts.replace ?? true;
  if (!replace && config.getBitxLinkVersion()) return undefined;
  return linkBitx(undefined, version, {
    addToConfig: true,
    addToPathIfMissing: opts.addToPathIfMissing,
    useSystemNode: opts.useSystemNode,
  });
}

function toInstallResults(
  version: string,
  versionDir: string,
  downloadRequired: boolean,
  linkResult: LinkResult | undefined,
  warnings: string[]
): BitxInstallResults {
  return {
    installedVersion: version,
    downloadRequired,
    replacedCurrent: !!linkResult,
    previousCurrentVersion: linkResult?.previousLinkVersion,
    versionPath: versionDir,
    linkName: linkResult?.linkName ?? Config.load().getBitxLinkName(),
    pathExtenderReport: linkResult?.pathExtenderReport,
    warnings: [...warnings, ...(linkResult?.warnings ?? [])],
  };
}

/**
 * The Node.js version a bitx release asks for, from a `"bvm": { "node": "<version>" }`
 * field in its package.json (the same field classic Bit releases use).
 */
function readWantedNodeVersion(packageDir: string): string | undefined {
  try {
    const manifest = fs.readJsonSync(path.join(packageDir, 'package.json'));
    return manifest?.bvm?.node;
  } catch {
    return undefined;
  }
}

async function checkExecutableVersion(versionDir: string, version: string): Promise<string | undefined> {
  const executable = path.join(versionDir, 'bin', getBitxExecutableName());
  try {
    const { stdout } = await execFileP(executable, ['--version'], { timeout: 30_000 });
    if (!stdout.includes(version)) {
      return `the installed bitx executable reports version "${stdout.trim()}" instead of ${version}`;
    }
    return undefined;
  } catch (err) {
    return `the installed bitx executable failed to run: ${(err as Error).message}`;
  }
}
