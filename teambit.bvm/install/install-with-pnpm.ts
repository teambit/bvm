import fs from 'fs';
import path from 'path';
import { streamParser } from '@pnpm/logger';
import { initDefaultReporter } from '@pnpm/default-reporter';
import { readWantedLockfile } from '@pnpm/lockfile.fs';
import pathTemp from 'path-temp';
import { sync as renameOverwrite } from 'rename-overwrite';
import { sync as rimraf } from 'rimraf';

// The settings block of pnpm-lock.yaml. It is read with the pnpm v11 lockfile
// reader, whose type is missing the settings that pnpm v12 added.
type LockfileSettings = {
  autoInstallPeers?: boolean;
  dedupePeers?: boolean;
  excludeLinksFromLockfile?: boolean;
  injectWorkspacePackages?: boolean;
  peersSuffixMaxLength?: number;
};

// @pnpm/napi is a CommonJS package that builds its exports at load time, so an
// `import` cannot pick up its named exports. It also loads a native addon, which
// is why it stays outside the bundle and is required from disk at runtime.
const nodeApi = require('@pnpm/napi') as typeof import('@pnpm/napi');

export async function installWithPnpm(fetch, version: string, dest: string, opts: { registry: string; lockfilePath?: string }) {
  const tempDest = pathTemp(path.dirname(path.dirname(dest)));
  try {
    fs.mkdirSync(tempDest, { recursive: true })
    const lockfileDestPath = path.join(tempDest, 'pnpm-lock.yaml');
    if (opts.lockfilePath) {
      fs.copyFileSync(opts.lockfilePath, lockfileDestPath);
    } else {
      await fetchLockfile(fetch, version, lockfileDestPath);
    }
    const { manifest, overrides, settings } = await createPackageJsonFile(tempDest);

    // The pnpm engine resolves the store, the metadata cache and the registry
    // credentials from the .npmrc cascade itself. bvm only overrides the registry.
    const pnpmConfig = nodeApi.readConfig({ dir: tempDest });
    const stopReporting = initReporter();
    try {
      await nodeApi.install({
        dir: tempDest,
        projects: [{ rootDir: tempDest, manifest }],
        storeDir: pnpmConfig.storeDir,
        cacheDir: pnpmConfig.cacheDir,
        registries: { default: opts.registry },
        authHeaderByUri: pnpmConfig.authHeaderByUri,
        proxyConfig: {
          httpProxy: pnpmConfig.httpProxy,
          httpsProxy: pnpmConfig.httpsProxy,
          noProxy: pnpmConfig.noProxy,
        },
        networkConfig: {
          ca: pnpmConfig.ca,
          cert: pnpmConfig.cert,
          key: pnpmConfig.key,
          strictSsl: pnpmConfig.strictSsl,
          maxSockets: pnpmConfig.maxSockets,
          networkConcurrency: pnpmConfig.networkConcurrency,
          fetchRetries: pnpmConfig.fetchRetries,
          fetchRetryFactor: pnpmConfig.fetchRetryFactor,
          fetchRetryMintimeout: pnpmConfig.fetchRetryMintimeout,
          fetchRetryMaxtimeout: pnpmConfig.fetchRetryMaxtimeout,
          fetchTimeout: pnpmConfig.fetchTimeout,
        },
        overrides,
        // The settings that the lockfile was created with have to be repeated here,
        // otherwise the engine treats the lockfile as outdated and the frozen install fails.
        autoInstallPeers: settings?.autoInstallPeers,
        dedupePeers: settings?.dedupePeers,
        excludeLinksFromLockfile: settings?.excludeLinksFromLockfile,
        injectWorkspacePackages: settings?.injectWorkspacePackages,
        peersSuffixMaxLength: settings?.peersSuffixMaxLength,
        frozenLockfile: true,
        // The lockfile is published by Bit's release pipeline, so its resolutions
        // don't need to be verified against the registry metadata.
        trustLockfile: true,
        nodeLinker: 'hoisted',
        // The hoisted linker copies the packages into node_modules instead of
        // symlinking them out of a virtual store, so there is no virtual store
        // for the global one to replace.
        enableGlobalVirtualStore: false,
        // The maturity cutoff only slows down resolution and pnpm v12 defaults it to a day.
        minimumReleaseAge: 0,
        ignoreScripts: true,
      }, emitLogEvent);
    } finally {
      stopReporting();
    }
    renameOverwrite(tempDest, dest);
  } catch (error) {
    try {
      rimraf(tempDest);
    } catch {
      // Ignore
    }
    throw error;
  }
}

async function fetchLockfile(fetch, version: string, lockfilePath: string): Promise<void> {
  const url = `https://bvm.bit.dev/bit/versions/${version}/pnpm-lock.yaml`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

  const fileStream = fs.createWriteStream(lockfilePath);

  response.body.pipe(fileStream);

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => resolve());
    fileStream.on('error', (err: Error) => reject(err));
  });
}

async function createPackageJsonFile(dest: string) {
  const lockfile = await readWantedLockfile(dest, { ignoreIncompatible: false });
  const overrides = lockfile?.overrides ?? {};
  const manifest = {
    dependencies: {
      '@teambit/bit': lockfile?.importers['.'].specifiers['@teambit/bit'],
    },
  };
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({
    ...manifest,
    pnpm: {
      overrides,
    },
  }, null, 2), 'utf8');
  return { manifest, overrides, settings: lockfile?.settings as LockfileSettings | undefined };
}

/**
 * The pnpm engine emits bunyan-shaped log events. The reporter subscribes to
 * `streamParser` via `.on('data', ...)`, so emitting a `data` event on the
 * underlying stream delivers the event straight to the reporter.
 */
function emitLogEvent(event: Record<string, unknown>): void {
  (streamParser as unknown as NodeJS.EventEmitter).emit('data', event);
}

function initReporter() {
  return initDefaultReporter({
    context: {
      argv: [],
    },
    reportingOptions: {
      appendOnly: false,
      throttleProgress: 200,
      hideProgressPrefix: true,
    },
    streamParser: streamParser as any, // eslint-disable-line
  });
}
