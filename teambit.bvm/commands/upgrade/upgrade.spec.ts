import nodeFs from "fs";
import os from "os";
import path from "path";

jest.mock(
  "@teambit/bvm.install",
  () => ({
    installVersion: jest.fn(),
    InstallationMethods: ["package-manager", "tar"],
  }),
  { virtual: true }
);

jest.mock(
  "@teambit/bvm.remove",
  () => ({
    removeVersions: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  "@teambit/bvm.version",
  () => ({
    getBvmLocalVersion: jest.fn(),
    getBvmRemoteVersion: jest.fn(),
    getNewerBvmAvailableOutput: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  "chalk",
  () => ({
    __esModule: true,
    default: {
      green: (value: string) => value,
      yellow: (value: string) => value,
    },
  }),
  { virtual: true }
);

import { installVersion } from "@teambit/bvm.install";
import { removeVersions } from "@teambit/bvm.remove";
import { UpgradeCmd } from "./upgrade";

const mockedInstallVersion = installVersion as jest.Mock;
const mockedRemoveVersions = removeVersions as jest.Mock;

describe("bvm upgrade", () => {
  let bvmDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    bvmDir = await nodeFs.promises.mkdtemp(path.join(os.tmpdir(), "bvm-upgrade-"));
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockedRemoveVersions.mockImplementation(async (versions: string[]) => {
      await Promise.all(
        versions.map((version) =>
          nodeFs.promises.rm(path.join(bvmDir, "versions", version), {
            recursive: true,
            force: true,
          })
        )
      );
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await nodeFs.promises.rm(bvmDir, { recursive: true, force: true });
  });

  it("removes the previously used version after upgrading", async () => {
    const previousVersionDir = path.join(bvmDir, "versions", "1.0.0");
    const installedVersionDir = path.join(bvmDir, "versions", "2.0.0");
    await nodeFs.promises.mkdir(previousVersionDir, { recursive: true });
    await nodeFs.promises.mkdir(installedVersionDir, { recursive: true });
    mockedInstallVersion.mockResolvedValue({
      installedVersion: "2.0.0",
      previousCurrentVersion: "1.0.0",
      downloadRequired: false,
      replacedCurrent: true,
      versionPath: installedVersionDir,
    });

    await new UpgradeCmd().handler({
      skipUpdateCheck: true,
      skipUpdatePath: true,
    });

    expect(nodeFs.existsSync(previousVersionDir)).toBe(false);
    expect(nodeFs.existsSync(installedVersionDir)).toBe(true);
    expect(mockedRemoveVersions).toHaveBeenCalledWith(["1.0.0"]);
  });

  it("does not remove the installed version when already on latest", async () => {
    const installedVersionDir = path.join(bvmDir, "versions", "2.0.0");
    await nodeFs.promises.mkdir(installedVersionDir, { recursive: true });
    mockedInstallVersion.mockResolvedValue({
      installedVersion: "2.0.0",
      previousCurrentVersion: "2.0.0",
      downloadRequired: false,
      replacedCurrent: true,
      versionPath: installedVersionDir,
    });

    await new UpgradeCmd().handler({
      skipUpdateCheck: true,
      skipUpdatePath: true,
    });

    expect(nodeFs.existsSync(installedVersionDir)).toBe(true);
    expect(mockedRemoveVersions).not.toHaveBeenCalled();
  });
});
