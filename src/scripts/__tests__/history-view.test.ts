import { describe, expect, it, vi } from 'vitest';

import {
  exportCsvView,
  readJsonArray,
  readStoredDatasetValue,
  writeJsonArray,
  writeStoredDatasetValue,
} from '../shared/history-view';

describe('history view helpers', () => {
  it('reads and writes dataset-backed storage values', () => {
    const store = new Map<string, string>();
    const root = { dataset: {} } as HTMLElement & { dataset: DOMStringMap };

    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    };

    expect(readStoredDatasetValue(root, 'selectedStatus', 'billing')).toBe('');

    writeStoredDatasetValue(root, 'selectedStatus', 'billing', 'paid');
    expect(root.dataset.selectedStatus).toBe('paid');
    expect(store.get('billing')).toBe('paid');
    expect(readStoredDatasetValue(root, 'selectedStatus', 'billing')).toBe('paid');

    writeStoredDatasetValue(root, 'selectedStatus', 'billing', '');
    expect(store.has('billing')).toBe(false);
  });

  it('reads and writes json arrays', () => {
    const root = { dataset: {} } as HTMLElement & { dataset: DOMStringMap };

    writeJsonArray(root, 'itemsJson', [{ id: '1' }]);
    expect(readJsonArray<{ id: string }>(root, 'itemsJson')).toEqual([{ id: '1' }]);
  });

  it('exports csv rows using blob download', () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();

    (globalThis as any).window = {
      URL: {
        createObjectURL,
        revokeObjectURL,
      },
    };
    (globalThis as any).document = {
      createElement: () => ({
        href: '',
        download: '',
        click,
      }),
    };

    exportCsvView('rapor.csv', ['A', 'B'], [['1', '2']]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
