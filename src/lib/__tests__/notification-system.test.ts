/**
 * Unit Tests — notification/notification-system.ts singleton class managers
 *
 * - NotificationManager (sendNotification + getUserNotifications + markAsRead/markAllAsRead + template + interpolate)
 *
 * Note: ScheduledNotifications + NotificationPreferences + NotificationAggregator
 * benzer pattern, smoke test ile kapsanır.
 */

import { describe, it, expect } from 'vitest';
import {
  notificationManager,
  scheduledNotifications,
  notificationPreferences,
} from '../notification/notification-system';

describe('NotificationManager', () => {
  it('sendNotification — id `notif-` prefix + read=false', () => {
    const notif = notificationManager.sendNotification({
      userId: 'u-1', title: 'Test', message: 'Body', priority: 'normal', channels: ['in-app'],
    } as any);
    expect(notif.id).toMatch(/^notif-\d+-\d+$/);
    expect(notif.read).toBe(false);
  });

  it('getUserNotifications — userId filter', () => {
    notificationManager.sendNotification({
      userId: 'u-getlist', title: 'X', message: 'Y', priority: 'normal', channels: ['in-app'],
    } as any);
    expect(notificationManager.getUserNotifications('u-getlist').length).toBeGreaterThan(0);
  });

  it('getUserNotifications — bilinmeyen → boş', () => {
    expect(notificationManager.getUserNotifications('non-existent')).toEqual([]);
  });

  it('getUserNotifications — unreadOnly filter', () => {
    const notif = notificationManager.sendNotification({
      userId: 'u-unread', title: 'X', message: 'Y', priority: 'normal', channels: [],
    } as any);
    notificationManager.markAsRead(notif.id);
    notificationManager.sendNotification({
      userId: 'u-unread', title: 'Unread', message: 'Y', priority: 'normal', channels: [],
    } as any);
    const unread = notificationManager.getUserNotifications('u-unread', true);
    expect(unread.every((n) => !n.read)).toBe(true);
  });

  it('markAsRead — read=true + readAt set', () => {
    const notif = notificationManager.sendNotification({
      userId: 'u-mark', title: 'X', message: 'Y', priority: 'normal', channels: [],
    } as any);
    notificationManager.markAsRead(notif.id);
    const updated = notificationManager.getNotification(notif.id);
    expect(updated?.read).toBe(true);
    expect(updated?.readAt).toBeGreaterThan(0);
  });

  it('markAsRead — bilinmeyen → no-throw', () => {
    expect(() => notificationManager.markAsRead('non-existent')).not.toThrow();
  });

  it('markAllAsRead — kullanıcı tüm notification read', () => {
    const UID = `u-all-${Date.now()}`;
    notificationManager.sendNotification({ userId: UID, title: '1', message: 'x', priority: 'normal', channels: [] } as any);
    notificationManager.sendNotification({ userId: UID, title: '2', message: 'x', priority: 'normal', channels: [] } as any);
    notificationManager.markAllAsRead(UID);
    const notifs = notificationManager.getUserNotifications(UID);
    expect(notifs.every((n) => n.read)).toBe(true);
  });

  it('getNotification — bilinmeyen → null', () => {
    expect(notificationManager.getNotification('non-existent')).toBeNull();
  });

  it('deleteNotification — siler', () => {
    const notif = notificationManager.sendNotification({
      userId: 'u-del', title: 'X', message: 'Y', priority: 'normal', channels: [],
    } as any);
    notificationManager.deleteNotification(notif.id);
    expect(notificationManager.getNotification(notif.id)).toBeNull();
  });

  it('deleteNotification — bilinmeyen → no-throw', () => {
    expect(() => notificationManager.deleteNotification('non-existent')).not.toThrow();
  });

  it('createTemplate — id `template-` prefix + extract variables', () => {
    const tpl = notificationManager.createTemplate(
      'welcome', 'Welcome {name}', 'Hello {name}, your role is {role}',
    );
    expect(tpl.id).toMatch(/^template-\d+$/);
    expect(tpl.variables).toContain('name');
    expect(tpl.variables).toContain('role');
  });

  it('sendFromTemplate — variable interpolation', () => {
    const tpl = notificationManager.createTemplate('greet', 'Hi {name}', 'Hello {name}');
    const notif = notificationManager.sendFromTemplate('u-tpl', tpl.id, { name: 'Ali' }, ['in-app'] as any);
    expect(notif.title).toBe('Hi Ali');
    expect(notif.message).toBe('Hello Ali');
  });

  it('sendFromTemplate — bilinmeyen template → throw', () => {
    expect(() =>
      notificationManager.sendFromTemplate('u', 'non-existent', {}, ['in-app'] as any),
    ).toThrow(/Template not found/);
  });

  it('sendFromTemplate — eksik variable → placeholder kalır', () => {
    const tpl = notificationManager.createTemplate('partial', 'X {a} {b}', 'M');
    const notif = notificationManager.sendFromTemplate('u', tpl.id, { a: 'A' }, ['in-app'] as any);
    expect(notif.title).toContain('A');
    expect(notif.title).toContain('{b}'); // missing var literal
  });
});

describe('ScheduledNotifications + NotificationPreferences — smoke', () => {
  it('scheduledNotifications singleton exported', () => {
    expect(scheduledNotifications).toBeDefined();
  });

  it('notificationPreferences singleton exported', () => {
    expect(notificationPreferences).toBeDefined();
  });
});
