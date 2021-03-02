import semver from 'semver';
import {listLocal, listRemote} from '@teambit/bvm.list.api';

export async function latestLocal(): Promise<string | undefined> {
  const allVersions = await listLocal();
  if (!allVersions || !allVersions.length) return undefined;
  return latestFromArray(allVersions);
}

export async function latestRemote(): Promise<string> {
  const allVersions = await listRemote();
  const allVersionsSemvers = allVersions.map(entry => entry.version);
  return latestFromArray(allVersionsSemvers)
}

export function latestFromArray(versions: string[]): string {
  const latest = semver.maxSatisfying(versions, '*');
  return latest;
}