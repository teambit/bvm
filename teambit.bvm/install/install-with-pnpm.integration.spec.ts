import fs from 'fs';
import os from 'os';
import path from 'path';
import { installWithPnpm } from './install-with-pnpm';

const lockfile = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@teambit/bit':
        specifier: npm:is-positive@3.1.0
        version: is-positive@3.1.0

packages:

  is-positive@3.1.0:
    resolution: {integrity: sha512-8ND1j3y9/HP94TOvGzr69/FgbkX2ruOldhLEsTWwcJVfo4oRjwemJmJxt7RJkKYH8tz7vYBP9JcKQY8CLuJ90Q==}
    engines: {node: '>=0.10.0'}

snapshots:

  is-positive@3.1.0: {}
`;

describe('installWithPnpm integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-install-integration-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('produces a usable Bit installation via @pnpm/napi', async () => {
    const lockfilePath = path.join(tempDir, 'pnpm-lock.yaml');
    fs.writeFileSync(lockfilePath, lockfile);
    const dest = path.join(tempDir, 'versions', '1.0.0', 'bit-1.0.0');

    await installWithPnpm('1.0.0', dest, {
      registry: 'https://registry.npmjs.org/',
      lockfilePath,
    });

    // The fixture aliases a small package as @teambit/bit so this exercises
    // BVM's real locked-install path without downloading the full Bit package.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const installedBit = require(path.join(dest, 'node_modules', '@teambit', 'bit'));
    expect(installedBit(1)).toBe(true);
    expect(installedBit(-1)).toBe(false);
  }, 180_000);
});
