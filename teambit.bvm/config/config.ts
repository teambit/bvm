import { Provider } from 'nconf';
import os from 'os';
import path from 'path';
import userHome from 'user-home';
import pickBy from 'lodash.pickby';
import fs from 'fs-extra';
import {execSync} from 'child_process';
import semver from 'semver';
import chalk from 'chalk';

export const IS_WINDOWS = os.platform() === 'win32';
export const CONFIG_DIR = 'config';
export const CONFIG_FILENAME = 'config.json';
export const KNOWN_KEYS = ['BVM_DIR', 'DEFAULT_LINK'];
export const ALIASES_KEY = 'aliases';
export const LINKS_KEY = 'links';
export const BIT_VERSIONS_FOLDER_NAME = 'versions';
const CONFIG_KEY_NAME = 'global';

const DEFAULT_LINK = 'bit';
const DEFAULT_ALTERNATIVE_LINK = 'bbit';

const ALTERNATIVE_LINK_WARNING = `A legacy version of Bit is installed on your machine. 
Use the 'bbit' command for Bit's latest version and the 'bit' command for Bit's legacy version.
For more information, see the following link: https://harmony-docs.bit.dev/introduction/installation`

const globalDefaults = {
  BVM_DIR: getBvmDirectory(),
  DEFAULT_LINK: DEFAULT_LINK
}

function getBvmDirectory(): string {
  if (IS_WINDOWS && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, '.bvm');
  }

  return path.join(userHome, '.bvm');
}

function getConfigDirectory(): string {
  return path.join(getBvmDirectory(), CONFIG_DIR);
}

function getConfigPath(): string {
  return path.join(getConfigDirectory(), CONFIG_FILENAME);
}

let configSingleton;

export class Config {
  private store: Provider;
  private fsStore: Provider;

  constructor(private name: string, private filePath: string, defaults: any ={}){
    const store = new Provider();
    store.env().argv().file(name, filePath).defaults(defaults);
    const fsStore = new Provider().file(name, filePath);
    this.store = store;
    this.fsStore = fsStore;
  }

  static load(newInstance = false): Config {
    if (!newInstance && configSingleton){
      return configSingleton;
    }
    const name = CONFIG_KEY_NAME;
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)){
      fs.ensureDirSync(path.dirname(configPath));
      const legacyBitExist = checkIfBitLegacyExist();
      let defaultLink = DEFAULT_LINK;
      if (legacyBitExist){
        console.log(chalk.yellowBright(ALTERNATIVE_LINK_WARNING));
        defaultLink = DEFAULT_ALTERNATIVE_LINK;
      }
      fs.writeJSONSync(configPath, {DEFAULT_LINK: defaultLink});
    }
    const config = new Config(name, configPath, globalDefaults);
    if (!newInstance){
      configSingleton = config;
    }
    return config;
  }

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void{
    this.fsStore.set(key, value);
    this.store.set(key, value);
    this.persist();
  }

  persist(): void {
    this.fsStore.save(this.name);
  }

  del(key: string): void{
    this.fsStore.clear(key);
    this.store.clear(key);
    this.persist();
  }

  list(persistedOnly = false): any {
    const allConfigs =  persistedOnly ? this.fsStore.load() : this.store.load();
    return pickBy(allConfigs, (val, key) => {
      return (KNOWN_KEYS.includes(key) || (key.startsWith(ALIASES_KEY) || (key.startsWith(LINKS_KEY))))
    });
  }

  path(): string {
    return this.filePath;
  }

  getBvmDirectory(): string {
    return this.store.get('BVM_DIR');
  }

  getTempDir(): string {
    return path.join(this.getBvmDirectory(), 'temp');
  }

  getDefaultLinkName(): string {
    return this.store.get('DEFAULT_LINK');
  }

  getBitVersionsDir(): string {
    return path.join(this.getBvmDirectory(), BIT_VERSIONS_FOLDER_NAME);
  }

  getSpecificVersionDir(version: string, innerDir = false):{versionDir: string, exists: boolean} {
    const versionsDir = this.getBitVersionsDir();
    let versionDir = path.join(versionsDir, version);
    if (innerDir){
      versionDir = path.join(versionDir, `bit-${version}`);
    }
    const exists = fs.pathExistsSync(versionDir);
    return {
      versionDir,
      exists
    } 
  }

  getAliases(): Record<string, string> {
    const all = this.list();
    const flatAliases = pickBy(all, (val, key) => {
      return ((key.startsWith(ALIASES_KEY)))
    });
    const res = Object.keys(flatAliases).reduce((acc, keyName) => {
      const keyWithoutPrefix = keyName.replace(`${ALIASES_KEY}.`, '');
      acc[keyWithoutPrefix] = flatAliases[keyName];
      return acc;
    }, {});
    return res;
  }

  getLinks(): Record<string, string> {
    const all = this.list();
    const flatLinks = pickBy(all, (val, key) => {
      return ((key.startsWith(LINKS_KEY)))
    });
    const res = Object.keys(flatLinks).reduce((acc, keyName) => {
      const keyWithoutPrefix = keyName.replace(`${LINKS_KEY}.`, '');
      acc[keyWithoutPrefix] = flatLinks[keyName];
      return acc;
    }, {});
    return res;
  }

  setLink(linkName: string, value: string){
    const keyName = `${LINKS_KEY}.${linkName}`;
    this.set(keyName, value);
  }

  getDefaultLinkVersion(): string | undefined {
    const allLinks = this.getLinks();
    const defaultLinkName = this.getDefaultLinkName();
    return allLinks[defaultLinkName];
  }
}

function checkIfBitLegacyExist(): boolean {
  try {
    const output = execSync('bit -v').toString();
    if (output && semver.valid(output.trim()) && output.startsWith('14')){
      return true;
    }
    return false;
  } catch (e){
    return false;
  }
}