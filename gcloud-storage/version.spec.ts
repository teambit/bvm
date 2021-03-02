import { Version } from "./version";

describe("Google Cloud Storage Versions List", () => {
  describe("version", () => {
    it("should return bit version from Class", async () => {
      const version = new Version(
        "versions/dev/bit-0.0.301.tar.gz",
        "bvm.bit.dev",
        "https"
      );
      expect(version.version).toBe("0.0.301");
    });

    it("should return bit version from Object", async () => {
      const version = new Version(
        "versions/dev/bit-0.0.300.tar.gz",
        "bvm.bit.dev",
        "https"
      );
      expect(version.toObject().version).toBe("0.0.300");
    });
  });

  describe("download url", () => {
    it("should return download url from Class", async () => {
      const version = new Version(
        "versions/dev/bit-0.0.1.tar.gz",
        "bvm.bit.dev",
        "https"
      );

      expect(version.url).toBe(
        "https://bvm.bit.dev/versions/dev/bit-0.0.1.tar.gz"
      );
    });
    it("should return download url from Object", async () => {
      const version = new Version(
        "versions/dev/bit-0.0.1.tar.gz",
        "bvm.bit.dev",
        "https"
      );

      expect(version.toObject().url).toBe(
        "https://bvm.bit.dev/versions/dev/bit-0.0.1.tar.gz"
      );
    });
  });
});
