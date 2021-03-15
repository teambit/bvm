import fs from 'fs-extra';
import path from 'path';
import fetch from 'node-fetch';
import Progress from 'node-fetch-progress';
import cliProgress from 'cli-progress';
import util from 'util';
import { pipeline } from 'stream';
import { BvmError } from '@teambit/bvm.error';

const streamPipeline = util.promisify(pipeline);

export type DownloadOpts = {
  ensureDir: boolean;
  overrideExisting: boolean;
};

const defaults: DownloadOpts = {
  ensureDir: true,
  overrideExisting: false,
};

export async function download(url: string, destination: string, opts: DownloadOpts = defaults): Promise<void> {
  const bar = new cliProgress.SingleBar({
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    stopOnComplete: true,
    clearOnComplete: true,
    format: '[{bar}] {percentage}% | ETA: {etah} | Speed: {speed}',
  });
  const finalOpts = Object.assign({}, defaults, opts);
  const exists = await fs.pathExists(destination);
  if (exists && !finalOpts.overrideExisting) {
    throw new BvmError(`path ${destination} already exists`);
  }
  const dirname = path.dirname(destination);
  if (finalOpts.ensureDir) {
    await fs.ensureDir(dirname);
  }
  const response = await fetch(url);
  const progress = new Progress(response, { throttle: 100 });

  bar.start(1, 0, { speed: 'N/A' });
  progress.on('progress', (p: any) => bar.update(p.progress, { speed: p.rateh, etah: p.etah }));
  if (!response.ok) throw new BvmError(`unexpected response ${response.statusText}`);
  await streamPipeline(response.body, fs.createWriteStream(destination));
  return;
}
