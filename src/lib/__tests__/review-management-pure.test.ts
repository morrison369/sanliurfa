/**
 * Unit Tests - review/review-management.ts addReviewResponse + getReviewResponses
 *
 * - addReviewResponse (place ownership check + insert + cache invalidate + notification)
 * - non-owner → throw "Access denied"
 * - getReviewResponses (cache hit + DB + 600s TTL)
 *
 * vi.hoisted - postgres + cache + notifications mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, deleteCachePatternMock, getCacheMock, setCacheMock, createNotificationMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  deleteCachePatternMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  createNotificationMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: vi.fn(),
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: vi.fn().mockResolvedValue(1),
  deleteCachePattern: deleteCachePatternMock,
}));

vi.mock('../notification/notifications-queue', () => ({
  createNotification: createNotificationMock,
}));

vi.mock('../loyalty/loyalty-system', () => ({
  awardPoints: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  deleteCachePatternMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  createNotificationMock.mockReset();
  deleteCachePatternMock.mockResolvedValue(1);
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  createNotificationMock.mockResolvedValue('notif-1');
});

import { addReviewResponse, getReviewResponses } from '../review/review-management';

describe('addReviewResponse', () => {
  it('owner verified + insert + cache invalidate + notification', async () => {
    queryOneMock
      .mockResolvedValueOnce({ user_id: 'owner-1' }) // place ownership
      .mockResolvedValueOnce({ user_id: 'reviewer-1' }) // review user
      .mockResolvedValueOnce({ full_name: 'İşletme Adı' }); // owner user

    insertMock.mockResolvedValueOnce({
      id: 'response-1',
      review_id: 'rev-1',
      place_id: 'p-1',
      owner_id: 'owner-1',
    });

    const r = await addReviewResponse('rev-1', 'p-1', 'owner-1', 'Teşekkürler!');
    expect(r.id).toBe('response-1');
    expect(deleteCachePatternMock).toHaveBeenCalled();
    expect(createNotificationMock).toHaveBeenCalled();
  });

  it('non-owner - throw "Access denied"', async () => {
    queryOneMock.mockResolvedValueOnce({ user_id: 'real-owner' });
    await expect(
      addReviewResponse('rev-1', 'p-1', 'fake-owner', 'Response')
    ).rejects.toThrow(/Access denied/);
  });

  it('place not found - throw "Access denied"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(
      addReviewResponse('rev-1', 'p-1', 'owner', 'X')
    ).rejects.toThrow(/Access denied/);
  });

  it('review not found - skip notification (no error)', async () => {
    queryOneMock
      .mockResolvedValueOnce({ user_id: 'owner-1' })
      .mockResolvedValueOnce(null); // review not found

    insertMock.mockResolvedValueOnce({ id: 'r-1' });
    await addReviewResponse('rev-1', 'p-1', 'owner-1', 'X');
    // notification skipped because review null
    expect(createNotificationMock).not.toHaveBeenCalled();
  });

  it('owner full_name fallback "İşletme Sahibi"', async () => {
    queryOneMock
      .mockResolvedValueOnce({ user_id: 'owner-1' })
      .mockResolvedValueOnce({ user_id: 'reviewer-1' })
      .mockResolvedValueOnce(null); // owner user not found

    insertMock.mockResolvedValueOnce({ id: 'r-1' });
    await addReviewResponse('rev-1', 'p-1', 'owner-1', 'X');
    const notifyCall = createNotificationMock.mock.calls[0];
    expect(notifyCall[1]).toContain('İşletme Sahibi');
  });
});

describe('getReviewResponses', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce([{ id: 'cached-r-1' }]);
    const r = await getReviewResponses('rev-1');
    expect(r[0].id).toBe('cached-r-1');
    expect(queryManyMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 600s TTL + is_public filter', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'r-1', review_id: 'rev-1' }]);
    await getReviewResponses('rev-1');
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('is_public = true');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(600);
  });

  it('exception - throw', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(getReviewResponses('rev-1')).rejects.toThrow();
  });
});
