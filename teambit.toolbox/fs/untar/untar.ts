
import path from 'path';
import fs from 'fs-extra';
import tar from 'tar-fs';
import util from 'util';
import ora from 'ora';
import { timeFormat } from '@teambit/time.time-format';
import {pipeline} from 'stream';

const streamPipeline = util.promisify(pipeline);

const loader = ora();

export type UntarOptions = {
  showLoader?: boolean;
}

export async function untar(filePath: string, folder?: string, opts?: UntarOptions){
  const {showLoader = true} = opts || {};
  let untarLoaderText;
  let untarStartTime;
  if (showLoader){
    untarLoaderText = `extracting ${filePath}`;
    loader.start(untarLoaderText);
    untarStartTime = Date.now();
  }
  const exists = fs.pathExists(filePath);
  if (!exists) throw new Error(`file ${filePath} does not exist`);
  if (folder) fs.ensureDir(folder);
  const finalFolder = folder || path.dirname(filePath);
  // const stream = fs.createReadStream(filePath).pipe(tar.extract(finalFolder));
  await streamPipeline(fs.createReadStream(filePath), tar.extract(finalFolder));
  if (showLoader){
    const untarEndTime = Date.now();
    const untarTimeDiff = timeFormat(untarEndTime - untarStartTime);
    loader.succeed(`${untarLoaderText} in ${untarTimeDiff}`);
    loader.stop();
  }
  return;
}