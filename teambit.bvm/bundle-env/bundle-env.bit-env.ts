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
import { EsbuildCompiler, EsbuildTask, ESBuiltOriginalOptions } from '@teambit/compilation.esbuild-compiler';

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

  compiler(): EnvHandler<Compiler> {
    const esbuildOptions: ESBuiltOriginalOptions = {
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
        'import.meta.url': JSON.stringify(require("url").pathToFileURL(import.meta.filename).href),
      },
    };
    /**
     * use esbuild for compilation and bundling during development (in the workspace)
     * executed on 'bit compile', 'bit start', 'bit watch'
     */
    return EsbuildCompiler.from([
      {
        entryPoint: 'app.ts',
        outfile: 'bundle.mjs',
        esbuildOptions,
      },
      {
        entryPoint: 'worker.ts',
        outfile: 'worker.js',
        esbuildOptions,
      },
    ]);
  }

  build(): Pipeline {
    const esbuildOptions: ESBuiltOriginalOptions = {
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
        'import.meta.url': JSON.stringify(require("url").pathToFileURL(import.meta.filename).href),
      },
    };
    return Pipeline.from([
      EsbuildTask.from([
        {
          entryPoint: 'app.ts',
          outfile: 'bundle.mjs',
          esbuildOptions,
        },
        {
          entryPoint: 'worker.ts',
          outfile: 'worker.js',
          esbuildOptions,
        },
      ], {})
    ]);
  }
}

export default new BundleEnv();
