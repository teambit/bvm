---
description: API for linking bit versions installed by bit version manager
labels: ['bvm']
---

API for linking bit versions installed by bit version manager

Packaged releases may include a native entry at `bin/bit` (`bin/bit.exe` on Windows).
Links select that executable when present. Releases without it retain the Node CLI entry.
The packaged Node CLI and its Node.js runtime remain available for delegated commands.
An invalid native entry fails linking with a filesystem error.
