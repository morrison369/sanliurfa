/**
 * Unit Tests - notification/notifications-queue.ts (in-app notification queue)
 *
 * - createNotification (DB insert + cache invalidate + WebSocket broadcast fire-and-forget)
 * - expiresInHours default 7 days OR custom hours
 * - icon/actionUrl/actionLabel optional fields
 * - error handling - return null
 *
 * vi.hoisted - postgres pool + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { poolMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  poolMock: { query: vi.fn() },
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  pool: poolMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: deleteCacheMock,
}));

beforeEach(() => {
  poolMock.query.mockReset();
  deleteCacheMock.mockReset();
  poolMock.query.mockResolvedValue({ rows: [{ id: 'notif-1' }] });
  deleteCacheMock.mockResolvedValue(1);
});

import { createNotification } from '../notification/notifications-queue';

describe('createNotification', () => {
  it('insert success - notificationId döner + cache invalidate', async () => {
    const id = await createNotification('u-1', 'Hello', 'Test message', 'info');
    expect(id).toBe('notif-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('notifications:unread:u-1');
  });

  it('default expiresAt - 7 days from now', async () => {
    await createNotification('u-1', 'T', 'M');
    const call = poolMock.query.mock.calls[0];
    const expiresAt = call[1][7]; // index 7 (expires_at param)
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const days = diffMs / (24 * 3600 * 1000);
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThan(8);
  });

  it('custom expiresInHours - 24 saat', async () => {
    await createNotification('u-1', 'T', 'M', 'warning', { expiresInHours: 24 });
    const call = poolMock.query.mock.calls[0];
    const expiresAt = call[1][7];
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const hours = diffMs / 3600000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(25);
  });

  it('icon + actionUrl + actionLabel - SQL params dahil', async () => {
    await createNotification('u-1', 'T', 'M', 'action', {
      icon: '🔔',
      actionUrl: '/profil',
      actionLabel: 'Görüntüle',
    });
    const call = poolMock.query.mock.calls[0];
    expect(call[1][4]).toBe('🔔');
    expect(call[1][5]).toBe('/profil');
    expect(call[1][6]).toBe('Görüntüle');
  });

  it('options yok - icon/actionUrl/actionLabel null', async () => {
    await createNotification('u-1', 'T', 'M');
    const call = poolMock.query.mock.calls[0];
    expect(call[1][4]).toBeNull();
    expect(call[1][5]).toBeNull();
    expect(call[1][6]).toBeNull();
  });

  it('default type "info"', async () => {
    await createNotification('u-1', 'T', 'M');
    const call = poolMock.query.mock.calls[0];
    expect(call[1][3]).toBe('info');
  });

  it('exception - return null', async () => {
    poolMock.query.mockRejectedValueOnce(new Error('DB fail'));
    const id = await createNotification('u-1', 'T', 'M');
    expect(id).toBeNull();
  });

  it('insert no rows - return null', async () => {
    poolMock.query.mockResolvedValueOnce({ rows: [] });
    const id = await createNotification('u-1', 'T', 'M');
    expect(id).toBeNull();
  });
});
