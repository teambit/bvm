import {Config} from '@teambit/bvm.config';
import {listLocal} from '@teambit/bvm.list';
import path from 'path';
import binLinks from 'bin-links';
import { BvmError } from '@teambit/bvm.error';
import os from 'os';
import chalk from 'chalk';

const IS_WINDOWS = os.platform() === 'win32';
const DOCS_BASE_URL = 'https://harmony-docs.bit.dev';
const WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/introduction/installation`;
const MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/introduction/installation`;

const config = Config.load();

export type LinkResult = {
  linkName: string,
  version: string,
  previousLinkVersion?: string,
  generatedLink: GeneratedLink
}

export type GeneratedLink = {
  source: string,
  target: string
}

export async function linkAll(): Promise<LinkResult[]>{
  const links = config.getLinks();
  const defaultLinkVersion = config.getDefaultLinkVersion();
  const localLatest = (await listLocal()).latest();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version, false);
  });
  if (!defaultLinkVersion && localLatest){
    const defaultLinkName = config.getDefaultLinkName();
    promises.push(linkOne(defaultLinkName, localLatest.version, true))
  }
  return Promise.all(promises);
}

export async function linkDefault(
  version: string | undefined,
  addToConfig = true
): Promise<LinkResult> {
  const defaultLinkName = config.getDefaultLinkName();
  return linkOne(defaultLinkName, version, addToConfig);
}

export async function linkOne(linkName: string, version: string | undefined, addToConfig = false): Promise<LinkResult> {
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
  const opts = {
    path: versionDir,
    pkg,
    global: true,
    top: true,
    force: true,
  }
  const rawGeneratedLinks = binLinks.getPaths(opts);
  const generatedLink = {
    source: versionDir,
    target: rawGeneratedLinks[0]
  }
  await binLinks(opts);

  let previousLinkVersion;
  if (addToConfig){
    previousLinkVersion = config.setLink(linkName, concreteVersion);
  }
  let binDir = path.join(os.homedir(), 'bin');
  if (IS_WINDOWS){
    binDir = config.getBvmDirectory();
  }
  validateBinDirInPath(binDir);

  return {
    linkName, 
    previousLinkVersion,
    version: concreteVersion,
    generatedLink
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

function validateBinDirInPath(binDir: string){
  const osPaths = (process.env.PATH || process.env.Path || process.env.path).split(path.delimiter);
  if (osPaths.indexOf(binDir) === -1) {
    const err = IS_WINDOWS ? windowsMissingInPathError(binDir, WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL) : macLinuxMissingInPathError(binDir, MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL);
    console.log(chalk.yellowBright(err));
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

