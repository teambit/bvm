import fs from 'fs';
import os from 'os';
import path from 'path';
import nodeFetch from 'node-fetch';
import { installWithPnpm } from './install-with-pnpm';

jest.mock('@pnpm/napi', () => ({
  install: jest.fn(),
  readConfig: jest.fn(() => ({})),
}), { virtual: true });

jest.mock('node-fetch', () => jest.fn(), { virtual: true });

jest.mock('@teambit/toolbox.network.agent', () => ({
  getAgent: jest.fn(),
}), { virtual: true });

jest.mock('@pnpm/logger', () => ({
  streamParser: new (require('events').EventEmitter)(),
}), { virtual: true });

jest.mock('@pnpm/default-reporter', () => ({
  initDefaultReporter: jest.fn(() => jest.fn()),
}), { virtual: true });

jest.mock('@pnpm/lockfile.fs', () => ({
  readWantedLockfile: jest.fn(),
}), { virtual: true });

jest.mock('path-temp', () => jest.fn((parentDir: string) =>
  require('path').join(parentDir, 'bvm-test-temp')
), { virtual: true });

jest.mock('rename-overwrite', () => ({
  sync: (source: string, destination: string) => {
    require('fs').mkdirSync(require('path').dirname(destination), { recursive: true });
    require('fs').renameSync(source, destination);
  },
}), { virtual: true });

jest.mock('rimraf', () => ({
  sync: (target: string) => require('fs').rmSync(target, { recursive: true, force: true }),
}), { virtual: true });

const mockNodeApiInstall = require('@pnpm/napi').install as jest.Mock;

describe('installWithPnpm', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNodeApiInstall.mockResolvedValue(undefined);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-install-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('fails when the lockfile is missing so the caller can fall back to the tarball', async () => {
    (nodeFetch as unknown as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    const dest = path.join(tempDir, 'versions', '2.1.0', 'bit-2.1.0');

    await expect(installWithPnpm('2.1.0', dest, {
      registry: 'https://node-registry.bit.cloud/',
    })).rejects.toThrow(
      'Failed to fetch https://bvm.bit.dev/bit/versions/2.1.0/pnpm-lock.yaml: Not Found'
    );

    expect(mockNodeApiInstall).not.toHaveBeenCalled();
    expect(fs.existsSync(dest)).toBe(false);
  });
});
