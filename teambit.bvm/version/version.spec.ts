jest.mock("child_process", () => {
  const { promisify } = require("util");
  const execMock = jest.fn();
  // child_process.exec has a custom util.promisify implementation that resolves to
  // {stdout, stderr}; replicate it so version.ts's `util.promisify(exec)` behaves the same.
  execMock[promisify.custom] = (command: string) =>
    new Promise((resolve, reject) => {
      execMock(command, (error: Error | null, stdout: string, stderr: string) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
  return { exec: execMock };
});

import { exec } from "child_process";
import { getBvmLocalVersion, getBvmRemoteVersion } from "./version";

const mockedExec = exec as unknown as jest.Mock;

function failWith(message: string) {
  mockedExec.mockImplementation((_command: string, callback: (error: Error) => void) => {
    callback(new Error(message));
  });
}

beforeEach(() => {
  mockedExec.mockReset();
});

describe("getBvmLocalVersion", () => {
  const originalArgv1 = process.argv[1];

  afterEach(() => {
    process.argv[1] = originalArgv1;
  });

  it("invokes itself by its own resolved path instead of looking up bvm on PATH", async () => {
    // reproduces https://github.com/teambit/bit/issues/8629: under `npx @teambit/bvm ...`,
    // bvm isn't installed/linked onto the PATH yet, so a plain "bvm local-version" lookup fails
    // even though we're already running it. Re-invoke via process.execPath + process.argv[1]
    // instead, which works regardless of PATH.
    process.argv[1] = "/tmp/npx-cache/some-hash/node_modules/@teambit/bvm/out/bundle.mjs";
    mockedExec.mockImplementation((command: string, callback: (error: null, stdout: string, stderr: string) => void) => {
      callback(null, "3.1.4\n", "");
    });

    await expect(getBvmLocalVersion()).resolves.toBe("3.1.4");
    expect(mockedExec).toHaveBeenCalledWith(
      `"${process.execPath}" "${process.argv[1]}" local-version`,
      expect.any(Function)
    );
  });

  it("resolves to undefined instead of throwing when the self-invocation fails", async () => {
    process.argv[1] = "/tmp/npx-cache/some-hash/node_modules/@teambit/bvm/out/bundle.mjs";
    failWith("Command failed: bvm local-version\n/bin/sh: bvm: command not found");

    await expect(getBvmLocalVersion()).resolves.toBeUndefined();
  });
});

describe("getBvmRemoteVersion", () => {
  it("resolves to undefined instead of throwing when the version check fails", async () => {
    failWith("Command failed: npm view @teambit/bvm version");

    await expect(getBvmRemoteVersion()).resolves.toBeUndefined();
  });
});
