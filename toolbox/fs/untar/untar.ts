
import path from 'path';
import fs from 'fs-extra';
import tar from 'tar-fs';
import util from 'util';
import {pipeline} from 'stream';
const streamPipeline = util.promisify(pipeline);

export async function untar(filePath: string, folder?: string){
  const exists = fs.pathExists(filePath);
  if (!exists) throw new Error(`file ${filePath} does not exist`);
  if (folder) fs.ensureDir(folder);
  const finalFolder = folder || path.dirname(filePath);
  // const stream = fs.createReadStream(filePath).pipe(tar.extract(finalFolder));
  await streamPipeline(fs.createReadStream(filePath), tar.extract(finalFolder));
  return;
}