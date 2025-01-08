import fs from 'fs';
import { getConfig } from '@pnpm/config';
import { add } from '@pnpm/plugin-commands-installation';

export async function installWithPnpm(version: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  const cliOptions = {
    argv: [],
    dir: dest,
    registry: 'https://node-registry.bit.cloud/',
  }
  const { config } = await getConfig({
    cliOptions,
    packageManager: { name: '@teambit/bvm', version: '' },
  });
  await add.handler({
    ...config,
    argv: { original: [] },
    cliOptions,
  }, [`@teambit/bit@${version}`])
}
