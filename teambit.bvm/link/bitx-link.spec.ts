import fs from 'fs';
import os from 'os';
import path from 'path';
import { getBitxLinkSource, readBitxMetadata, BITX_METADATA_FILE } from './bitx-link';

describe('bitx link helpers', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-bitx-link-'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  describe('getBitxLinkSource', () => {
    it('selects bin/bitx on Unix', () => {
      fs.mkdirSync(path.join(root, 'bin'));
      fs.writeFileSync(path.join(root, 'bin/bitx'), 'native fixture', { mode: 0o755 });
      expect(getBitxLinkSource(root, 'linux')).toEqual(path.join('bin', 'bitx'));
    });

    it('selects bin/bitx.exe on Windows', () => {
      fs.mkdirSync(path.join(root, 'bin'));
      fs.writeFileSync(path.join(root, 'bin/bitx.exe'), 'native fixture');
      expect(getBitxLinkSource(root, 'win32')).toEqual(path.join('bin', 'bitx.exe'));
    });

    it('fails with a reinstall hint when the executable is missing', () => {
      expect(() => getBitxLinkSource(root, 'linux')).toThrow('bvm install --next --override');
    });
  });

  it('reads the metadata file and treats a missing one as not installed', () => {
    expect(readBitxMetadata(root)).toBeUndefined();
    fs.writeFileSync(path.join(root, BITX_METADATA_FILE), JSON.stringify({ version: '0.1.0', node: '22.23.4' }));
    expect(readBitxMetadata(root)).toEqual({ version: '0.1.0', node: '22.23.4' });
  });
});
