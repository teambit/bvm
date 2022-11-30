import fs from 'fs-extra';
import path from 'path';
import {addSeconds, formatDistanceToNow} from 'date-fns';
import cliProgress from 'cli-progress';
import tar from 'tar';
import prettyBytes from 'pretty-bytes';

export type ExtractOpts = {
  ensureDir?: boolean;
};

const defaults: ExtractOpts = {
  ensureDir: true,
};

export type ProgressBarOpts = {
  barCompleteChar?: string
  barIncompleteChar?: string
  hideCursor?: boolean,
  stopOnComplete?: boolean,
  clearOnComplete?: boolean,
  format?: string
};

const defaultProgressBarOpts: ProgressBarOpts = {
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  stopOnComplete: true,
  clearOnComplete: true,
  format: '[{bar}] {percentage}% | ETA: {etah} | Speed: {speed}',
};

// TODO: support zip files as well
export async function extract(filePath: string, folder?: string, opts: ExtractOpts = defaults, progressBarOpts: ProgressBarOpts = defaultProgressBarOpts): Promise<void> {
  const concreteOpts = Object.assign({}, defaults, opts); 
  const exists = await fs.pathExists(filePath);
  if (!exists) throw new Error(`file ${filePath} does not exist`);
  if (folder) {
    const folderExists = await fs.pathExists(folder);
    if (!folderExists && !concreteOpts.ensureDir){
      throw new Error(`folder ${folder} does not exist`);
    }
    if (!folderExists && concreteOpts.ensureDir){
      fs.ensureDir(folder);
    }
  }
  const finalFolder = folder || path.dirname(filePath);
  const stat = await fs.stat(filePath)
  let maxBytes = stat.size;
  let processedBytes = 0
  const startedAt = Date.now()

  const concreteProgressBarOpts = Object.assign({}, defaultProgressBarOpts, progressBarOpts); 
  const bar = new cliProgress.SingleBar(concreteProgressBarOpts);
  bar.start(maxBytes, 0, { speed: 'N/A' });
  const promise = tar.x({
    file: filePath,
    C: finalFolder,
    onentry: entry => { 
      if (!entry.size){
        return;
      }
      processedBytes += entry.size
      const elapsed = (Date.now() - startedAt) / 1000;
      const rate = processedBytes / elapsed;
      const rateh = `${prettyBytes(rate)}/s`;
      const estimated = maxBytes / rate
      // const progress = this.done / this.total
      const eta = estimated - elapsed
      const etaDate = addSeconds(new Date(), eta)
      const etah = formatDistanceToNow(etaDate, { includeSeconds: true })
      bar.update(processedBytes, { speed: rateh, etah: etah })
    }
  });
  await promise;
  bar.update(stat.size)
  return promise;
}