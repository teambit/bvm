
[BVM](https://github.com/teambit/bvm) is a version manager for [Bit](https://bit.dev).  
Using BVM makes it easier to install and manage multiple versions of Bit in a single environment.

### Features

- __Consistent installation:__ All Bit dependencies are bundled together to ensure a consistent and predictable package installation that is not affected by SemVer rules.
- __Fast installation:__ A simple and quick installation process that requires no additional time-consuming operations (post-install scripts, etc.)
- __Friendly UX:__ Easy upgrades and version management
- __Multiple Bit versions:__ Easily switch between Bit versions or even use multiple versions in parallel

### Install BVM

#### Install with NPM
```shell
npm i -g @teambit/bvm
```

#### Install with pnpm
```shell
pnpm add -g @teambit/bvm
```

#### Install with Yarn
```shell
yarn global add @teambit/bvm
```

### Install Bit
#### Install Bit's latest version
```shell
bvm install
```

#### Install A specific Bit version
```shell
bvm install <bit-version>
```
#### Upgrade to Bit's latest version
Install the latest version and remove the version previously used.
```shell
bvm upgrade
```

### Manage versions

#### Get the current version of BVM
```shell
bvm -v
```

#### List all versions of Bit available to be installed
```shell
bvm list --remote
```

#### Switch to another bit version
Switch the currently used bit version
```shell
bvm use <bit-version>
```

#### Get the local and remote versions of Bit and BVM
Get the local used versions, local latest versions and remote latest versions of Bit and BVM
```shell
bvm version
```

#### List all installed Bit versions
```shell
bvm list
```

#### Remove an installed Bit version
```shell
bvm remove <bit-version>
```

#### Link to a specific Bit version
Link a command name to a Bit version (link to binaries in the `PATH` variable).

```shell
bvm link <command> <bit-version>
```

For example, the following line will link Bit's version `0.0.315` to the `bitty` command name
(this will execute Bit's version `0.0.315` whenever the `bitty` command is used).
```
bvm link bitty 0.0.315
```
Validate the link by checking the version number of the new link:
```shell
$ bitty -v

0.0.315 (@teambit/legacy: 1.0.28)
```

:::info Auto-Link Bit's latest version to `bbit`
If a legacy version of Bit (Bit v14) is installed on your machine,
BVM will automatically link the latest version to `bbit` (instead of `bit`) to allow you to use both versions in parallel.
:::

### BVM configurations

#### Change BVM dir via environment variable

Make sure to set an env variable named `BVM_GLOBALS_DIR`.
Bvm will create its config in this folder, and will set the `BVM_DIR` inside the config to this folder as well. 
#### Get BVM configurations

- `DEFAULT_LINK` -  The default command name to be linked to BVM's latest version.  
`bit` is linked by default unless a legacy version of Bit is installed. In that case, `bbit` will be linked, instead.

- `BVM_DIR` -  The location for BVM (this will no apply for the config of bvm itself, as it's configured inside the config)
In order to change the entire folder include config, use the `BVM_GLOBALS_DIR` env variable described above.

```shell
bvm config
```

#### Set BVM configurations

```shell
bvm config set <property> <new-value>
```

For example, to change the default link for Bit, from  `bit` to `bitty`:

```shell
bvm config set DEFAULT_LINK bitty
```



### Troubleshooting

#### The PATH env variable is missing BVM's installation directory

##### MacOS / Linux

The error message:

```
global Bit install location was not found in your PATH global variable.
please add the following command to your bash/zsh profile then re-open the terminal:
export PATH=$HOME/bin:$PATH
```

**Solution:**

###### Bash

Run the following command:

```shell
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc && source ~/.bashrc
```

###### ZSH (Z Shell)

Run the following command:

```shell
echo 'export PATH=$HOME/bin:$PATH' >> ~/.zshrc && source ~/.zshrc
```

##### Windows

The error message:

```
global Bit install location was not found in your PATH global variable.
please run the following command and then re-open the terminal:
setx path "%path%;C:\Users\USER\AppData\Local\.bvm" and re-open your terminal
```

**Solution:**

Run the following command:

```shell
setx path "%path%;%LocalAppData%\.bvm"
```

If you're running VSCODE - restart it (learn why [here](https://github.com/microsoft/vscode/issues/47816)).

## License 💮

Apache License, Version 2.0
