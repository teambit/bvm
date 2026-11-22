import {
  getBitxPlatformPackage,
  getPackumentUrl,
  listVersionsFromPackument,
  resolveBitxVersionFromPackument,
  BitxPackument,
} from './packument';

const packument: BitxPackument = {
  name: '@cocycles/bitx',
  'dist-tags': { latest: '0.1.0', next: '0.2.0-alpha.1' },
  versions: {
    '0.0.0-stage': { version: '0.0.0-stage', stub: true },
    '0.1.0': { version: '0.1.0' },
    '0.2.0-alpha.0': { version: '0.2.0-alpha.0' },
    '0.2.0-alpha.1': { version: '0.2.0-alpha.1' },
  },
  time: {
    '0.1.0': '2026-11-01T00:00:00.000Z',
    '0.2.0-alpha.1': '2026-11-02T00:00:00.000Z',
  },
};

describe('resolveBitxVersionFromPackument', () => {
  it('resolves the default dist-tag when no version is given', () => {
    expect(resolveBitxVersionFromPackument(packument, undefined, 'next')).toBe('0.2.0-alpha.1');
  });

  it('resolves an explicit dist-tag', () => {
    expect(resolveBitxVersionFromPackument(packument, 'latest', 'next')).toBe('0.1.0');
  });

  it('accepts an exact published version', () => {
    expect(resolveBitxVersionFromPackument(packument, '0.2.0-alpha.0', 'next')).toBe('0.2.0-alpha.0');
    expect(resolveBitxVersionFromPackument(packument, 'v0.1.0', 'next')).toBe('0.1.0');
  });

  it('fails for a version that is not published', () => {
    expect(() => resolveBitxVersionFromPackument(packument, '9.9.9', 'next')).toThrow('was not found in the registry');
  });

  it('fails for an unknown dist-tag', () => {
    expect(() => resolveBitxVersionFromPackument(packument, 'beta', 'next')).toThrow('not a bitx version or dist-tag');
  });
});

describe('listVersionsFromPackument', () => {
  it('lists published versions newest first, with their dist-tags, skipping stubs', () => {
    expect(listVersionsFromPackument(packument)).toEqual([
      { version: '0.2.0-alpha.1', released: '2026-11-02T00:00:00.000Z', tags: ['next'] },
      { version: '0.2.0-alpha.0', released: undefined, tags: [] },
      { version: '0.1.0', released: '2026-11-01T00:00:00.000Z', tags: ['latest'] },
    ]);
  });
});

describe('getBitxPlatformPackage', () => {
  it('maps the platform to its package', () => {
    expect(getBitxPlatformPackage('@cocycles/bitx', 'darwin', 'arm64')).toBe('@cocycles/bitx-darwin-arm64');
    expect(getBitxPlatformPackage('@cocycles/bitx', 'win32', 'x64')).toBe('@cocycles/bitx-win32-x64');
  });

  it('fails for an unsupported platform', () => {
    expect(() => getBitxPlatformPackage('@cocycles/bitx', 'win32', 'arm64')).toThrow('not available for win32-arm64');
  });
});

describe('getPackumentUrl', () => {
  it('escapes the scope separator and handles a registry without a trailing slash', () => {
    expect(getPackumentUrl('https://node-registry.bit.cloud/', '@cocycles/bitx')).toBe('https://node-registry.bit.cloud/@cocycles%2fbitx');
    expect(getPackumentUrl('https://registry.example.com/npm', '@cocycles/bitx')).toBe('https://registry.example.com/npm/@cocycles%2fbitx');
  });
});
