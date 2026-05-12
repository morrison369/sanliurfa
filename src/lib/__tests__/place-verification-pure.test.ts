/**
 * Unit Tests - place/place-verification.ts vi.mock postgres
 *
 * - requestPlaceVerification (existing pending → null; new request creates)
 * - documents optional spread
 * - status pending initial
 * - exception handling
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
}));

vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue('OK'),
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { requestPlaceVerification } from '../place/place-verification';

describe('requestPlaceVerification', () => {
  it('new request - VerificationRequest shape döner + cache invalidate', async () => {
    queryOneMock.mockResolvedValueOnce(null); // existing yok
    insertMock.mockResolvedValueOnce({
      id: 'verify-1',
      requested_at: '2026-05-05T10:00:00Z',
      updated_at: '2026-05-05T10:00:00Z',
    });

    const r = await requestPlaceVerification('place-1');
    expect(r?.id).toBe('verify-1');
    expect(r?.status).toBe('pending');
    expect(r?.placeId).toBe('place-1');
    expect(deleteCacheMock).toHaveBeenCalled();
  });

  it('existing pending request → null (no duplicate)', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'existing-verify' });
    const r = await requestPlaceVerification('place-1');
    expect(r).toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('documents optional spread - documents field included when provided', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    insertMock.mockResolvedValueOnce({
      id: 'v-1',
      requested_at: 't',
      updated_at: 't',
    });
    const docs = [{ url: 'https://x.com/doc.pdf', type: 'pdf' }];
    const r = await requestPlaceVerification('place-1', docs);
    expect(r?.documents).toEqual(docs);
  });

  it('documents yok - field undefined', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    insertMock.mockResolvedValueOnce({
      id: 'v-1',
      requested_at: 't',
      updated_at: 't',
    });
    const r = await requestPlaceVerification('place-1');
    expect(r?.documents).toBeUndefined();
  });

  it('exception - return null', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB fail'));
    const r = await requestPlaceVerification('place-1');
    expect(r).toBeNull();
  });

  it('SELECT existing - rejected status hariç tutulur (status != rejected)', async () => {
    queryOneMock.mockResolvedValueOnce(null); // No existing pending/verified
    insertMock.mockResolvedValueOnce({ id: 'v-1', requested_at: 't', updated_at: 't' });
    await requestPlaceVerification('place-1');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('status != $2');
    expect(sqlCall[1]).toContain('rejected');
  });
});
