import fs from 'fs';
import path from 'path';
import { BvmError } from '@teambit/bvm.error';

/**
 * Written to the root of every installed bitx version once its installation completes.
 * A bitx version directory without it is an interrupted installation.
 */
export const BITX_METADATA_FILE = 'bvm-bitx.json';

export type BitxMetadata = {
  version: string,
  // the npm package the version was installed from, and the platform package that holds the executable
  package: string,
  platformPackage: string,
  // the Node.js version installed for this bitx version (undefined when the system Node.js is used)
  node?: string,
  installedAt: string,
};

export function getBitxExecutableName(platform = process.platform): string {
  return platform === 'win32' ? 'bitx.exe' : 'bitx';
}

export function readBitxMetadata(versionDir: string): BitxMetadata | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(versionDir, BITX_METADATA_FILE), 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * The bitx executable inside an installed bitx version, relative to the version directory.
 */
export function getBitxLinkSource(versionDir: string, platform = process.platform): string {
  const source = path.join('bin', getBitxExecutableName(platform));
  const filename = path.join(versionDir, source);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new BvmError(`the bitx executable is missing at ${filename}. reinstall bitx with "bvm install --next --override"`);
    }
    throw error;
  }
  if (!stat.isFile()) throw new BvmError(`the bitx executable is not a regular file: ${filename}`);
  if (platform !== 'win32') fs.accessSync(filename, fs.constants.X_OK);
  return source;
}
