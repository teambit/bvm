/**
 * This env uses bitdev.node/node-env, inspect it's config and API https://bit.cloud/bitdev/node/node-env
 * Learn more on how you can customize your env here - https://bit.cloud/bitdev/node/node-env
 */
import { createRequire } from "node:module";
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeEnv } from '@bitdev/node.node-env';
import { Compiler } from '@teambit/compiler';
import { Pipeline } from '@teambit/builder';
import { EnvHandler } from '@teambit/envs';
import { EsbuildCompiler, EsbuildTask, ESBuiltOriginalOptions, ESBuildTarget } from '@teambit/compilation.esbuild-compiler';

const require = createRequire(import.meta.url);

export class BundleEnv extends NodeEnv {

  /* a shorthand name for the env */
  name = 'bundle-env';

  /* Typescript config. Learn how to replace compiler - https://bit.dev/reference/compiling/set-up-compiler */
  protected tsconfigPath = require.resolve('./config/tsconfig.json');

  protected tsTypesPath = './types';

  /* ESLint config. Learn how to replace linter - https://bit.dev/reference/linting/set-up-linter */
  protected eslintConfigPath = require.resolve('./config/eslintrc.cjs');

  /* Prettier config. Learn how to replace formatter - https://bit.dev/reference/formatting/set-up-formatter */
  protected prettierConfigPath = require.resolve('./config/prettier.config.cjs');

  /* Vitest config. Learn how to replace tester - https://bit.dev/reference/testing/set-up-tester */
  protected vitestConfigPath = require.resolve('./config/vitest.config.mjs');

  protected dirName = dirname(fileURLToPath(import.meta.url));

  protected esbuildOptions: ESBuiltOriginalOptions = {
    platform: 'node',
    bundle: true,
    minify: false,
    sourcemap: true,
    banner: {
      js: `import { createRequire as _cr } from 'module';const require = _cr(import.meta.url); const __filename = import.meta.filename; const __dirname = import.meta.dirname`,
    },
    external: ['@reflink/*'],
    format: 'esm',
    define: {
      // Use `as any` to avoid TS complaining about non-standard fields on ImportMeta
      'import.meta.url': JSON.stringify(require("url").pathToFileURL((import.meta as any).filename).href),
    },
  };

  protected esbuildTargets: ESBuildTarget[] = [
    {
      entryPoint: 'app.ts',
      outfile: 'bundle.mjs',
      esbuildOptions: this.esbuildOptions,
    },
    {
      entryPoint: 'worker.ts',
      outfile: 'worker.js',
      esbuildOptions: this.esbuildOptions,
    },
  ];

  compiler(): EnvHandler<Compiler> {
    return EsbuildCompiler.from(this.esbuildTargets);
  }

  build(): Pipeline {
    return Pipeline.from([
      EsbuildTask.from(this.esbuildTargets, {}),
      createPatchPackageJsonTask((pkg) => this.patchCapsulePackageJson(pkg)) as any
    ]);
  }

  /**
   * Modify the package.json that lives inside the build capsule.
   * Adjust this patch to whatever you need during build time.
   */
  protected patchCapsulePackageJson(pkg: any) {
    pkg.dependencies = {
      '@reflink/reflink': '0.1.19',
    }
    return pkg;
  }
}

export default new BundleEnv();

/**
 * A minimal build task that patches the package.json inside Bit's build capsules.
 * This runs after the esbuild task and updates each seeder capsule in-place.
 */
function createPatchPackageJsonTask(patchFn: (pkg: any) => any) {
  return {
    name: 'patchPackageJson',
    description: 'Patch package.json inside the build capsule',
    location: 'end' as any,
    // Bit builder expects a `handler` that returns a Task
    handler: () => ({
      name: 'patchPackageJson',
      execute: async (context: any) => {
        try {
          // Support different shapes of capsule access across Bit versions.
          const capsules: Array<{ path: string, component?: any }> =
            context?.capsuleNetwork?.seedersCapsules
            || context?.capsuleNetwork?.graph?.capsules
            || [];

          for (const capsule of capsules) {
            const capsulePath = capsule?.path;
            if (!capsulePath) continue;
            const pkgJsonPath = path.join(capsulePath, 'package.json');
            if (!fs.existsSync(pkgJsonPath)) continue;
            const raw = fs.readFileSync(pkgJsonPath, 'utf8');
            let pkg: any;
            try {
              pkg = JSON.parse(raw);
            } catch {
              // skip malformed package.json to avoid breaking the build
              continue;
            }
            const patched = patchFn(pkg) || pkg;
            // Only write if changed to avoid unnecessary FS churn
            const nextStr = JSON.stringify(patched, null, 2);
            if (nextStr !== raw) {
              fs.writeFileSync(pkgJsonPath, nextStr + '\n', 'utf8');
            }
          }
        } catch (e) {
          // Don't fail the whole build on patch issues; log and continue
          // eslint-disable-next-line no-console
          console.warn('[patch-package-json] failed to patch package.json in capsule:', e);
        }
        return { componentsResults: [] } as any;
      }
    }),
  };
}
