/**
 * This env uses bitdev.node/node-env, inspect it's config and API https://bit.cloud/bitdev/node/node-env
 * Learn more on how you can customize your env here - https://bit.cloud/bitdev/node/node-env
 */
import { createRequire } from "node:module";
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeEnv } from '@bitdev/node.node-env';
import { Compiler } from '@teambit/compiler';
import { Pipeline } from '@teambit/builder';
import { EnvHandler } from '@teambit/envs';
import { EsbuildCompiler, EsbuildTask, ESBuiltOriginalOptions, ESBuildTarget } from '@teambit/compilation.esbuild-compiler';
import { PackageJsonMutatorTask } from "@teambit/pkg.package-json.mutator-task";

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
      js: `import { createRequire as _cr } from 'module';const require = _cr(import.meta.url); const __filename = import.meta.filename; const __dirname = import.meta.dirname; ` +
      // This is needed to fix an issue in the smartwrap dependency, which references the "result" variable without declaring it.
      `let result;`,
    },
    // Native addons cannot be inlined into the bundle. @pnpm/napi loads the pnpm
    // Rust engine, which it resolves at runtime from its platform-specific
    // optional dependencies (@pnpm/napi.linux-x64, ...).
    external: ['@pnpm/napi', '@pnpm/napi.*'],
    format: 'esm',
    target: 'es2020',
  };

  protected esbuildTargets: ESBuildTarget[] = [
    {
      entryPoint: 'app.ts',
      outfile: 'bundle.mjs',
      esbuildOptions: this.esbuildOptions,
    },
  ];

  compiler(): EnvHandler<Compiler> {
    return EsbuildCompiler.from(this.esbuildTargets);
  }

  build(): Pipeline {
    return Pipeline.from([
      EsbuildTask.from(this.esbuildTargets, {}),
      PackageJsonMutatorTask.from({
        mutator: (pkgJson) => {
          // The bundle's sole external dependency. Resolved from the
          // installed package so it always matches the version the
          // workspace (workspace.jsonc) was built and tested against —
          // a hardcoded copy here silently drifted when the policy was
          // bumped (3.1.1 shipped with the previous engine because of
          // that).
          // eslint-disable-next-line global-require
          const napiVersion = require('@pnpm/napi/package.json').version;
          // eslint-disable-next-line no-param-reassign
          pkgJson.dependencies = {
            '@pnpm/napi': napiVersion,
          }
          return pkgJson;
        },
      })
    ]);
  }
}

export default new BundleEnv();
