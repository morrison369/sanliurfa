/**
 * Unit Tests - blog/newsletter-subscriptions.ts vi.mock postgres+cache
 *
 * - subscribeToBlogNewsletter — email normalize (trim + lowercase)
 * - existing subscribed → alreadySubscribed: true (no INSERT)
 * - new email → INSERT ON CONFLICT email DO UPDATE (re-subscribe path) + cache invalidate
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, deleteCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  queryOne: queryOneMock,
}));

vi.mock('../cache', () => ({
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  queryOneMock.mockReset();
  deleteCacheMock.mockReset();
  deleteCacheMock.mockResolvedValue(1);
});

import { subscribeToBlogNewsletter } from '../blog/newsletter-subscriptions';

describe('subscribeToBlogNewsletter', () => {
  it('new subscription - created: true + cache invalidate', async () => {
    queryOneMock
      .mockResolvedValueOnce(null) // existing yok
      .mockResolvedValueOnce({ id: 'sub-1' }); // INSERT RETURNING

    const r = await subscribeToBlogNewsletter('user@example.com');
    expect(r.created).toBe(true);
    expect(r.alreadySubscribed).toBe(false);
    expect(deleteCacheMock).toHaveBeenCalledWith('blog:subscriptions:count');
  });

  it('existing subscribed - alreadySubscribed: true (no INSERT)', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'existing-sub' });
    const r = await subscribeToBlogNewsletter('user@example.com');
    expect(r.created).toBe(false);
    expect(r.alreadySubscribed).toBe(true);
    expect(deleteCacheMock).not.toHaveBeenCalled();
  });

  it('email normalize - "  USER@EXAMPLE.COM  " → "user@example.com"', async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sub-1' });

    await subscribeToBlogNewsletter('  USER@EXAMPLE.COM  ');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1][0]).toBe('user@example.com');
  });

  it('categories optional - null kabul edilir', async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sub-1' });

    await subscribeToBlogNewsletter('a@b.com');
    const insertCall = queryOneMock.mock.calls[1];
    expect(insertCall[1][1]).toBeNull();
  });

  it('categories specified - SQL params dahil', async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sub-1' });

    await subscribeToBlogNewsletter('a@b.com', 'tech,science');
    const insertCall = queryOneMock.mock.calls[1];
    expect(insertCall[1][1]).toBe('tech,science');
  });

  it('SELECT WHERE email AND status filter (only "subscribed")', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'existing' });
    await subscribeToBlogNewsletter('a@b.com');
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('status = $2');
    expect(sqlCall[1][1]).toBe('subscribed');
  });

  it('INSERT ON CONFLICT email - re-subscribe path (status = "subscribed", unsubscribed_at = NULL)', async () => {
    queryOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'sub-1' });

    await subscribeToBlogNewsletter('a@b.com');
    const insertCall = queryOneMock.mock.calls[1];
    expect(insertCall[0]).toContain('ON CONFLICT (email)');
    expect(insertCall[0]).toContain('unsubscribed_at = NULL');
  });
});
