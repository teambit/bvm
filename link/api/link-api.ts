import os from 'os';
import {Config} from '@teambit/bvm.config.api';
import path from 'path';
import {link as linuxMacLink} from './link-mac-linux';


const config = Config.load();

const IS_WINDOWS = os.platform() === 'win32';

export type LinkResult = {
  alias: string,
  version: string
}

export async function linkAll(): Promise<LinkResult[]>{}

export async function linkOne(alias: string, version: string): Promise<LinkResult> {
  const source = getSourcePath(version);
  if (!IS_WINDOWS){
    await linuxMacLink(source, alias);
    return {
      alias, 
      version
    }
  }
}

function getSourcePath(version: string): string {
  const versionsDir = config.getBitVersionsDir();
  const versionDir = path.join(versionsDir, version);
  const innerBinPath = path.join(`bit-${version}`, 'node_modules', '@teambit', 'bit', 'bin', 'bit');
  const source = path.join(versionDir, innerBinPath);
  return source;
}