import fs from 'fs';
import path from 'path';
import { getConfig } from '@pnpm/config';
import { install } from '@pnpm/plugin-commands-installation';
import { readWantedLockfile } from '@pnpm/lockfile.fs';

export async function installWithPnpm(fetch, version: string, dest: string) {
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

  const lockfile = await readWantedLockfile(dest, { ignoreIncompatible: false });
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    dependencies: {
      '@teambit/bit': lockfile?.importers['.'].specifiers['@teambit/bit'],
    },
    pnpm: {
      overrides: lockfile?.overrides ?? {},
    },
  }, null, 2), 'utf8');
  const cliOptions = {
    argv: [],
    dir: dest,
    registry: 'https://node-registry.bit.cloud/',
  }
  const { config } = await getConfig({
    cliOptions,
    packageManager: { name: '@teambit/bvm', version: '' },
  });
  await install.handler({
    ...config,
    argv: { original: [] },
    frozenLockfile: true,
    nodeLinker: 'hoisted',
    cliOptions,
  });
}
