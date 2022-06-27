import { addDirToEnvPath, ConfigFileChangeType, ConfigReport, PathExtenderReport } from '@pnpm/os.env.path-extender';
import {Config} from '@teambit/bvm.config';
import {listLocal} from '@teambit/bvm.list';
import cmdShim from '@zkochan/cmd-shim';
import path from 'path';
import binLinks from 'bin-links';
import { BvmError } from '@teambit/bvm.error';
import os from 'os';
import chalk from 'chalk';

const IS_WINDOWS = os.platform() === 'win32';
const DOCS_BASE_URL = 'https://bit.dev/docs';
const WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/reference/using-bvm#troubleshooting`;
const MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/reference/using-bvm#troubleshooting`;

const config = Config.load();

export type LinkResult = {
  linkName: string,
  version: string,
  previousLinkVersion?: string,
  generatedLink: GeneratedLink
  pathExtenderReport?: PathExtenderReport,
}

export { PathExtenderReport, ConfigReport, ConfigFileChangeType }

export type GeneratedLink = {
  source: string,
  target: string
}

export async function linkAll(opts: { addToPathIfMissing?: boolean }): Promise<LinkResult[]>{
  const links = config.getLinks();
  const defaultLinkVersion = config.getDefaultLinkVersion();
  const localLatest = (await listLocal()).latest();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version, { addToConfig: false, addToPathIfMissing: opts.addToPathIfMissing });
  });
  if (!defaultLinkVersion && localLatest){
    const defaultLinkName = config.getDefaultLinkName();
    promises.push(linkOne(defaultLinkName, localLatest.version, { addToConfig: true, addToPathIfMissing: opts.addToPathIfMissing }))
  }
  return Promise.all(promises);
}

export interface LinkOptions {
  addToConfig?: boolean
  addToPathIfMissing?: boolean
  nodeExecPath?: string
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
  const {versionDir, exists} = config.getSpecificVersionDir(concreteVersion, true);
  if (!exists){
    throw new BvmError(`version ${concreteVersion} is not installed`);
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
  await cmdShim(path.join(versionDir, source), rawGeneratedLinks[0], {
    // Unsigned PowerShell scripts are not allowed on Windows with default settings,
    // so it is better to not use them.
    createPwshFile: false,
    nodeExecPath: opts.nodeExecPath,
  });
  const generatedLink = {
    source: versionDir,
    target: rawGeneratedLinks[0]
  }

  let previousLinkVersion;
  if (opts.addToConfig){
    previousLinkVersion = config.setLink(linkName, concreteVersion);
  }
  let binDir = path.join(os.homedir(), 'bin');
  if (IS_WINDOWS){
    binDir = config.getBvmDirectory();
  }
  const pathExtenderReport = await validateBinDirInPath(binDir, opts);

  return {
    linkName, 
    previousLinkVersion,
    version: concreteVersion,
    generatedLink,
    pathExtenderReport,
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

async function validateBinDirInPath(binDir: string, opts: { addToPathIfMissing?: boolean } = { addToPathIfMissing: true }): Promise<PathExtenderReport | undefined> {
  const osPaths = (process.env.PATH || process.env.Path || process.env.path).split(path.delimiter);
  if (osPaths.indexOf(binDir) !== -1) return;
  if (!opts.addToPathIfMissing) {
    const err = IS_WINDOWS ? windowsMissingInPathError(binDir, WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL) : macLinuxMissingInPathError(binDir, MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL);
    console.log(chalk.yellowBright(err));
  } else {
    return await addDirToEnvPath(binDir, {
      overwrite: true,
      position: 'end',
      configSectionName: 'bit',
    })
  }
}

function windowsMissingInPathError(binDir: string, docsLink){
  // Join with \n for better visibility in windows
  const errLines = [
    'global Bit install location was not found in your PATH global variable.',
    'please run the following command and then re-open the terminal:',
    `setx path "%path%;${binDir}" and re-open your terminal`,
    `for more information read here - ${docsLink}
    `
  ];
  return errLines.join('\n');
}

function macLinuxMissingInPathError(binDir: string, docsLink){
  // Join with \n for better visibility in windows
  const errLines = [
    'global Bit install location was not found in your PATH global variable.',
    'please add the following to your bash/zsh profile then re-open the terminal:',
    `export PATH=$HOME/bin:$PATH`,
    `for more information read here - ${docsLink}
    `
  ];
  return errLines.join('\n');
}

