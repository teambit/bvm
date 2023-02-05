import { GcpList, ReleaseTypeFilter, Release } from "./gcp-list";
import fetch from "node-fetch";
import { getGcpList } from "../list";

jest.mock("node-fetch", () => jest.fn());

describe("GcpList", () => {
  it("should return the correct URL on Windows", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        nightly: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.NIGHTLY,
      os: "Windows_NT",
      arch: "x64",
    });
    const list = await gcpList.list();
    expect(list.entries[0].url).toBe(
      "https://bvm.bit.dev/bit/versions/1.0.0/bit-1.0.0-win-x64.tar.gz"
    );
  });
  it("should return the correct URL on Linux", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        nightly: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.NIGHTLY,
      os: "Linux",
      arch: "x64",
    });
    const list = await gcpList.list();
    expect(list.entries[0].url).toBe(
      "https://bvm.bit.dev/bit/versions/1.0.0/bit-1.0.0-linux-x64.tar.gz"
    );
  });
  it("should return the correct URL on Linux with arm64 CPU", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        nightly: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.NIGHTLY,
      os: "Linux",
      arch: "arm64",
    });
    const list = await gcpList.list();
    expect(list.entries[0].url).toBe(
      "https://bvm.bit.dev/bit/versions/1.0.0/bit-1.0.0-linux-arm64.tar.gz"
    );
  });
  it("should return the correct URL on macOS", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        nightly: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.NIGHTLY,
      os: "Darwin",
      arch: "x64",
    });
    const list = await gcpList.list();
    expect(list.entries[0].url).toBe(
      "https://bvm.bit.dev/bit/versions/1.0.0/bit-1.0.0-darwin-x64.tar.gz"
    );
  });
  it("should return the correct URL on macOS with arm64 CPU", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        nightly: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.NIGHTLY,
      os: "Darwin",
      arch: "arm64",
    });
    const list = await gcpList.list();
    expect(list.entries[0].url).toBe(
      "https://bvm.bit.dev/bit/versions/1.0.0/bit-1.0.0-darwin-arm64.tar.gz"
    );
  });
  it("should return only stable releases", async () => {
    mockFetch([
      {
        version: "1.0.0",
        date: "2020-01-01",
        stable: true,
        nightly: true,
      },
      {
        version: "2.0.0",
        date: "2020-01-01",
        nightly: true,
      },
      {
        version: "3.0.0",
        date: "2020-01-01",
        stable: true,
      },
    ]);
    const gcpList = getGcpList({
      releaseType: ReleaseTypeFilter.STABLE,
      os: "Windows_NT",
      arch: "x64",
    });
    const list = await gcpList.list();
    expect(list.entries.length).toBe(2);
    expect(list.entries[0].version).toBe("1.0.0");
    expect(list.entries[1].version).toBe("3.0.0");
  });
});

function mockFetch(releases: Release[]) {
  fetch["mockReturnValue"](
    Promise.resolve({
      json: () => Promise.resolve(releases),
    })
  );
}
