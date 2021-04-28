---
description: A CLI tool to install and manage bit versions
labels: ['bvm', 'CLI']
---

A CLI tool to install and manage bit versions

## Installation
Use your favorite package manager to install bvm globally, e.g. `npm install -g @teambit/bvm`.
Now you should be able to run `bvm` in the CLI and get the commands list.

## Troubleshooting
- on Windows, `bvm` is not recognized as a command when installed via `npm`.

This is not an issue with `bvm` specifically, but with npm paths in general. Run `setx PATH=%PATH%;%AppData%\npm` to add npm global packages to the `path` variable. Restart your terminal and try again.