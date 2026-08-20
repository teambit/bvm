import fs from 'fs';
import path from 'path';
import nodeFetch from 'node-fetch';
import { getAgent } from '@teambit/toolbox.network.agent';
import { streamParser } from '@pnpm/logger';
import { initDefaultReporter } from '@pnpm/default-reporter';
import { readWantedLockfile } from '@pnpm/lockfile.fs';
import pathTemp from 'path-temp';
import { sync as renameOverwrite } from 'rename-overwrite';
import { sync as rimraf } from 'rimraf';

// @pnpm/napi is a CommonJS package that builds its exports at load time, so an
// `import` cannot pick up its named exports. It also loads a native addon, which
// is why it stays outside the bundle and is required from disk at runtime.
const nodeApi = require('@pnpm/napi') as typeof import('@pnpm/napi');

// The settings block of pnpm-lock.yaml. It is read with the pnpm v11 lockfile
// reader, whose type is missing the settings that pnpm v12 added.
type LockfileSettings = {
  autoInstallPeers?: boolean;
  dedupePeers?: boolean;
  excludeLinksFromLockfile?: boolean;
  injectWorkspacePackages?: boolean;
  peersSuffixMaxLength?: number;
};

export type ProxyConfig = {
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string | boolean;
};

export type NetworkConfig = {
  ca?: string | string[];
  cafile?: string;
  cert?: string;
  key?: string;
  localAddress?: string;
  maxSockets?: number;
  strictSSL?: boolean;
};

export type NetworkOpts = {
  proxyConfig?: ProxyConfig;
  networkConfig?: NetworkConfig;
};

export type InstallWithPnpmOpts = NetworkOpts & {
  registry: string;
  lockfilePath?: string;
};

/**
 * Installs the given Bit version from the registry, using the lockfile that was
 * published with it.
 */
export async function installWithPnpm(version: string, dest: string, opts: InstallWithPnpmOpts) {
  const tempDest = pathTemp(path.dirname(path.dirname(dest)));
  try {
    fs.mkdirSync(tempDest, { recursive: true })
    const lockfileDestPath = path.join(tempDest, 'pnpm-lock.yaml');
    let hasLockfile = true;
    if (opts.lockfilePath) {
      fs.copyFileSync(opts.lockfilePath, lockfileDestPath);
    } else {
      hasLockfile = await fetchLockfile(version, lockfileDestPath, opts);
    }
    const { manifest, overrides, settings } = hasLockfile
      ? await createPackageJsonFileFromLockfile(tempDest)
      : createPackageJsonFileForVersion(tempDest, version);

    const stopReporting = initReporter();
    try {
      await nodeApi.install({
        ...engineOptions(tempDest, opts),
        dir: tempDest,
        projects: [{ rootDir: tempDest, manifest }],
        registries: { default: opts.registry },
        overrides,
        // The settings that the lockfile was created with have to be repeated here,
        // otherwise the engine treats the lockfile as outdated and the frozen install fails.
        autoInstallPeers: settings?.autoInstallPeers,
        dedupePeers: settings?.dedupePeers,
        excludeLinksFromLockfile: settings?.excludeLinksFromLockfile,
        injectWorkspacePackages: settings?.injectWorkspacePackages,
        peersSuffixMaxLength: settings?.peersSuffixMaxLength,
        frozenLockfile: hasLockfile,
        // The lockfile is published by Bit's release pipeline, so its resolutions
        // don't need to be verified against the registry metadata.
        trustLockfile: hasLockfile,
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

export type InstallNodeOpts = NetworkOpts & {
  storeDir?: string;
};

/**
 * Installs the given Node.js version to the given directory.
 *
 * The pnpm engine can install a runtime the same way it installs a package, so
 * Node.js is requested as a "runtime:" dependency of a throwaway project. The
 * installed package is the Node.js distribution itself, which is exactly what
 * bvm keeps in its Node.js directory, so it is moved out of node_modules.
 */
export async function installNodeWithPnpm(version: string, dest: string, opts: InstallNodeOpts = {}) {
  const tempDest = pathTemp(path.dirname(dest));
  try {
    fs.mkdirSync(tempDest, { recursive: true });
    await nodeApi.install({
      ...engineOptions(tempDest, opts),
      dir: tempDest,
      projects: [{
        rootDir: tempDest,
        manifest: {
          name: 'bvm-node',
          version: '0.0.0',
          dependencies: { node: `runtime:${version}` },
        },
      }],
      storeDir: opts.storeDir,
    });
    renameOverwrite(path.join(tempDest, 'node_modules', 'node'), dest);
  } finally {
    try {
      rimraf(tempDest);
    } catch {
      // Ignore
    }
  }
}

/**
 * The options that every bvm installation shares. The proxy and TLS settings
 * that bvm was configured with win over the ones the pnpm engine reads from the
 * .npmrc cascade; the rest of the engine's configuration is used as it is.
 */
function engineOptions(dir: string, opts: NetworkOpts) {
  const pnpmConfig = nodeApi.readConfig({ dir });
  const proxyConfig = opts.proxyConfig ?? {};
  const networkConfig = opts.networkConfig ?? {};
  return {
    storeDir: pnpmConfig.storeDir,
    cacheDir: pnpmConfig.cacheDir,
    authHeaderByUri: pnpmConfig.authHeaderByUri,
    proxyConfig: {
      httpProxy: proxyConfig.httpProxy ?? pnpmConfig.httpProxy,
      httpsProxy: proxyConfig.httpsProxy ?? pnpmConfig.httpsProxy,
      noProxy: proxyConfig.noProxy ?? pnpmConfig.noProxy,
    },
    networkConfig: {
      ca: readCa(networkConfig) ?? pnpmConfig.ca,
      cert: networkConfig.cert ?? pnpmConfig.cert,
      key: networkConfig.key ?? pnpmConfig.key,
      localAddress: networkConfig.localAddress,
      strictSsl: networkConfig.strictSSL ?? pnpmConfig.strictSsl,
      maxSockets: networkConfig.maxSockets ?? pnpmConfig.maxSockets,
      networkConcurrency: pnpmConfig.networkConcurrency,
      fetchRetries: pnpmConfig.fetchRetries,
      fetchRetryFactor: pnpmConfig.fetchRetryFactor,
      fetchRetryMintimeout: pnpmConfig.fetchRetryMintimeout,
      fetchRetryMaxtimeout: pnpmConfig.fetchRetryMaxtimeout,
      fetchTimeout: pnpmConfig.fetchTimeout,
    },
    nodeLinker: 'hoisted' as const,
    // The hoisted linker copies the packages into node_modules instead of
    // symlinking them out of a virtual store, so there is no virtual store
    // for the global one to replace.
    enableGlobalVirtualStore: false,
    // The maturity cutoff only slows down resolution and pnpm v12 defaults it to a day.
    minimumReleaseAge: 0,
    ignoreScripts: true,
  };
}

/**
 * bvm's "cafile" setting points at a file, while the engine wants the certificates themselves.
 */
function readCa(networkConfig: NetworkConfig): string | string[] | undefined {
  if (!networkConfig.cafile) return networkConfig.ca;
  try {
    return fs.readFileSync(networkConfig.cafile, 'utf8');
  } catch {
    return networkConfig.ca;
  }
}

async function fetchLockfile(version: string, lockfilePath: string, opts: NetworkOpts): Promise<boolean> {
  const url = `https://bvm.bit.dev/bit/versions/${version}/pnpm-lock.yaml`;
  const response = await nodeFetch(url, {
    agent: getAgent(url, { ...opts.networkConfig, ...opts.proxyConfig }),
  });
  // Registry installation can still resolve an exact Bit version when its release
  // pipeline has not published a lockfile yet.
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

  const fileStream = fs.createWriteStream(lockfilePath);

  response.body.pipe(fileStream);

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => resolve());
    fileStream.on('error', (err: Error) => reject(err));
  });
  return true;
}

async function createPackageJsonFileFromLockfile(dest: string) {
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

function createPackageJsonFileForVersion(dest: string, version: string) {
  const manifest = {
    dependencies: {
      '@teambit/bit': version,
    },
  };
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return { manifest, overrides: {}, settings: undefined };
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
