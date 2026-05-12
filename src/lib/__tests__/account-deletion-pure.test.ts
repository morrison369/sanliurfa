/**
 * Unit Tests - account/account-deletion.ts vi.mock postgres+cache
 *
 * - requestAccountDeletion (7-day GRACE_PERIOD_DAYS + scheduled_for ISO + ticket id)
 * - cancelAccountDeletion (rowCount > 0 → true; rowCount 0 → false)
 * - getDeletionStatus (gracePeriodDaysRemaining ceil + Math.max(0, ...) + null hasPendingDeletion false)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, deleteCacheMock, deleteCachePatternMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  deleteCacheMock: vi.fn(),
  deleteCachePatternMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
  deleteCachePattern: deleteCachePatternMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCachePatternMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
  deleteCachePatternMock.mockResolvedValue(1);
});

import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
} from '../account/account-deletion';

describe('requestAccountDeletion', () => {
  it('insert success - id + deletesAt 7-day future + gracePeriodDays 7', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    queryOneMock.mockResolvedValueOnce({ id: 'del-1', scheduled_for: futureDate.toISOString() });
    const r = await requestAccountDeletion('u-1', 'no longer use');
    expect(r.deletionRequestId).toBe('del-1');
    expect(r.gracePeriodDays).toBe(7);
    const diffDays = (r.deletesAt.getTime() - Date.now()) / (24 * 3600 * 1000);
    expect(diffDays).toBeGreaterThan(6);
    expect(diffDays).toBeLessThan(8);
  });

  it('reason optional - null kabul edilir', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'd-2', scheduled_for: new Date().toISOString() });
    const r = await requestAccountDeletion('u-1');
    expect(r.deletionRequestId).toBe('d-2');
  });

  it('exception - throw (caller handles)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(requestAccountDeletion('u-1')).rejects.toThrow();
  });
});

describe('cancelAccountDeletion', () => {
  it('rowCount > 0 - true + cache invalidate', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await cancelAccountDeletion('u-1')).toBe(true);
    expect(deleteCacheMock).toHaveBeenCalledWith('user:profile:u-1');
    expect(deleteCachePatternMock).toHaveBeenCalled();
  });

  it('rowCount 0 (no pending or expired) → false (no cache invalidate)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await cancelAccountDeletion('u-1')).toBe(false);
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('exception - throw', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(cancelAccountDeletion('u-1')).rejects.toThrow();
  });
});

describe('getDeletionStatus', () => {
  it('pending deletion - hasPendingDeletion true + gracePeriodDaysRemaining ceil', async () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    queryOneMock.mockResolvedValueOnce({ scheduled_for: futureDate.toISOString() });
    const r = await getDeletionStatus('u-1');
    expect(r?.hasPendingDeletion).toBe(true);
    expect(r?.gracePeriodDaysRemaining).toBeGreaterThanOrEqual(4);
    expect(r?.gracePeriodDaysRemaining).toBeLessThanOrEqual(5);
  });

  it('no pending - hasPendingDeletion false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await getDeletionStatus('u-1');
    expect(r?.hasPendingDeletion).toBe(false);
  });

  it('past scheduled_for - Math.max(0) clamp', async () => {
    // Should not happen via SQL filter, but defensive Math.max guard
    queryOneMock.mockResolvedValueOnce({ scheduled_for: new Date(Date.now() - 86400000).toISOString() });
    const r = await getDeletionStatus('u-1');
    expect(r?.gracePeriodDaysRemaining).toBeGreaterThanOrEqual(0);
  });

  it('exception - throw', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(getDeletionStatus('u-1')).rejects.toThrow();
  });
});
