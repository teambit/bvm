import { VersionManifest } from './versions-manifast';
import { versionsMock } from './versions-manifast.mock';

it('should return the correct value', () => {
  const versions = VersionManifest.fromArray(versionsMock);
});
