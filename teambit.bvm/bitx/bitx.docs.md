---
description: Installs and manages bitx (the next Bit CLI) side by side with Bit
labels: ['bvm', 'bitx']
---

Installs and manages bitx, the next Bit CLI, next to the Bit versions that bvm already manages.

bitx is published to npm as a small launcher package plus one package per platform that holds only the
native executable. bvm installs the launcher with its pnpm engine (the platform package matching the
machine comes with it), keeps only the executable, and records the installation in `bvm-bitx.json`:

```
<bvm dir>/bitx/versions/<version>/
  bin/bitx            (bitx.exe on Windows)
  bvm-bitx.json       {version, package, platformPackage, node, installedAt}
```

- `installBitx(spec)` resolves a dist-tag (default `next`, see `BITX_DIST_TAG`) or an exact version from the
  registry, installs it, installs the Node.js version the release asks for, and links it as `BITX_LINK` (default `bit`).
- `listLocalBitx()` / `listRemoteBitx()` list installed and published versions.
- `removeBitxVersions()` / `removeAllBitx()` remove installed versions.
- `useBitx()` switches the `bitx` link to another installed version.
