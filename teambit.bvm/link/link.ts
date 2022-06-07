import { addDirToEnvPath, ConfigReport, PathExtenderReport } from '@pnpm/os.env.path-extender';
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

export async function linkAll(opts: { updatePath?: boolean }): Promise<LinkResult[]>{
  const links = config.getLinks();
  const defaultLinkVersion = config.getDefaultLinkVersion();
  const localLatest = (await listLocal()).latest();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version, { addToConfig: false, updatePath: opts.updatePath });
  });
  if (!defaultLinkVersion && localLatest){
    const defaultLinkName = config.getDefaultLinkName();
    promises.push(linkOne(defaultLinkName, localLatest.version, { addToConfig: true, updatePath: opts.updatePath }))
  }
  return Promise.all(promises);
}

export interface LinkOptions {
  addToConfig?: boolean
  updatePath?: boolean
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
  const generatedLink = {
    source: versionDir,
    target: rawGeneratedLinks[0]
  }
  await binLinks(binOpts);

  let previousLinkVersion;
  if (opts.addToConfig){
    previousLinkVersion = config.setLink(linkName, concreteVersion);
  }
  let binDir = path.join(os.homedir(), 'bin');
  if (IS_WINDOWS){
    binDir = config.getBvmDirectory();
  }
  await validateBinDirInPath(binDir, opts);

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

async function validateBinDirInPath(binDir: string, opts: { updatePath?: boolean } = { updatePath: true }) {
  const osPaths = (process.env.PATH || process.env.Path || process.env.path).split(path.delimiter);
  if (osPaths.indexOf(binDir) !== -1) return;
  if (!opts.updatePath) {
    const err = IS_WINDOWS ? windowsMissingInPathError(binDir, WINDOWS_INSTALL_TROUBLESHOOTING_DOCS_URL) : macLinuxMissingInPathError(binDir, MAC_LINUX_INSTALL_TROUBLESHOOTING_DOCS_URL);
    console.log(chalk.yellowBright(err));
  } else {
    const report = await addDirToEnvPath(binDir, {
      overwrite: true,
      position: 'end',
      configSectionName: 'bit',
    })
    const output = renderSetupOutput(report)
    if (output) {
      console.log(output)
    }
  }
}

function renderSetupOutput (report: PathExtenderReport): string | undefined {
  if (report.oldSettings === report.newSettings) {
    return undefined
  }
  const output = []
  if (report.configFile) {
    output.push(reportConfigChange(report.configFile))
  }
  output.push(`Next configuration changes were made:
${report.newSettings}
${chalk.blueBright('Setup complete. Open a new terminal to start using Bit.')}
`)
  return output.join('\n')
}

function reportConfigChange (configReport: ConfigReport): string {
  switch (configReport.changeType) {
  case 'created': return `Created ${configReport.path}`
  case 'appended': return `Appended new lines to ${configReport.path}`
  case 'modified': return `Replaced configuration in ${configReport.path}`
  case 'skipped': return `Configuration already up-to-date in ${configReport.path}`
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

