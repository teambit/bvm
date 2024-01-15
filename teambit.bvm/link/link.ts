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
  const source = getLinkSource();
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
    prependToPath: nodeExecPath ? path.dirname(nodeExecPath) : undefined,
  });

  let previousLinkVersion;
  if (opts.addToConfig){
    previousLinkVersion = config.setLink(linkName, concreteVersion);
  }
  let binDir = path.join(os.homedir(), 'bin');
  if (IS_WINDOWS){
    binDir = config.getBvmDirectory();
  }
  const { pathExtenderReport, warning } = await validateBinDirInPath(binDir, opts);
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

function getLinkSource(): string {
  const bitBinPath = getBitBinPath();
  const source = path.join('.', 'node_modules', bitBinPath);
  return source;
}

function getBitBinPath(){
  return path.join('@teambit', 'bit', 'bin', 'bit');
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

