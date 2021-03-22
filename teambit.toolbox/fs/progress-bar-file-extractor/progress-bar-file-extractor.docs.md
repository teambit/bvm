---
description: A small utility to extract a file with CLI progress bar.
labels: ['extract', 'file-system', 'progress bar', 'untar']
---

A small utility to extract a file with CLI progress bar.

## API:

```js

export async function extract(filePath: string, folder?: string, opts: ExtractOpts = defaults, progressBarOpts: ProgressBarOpts = defaultProgressBarOpts): Promise<void>

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
```

The default folder is the the filePath containing folder.

### ProgressBar tokens
The progress bar tokens that available to use are: `bar`, `percentage`, `etah`, `speed`