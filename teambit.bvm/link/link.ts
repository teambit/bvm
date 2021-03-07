import {Config} from '@teambit/bvm.config';
import path from 'path';
import binLinks from 'bin-links';
import { BvmError } from '@teambit/bvm.error';
import os from 'os';

const IS_WINDOWS = os.platform() === 'win32';
const DOCS_BASE_URL = 'https://harmony-docs.bit.dev/tutorial/install-bit';
const WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/tutorial/install-bit`;
const MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL = `${DOCS_BASE_URL}/tutorial/install-bit`;

const config = Config.load();

export type LinkResult = {
  linkName: string,
  version: string
}

export async function linkAll(): Promise<LinkResult[]>{
  const links = config.getLinks();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version, false);
  });
  return Promise.all(promises);
}

export async function linkOne(linkName: string, version: string, addToConfig = false): Promise<LinkResult> {
  const source = getLinkSource();
  const {versionDir, exists} = config.getSpecificVersionDir(version, true);
  if (!exists){
    throw new BvmError(`version ${version} is not installed`);
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
  // const generatedLinks = binLinks.getPaths(opts);
  // console.log('generated links', generatedLinks)
  await binLinks(opts);


  if (addToConfig){
    config.setLink(linkName, version);
  }
  let binDir = path.join(os.homedir(), 'bin');
  if (IS_WINDOWS){
    binDir = config.getBvmDirectory();
  }
  validateBinDirInPath(binDir);

  return {
    linkName, 
    version
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
    throw new BvmError(err);
  }
}

function windowsMissingInPathError(binDir: string, docsLink){
  // Join with \n for better visibility in windows
  const errLines = [
    'global Bit install location was not found in your PATH global variable.',
    'please run the following command and then re-open the terminal:',
    `setx path "%path%;${binDir}" and re-open your terminal`,
    `for more information read here - ${docsLink}`
  ];
  return errLines.join('\n');
}

function macLinuxMissingInPathError(binDir: string, docsLink){
  // Join with \n for better visibility in windows
  const errLines = [
    'global Bit install location was not found in your PATH global variable.',
    'please run the following command to your bash/zsh profile then re-open the terminal:',
    `export PATH=$HOME/bin:$PATH" and re-open your terminal`,
    `for more information read here - ${docsLink}`
  ];
  return errLines.join('\n');
}

