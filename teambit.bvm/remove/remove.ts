import {listLocal} from '@teambit/bvm.list'
import {Config} from '@teambit/bvm.config';
import fs from 'fs-extra';
import intersect from 'lodash.intersection';
import difference from 'lodash.difference';
import path from 'path';
import {desc as semverSortDesc} from 'semver-sort';

export type RemoveResults = {
  removedVersions: string[],
  missingVersions: string[]
}

const config = Config.load();

export async function removeVersions(versions: string[]): Promise<RemoveResults> {
  let resolvedVersions = versions;
  const localVersions = await listLocal();
  if (versions.includes('latest')){
    const latestVersion = (await listLocal()).latest().version;
    resolvedVersions = resolvedVersions.filter(version => {
      return (version !== 'latest');
    });
    resolvedVersions.push(latestVersion);
  }
  const missingVersions = difference(resolvedVersions, localVersions.toVersionsStringArray());
  const removedVersions = intersect(resolvedVersions, localVersions.toVersionsStringArray());
  if (!removeVersions.length){
    return {
      missingVersions,
      removedVersions
    };
  }
  const allVersionsDir = config.getBitVersionsDir();
  const promises = removedVersions.map(version => {
    const versionPath = path.join(allVersionsDir, version);
    return fs.remove(versionPath);
  });
  await Promise.all(promises);
  return {
    missingVersions,
    removedVersions
  };
}

export async function removeAll(versionsToKeep: string[] = [], numberOfLatestToKeep: number = 0): Promise<RemoveResults> {
  const localVersions = await listLocal();
  const withoutVersionsToKeep = difference(localVersions.toVersionsStringArray(), versionsToKeep);
  let versionsToRemove = withoutVersionsToKeep;
  if (numberOfLatestToKeep > 0){
    versionsToRemove = semverSortDesc(versionsToRemove);
    versionsToRemove.splice(0, numberOfLatestToKeep);
  }
  return removeVersions(versionsToRemove);
}


