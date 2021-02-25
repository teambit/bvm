import fetch, {RequestInit} from 'node-fetch';

export const BASE_URL = 'https://bitsrc.jfrog.io/artifactory';
export const REPO_NAME = 'bvm';
export type RELEASE_TYPE = 'dev' | 'prod';

export function sendRequest(apiPath: string, opts?: RequestInit){
  const url = composeUrl(apiPath);
  return fetch(url, opts);
}

function composeUrl(apiPath: string): string {
  const apiPathWithSuffix = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `${BASE_URL}${apiPathWithSuffix}`;
}