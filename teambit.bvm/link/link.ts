import {Config} from '@teambit/bvm.config';
import path from 'path';
import binLinks from 'bin-links';

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
  const {versionDir} = config.getSpecificVersionDir(version, true);
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
  await binLinks(opts);

  if (addToConfig){
    config.setLink(linkName, version);
  }
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