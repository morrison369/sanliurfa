/**
 * Unit Tests - notifications/realtime-notifications.ts vi.mock postgres
 *
 * - addNotification (insert + Notification shape return + SSE broadcast (smoke))
 * - getNotifications (default limit 50 + unreadOnly filter)
 * - markAsRead (rowCount > 0 → true)
 * - markAllAsRead (rowCount return)
 * - deleteNotification (soft delete → deleted_at NOW)
 * - getUnreadCount (parseInt fallback 0)
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryMock.mockResolvedValue({ rows: [], rowCount: 1 });
});

import {
  addNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../notifications/realtime-notifications';

describe('addNotification', () => {
  it('insert + return Notification shape', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'notif-1',
        user_id: 'u-1',
        type: 'info',
        title: 'Hello',
        message: 'Welcome',
        read: false,
        created_at: 't',
        expires_at: null,
      }],
    });
    const r = await addNotification({
      type: 'info',
      title: 'Hello',
      message: 'Welcome',
      userId: 'u-1',
      read: false,
    });
    expect(r.id).toBe('notif-1');
    expect(r.userId).toBe('u-1');
    expect(r.type).toBe('info');
  });

  it('userId optional - null in SQL params', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: 'n-1', user_id: null, type: 'system', title: 'T', message: 'M', read: false, created_at: 't' }],
    });
    await addNotification({ type: 'system', title: 'T', message: 'M', read: false });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][0]).toBeNull();
  });

  it('expiresAt optional - null in SQL params', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: 'n-1', user_id: 'u-1', type: 'info', title: 'T', message: 'M', read: false, created_at: 't' }],
    });
    await addNotification({ type: 'info', title: 'T', message: 'M', userId: 'u-1', read: false });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][4]).toBeNull(); // expires_at
  });
});

describe('getNotifications', () => {
  it('default limit 50', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getNotifications('u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', 50]);
  });

  it('custom limit', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getNotifications('u-1', { limit: 10 });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', 10]);
  });

  it('unreadOnly filter - SQL contains "AND read = false"', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getNotifications('u-1', { unreadOnly: true });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('AND read = false');
  });

  it('unreadOnly default false - no filter in SQL', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getNotifications('u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).not.toContain('AND read = false');
  });

  it('expires_at NOW filter (active notifications only)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await getNotifications('u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('expires_at IS NULL OR expires_at > NOW()');
  });
});

describe('markAsRead / markAllAsRead', () => {
  it('markAsRead - rowCount > 0 → true', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await markAsRead('u-1', 'notif-1')).toBe(true);
  });

  it('markAsRead - rowCount 0 (not found or not owned) → false', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await markAsRead('u-1', 'non-existent')).toBe(false);
  });

  it('markAllAsRead - returns rowCount (number marked)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 7 });
    expect(await markAllAsRead('u-1')).toBe(7);
  });

  it('markAllAsRead - rowCount 0 (none unread)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await markAllAsRead('u-1')).toBe(0);
  });
});

describe('deleteNotification (soft delete)', () => {
  it('rowCount > 0 → true + soft delete (deleted_at NOW)', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await deleteNotification('u-1', 'notif-1')).toBe(true);
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('UPDATE notifications SET deleted_at = NOW()');
  });

  it('rowCount 0 → false', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 0 });
    expect(await deleteNotification('u-1', 'non-existent')).toBe(false);
  });
});

describe('getUnreadCount', () => {
  it('parseInt result', async () => {
    queryOneMock.mockResolvedValueOnce({ c: '5' });
    expect(await getUnreadCount('u-1')).toBe(5);
  });

  it('null result - 0 fallback', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getUnreadCount('u-1')).toBe(0);
  });
});
