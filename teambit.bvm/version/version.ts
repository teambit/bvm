import { Config } from "@teambit/bvm.config";
import { latestLocal, latestRemote } from "@teambit/bvm.list";

export type GetVersionsResult = {
  currentVersion?: string;
  latestRemoteVersion?: string;
  latestInstalledVersion?: string;
};

export type GetVersionsOpts = {
  showCurrentVersion?: boolean;
  showLatestRemoteVersion?: boolean;
  showLatestInstalledVersion?: boolean;
};

export async function getVersions(
  opts: GetVersionsOpts
): Promise<GetVersionsResult> {
  const {
    showCurrentVersion = true,
    showLatestRemoteVersion = true,
    showLatestInstalledVersion = true,
  } = opts;
  const result: GetVersionsResult = {};
  if (showCurrentVersion) {
    const config = getConfig();
    result.currentVersion = config.getDefaultLinkVersion();
  }
  if (showLatestRemoteVersion) {
    result.latestRemoteVersion = await latestRemote();
  }
  if (showLatestInstalledVersion) {
    result.latestInstalledVersion = await latestLocal();
  }
  return result;
}

function getConfig(): Config {
  const config = Config.load();
  return config;
}
