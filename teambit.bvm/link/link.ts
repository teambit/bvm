import { addDirToEnvPath, ConfigFileChangeType, ConfigReport, PathExtenderReport } from '@pnpm/os.env.path-extender';
import {Config} from '@teambit/bvm.config';
import {listLocal} from '@teambit/bvm.list';
import cmdShim from '@zkochan/cmd-shim';
import path from 'path';
import symlinkDir from 'symlink-dir';
import binLinks from 'bin-links';
import { BvmError } from '@teambit/bvm.error';
import os from 'os';
import semver from 'semver';
import { getLinkSource } from './link-source';
import { getBitxLinkSource, readBitxMetadata } from './bitx-link';

const IS_WINDOWS = os.platform() === 'win32';
const DOCS_BASE_URL = 'https://bit.dev/docs';
const DOCS_REFERENCE_BASE_URL = 'https://bit.dev/reference';
const WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_REFERENCE_BASE_URL}/reference/using-bvm#troubleshooting`;
const MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_REFERENCE_BASE_URL}/reference/using-bvm#troubleshooting`;

const config = Config.load();

export type LinkResult = {
  linkName: string,
  version: string,
  previousLinkVersion?: string,
  generatedLink: GeneratedLink
  pathExtenderReport?: PathExtenderReport,
  warnings?: string[],
}

export { PathExtenderReport, ConfigReport, ConfigFileChangeType }

export type GeneratedLink = {
  source: string,
  target: string
}

export async function linkAll(opts: { addToPathIfMissing?: boolean, useSystemNode?: boolean }): Promise<LinkResult[]>{
  const links = config.getLinks();
  const defaultLinkVersion = config.getDefaultLinkVersion();
  const localLatest = (await listLocal()).latest();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version, {
      addToConfig: false,
      addToPathIfMissing: opts.addToPathIfMissing,
      useSystemNode: opts.useSystemNode,
    });
  });
  if (!defaultLinkVersion && localLatest){
    const defaultLinkName = config.getDefaultLinkName();
    promises.push(linkOne(defaultLinkName, localLatest.version, {
      addToConfig: true,
      addToPathIfMissing: opts.addToPathIfMissing,
      useSystemNode: opts.useSystemNode,
    }))
  }
  return Promise.all(promises);
}

export interface LinkOptions {
  addToConfig?: boolean
  addToPathIfMissing?: boolean
  useSystemNode?: boolean
}

export async function linkDefault(
  version: string | undefined,
  opts: LinkOptions = {}
): Promise<LinkResult> {
  const defaultLinkName = config.getDefaultLinkName();
  return linkOne(defaultLinkName, version, {
    addToConfig: true,
    ...opts,
  });
}

export async function linkOne(linkName: string, version: string | undefined, opts: LinkOptions = {}): Promise<LinkResult> {
  let concreteVersion = version;
  if (!concreteVersion || concreteVersion === 'latest'){
    const localLatest = (await listLocal()).latest();
    concreteVersion = localLatest.version;
  }
  if (concreteVersion === 'stable'){
    const localStable = (await listLocal()).stable();
    if (!localStable){
      throw new BvmError(`no stable version found installed`);
    }
    concreteVersion = localStable.version;
  }
  const {versionDir, exists} = config.getSpecificVersionDir(concreteVersion, true);
  if (!exists){
    throw new BvmError(`version ${concreteVersion} is not installed`);
  }
  if (config.getBitxLinks()[linkName]) {
    throw new BvmError(`the link name "${linkName}" is used by bitx (the next Bit). choose another link name for Bit, or change the bitx link name with "bvm config set BITX_LINK <name>"`);
  }
  const source = getLinkSource(versionDir);
  let nodeExecPath: string;
  const wantedNodeVersion = config.getWantedNodeVersion(versionDir);
  const warnings: string[] = []
  if (!opts.useSystemNode) {
    if (wantedNodeVersion) {
      const node = config.getSpecificNodeVersionDir(wantedNodeVersion);
      if (!node.exists) {
        throw new BvmError(`Node.js version ${wantedNodeVersion} is not installed. Try to reinstall the wanted bit CLI version with the --override option`);
      }
      nodeExecPath = path.join(node.versionDir, process.platform === 'win32' ? 'node.exe' : 'bin/node');
    }
  } else if (semver.lt(process.version, wantedNodeVersion)) {
    warnings.push(`The system Node.js is ${process.version} while Bit CLI requires at least Node.js ${wantedNodeVersion}!`)
  }
  const generatedLink = await createShim({
    linkName,
    versionDir,
    source,
    nodeExecPath,
    prependToPath: nodeExecPath ? path.dirname(nodeExecPath) : undefined,
  });

  let previousLinkVersion;
  if (opts.addToConfig){
    previousLinkVersion = config.setLink(linkName, concreteVersion);
  }
  const { pathExtenderReport, warning } = await validateBinDirInPath(getBinDir(), opts);
  if (warning) {
    warnings.push(warning);
  }

  return {
    linkName, 
    previousLinkVersion,
    version: concreteVersion,
    generatedLink,
    pathExtenderReport,
    warnings,
  }
}

type CreateShimOpts = {
  linkName: string,
  versionDir: string,
  // relative to versionDir
  source: string,
  nodeExecPath?: string,
  prependToPath?: string,
}

/**
 * Points `<bvm dir>/links/<linkName>` at the version directory and writes the
 * `<linkName>` shim (in ~/bin, or in the bvm directory on Windows) that runs `source` from it.
 */
async function createShim({ linkName, versionDir, source, nodeExecPath, prependToPath }: CreateShimOpts): Promise<GeneratedLink> {
  const pkg = {
    bin: {
      [linkName]: source
    }
  };
  const binOpts = {
    path: versionDir,
    pkg,
    global: true,
    top: true,
    force: true,
  }
  const rawGeneratedLinks = binLinks.getPaths(binOpts);
  const generatedLink = {
    source: versionDir,
    target: rawGeneratedLinks[0]
  }
  const currentDir = path.join(config.getBvmDirectory(), 'links', linkName)
  await symlinkDir(generatedLink.source, currentDir)
  await cmdShim(path.join(currentDir, source), generatedLink.target, {
    // Unsigned PowerShell scripts are not allowed on Windows with default settings,
    // so it is better to not use them.
    createPwshFile: false,
    nodeExecPath,
    prependToPath,
  });
  return generatedLink;
}

function getBinDir(): string {
  if (IS_WINDOWS){
    return config.getBvmDirectory();
  }
  return path.join(os.homedir(), 'bin');
}

export type BitxLinkOptions = {
  addToConfig?: boolean
  addToPathIfMissing?: boolean
  useSystemNode?: boolean
}

/**
 * Links an installed bitx (the next Bit) version.
 * bitx is a native executable, so the shim runs it directly. Unless `useSystemNode` is set,
 * the shim puts the Node.js that was installed for this bitx version first on the PATH,
 * since bitx runs Node.js for env-related work (compile, test, build, start...).
 */
export async function linkBitx(linkName: string | undefined, version: string, opts: BitxLinkOptions = {}): Promise<LinkResult> {
  const concreteLinkName = linkName || config.getBitxLinkName();
  if (!concreteLinkName) throw new BvmError('bitx link name is empty');
  const { versionDir } = config.getSpecificBitxVersionDir(version);
  const conflictingBitVersion = config.getLinks()[concreteLinkName];
  const metadata = readBitxMetadata(versionDir);
  if (!metadata) {
    throw new BvmError(`bitx version ${version} is not installed`);
  }
  const source = getBitxLinkSource(versionDir);
  const warnings: string[] = [];
  let prependToPath: string | undefined;
  if (!opts.useSystemNode && metadata.node) {
    const node = config.getSpecificNodeVersionDir(metadata.node);
    if (!node.exists) {
      throw new BvmError(`Node.js version ${metadata.node} is not installed. Try to reinstall bitx with "bvm install --next ${version} --override"`);
    }
    prependToPath = IS_WINDOWS ? node.versionDir : path.join(node.versionDir, 'bin');
  }
  const generatedLink = await createShim({
    linkName: concreteLinkName,
    versionDir,
    source,
    prependToPath,
  });
  // linking bitx replaces a Bit link that uses the same name
  config.delLink(concreteLinkName);
  let previousLinkVersion;
  if (opts.addToConfig) {
    previousLinkVersion = config.setBitxLink(concreteLinkName, version);
  }
  const { pathExtenderReport, warning } = await validateBinDirInPath(getBinDir(), opts);
  if (warning) {
    warnings.push(warning);
  }
  return {
    linkName: concreteLinkName,
    previousLinkVersion,
    version,
    generatedLink,
    pathExtenderReport,
    warnings,
  };
}

/**
 * Relinks every bitx link that is saved in the config.
 */
export async function linkAllBitx(opts: { addToPathIfMissing?: boolean, useSystemNode?: boolean }): Promise<LinkResult[]> {
  const links = config.getBitxLinks();
  return Promise.all(Object.entries(links).map(([linkName, version]) => {
    return linkBitx(linkName, version, {
      addToConfig: false,
      addToPathIfMissing: opts.addToPathIfMissing,
      useSystemNode: opts.useSystemNode,
    });
  }));
}

async function validateBinDirInPath(binDir: string, opts: { addToPathIfMissing?: boolean } = { addToPathIfMissing: true }): Promise<{ pathExtenderReport?: PathExtenderReport | undefined, warning?: string }> {
  const osPaths = (process.env.PATH || process.env.Path || process.env.path).split(path.delimiter);
  if (osPaths.indexOf(binDir) !== -1) return {};
  if (!opts.addToPathIfMissing) {
    const warningLines = [
      'global Bit install location was not found in your PATH global variable.',
      missingInPathError(binDir),
      '',
    ];
    return { warning: warningLines.join('\n') };
  } else {
    try {
      const pathExtenderReport = await addDirToEnvPath(binDir, {
        overwrite: true,
        position: 'end',
        configSectionName: 'bit',
      });
      return { pathExtenderReport };
    } catch (err) {
      if (err.code === 'ERR_PNPM_UNKNOWN_SHELL') {
        return {
          warning: `Couldn't update the system PATH because failed to detect the active shell.
You can either set the SHELL env variable to your shell name (e.g., "SHELL=bash bvm install")
or ${missingInPathError(binDir)}`
        };
      }
      return {
        warning: `Couldn't update the system path: ${err.message}
${missingInPathError(binDir)}`
      }
    }
  }
}

function missingInPathError(binDir: string) {
  if (IS_WINDOWS) {
    return `run the following command and then re-open the terminal:
setx path "%path%;${binDir}" and re-open your terminal
for more information read here - ${WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL}`;
  }
  return `add the following to your bash/zsh profile then re-open the terminal:
export PATH=$HOME/bin:$PATH
for more information read here - ${MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL}`;
}

