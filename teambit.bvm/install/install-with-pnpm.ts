import fs from 'fs';
import path from 'path';
import { getConfig, type Config } from '@pnpm/config';
import { streamParser } from '@pnpm/logger';
import { initDefaultReporter } from '@pnpm/default-reporter';
import { install } from '@pnpm/plugin-commands-installation';
import { readWantedLockfile } from '@pnpm/lockfile.fs';
import pathTemp from 'path-temp';
import { sync as renameOverwrite } from 'rename-overwrite';
import { sync as rimraf } from 'rimraf';

export async function installWithPnpm(fetch, version: string, dest: string, opts: { registry: string; lockfilePath?: string }) {
  const tempDest = pathTemp(path.dirname(path.dirname(dest)));
  try {
    fs.mkdirSync(tempDest, { recursive: true })
    const lockfileDestPath = path.join(tempDest, 'pnpm-lock.yaml');
    if (opts.lockfilePath) {
      fs.copyFileSync(opts.lockfilePath, lockfileDestPath);
    } else {
      await fetchLockfile(fetch, version, lockfileDestPath);
    }
    await createPackageJsonFile(tempDest);

    const cliOptions = {
      argv: [],
      dir: tempDest,
      registry: opts.registry,
    }
    const { config } = await getConfig({
      cliOptions,
      packageManager: { name: '@teambit/bvm', version: '' },
    });
    const stopReporting = initReporter(config);
    await install.handler({
      ...config,
      argv: { original: [] },
      frozenLockfile: true,
      nodeLinker: 'hoisted',
      cliOptions,
      ignoreScripts: true,
      pnpmfile: Array.isArray(config.pnpmfile) ? config.pnpmfile : [config.pnpmfile],
    });
    // pnpm is doing some actions in workers.
    // We need to finish them, when we're done.
    await global['finishWorkers']();
    stopReporting();
    renameOverwrite(tempDest, dest);
  } catch (error) {
    try {
      rimraf(tempDest);
    } catch {
      // Ignore
    }
    throw error;
  }
}

async function fetchLockfile(fetch, version: string, lockfilePath: string): Promise<void> {
  const url = `https://bvm.bit.dev/bit/versions/${version}/pnpm-lock.yaml`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

  const fileStream = fs.createWriteStream(lockfilePath);

  response.body.pipe(fileStream);

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => resolve());
    fileStream.on('error', (err: Error) => reject(err));
  });
}

async function createPackageJsonFile(dest: string) {
  const lockfile = await readWantedLockfile(dest, { ignoreIncompatible: false });
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    dependencies: {
      '@teambit/bit': lockfile?.importers['.'].specifiers['@teambit/bit'],
    },
    pnpm: {
      overrides: lockfile?.overrides ?? {},
    },
  }, null, 2), 'utf8');
}

function initReporter(config: Config) {
  return initDefaultReporter({
    context: {
      argv: [],
      config,
    },
    reportingOptions: {
      appendOnly: false,
      throttleProgress: 200,
      hideProgressPrefix: true,
    },
    streamParser: streamParser as any, // eslint-disable-line
  });
}
