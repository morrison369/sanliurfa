/**
 * Unit Tests - analytics/cohort-analytics.ts vi.mock postgres+cache
 *
 * - createCohort (insert + cache invalidate "cohorts:list")
 * - getCohortById (cache hit + DB fallback + 1-hour TTL 3600s)
 * - listCohorts (default limit 50 + cache 30-min TTL 1800s)
 * - addUserToCohort (insert + member_count update + cache invalidate)
 * - calculateRetention (totalUsers / activeCount * 100 percentage + 0 guard)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, updateMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  deleteCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  deleteCacheMock.mockResolvedValue(1);
});

import {
  createCohort,
  getCohortById,
  listCohorts,
  addUserToCohort,
  calculateRetention,
} from '../analytics/cohort-analytics';

describe('createCohort', () => {
  it('insert + cache invalidate "cohorts:list"', async () => {
    insertMock.mockResolvedValueOnce({ id: 'cohort-1', cohort_name: 'Q1 2026 Signups' });
    const r = await createCohort('admin-1', 'Q1 2026 Signups', 'q1-2026', 'time_based', { startDate: '2026-01-01' });
    expect(r?.id).toBe('cohort-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('cohorts:list');
  });

  it('exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await createCohort('u', 'n', 'k', 't', {})).toBeNull();
  });
});

describe('getCohortById', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({ id: 'cached-cohort', cohort_name: 'X' });
    const r = await getCohortById('cohort-1');
    expect(r?.id).toBe('cached-cohort');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB fetch + 1-hour TTL (3600s)', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'cohort-1', cohort_name: 'X' });
    await getCohortById('cohort-1');
    expect(setCacheMock).toHaveBeenCalled();
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(3600);
  });

  it('not found - null + cache skip', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getCohortById('non-existent')).toBeNull();
    expect(setCacheMock).not.toHaveBeenCalled();
  });
});

describe('listCohorts', () => {
  it('default limit 50 + cache 30-min TTL (1800s)', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'c-1' }]);
    await listCohorts();
    expect(queryManyMock.mock.calls[0][1]).toEqual([50]);
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(1800);
  });

  it('custom limit', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await listCohorts(20);
    expect(queryManyMock.mock.calls[0][1]).toEqual([20]);
  });

  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce([{ id: 'cached' }]);
    const r = await listCohorts();
    expect(r).toEqual([{ id: 'cached' }]);
    expect(queryManyMock).not.toHaveBeenCalled();
  });
});

describe('addUserToCohort', () => {
  it('insert + member_count update + cache invalidate', async () => {
    insertMock.mockResolvedValueOnce({ id: 'member-1' });
    queryOneMock.mockResolvedValueOnce({ count: '5' });
    updateMock.mockResolvedValueOnce({});
    expect(await addUserToCohort('cohort-1', 'u-1')).toBe(true);
    expect(updateMock).toHaveBeenCalled();
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].member_count).toBe(5);
    expect(deleteCacheMock).toHaveBeenCalled();
  });

  it('exception - return false', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await addUserToCohort('c-1', 'u-1')).toBe(false);
  });
});

describe('calculateRetention', () => {
  it('valid - retention_rate calculated + insert into retention_cohorts', async () => {
    // First call: getCohortById (cohort exists)
    queryOneMock.mockResolvedValueOnce({ id: 'c-1', cohort_name: 'X' });
    // members fetch
    queryManyMock
      .mockResolvedValueOnce([{ user_id: 'u-1' }, { user_id: 'u-2' }, { user_id: 'u-3' }]) // 3 members
      .mockResolvedValueOnce([{ count: '2' }]); // 2 active
    insertMock.mockResolvedValueOnce({ id: 'r-1' });

    expect(await calculateRetention('c-1', 1)).toBe(true);
    const insertCall = insertMock.mock.calls[0];
    // 2/3 * 100 = 66.67
    expect(insertCall[1].retention_rate).toBeCloseTo(66.67, 1);
  });

  it('cohort not found - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await calculateRetention('non-existent', 1)).toBe(false);
  });

  it('totalUsers 0 - retention_rate 0 (division guard)', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'c-1' });
    queryManyMock
      .mockResolvedValueOnce([]) // 0 members
      .mockResolvedValueOnce([{ count: '0' }]);
    insertMock.mockResolvedValueOnce({ id: 'r-1' });

    expect(await calculateRetention('c-1', 1)).toBe(true);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].retention_rate).toBe(0);
  });
});
