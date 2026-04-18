import { describe, expect, it, vi } from 'vitest';

import {
  readDatasetOrStoredTab,
  readStoredJsonArray,
  readStoredString,
  writeStoredJsonArray,
  writeStoredString,
} from '../shared/persisted-ui-state';

describe('persisted ui state helpers', () => {
  it('reads and writes stored strings', () => {
    const storage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
      },
    };

    writeStoredString('query', 'urfa');
    expect(readStoredString('query')).toBe('urfa');

    writeStoredString('query', '');
    expect(readStoredString('query')).toBe('');
  });

  it('reads and writes stored json arrays', () => {
    const storage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
      },
    };

    writeStoredJsonArray('recent', ['a', 'b', 'c'], 2);
    expect(readStoredJsonArray('recent')).toEqual(['a', 'b']);
  });

  it('prefers dataset tab and falls back to stored tab', () => {
    const storage = new Map<string, string>([['vendor-tab', 'reviews']]);
    const root = { dataset: { activeTab: 'ads' } } as HTMLElement & { dataset: DOMStringMap };

    (globalThis as any).window = {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    };

    expect(readDatasetOrStoredTab(root, 'activeTab', 'vendor-tab', ['overview', 'listings', 'reviews', 'ads'], 'overview')).toBe('ads');

    root.dataset.activeTab = '';
    expect(readDatasetOrStoredTab(root, 'activeTab', 'vendor-tab', ['overview', 'listings', 'reviews', 'ads'], 'overview')).toBe('reviews');
  });
});
