import {download, DownloadOpts} from '@teambit/bvm.download.api';

export type InstallOpts = {
  override?: boolean
}

const defaultOpts = {
  override: false
}

export async function installVersion(version: string, opts: InstallOpts = defaultOpts): Promise<string>{
  const concreteOpts = Object.assign({}, defaultOpts, opts);
  const downloadOpts: DownloadOpts = {
    override: concreteOpts.override
  }
  return download(version, downloadOpts);
}