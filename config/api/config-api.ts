import nconf, {IOptions, Provider } from 'nconf';
import os from 'os';
import path from 'path';
import userHome from 'user-home';
import pick from 'lodash.pick';
import fs from 'fs-extra';

export const IS_WINDOWS = os.platform() === 'win32';
export const CONFIG_DIR = 'config';
export const CONFIG_FILENAME = 'config.json';
export const KNOWN_KEYS = ['BVM_DIR', 'DEFAULT_ALIAS'];
export const BIT_VERSIONS_FOLDER_NAME = 'versions';
const CONFIG_KEY_NAME = 'global';

const globalDefaults = {
  BVM_DIR: getBvmDirectory(),
  DEFAULT_ALIAS: 'bit'
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
      fs.writeJSONSync(configPath, {});
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
    const val =  persistedOnly ? this.fsStore.load() : this.store.load();
    return pick(val, KNOWN_KEYS);
  }

  path(): string {
    return this.filePath;
  }

  getBvmDirectory(): string {
    return this.store.get('BVM_DIR');
  }

  getDefaultAlias(): string {
    return this.store.get('DEFAULT_ALIAS');
  }

  getBitVersionsDir(): string {
    return path.join(this.getBvmDirectory(), BIT_VERSIONS_FOLDER_NAME);
  }
}