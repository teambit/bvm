import path from 'path';

export function findCurrentBvmDir(dir: string): string | null {
  let current = dir;
  let parentDir = dir;
  let parentParentDir = path.dirname(parentDir)
  do {
    current = parentDir;
    parentDir = parentParentDir;
    if (current === parentDir) return null;
    parentParentDir = path.dirname(parentDir)
  } while (path.basename(parentParentDir) !== '.bvm' || path.basename(parentDir) !== 'links');
  return current;
}
