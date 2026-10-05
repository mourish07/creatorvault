// Test setup file
import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Mock chrome APIs for unit tests
const chromeStorageData: Record<string, unknown> = {};

global.chrome = {
  storage: {
    local: {
      get: (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (chromeStorageData[key] !== undefined) {
            result[key] = chromeStorageData[key];
          }
        }
        callback(result);
      },
      set: (items: Record<string, unknown>, callback?: () => void) => {
        Object.assign(chromeStorageData, items);
        callback?.();
      },
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  runtime: {
    lastError: undefined,
    getURL: (path: string) => `chrome-extension://test/${path}`,
    sendMessage: () => Promise.resolve(),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  tabs: {
    query: (_opts: unknown, callback: (tabs: unknown[]) => void) => callback([]),
    create: () => {},
    sendMessage: () => Promise.resolve(),
  },
} as unknown as typeof chrome;

// Reset storage between tests
beforeEach(() => {
  Object.keys(chromeStorageData).forEach((k) => delete chromeStorageData[k]);
});
