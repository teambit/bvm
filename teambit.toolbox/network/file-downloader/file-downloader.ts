import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import util from 'util';
import {pipeline} from 'stream';
import { BvmError } from '@teambit/bvm.error';

const streamPipeline = util.promisify(pipeline);

export type DownloadOpts = {
  ensureDir: boolean,
  overrideExisting: boolean
}

const defaults: DownloadOpts = {
  ensureDir: true,
  overrideExisting: false
}

export async function download(url: string, destination: string, opts:DownloadOpts = defaults): Promise<void>{
  const finalOpts = Object.assign({}, defaults, opts);
  const exists = await fs.pathExists(destination);
  if (exists && !finalOpts.overrideExisting){
    throw new BvmError(`path ${destination} already exists`);
  }
  const dirname = path.dirname(destination);
  if (finalOpts.ensureDir){
    await fs.ensureDir(dirname);
  }
  const response = await fetch(url);
  if (!response.ok) throw new BvmError(`unexpected response ${response.statusText}`)
  await streamPipeline(response.body, fs.createWriteStream(destination));
  return;
}
