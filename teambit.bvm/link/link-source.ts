import fs from 'fs';
import path from 'path';

/** Select the packaged native entry when present, retaining the Node CLI for older versions. */
export function getLinkSource(versionDir: string, platform = process.platform): string {
  const source = path.join('bin', platform === 'win32' ? 'bit.exe' : 'bit');
  const filename = path.join(versionDir, source);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return path.join('node_modules', '@teambit', 'bit', 'bin', 'bit');
  }
  if (!stat.isFile()) throw new Error(`Packaged native CLI is not a regular file: ${filename}`);
  if (platform !== 'win32') fs.accessSync(filename, fs.constants.X_OK);
  return source;
}
