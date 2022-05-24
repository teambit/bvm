import { timeFormat } from '@teambit/toolbox.time.time-format';
import fs, {CopyOptions} from 'fs-extra';
import {basename, dirname, join} from 'path';

type LoaderOpts = {
  loader: any
}
type CopyToDirOpts = CopyOptions & Partial<LoaderOpts>
type CopyWithLoaderOpts = CopyOptions & LoaderOpts

export class FsTarVersion {
  constructor(public path: string){}
  
  get fileName() {
    return basename(this.path);
  }
  get dirName() {
    return dirname(this.path);
  }
  get version() {
    return this.fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/\.[^/.]+$/, '')
      .split('-')[1];
  }

  async copyToDir(destinationDir: string, opts: CopyToDirOpts): Promise<FsTarVersion> {
    if (this.dirName === destinationDir) return this;
    const destination = join(destinationDir, this.fileName);
    if (opts.loader){
      await copyWithLoader(this.path, destination, opts as CopyWithLoaderOpts);
    } else {
      await fs.copy(this.path, destination, opts);
    }
    return new FsTarVersion(destination);
  }
}


async function copyWithLoader(src: string, target: string, opts: CopyWithLoaderOpts): Promise<void> {
  const copyLoaderText = `copy from ${src} to ${target}`;
  opts.loader.start(copyLoaderText);
  const moveStartTime = Date.now();
  await fs.copy(src, target, opts);
  const moveEndTime = Date.now();
  const moveTimeDiff = timeFormat(moveEndTime - moveStartTime);
  opts.loader.succeed(`${copyLoaderText} in ${moveTimeDiff}`);
}