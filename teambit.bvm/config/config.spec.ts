import fs from 'fs';
import os from 'os';
import path from 'path';

describe('bitx config', () => {
  let bvmDir: string;
  const envBackup = { ...process.env };

  beforeEach(() => {
    bvmDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-config-'));
    process.env.BVM_GLOBALS_DIR = bvmDir;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...envBackup };
    fs.rmSync(bvmDir, { recursive: true, force: true });
  });

  function loadConfig() {
    // eslint-disable-next-line global-require
    const { Config } = require('./config');
    return Config.load(true);
  }

  it('has defaults for the bitx settings', () => {
    const config = loadConfig();
    expect(config.getBitxLinkName()).toBe('bitx');
    expect(config.getBitxPackage()).toBe('@cocycles/bitx');
    expect(config.getBitxDistTag()).toBe('next');
    expect(config.getBitxNodeVersion()).toBe('22.23.4');
    expect(config.getBitxVersionsDir()).toBe(path.join(bvmDir, 'bitx', 'versions'));
  });

  it('reads the bitx settings from BVM_ env variables', () => {
    process.env.BVM_BITX_DIST_TAG = 'latest';
    process.env.BVM_BITX_LINK = 'bit-next';
    const config = loadConfig();
    expect(config.getBitxDistTag()).toBe('latest');
    expect(config.getBitxLinkName()).toBe('bit-next');
  });

  it('keeps bitx links separate from Bit links', () => {
    const config = loadConfig();
    config.setLink('bit', '2.2.164');
    const previous = config.setBitxLink('bitx', '0.1.0');
    expect(previous).toBeUndefined();
    expect(config.getLinks()).toEqual({ bit: '2.2.164' });
    expect(config.getBitxLinks()).toEqual({ bitx: '0.1.0' });
    expect(config.getBitxLinkVersion()).toBe('0.1.0');
    expect(config.setBitxLink('bitx', '0.2.0')).toBe('0.1.0');
    const persisted = JSON.parse(fs.readFileSync(path.join(bvmDir, 'config', 'config.json'), 'utf8'));
    expect(persisted).toMatchObject({ 'links.bit': '2.2.164', 'bitx_links.bitx': '0.2.0' });
  });
});
