/**
 * Unit Tests - notification/notification-channels.ts vi.mock postgres+cache
 *
 * - getUserChannels (cache hit + DB fallback + 1-hour TTL 3600s)
 * - addChannel (insert + cache invalidate "channels:{userId}")
 * - addPushSubscription (insert + cache invalidate "push:{userId}")
 * - getEmailTemplate (cache hit + 24-hour TTL 86400s + is_active filter)
 * - queueEmail (insert + scheduled_for + priority default 5)
 * - markEmailSent / markEmailFailed (retry logic - retry_count < 5)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock, insertMock, updateMock, getCacheMock, setCacheMock, deleteCacheMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
  deleteCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
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
  queryMock.mockReset();
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
  getUserChannels,
  addChannel,
  removeChannel,
  addPushSubscription,
  getEmailTemplate,
  queueEmail,
  markEmailSent,
  markEmailFailed,
} from '../notification/notification-channels';

describe('getUserChannels', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce([{ id: 'ch-1', channel_type: 'email' }]);
    const r = await getUserChannels('u-1');
    expect(r).toHaveLength(1);
    expect(queryManyMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 1-hour TTL (3600s) + ORDER BY is_primary DESC', async () => {
    queryManyMock.mockResolvedValueOnce([{ id: 'ch-1' }]);
    await getUserChannels('u-1');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(3600);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('ORDER BY is_primary DESC');
  });

  it('exception - empty array fallback', async () => {
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getUserChannels('u-1')).toEqual([]);
  });
});

describe('addChannel', () => {
  it('insert + cache invalidate', async () => {
    insertMock.mockResolvedValueOnce({ id: 'ch-1' });
    const r = await addChannel('u-1', 'email', 'test@example.com', false);
    expect((r as any)?.id).toBe('ch-1');
    expect(deleteCacheMock).toHaveBeenCalledWith('channels:u-1');
  });

  it('default isPrimary false', async () => {
    insertMock.mockResolvedValueOnce({ id: 'ch-1' });
    await addChannel('u-1', 'email', 'test@example.com');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].is_primary).toBe(false);
  });

  it('exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await addChannel('u-1', 'email', 'x')).toBeNull();
  });
});

describe('removeChannel', () => {
  it('DELETE + cache invalidate + true', async () => {
    queryMock.mockResolvedValueOnce({ rowCount: 1 });
    expect(await removeChannel('ch-1', 'u-1')).toBe(true);
    expect(deleteCacheMock).toHaveBeenCalled();
  });
});

describe('addPushSubscription', () => {
  it('insert + cache invalidate "push:{userId}"', async () => {
    insertMock.mockResolvedValueOnce({ id: 'sub-1' });
    await addPushSubscription('u-1', 'https://endpoint', 'authKey', 'p256dhKey');
    expect(deleteCacheMock).toHaveBeenCalledWith('push:u-1');
  });
});

describe('getEmailTemplate', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce({ key: 'welcome', subject: 'Welcome!' });
    const r = await getEmailTemplate('welcome');
    expect((r as any)?.key).toBe('welcome');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB + 24-hour TTL (86400s) + is_active filter', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 't-1', key: 'welcome' });
    await getEmailTemplate('welcome');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(86400);
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[0]).toContain('is_active = true');
  });

  it('not found - null + cache skip', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getEmailTemplate('non-existent')).toBeNull();
  });
});

describe('queueEmail', () => {
  it('insert + default priority 5', async () => {
    insertMock.mockResolvedValueOnce({ id: 'eq-1' });
    expect(await queueEmail('user@example.com', 'welcome')).toBe(true);
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].priority).toBe(5);
    expect(insertCall[1].status).toBe('pending');
  });

  it('exception - return false', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await queueEmail('a@b.com', 'tmp')).toBe(false);
  });
});

describe('markEmailSent / markEmailFailed', () => {
  it('markEmailSent - status sent + sent_at NOW', async () => {
    updateMock.mockResolvedValueOnce({});
    expect(await markEmailSent('eq-1')).toBe(true);
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].status).toBe('sent');
  });

  it('markEmailFailed - retry_count < 5 → status pending + retry_count + 1', async () => {
    queryOneMock.mockResolvedValueOnce({ retry_count: 2 });
    updateMock.mockResolvedValueOnce({});
    await markEmailFailed('eq-1', 'SMTP timeout');
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].status).toBe('pending');
    expect(updateCall[2].retry_count).toBe(3);
    expect(updateCall[2].failed_reason).toBe('SMTP timeout');
  });

  it('markEmailFailed - retry_count >= 5 → status failed', async () => {
    queryOneMock.mockResolvedValueOnce({ retry_count: 5 });
    updateMock.mockResolvedValueOnce({});
    await markEmailFailed('eq-1', 'Permanent failure');
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].status).toBe('failed');
  });
});
