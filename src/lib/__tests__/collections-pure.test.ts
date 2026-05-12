/**
 * Unit Tests - collections/collections.ts vi.mock postgres+cache
 *
 * - createCollection (insert + cache invalidate "collections:{userId}")
 * - description/icon optional null
 * - isPublic default false
 * - updateCollection ownership check (user_id !== userId → throw "Access denied")
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, deleteCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: vi.fn(),
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { createCollection, updateCollection } from '../collections/collections';

describe('createCollection', () => {
  it('insert + cache invalidate "collections:{userId}"', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 'col-1',
      user_id: 'u-1',
      name: 'Favoriler',
      description: 'My favorites',
      is_public: false,
      place_count: 0,
      created_at: 't',
      updated_at: 't',
    });
    const r = await createCollection('u-1', 'Favoriler', 'My favorites');
    expect(r.id).toBe('col-1');
    expect(r.name).toBe('Favoriler');
    expect(deleteCacheMock).toHaveBeenCalledWith('collections:u-1');
  });

  it('description optional - null', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'c-1' });
    await createCollection('u-1', 'Cafes');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][2]).toBeNull(); // description
  });

  it('icon optional - null', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'c-1' });
    await createCollection('u-1', 'Cafes');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][3]).toBeNull(); // icon
  });

  it('isPublic default false', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'c-1' });
    await createCollection('u-1', 'Private');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][4]).toBe(false);
  });

  it('isPublic true override', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'c-1' });
    await createCollection('u-1', 'Public', undefined, undefined, true);
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][4]).toBe(true);
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(createCollection('u-1', 'X')).rejects.toThrow();
  });
});

describe('updateCollection', () => {
  it('owner check - user_id mismatch → throw "Access denied"', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'real-owner' });
    await expect(updateCollection('col-1', 'fake-user', { name: 'X' }))
      .rejects.toThrow(/Access denied/);
  });

  it('collection not found → throw "Access denied"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(updateCollection('non-existent', 'u-1', {})).rejects.toThrow(/Access denied/);
  });
});
