import os from 'os';
import {Config} from '@teambit/bvm.config';
import path from 'path';
import {link as linuxMacLink} from './link-mac-linux';


const config = Config.load();

const IS_WINDOWS = os.platform() === 'win32';

export type LinkResult = {
  linkName: string,
  version: string
}

export async function linkAll(): Promise<LinkResult[]>{
  const links = config.getLinks();
  const promises = Object.entries(links).map(([linkName, version]) => {
    return linkOne(linkName, version);
  });
  return Promise.all(promises);
}

export async function linkOne(linkName: string, version: string): Promise<LinkResult> {
  const source = getSourcePath(version);
  if (!IS_WINDOWS){
    await linuxMacLink(source, linkName);
    config.setLink(linkName, version);
    return {
      linkName, 
      version
    }
  }
  // TODO: implement for windows
}

function getSourcePath(version: string): string {
  const versionsDir = config.getBitVersionsDir();
  const versionDir = path.join(versionsDir, version);
  const innerBinPath = path.join(`bit-${version}`, 'node_modules', '@teambit', 'bit', 'bin', 'bit');
  const source = path.join(versionDir, innerBinPath);
  return source;
}