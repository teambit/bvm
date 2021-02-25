import {listVersions as artifactoryListVersions} from '@teambit/bvm.artifactory.list';
export type RemoteVersion = {
  version: string,
  url: string
}
export type RemoteVersionList = Array<RemoteVersion>

export async function listRemote(): Promise<RemoteVersionList> {
  return artifactoryListVersions('dev');
}

export function listLocal(){}