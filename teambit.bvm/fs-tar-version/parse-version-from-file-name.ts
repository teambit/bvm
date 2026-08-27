import { basename } from 'path';
import semver from 'semver';

const ARCHIVE_EXTENSION = /\.(tar\.gz|tgz|tar)$/;

/**
 * the os/arch suffix bvm's tar files carry, e.g. "bit-1.2.3-darwin-arm64.tar.gz".
 * it has to be stripped explicitly rather than by a semver check, because "1.2.3-darwin-arm64" is
 * itself a valid semver (a "darwin-arm64" pre-release), so a check alone would swallow it.
 */
const PLATFORM_SUFFIX = /-(linux|darwin|win|windows_nt|macos)-(x64|arm64)$/i;

const FILE_NAME_PREFIX = 'bit-';

/**
 * read the bit version out of a tar file name, e.g. "bit-1.2.3-darwin-arm64.tar.gz" -> "1.2.3".
 *
 * a pre-release version contains dashes of its own ("1.2.3-bundle.1"), so the version is not the
 * second dash-delimited segment of the name. returns undefined when the name is not recognized.
 */
export function parseVersionFromTarFileName(filePath: string): string | undefined {
  const withoutExtension = basename(filePath).replace(ARCHIVE_EXTENSION, '');
  if (!withoutExtension.startsWith(FILE_NAME_PREFIX)) return undefined;
  const version = withoutExtension.slice(FILE_NAME_PREFIX.length).replace(PLATFORM_SUFFIX, '');
  return semver.valid(version) ? version : undefined;
}
