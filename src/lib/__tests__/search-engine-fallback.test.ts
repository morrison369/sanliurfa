import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryReadManyMock, hasColumnMock } = vi.hoisted(() => ({
  queryReadManyMock: vi.fn(),
  hasColumnMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: vi.fn(),
  queryMany: vi.fn(),
  queryReadMany: queryReadManyMock,
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../search/schema-compat', () => ({
  hasColumn: hasColumnMock,
  pickFirstExistingColumn: vi.fn(),
}));

import { searchPlaces } from '../search/search-engine';

beforeEach(() => {
  queryReadManyMock.mockReset();
  hasColumnMock.mockReset();
  hasColumnMock.mockResolvedValue(true);
});

describe('search-engine curated fallback', () => {
  it('returns curated place fallback when DB has no matching active place', async () => {
    queryReadManyMock.mockResolvedValueOnce([]);

    const results = await searchPlaces('Göbeklitepe');

    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('gobeklitepe');
    expect(results[0].href).toBe('/isletme/gobeklitepe');
    expect(results[0].source).toBe('curated-place-fallback');
  });

  it('prefers DB results when queryReadMany returns matches', async () => {
    queryReadManyMock.mockResolvedValueOnce([
      { id: 'place-1', name: 'DB Place', slug: 'db-place', category: 'Kafe' },
    ]);

    const results = await searchPlaces('db');

    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('db-place');
    expect(results[0].source).toBeUndefined();
  });

  it('retries with synonym-expanded query variants before falling back', async () => {
    queryReadManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'place-2', name: 'Göbeklitepe', slug: 'gobeklitepe', category: 'Tarihi Yer' },
      ]);

    const results = await searchPlaces('gobekli tepe');

    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('gobeklitepe');
    expect(queryReadManyMock).toHaveBeenCalledTimes(2);
    expect(queryReadManyMock.mock.calls[0][1]?.[0]).toBe('gobekli tepe');
    expect(queryReadManyMock.mock.calls[1][1]?.[0]).toBe('göbeklitepe');
  });
});
