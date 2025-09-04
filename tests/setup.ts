// Test setup file
import 'jest';

// Mock global objects that would be available in Obsidian
global.moment = require('moment');

// Mock Obsidian classes and types globally
(global as any).obsidian = {
  moment: require('moment'),
  Plugin: class Plugin {},
  Setting: class Setting {},
  PluginSettingTab: class PluginSettingTab {},
  TFile: class TFile {},
  TFolder: class TFolder {},
  App: class App {},
  Vault: class Vault {}
};

// Mock console methods to avoid noise in tests
const originalConsole = console;
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Restore console after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock crypto for Node.js environment
if (typeof crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// Mock TextEncoder/TextDecoder if not available
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

export {};