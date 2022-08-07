import { GcpVersion } from "./gcp-version";

const versionPath = "versions/dev/Darwin/0.0.315/bit-0.0.315.tar.gz";
describe("Google Cloud Storage Versions List", () => {
  describe("version", () => {
    it("should return bit version from Class", async () => {
      const version = new GcpVersion('0.0.315', versionPath, "bvm.bit.dev", '0DebjGCNrSyBz/zpSV', '2022-01-05T22:50:52.883Z', {}, "https");
      expect(version.version).toBe("0.0.315");
    });

    it("should return bit version from Object", async () => {
      const version = new GcpVersion('0.0.315', versionPath, "bvm.bit.dev", '0DebjGCNrSyBz/zpSV', '2022-01-05T22:50:52.883Z', {}, "https");
      expect(version.toObject().version).toBe("0.0.315");
    });
  });

  describe("download url", () => {
    it("should return download url from Class", async () => {
      const version = new GcpVersion('0.0.315', versionPath, "bvm.bit.dev", '0DebjGCNrSyBz/zpSV', '2022-01-05T22:50:52.883Z', {}, "https");

      expect(version.url).toBe(
        "https://bvm.bit.dev/versions/dev/Darwin/0.0.315/bit-0.0.315.tar.gz"
      );
    });
    it("should return download url from Object", async () => {
      const version = new GcpVersion('0.0.315', versionPath, "bvm.bit.dev", '0DebjGCNrSyBz/zpSV', '2022-01-05T22:50:52.883Z', {}, "https");

      expect(version.toObject().url).toBe(
        "https://bvm.bit.dev/versions/dev/Darwin/0.0.315/bit-0.0.315.tar.gz"
      );
    });
  });
});
