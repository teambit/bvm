import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// A published bitx release. Installing it exercises the real registry, the pnpm engine
// and the platform package selection.
const BITX_VERSION = '0.1.0-alpha.1';

const supported = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64'].includes(`${process.platform}-${process.arch}`);
const describeIfSupported = supported ? describe : describe.skip;

describeIfSupported('bitx install integration', () => {
  let root: string;
  const envBackup = { ...process.env };
  let bitx: typeof import('./bitx');

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-bitx-integration-'));
    fs.mkdirSync(path.join(root, 'home', 'bin'), { recursive: true });
    // The bvm directory and the shims go to the temp dir. Shims are written next to the
    // bvm directory (<bvm dir>/../bin), so the bvm directory is placed in the fake home.
    process.env.BVM_GLOBALS_DIR = path.join(root, 'home', '.bvm');
    process.env.HOME = path.join(root, 'home');
    process.env.USERPROFILE = path.join(root, 'home');
    jest.resetModules();
    // eslint-disable-next-line global-require
    bitx = require('./bitx');
  });

  afterAll(() => {
    process.env = { ...envBackup };
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs bitx side by side, links it as bitx, and removes it', async () => {
    const results = await bitx.installBitx(BITX_VERSION, {
      addToPathIfMissing: false,
      useSystemNode: true,
    });
    expect(results.installedVersion).toBe(BITX_VERSION);
    expect(results.linkName).toBe('bitx');
    expect(results.warnings.filter((warning) => !warning.includes('PATH'))).toEqual([]);

    const versionDir = path.join(root, 'home', '.bvm', 'bitx', 'versions', BITX_VERSION);
    const metadata = JSON.parse(fs.readFileSync(path.join(versionDir, 'bvm-bitx.json'), 'utf8'));
    expect(metadata).toMatchObject({ version: BITX_VERSION, platformPackage: `@cocycles/bitx-${process.platform}-${process.arch}` });
    // nothing is installed where Bit versions are kept
    expect(fs.existsSync(path.join(root, 'home', '.bvm', 'versions'))).toBe(false);

    const shim = process.platform === 'win32'
      ? path.join(root, 'home', '.bvm', 'bitx.cmd')
      : path.join(root, 'home', 'bin', 'bitx');
    const output = execFileSync(shim, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
    expect(output).toContain(BITX_VERSION);

    expect((await bitx.listLocalBitx()).toVersionsStringArray()).toEqual([BITX_VERSION]);

    // already installed: no download, linked again
    const again = await bitx.installBitx(BITX_VERSION, { addToPathIfMissing: false, useSystemNode: true });
    expect(again.downloadRequired).toBe(false);

    expect(await bitx.removeBitxVersions([BITX_VERSION])).toEqual({ removedVersions: [BITX_VERSION], missingVersions: [] });
    expect(fs.existsSync(versionDir)).toBe(false);
  }, 300_000);
});
