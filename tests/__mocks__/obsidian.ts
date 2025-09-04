// Mock implementation of Obsidian API for testing
export const moment = require('moment');

// Mock normalizePath function
export const normalizePath = (path: string) => path.replace(/\\/g, '/');

export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  
  async onload() {}
  async onunload() {}
  addCommand() {}
  addSettingTab() {}
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: any;
  
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = { createEl: jest.fn() };
  }
  
  display() {}
  hide() {}
}

export class Setting {
  settingEl: any;
  
  constructor(containerEl: any) {
    this.settingEl = { createEl: jest.fn() };
  }
  
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addDropdown() { return this; }
  addToggle() { return this; }
  addSlider() { return this; }
  addButton() { return this; }
}

export class TFile {
  name: string;
  path: string;
  extension: string;
  stat: any;
  
  constructor(name: string = 'test.md') {
    this.name = name;
    this.path = name;
    this.extension = 'md';
    this.stat = { mtime: Date.now(), ctime: Date.now(), size: 100 };
  }
}

export class TFolder {
  name: string;
  path: string;
  children: any[];
  
  constructor(name: string = 'test-folder') {
    this.name = name;
    this.path = name;
    this.children = [];
  }
}

export class Vault {
  adapter: any;
  
  constructor() {
    this.adapter = {
      exists: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      mkdir: jest.fn(),
      list: jest.fn()
    };
  }
  
  create() { return Promise.resolve(new TFile()); }
  modify() { return Promise.resolve(); }
  delete() { return Promise.resolve(); }
  getAbstractFileByPath() { return new TFile(); }
}

export class App {
  vault: Vault;
  workspace: any;
  metadataCache: any;
  
  constructor() {
    this.vault = new Vault();
    this.workspace = {
      getActiveFile: jest.fn(),
      openLinkText: jest.fn()
    };
    this.metadataCache = {
      getFileCache: jest.fn()
    };
  }
}

export const loadMoment = () => moment;

export default {
  moment,
  normalizePath,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  Vault,
  App,
  loadMoment
};