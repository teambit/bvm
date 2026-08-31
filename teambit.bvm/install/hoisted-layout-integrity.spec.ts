import fs from 'fs';
import os from 'os';
import path from 'path';

// This spec deliberately does NOT mock @pnpm/napi: it runs the real
// engine — the same one bvm ships — and asserts the hoisted layout it
// produces resolves version-conflicted dependencies correctly.
//
// Regression context: the engine bundled up to bvm 3.1.1 nested a
// version-conflicted package's transitive dependencies under only one
// of its dependents, so requires through any other dependent resolved
// the wrong (root-hoisted) version. In bit installs that surfaced as
// `ERR_IMPORT_ATTRIBUTE_MISSING` at startup — an ESM `execa` loading
// the root's CommonJS `npm-run-path`. This fixture reproduces the
// same shape with `parse-entities`: the root holds v2 (whose
// `character-entities-legacy` is v1) while two local packages both
// depend on v4 (which needs `character-entities-legacy` v3).
const nodeApi = require('@pnpm/napi') as typeof import('@pnpm/napi');

/**
 * Resolve `depName` from `fromDir` the way Node.js does: walk up the
 * directory tree probing each `node_modules/<depName>`. A plain
 * directory walk sidesteps `exports`-map restrictions that make
 * `require.resolve('<dep>/package.json')` fail for ESM-only packages.
 */
function resolveDepVersion(rootDir: string, fromDir: string, depName: string): string | undefined {
  let current = fromDir;
  for (;;) {
    const candidate = path.join(current, 'node_modules', depName, 'package.json');
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf8')).version;
    }
    if (current === rootDir) return undefined;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

describe('hoisted layout integrity', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bvm-hoist-integrity-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps a conflicting transitive dep reachable from every dependent', async () => {
    const manifest = {
      name: 'hoist-integrity-fixture',
      version: '0.0.0',
      dependencies: {
        'parse-entities': '2.0.0',
        'pkg-a': 'file:./packages/pkg-a',
        'pkg-b': 'file:./packages/pkg-b',
      },
    };
    for (const pkg of ['pkg-a', 'pkg-b']) {
      const pkgDir = path.join(tempDir, 'packages', pkg);
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name: pkg, version: '1.0.0', dependencies: { 'parse-entities': '4.0.2' } }),
      );
    }
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(manifest, null, 2));

    await nodeApi.install(
      {
        dir: tempDir,
        projects: [{ rootDir: tempDir, manifest }],
        registries: { default: 'https://registry.npmjs.org/' },
        storeDir: path.join(tempDir, 'store'),
        cacheDir: path.join(tempDir, 'cache'),
        nodeLinker: 'hoisted',
        enableGlobalVirtualStore: false,
        minimumReleaseAge: 0,
        ignoreScripts: true,
      },
      () => {},
    );

    // The root's parse-entities@2 wins the root slot, and its own
    // character-entities-legacy v1 hoists next to it.
    const rootParseEntities = resolveDepVersion(tempDir, tempDir, 'parse-entities');
    expect(rootParseEntities).toMatch(/^2\./);

    // Every dependent of the conflict-nested parse-entities@4 must
    // resolve v4's own transitive deps — not the root-hoisted v1
    // copies. Before the fix only one of pkg-a / pkg-b got them.
    for (const pkg of ['pkg-a', 'pkg-b']) {
      const pkgDir = path.join(tempDir, 'node_modules', pkg);
      const nested = resolveDepVersion(tempDir, pkgDir, 'parse-entities');
      expect(`${pkg}: parse-entities@${nested}`).toBe(`${pkg}: parse-entities@4.0.2`);

      const nestedDir = path.join(pkgDir, 'node_modules', 'parse-entities');
      const legacyBase = fs.existsSync(nestedDir) ? nestedDir : pkgDir;
      const legacy = resolveDepVersion(tempDir, legacyBase, 'character-entities-legacy');
      expect(`${pkg}: character-entities-legacy@${legacy}`).toMatch(
        new RegExp(`^${pkg}: character-entities-legacy@3\\.`),
      );
    }
  }, 180_000);
});
