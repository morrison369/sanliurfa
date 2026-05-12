/**
 * Unit Tests - admin/admin-dashboard.ts getDashboardOverview vi.mock postgres
 *
 * - Promise.all 4-parallel (userStats + contentStats + flagStats + actionStats)
 * - parseInt fallback '0' for null counts
 * - period passthrough
 * - exception → null fallback
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
  queryMany: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

beforeEach(() => {
  queryOneMock.mockReset();
});

import { getDashboardOverview } from '../admin/admin-dashboard';

describe('getDashboardOverview', () => {
  it('Promise.all 4-parallel + parseInt mapping', async () => {
    queryOneMock
      .mockResolvedValueOnce({ total_users: '100', new_users: '10', active_users: '50' })
      .mockResolvedValueOnce({ total_places: '20', total_reviews: '500', total_comments: '300', new_reviews: '15' })
      .mockResolvedValueOnce({ pending_flags: '5', resolved_flags: '20', total_flags: '25' })
      .mockResolvedValueOnce({ total_actions: '15', warnings: '8', suspensions: '5', bans: '2' });

    const r = await getDashboardOverview(30);
    expect(r?.users.total).toBe(100);
    expect(r?.users.new).toBe(10);
    expect(r?.users.active).toBe(50);
    expect(r?.content.places).toBe(20);
    expect(r?.content.newReviews).toBe(15);
    expect(r?.flags.pending).toBe(5);
    expect(r?.moderation.bans).toBe(2);
    expect(r?.period).toBe(30);
  });

  it('null counts - parseInt fallback "0"', async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const r = await getDashboardOverview(30);
    expect(r?.users.total).toBe(0);
    expect(r?.content.places).toBe(0);
    expect(r?.flags.pending).toBe(0);
    expect(r?.moderation.totalActions).toBe(0);
  });

  it('default period 30', async () => {
    queryOneMock
      .mockResolvedValueOnce({ total_users: '0' })
      .mockResolvedValueOnce({ total_places: '0' })
      .mockResolvedValueOnce({ pending_flags: '0' })
      .mockResolvedValueOnce({ total_actions: '0' });
    const r = await getDashboardOverview();
    expect(r?.period).toBe(30);
  });

  it('custom period 7', async () => {
    queryOneMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const r = await getDashboardOverview(7);
    expect(r?.period).toBe(7);
  });

  it('exception - return null', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getDashboardOverview()).toBeNull();
  });

  it('startDate calculated from days subtraction', async () => {
    queryOneMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const before = Date.now();
    await getDashboardOverview(30);
    // First call's $1 param is the startDate
    const sqlCall = queryOneMock.mock.calls[0];
    const startDate = sqlCall[1]?.[0] as Date;
    expect(startDate).toBeInstanceOf(Date);
    const diffDays = (before - startDate.getTime()) / (24 * 3600 * 1000);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });
});
