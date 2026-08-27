import { parseVersionFromTarFileName } from './parse-version-from-file-name';

describe('parseVersionFromTarFileName', () => {
  it('reads the version from a tar file name that carries an os/arch suffix', () => {
    expect(parseVersionFromTarFileName('bit-1.2.3-darwin-arm64.tar.gz')).toEqual('1.2.3');
    expect(parseVersionFromTarFileName('bit-1.2.3-linux-x64.tar.gz')).toEqual('1.2.3');
    expect(parseVersionFromTarFileName('bit-1.2.3-win-x64.tar.gz')).toEqual('1.2.3');
  });

  it('keeps the pre-release part of the version', () => {
    expect(parseVersionFromTarFileName('bit-1.2.3-bundle.1-darwin-arm64.tar.gz')).toEqual('1.2.3-bundle.1');
    expect(parseVersionFromTarFileName('bit-1.2.3-bundle.1.tar.gz')).toEqual('1.2.3-bundle.1');
  });

  it('reads the version from a tar file name with no os/arch suffix', () => {
    expect(parseVersionFromTarFileName('bit-0.0.740.tar.gz')).toEqual('0.0.740');
  });

  it('accepts a full path', () => {
    expect(parseVersionFromTarFileName('/tmp/some-dir/bit-1.2.3-darwin-arm64.tar.gz')).toEqual('1.2.3');
  });

  it('returns undefined for a file name it does not recognize', () => {
    expect(parseVersionFromTarFileName('bit-not-a-version-darwin-arm64.tar.gz')).toBeUndefined();
    expect(parseVersionFromTarFileName('something-else.tar.gz')).toBeUndefined();
  });
});
