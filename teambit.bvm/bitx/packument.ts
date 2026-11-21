import semver from 'semver';
import { BvmError } from '@teambit/bvm.error';

export type BitxPackument = {
  name: string;
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, { version: string; stub?: boolean; deprecated?: string; bvm?: { node?: string } }>;
  time?: Record<string, string>;
};

export type BitxRemoteVersion = {
  version: string;
  released?: string;
  tags: string[];
};

/**
 * Supported platforms, as `${process.platform}-${process.arch}`.
 * Each one is published as its own package (`<bitx package>-<platform>`) that holds only the executable.
 */
export const BITX_SUPPORTED_PLATFORMS = ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64'];

export function getBitxPlatformPackage(packageName: string, platform: string = process.platform, arch: string = process.arch): string {
  const platformKey = `${platform}-${arch}`;
  if (!BITX_SUPPORTED_PLATFORMS.includes(platformKey)) {
    throw new BvmError(`bitx is not available for ${platformKey}. supported platforms: ${BITX_SUPPORTED_PLATFORMS.join(', ')}`);
  }
  return `${packageName}-${platformKey}`;
}

export function getPackumentUrl(registry: string, packageName: string): string {
  const base = registry.endsWith('/') ? registry : `${registry}/`;
  return `${base}${packageName.replace('/', '%2f')}`;
}

/**
 * Resolves a version spec to a published bitx version.
 * No spec means the default dist-tag. A spec is either a dist-tag (`next`, `latest`) or an exact version.
 */
export function resolveBitxVersionFromPackument(packument: BitxPackument, spec: string | undefined, defaultDistTag: string): string {
  const distTags = packument['dist-tags'] ?? {};
  const versions = packument.versions ?? {};
  const wanted = spec || defaultDistTag;
  if (distTags[wanted]) {
    return distTags[wanted];
  }
  const cleanVersion = semver.valid(wanted);
  if (cleanVersion && versions[cleanVersion]) {
    return cleanVersion;
  }
  const tagsText = Object.entries(distTags).map(([tag, version]) => `${tag} (${version})`).join(', ');
  if (!cleanVersion) {
    throw new BvmError(`"${wanted}" is not a bitx version or dist-tag. available dist-tags: ${tagsText || 'none'}`);
  }
  throw new BvmError(`bitx version ${wanted} was not found in the registry. available dist-tags: ${tagsText || 'none'}. run "bvm list --next --remote" to see all versions`);
}

/**
 * Published bitx versions, newest first. Placeholder ("stub") versions are skipped.
 */
export function listVersionsFromPackument(packument: BitxPackument): BitxRemoteVersion[] {
  const distTags = packument['dist-tags'] ?? {};
  const tagsByVersion: Record<string, string[]> = {};
  Object.entries(distTags).forEach(([tag, version]) => {
    tagsByVersion[version] = [...(tagsByVersion[version] ?? []), tag];
  });
  return Object.values(packument.versions ?? {})
    .filter((manifest) => !manifest.stub && semver.valid(manifest.version))
    .map((manifest) => ({
      version: manifest.version,
      released: packument.time?.[manifest.version],
      tags: tagsByVersion[manifest.version] ?? [],
    }))
    .sort((a, b) => semver.rcompare(a.version, b.version));
}
