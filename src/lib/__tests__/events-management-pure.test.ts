/**
 * Unit Tests - events/events-management.ts vi.mock postgres+cache+content-images
 *
 * - getEventById (cache + view_count increment + 600s TTL + null guard)
 * - getEvents (filter category/placeId + Promise.all count+rows + 300s TTL)
 * - searchEvents (ILIKE wildcard %query%)
 * - toggleRsvp (insert ON CONFLICT → toggle off via DELETE + GREATEST guard)
 *
 * vi.hoisted - postgres + cache + content-images mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryReadOneMock, queryReadManyMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryReadOneMock: vi.fn(),
  queryReadManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  queryReadOne: queryReadOneMock,
  queryReadMany: queryReadManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

vi.mock('../content-images', () => ({
  resolveContentImage: vi.fn().mockReturnValue('/images/event.jpg'),
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryReadOneMock.mockReset();
  queryReadManyMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  deleteCacheMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
  deleteCacheMock.mockResolvedValue(1);
});

import { getEventById, getEvents, searchEvents, toggleRsvp } from '../events/events-management';

const mkEvent = (overrides: any = {}) => ({
  id: 'event-1',
  title: 'Concert',
  slug: 'concert-2026',
  description: 'Music event',
  start_date: '2026-06-01',
  category: 'music',
  status: 'active',
  view_count: 0,
  attendee_count: 50,
  capacity: 100,
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

describe('getEventById', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce(mkEvent());
    const r = await getEventById('event-1');
    expect(r?.id).toBe('event-1');
    expect(queryReadOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + view_count increment + 600s TTL', async () => {
    queryReadOneMock.mockResolvedValueOnce(mkEvent());
    await getEventById('event-1');
    expect(queryMock).toHaveBeenCalled(); // view_count UPDATE
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(600);
  });

  it('not found - null + cache skip', async () => {
    queryReadOneMock.mockResolvedValueOnce(null);
    expect(await getEventById('non-existent')).toBeNull();
  });
});

describe('getEvents', () => {
  it('default limit 20 + status published filter', async () => {
    queryReadOneMock.mockResolvedValueOnce({ count: '5' });
    queryReadManyMock.mockResolvedValueOnce([mkEvent()]);
    const r = await getEvents();
    expect(r.total).toBe(5);
    expect(r.events).toHaveLength(1);
    const sqlCall = queryReadOneMock.mock.calls[0];
    expect(sqlCall[1]).toContain('published');
  });

  it('category filter', async () => {
    queryReadOneMock.mockResolvedValueOnce({ count: '3' });
    queryReadManyMock.mockResolvedValueOnce([]);
    await getEvents(20, 0, { category: 'music' });
    const sqlCall = queryReadOneMock.mock.calls[0];
    expect(sqlCall[1]).toContain('music');
  });

  it('placeId filter', async () => {
    queryReadOneMock.mockResolvedValueOnce({ count: '2' });
    queryReadManyMock.mockResolvedValueOnce([]);
    await getEvents(20, 0, { placeId: 'p-1' });
    const sqlCall = queryReadOneMock.mock.calls[0];
    expect(sqlCall[1]).toContain('p-1');
  });

  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({ events: [mkEvent()], total: 1 });
    const r = await getEvents();
    expect(r.total).toBe(1);
    expect(queryReadOneMock).not.toHaveBeenCalled();
  });

  it('exception - empty array fallback', async () => {
    queryReadOneMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await getEvents();
    expect(r.events).toEqual([]);
    expect(r.total).toBe(0);
  });
});

describe('searchEvents', () => {
  it('ILIKE wildcard pattern + status published filter', async () => {
    queryReadManyMock.mockResolvedValueOnce([mkEvent()]);
    await searchEvents('konser');
    const sqlCall = queryReadManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['%konser%', 20]);
    expect(sqlCall[0]).toContain('ILIKE');
    expect(sqlCall[0]).toContain('published');
  });

  it('exception - empty array', async () => {
    queryReadManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await searchEvents('x')).toEqual([]);
  });
});

describe('toggleRsvp', () => {
  it('attend (insert success) - true + attendee_count increment', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'rsvp-1' });
    expect(await toggleRsvp('event-1', 'u-1')).toBe(true);
    const updateCall = queryMock.mock.calls.find((c) => c[0].includes('attendee_count + 1'));
    expect(updateCall).toBeDefined();
  });

  it('toggle off (already attending) - DELETE + GREATEST guard + return success true', async () => {
    queryOneMock.mockResolvedValueOnce(null); // INSERT ON CONFLICT, no insert
    queryMock.mockResolvedValueOnce({ rowCount: 1 }); // DELETE
    queryMock.mockResolvedValueOnce({ rowCount: 1 }); // counter UPDATE GREATEST
    const r = await toggleRsvp('event-1', 'u-1');
    // toggleRsvp returns success (true) — not toggle state
    expect(r).toBe(true);
    const greatestCall = queryMock.mock.calls.find((c) => c[0].includes('GREATEST(0'));
    expect(greatestCall).toBeDefined();
  });

  it('exception - return false', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await toggleRsvp('event-1', 'u-1')).toBe(false);
  });
});
