---
description: API for linking bit versions installed by bit version manager
labels: ['bvm']
---

API for linking bit versions installed by bit version manager

Packaged releases may include a native entry at `bin/bit` (`bin/bit.exe` on Windows).
Links select that executable when present. Releases without it retain the Node CLI entry.
The packaged Node CLI and its Node.js runtime remain available for delegated commands.
An invalid native entry fails linking with a filesystem error.

`linkBitx()` links an installed bitx (the next Bit CLI) version from `<bvm dir>/bitx/versions/<version>`.
The shim runs the native `bin/bitx` directly and puts the Node.js installed for that version first on the `PATH`.
bitx links are saved under `bitx_links` in the config, and a bitx link can't take the name of a Bit link (or the
other way around), since both share the links and bin directories.
