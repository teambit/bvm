import { getGcpList, ReleaseType } from '@teambit/bvm.list';
import { Release } from '@teambit/bvm.list';


export async function updateReleaseEntry(version: string, releaseTypeUpdates: Partial<Record<ReleaseType, boolean>>): Promise<Release> {
  const gcpList = getGcpList();
  return gcpList.updateReleaseEntry(version, releaseTypeUpdates);
}