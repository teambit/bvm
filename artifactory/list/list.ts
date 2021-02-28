import {RemoteVersionList} from '@teambit/bvm.list.api';
import {BASE_URL, REPO_NAME, sendRequest, RELEASE_TYPE} from '@teambit/bvm.artifactory.request';

const BASE_API_URL = `api/storage`;

type ListChild = {
  uri: string,
  folder: boolean
}

type RawList = {
  repo : string,
  path : string,
  uri: string,
  created : string,
  createdBy : string,
  lastModified : string,
  modifiedBy : string,
  lastUpdated : string,
  children : ListChild[],
}

export async function listVersions(releaseType: RELEASE_TYPE): Promise<RemoteVersionList> {
  const apiUrl = composeApiUrl(releaseType);
  const response = await sendRequest(apiUrl);
  const rawList: RawList = (await response.json()) as any as RawList;
  return getRemoteListFromRawList(rawList.children, releaseType);
}

function getRemoteListFromRawList(rawList: ListChild[], releaseType: RELEASE_TYPE): RemoteVersionList {
  const list = rawList.map(child => {
    const version = child.uri.replace('/', '');
    const url = composeUrlFromVersion(version, releaseType);
    return {
      version, 
      url
    }
  });
  return list;
}

function composeApiUrl(releaseType: RELEASE_TYPE): string {
  const apiUrl = `${BASE_API_URL}/${REPO_NAME}/${releaseType}`;
  return apiUrl
}

function composeUrlFromVersion(version: string, releaseType: RELEASE_TYPE): string {
  // TODO: consider call the API again to get the real name, for now using convention
  return (`${BASE_URL}/${REPO_NAME}/${releaseType}/${version}/bit-${version}.tar.gz`);
}