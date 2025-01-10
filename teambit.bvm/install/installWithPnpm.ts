import fs from 'fs';
import path from 'path';
import { getConfig } from '@pnpm/config';
import { streamParser } from '@pnpm/logger';
import { initDefaultReporter } from '@pnpm/default-reporter';
import { install } from '@pnpm/plugin-commands-installation';
import { readWantedLockfile } from '@pnpm/lockfile.fs';

export async function installWithPnpm(fetch, version: string, dest: string) {
  await fetchLockfile(fetch, version, dest);
  await createPackageJsonFile(dest);

  const cliOptions = {
    argv: [],
    dir: dest,
    registry: 'https://node-registry.bit.cloud/',
  }
  const { config } = await getConfig({
    cliOptions,
    packageManager: { name: '@teambit/bvm', version: '' },
  });
  const stopReporting = initDefaultReporter({
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
  await install.handler({
    ...config,
    argv: { original: [] },
    frozenLockfile: true,
    nodeLinker: 'hoisted',
    cliOptions,
    ignoreScripts: true,
  });
  // pnpm is doing some actions in workers.
  // We need to finish them, when we're done.
  await global['finishWorkers']();
  stopReporting();
}

async function fetchLockfile(fetch, version: string, dest: string): Promise<void> {
  const url = `https://bvm.bit.dev/bit/versions/${version}/pnpm-lock.yaml`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

  const lockfilePath = path.join(dest, 'pnpm-lock.yaml');
  const fileStream = fs.createWriteStream(lockfilePath);

  fs.mkdirSync(dest, { recursive: true })
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
