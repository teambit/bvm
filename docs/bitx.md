# Installing bitx (the next Bit CLI) with bvm

bitx is the next version of the Bit CLI. bvm keeps its versions apart from Bit's. It is linked with the command name
set by `BITX_LINK` (default `bit`). To keep Bit on `bit` and use bitx as `bitx`, run `bvm config set BITX_LINK bitx`.

> Older bvm versions don't know the `--next` flag and silently ignore it, which installs Bit instead.
> Make sure `bvm install --help` lists `--next`, or upgrade bvm first (`npm i -g @teambit/bvm`).

## Commands

Every command below accepts `--bitx` as an alias of `--next`.

| command | what it does |
| --- | --- |
| `bvm install --next` | installs the bitx version of the `next` dist-tag and links it as `BITX_LINK` |
| `bvm install --next <version>` | installs an exact version, or the version of a dist-tag (`next`, `latest`) |
| `bvm install --next --override` | reinstalls a version that is already installed |
| `bvm install --next --no-replace` | installs without relinking `bitx` (when `bitx` is already linked) |
| `bvm upgrade --next` | installs the version of the dist-tag, links it as `BITX_LINK`, and removes the previously linked bitx version |
| `bvm list --next` | lists installed bitx versions and marks the linked one |
| `bvm list --next --remote` | lists published bitx versions, with their publish time and dist-tags |
| `bvm use --next [<version>]` | shows the linked bitx version, or links `bitx` to another installed version (`latest` = newest installed) |
| `bvm remove --next <version...>` | removes installed bitx versions (`--all`, `--keep-versions` and `--keep-latest-versions` work as they do for Bit) |
| `bvm link --next <name> <version>` | links an extra command name to a bitx version, for example to keep an older bitx around |
| `bvm link --next` | relinks all bitx links |
| `bvm link` | relinks all Bit links, then all bitx links. A broken bitx installation is reported as a warning and doesn't fail relinking Bit |
| `bvm version` | also shows the linked, latest installed and latest published bitx versions, but only once bitx was installed |

`--skip-update-path`, `--skip-update-check` and `--use-system-node` work with `--next` like they do for Bit.
The options that only apply to installing Bit (`--file`, `--method`, `--lockfile-path`, `--extract-method`, `--os`,
`--arch`) fail with an error when combined with `--next`.

## Where bitx comes from

bitx is published to the npm registry as:

- a launcher package (`@cocycles/bitx`) with a small Node.js script, and
- one package per platform with only the native executable: `darwin-arm64`, `darwin-x64`, `linux-x64`,
  `linux-arm64` and `win32-x64` (for example `@cocycles/bitx-darwin-arm64`).

bvm resolves the version from the package metadata on the registry bvm is configured with (the `registry`
setting, `https://node-registry.bit.cloud/` by default), installs the launcher with the same pnpm engine it uses
for Bit and Node.js (only the platform package matching the machine is downloaded), and keeps only the native
executable. The proxy, certificate and auth settings that apply to Bit installations apply to bitx too. The
launcher script isn't used: the `bitx` command runs the native executable directly.

The package names are an implementation detail. They only appear in errors and in `--verbose` output.

## What bitx needs at runtime

- **Node.js.** bitx itself starts without Node.js, but it runs Node.js for everything that executes env or Bit
  code: compiling with an env's compiler, lint, format, test, build, `start`, `run`, templates, and more.
  bvm installs a Node.js version for bitx into its Node.js directory and the `bitx` command puts it first on the
  `PATH`, so bitx and everything it spawns use it. The version comes from a `"bvm": { "node": "<version>" }` field in
  the bitx launcher's `package.json` when the release declares one (the same field Bit releases use), and
  otherwise from the `BITX_NODE_VERSION` setting. With `--use-system-node`, no Node.js is installed and bitx uses
  the Node.js it finds on the `PATH`. If installing Node.js fails, bvm falls back to the system Node.js and prints
  a warning.
- **Bit's runtime.** bitx downloads the parts of Bit it reuses (Bit's runtime, prebuilt UI and preview bundles,
  templates) by itself into `~/.bitx` the first time it needs them. bvm doesn't install or manage them.

## Layout on disk

```
<bvm dir>/
  versions/<bit version>/...                  Bit versions, unchanged
  bitx/versions/<bitx version>/
    bin/bitx                                  bin/bitx.exe on Windows
    bvm-bitx.json                             {version, package, platformPackage, node, installedAt}
  links/bit  -> versions/<bit version>/bit-<bit version>
  links/bitx -> bitx/versions/<bitx version>
  nodejs/<node version>/                      shared by Bit and bitx
~/bin/bit, ~/bin/bitx                         the commands (on Windows: bit.cmd and bitx.cmd in the bvm dir)
```

`bvm-bitx.json` is written last, so a version directory without it is an interrupted installation. Such a
directory isn't listed and is reinstalled by the next `bvm install --next`.

bitx versions are kept out of `versions/`, since bitx versions are valid semver and would be taken for Bit versions
there.

## Configuration

bitx links are kept in the bvm config apart from Bit links:

```json
{
  "DEFAULT_LINK": "bit",
  "links.bit": "2.2.164",
  "bitx_links.bitx": "0.1.0-alpha.1"
}
```

| setting | default | meaning |
| --- | --- | --- |
| `BITX_LINK` | `bit` | the command name bitx is linked with. Set it to `bitx` to keep Bit on `bit` |
| `BITX_DIST_TAG` | `next` | the dist-tag `bvm install --next` and `bvm upgrade --next` install |
| `BITX_PACKAGE` | `@cocycles/bitx` | the npm package bitx is installed from |
| `BITX_NODE_VERSION` | `22.23.4` | the Node.js version for bitx, when the release doesn't declare one |

Set them with `bvm config set <setting> <value>`, or with a `BVM_` environment variable (for example
`BVM_BITX_DIST_TAG=latest`), which is handy in CI.

Bit and bitx share the links directory and the bin directory, so they can't use the same command name. The default
bitx name is `bit`, so to run both, run `bvm config set BITX_LINK bitx`. bvm refuses to link Bit with the name of a
bitx link.

If `bit` is already linked to a Bit version when bitx is linked with that name, bvm replaces it without asking and
removes the Bit link from the config. Set `BITX_LINK` to another name to keep both.

## Using Bit and bitx side by side

- Both CLIs share Bit's global config and login token (`~/.bit`).
- They can work on the same workspace, but their installs fight over `node_modules/@teambit/*`: `bitx install`
  links those packages to its own runtime in `~/.bitx` and removes links that point into the bvm directory, and
  `bit install` does the opposite. Use separate clones for each CLI, or run `install` with only one of them in a
  checkout.
- Disk: `~/.bitx` grows to a few GB after bitx's first runtime install, on top of the Bit versions in the bvm
  directory.
- `bvm remove --next` doesn't clean `~/.bitx`, since it isn't tied to a bitx version. Delete it manually to reclaim
  the space; bitx downloads what it needs again.

## Releasing bitx for bvm

bvm needs no release-time work: any bitx version published to npm is installable.

- `bvm install --next` and `bvm upgrade --next` follow the `next` dist-tag. Every release meant for bvm users must
  move it. Prereleases go to `next` by default; a stable release that is published to `latest` only must also be
  tagged `next`.
- To pin the Node.js version bvm installs for a release, add `"bvm": { "node": "<version>" }` to the launcher's
  `package.json`. It should match the Node.js version the Bit runtime bitx uses is tested with.
- A post-publish smoke check: `npx @teambit/bvm@latest install --next <version>` followed by `bitx --version`.
