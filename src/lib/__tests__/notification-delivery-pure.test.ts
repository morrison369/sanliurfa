/**
 * Unit Tests - notification/notification-delivery.ts vi.mock postgres+sendPushToUser
 *
 * - sendNotification (insert notification_history + per-channel delivery routing)
 * - getNotificationTypePreferences default (inAppEnabled true / pushEnabled true / emailEnabled true / frequency immediate)
 * - getUnreadNotificationCount (parseInt fallback 0)
 * - markNotificationAsRead (ownership check throw if not owned)
 *
 * vi.hoisted - postgres + push mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, queryOneMock, queryManyMock, insertMock, updateMock, sendPushToUserMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  sendPushToUserMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

vi.mock('../push/push', () => ({
  sendPushToUser: sendPushToUserMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  sendPushToUserMock.mockReset();
  insertMock.mockResolvedValue({ id: 'ndl-1' });
  sendPushToUserMock.mockResolvedValue({ sent: 1 });
});

import {
  sendNotification,
  recordDelivery,
  markNotificationAsRead,
  archiveNotification,
  getNotifications,
  getUnreadNotificationCount,
  getNotificationTypePreferences,
} from '../notification/notification-delivery';

describe('getNotificationTypePreferences', () => {
  it('not found - default all true + frequency immediate', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await getNotificationTypePreferences('u-1', 'reviews');
    expect(r.inAppEnabled).toBe(true);
    expect(r.pushEnabled).toBe(true);
    expect(r.emailEnabled).toBe(true);
    expect(r.frequency).toBe('immediate');
  });

  it('found - mapped from snake_case', async () => {
    queryOneMock.mockResolvedValueOnce({
      in_app_enabled: false,
      push_enabled: true,
      email_enabled: false,
      frequency: 'daily',
    });
    const r = await getNotificationTypePreferences('u-1', 'reviews');
    expect(r.inAppEnabled).toBe(false);
    expect(r.frequency).toBe('daily');
  });

  it('exception - default fallback (all true)', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await getNotificationTypePreferences('u-1', 'reviews');
    expect(r.inAppEnabled).toBe(true);
  });
});

describe('sendNotification', () => {
  it('insert notification_history + return id', async () => {
    queryOneMock.mockResolvedValueOnce({
      in_app_enabled: true, push_enabled: false, email_enabled: false, frequency: 'immediate',
    });
    const id = await sendNotification('u-1', 'review_response', 'New Reply', 'Someone replied to your review');
    expect(typeof id).toBe('string');
    expect(insertMock).toHaveBeenCalled();
  });

  it('inAppEnabled - recordDelivery in_app delivered', async () => {
    queryOneMock.mockResolvedValueOnce({
      in_app_enabled: true, push_enabled: false, email_enabled: false, frequency: 'immediate',
    });
    await sendNotification('u-1', 'msg', 'T', 'M');
    const inAppCall = insertMock.mock.calls.find((c) =>
      c[0] === 'notification_delivery_log' && c[1].delivery_channel === 'in_app'
    );
    expect(inAppCall).toBeDefined();
  });

  it('emailEnabled + sendEmail option - email "pending" record', async () => {
    queryOneMock.mockResolvedValueOnce({
      in_app_enabled: false, push_enabled: false, email_enabled: true, frequency: 'immediate',
    });
    await sendNotification('u-1', 'msg', 'T', 'M', null, { sendEmail: true });
    const emailCall = insertMock.mock.calls.find((c) =>
      c[0] === 'notification_delivery_log' && c[1].delivery_channel === 'email'
    );
    expect(emailCall).toBeDefined();
    expect(emailCall![1].status).toBe('pending');
  });

  it('exception - throw', async () => {
    queryOneMock.mockResolvedValueOnce({ in_app_enabled: true });
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(sendNotification('u-1', 'm', 'T', 'M')).rejects.toThrow();
  });
});

describe('recordDelivery', () => {
  it('insert delivery_log entry', async () => {
    insertMock.mockResolvedValueOnce({ id: 'log-1' });
    await recordDelivery('notif-1', 'push', 'delivered');
    expect(insertMock).toHaveBeenCalledWith('notification_delivery_log', expect.objectContaining({
      notification_id: 'notif-1',
      delivery_channel: 'push',
      status: 'delivered',
    }));
  });

  it('status delivered - delivered_at set, failed_at null', async () => {
    insertMock.mockResolvedValueOnce({});
    await recordDelivery('n-1', 'push', 'delivered');
    const call = insertMock.mock.calls[0];
    expect(call[1].delivered_at).toBeInstanceOf(Date);
    expect(call[1].failed_at).toBeNull();
  });

  it('status failed - failed_at set, delivered_at null', async () => {
    insertMock.mockResolvedValueOnce({});
    await recordDelivery('n-1', 'email', 'failed', 'SMTP error');
    const call = insertMock.mock.calls[0];
    expect(call[1].failed_at).toBeInstanceOf(Date);
    expect(call[1].delivered_at).toBeNull();
    expect(call[1].status_message).toBe('SMTP error');
  });
});

describe('markNotificationAsRead', () => {
  it('owner verified - update is_read true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'notif-1' });
    updateMock.mockResolvedValueOnce({});
    await markNotificationAsRead('notif-1', 'u-1');
    expect(updateMock).toHaveBeenCalled();
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].is_read).toBe(true);
    expect(updateCall[2].read_at).toBeInstanceOf(Date);
  });

  it('not owned - throw "Notification not found or not owned by user"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(markNotificationAsRead('non-existent', 'u-1')).rejects.toThrow(/not found/);
  });
});

describe('archiveNotification', () => {
  it('owner verified - update is_archived true', async () => {
    queryOneMock.mockResolvedValueOnce({ id: 'n-1' });
    updateMock.mockResolvedValueOnce({});
    await archiveNotification('n-1', 'u-1');
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].is_archived).toBe(true);
  });

  it('not found - throw', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    await expect(archiveNotification('n-1', 'u-1')).rejects.toThrow();
  });
});

describe('getNotifications + getUnreadNotificationCount', () => {
  it('getNotifications - default limit 20 + archived false default', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getNotifications('u-1');
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['u-1', false, 20]);
  });

  it('getUnreadNotificationCount - parseInt fallback 0', async () => {
    queryOneMock.mockResolvedValueOnce({ count: '7' });
    expect(await getUnreadNotificationCount('u-1')).toBe(7);
  });

  it('getUnreadNotificationCount - null fallback 0', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getUnreadNotificationCount('u-1')).toBe(0);
  });
});
