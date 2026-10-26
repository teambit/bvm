import { spawnSync } from 'child_process';
import cmdShim from '@zkochan/cmd-shim';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getLinkSource } from './link-source';

describe('packaged CLI entry', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-entry-'));
    fs.mkdirSync(path.join(root, 'bin'));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('keeps the Node entry for an existing installation without a native executable', () => {
    expect(getLinkSource(root)).toEqual(path.join('node_modules', '@teambit', 'bit', 'bin', 'bit'));
  });

  it('selects the native executable on Unix', () => {
    fs.writeFileSync(path.join(root, 'bin/bit'), 'native fixture', { mode: 0o755 });
    expect(getLinkSource(root, 'linux')).toEqual(path.join('bin', 'bit'));
  });

  it('selects the exe entry on Windows', () => {
    fs.writeFileSync(path.join(root, 'bin/bit.exe'), 'native fixture');
    expect(getLinkSource(root, 'win32')).toEqual(path.join('bin', 'bit.exe'));
  });

  it('does not mistake an executable for another platform for the current entry', () => {
    fs.writeFileSync(path.join(root, 'bin/bit.exe'), 'native fixture');
    expect(getLinkSource(root, 'linux')).toEqual(path.join('node_modules', '@teambit', 'bit', 'bin', 'bit'));
  });

  it('rejects an invalid native entry instead of linking it', () => {
    fs.mkdirSync(path.join(root, 'bin/bit'));
    expect(() => getLinkSource(root, 'linux')).toThrow('not a regular file');
  });

  const unixTest = process.platform === 'win32' ? it.skip : it;
  unixTest('rejects a native entry without executable permissions', () => {
    fs.writeFileSync(path.join(root, 'bin/bit'), 'native fixture', { mode: 0o644 });
    expect(() => getLinkSource(root, 'linux')).toThrow();
  });
});

const unixTest = process.platform === 'win32' ? it.skip : it;
unixTest.each(['native', 'node'])('executes the %s entry through the generated shim', async (entry) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm shim '));
  try {
    const script = 'console.log(JSON.stringify(process.argv.slice(1))); process.exit(23)';
    let args: string[];
    if (entry === 'native') {
      fs.mkdirSync(path.join(root, 'bin'));
      fs.copyFileSync(process.execPath, path.join(root, 'bin/bit'));
      fs.chmodSync(path.join(root, 'bin/bit'), 0o755);
      args = ['-e', script, '--', 'argument with spaces', 'λ'];
    } else {
      const filename = path.join(root, 'node_modules/@teambit/bit/bin/bit');
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, '#!/usr/bin/env node\n' + script.replace('slice(1)', 'slice(2)'));
      args = ['argument with spaces', 'λ'];
    }
    const target = path.join(root, 'shims/bit');
    await cmdShim(path.join(root, getLinkSource(root)), target, {
      createPwshFile: false,
      nodeExecPath: process.execPath,
      prependToPath: path.dirname(process.execPath),
    });
    const result = spawnSync(target, args, { encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(23);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual(['argument with spaces', 'λ']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
