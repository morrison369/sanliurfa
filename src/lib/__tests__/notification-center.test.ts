import { describe, expect, it } from 'vitest';

import {
  extractNotificationCenterData,
  extractNotificationCenterMessage,
  renderNotificationCenter,
} from '../notification-center';

describe('notification center helpers', () => {
  it('unwraps nested center payload', () => {
    const data = extractNotificationCenterData({
      data: {
        success: true,
        data: {
          notifications: [{ id: 'n1', title: 'Test', message: 'Mesaj', is_read: false, is_archived: false, notification_type: 'message', created_at: '2026-04-17T00:00:00.000Z' }],
          unreadCount: 3,
        },
      },
    });

    expect(data.notifications).toHaveLength(1);
    expect(data.unreadCount).toBe(3);
  });

  it('reads nested message and renders center', () => {
    const html = renderNotificationCenter({
      notifications: [{ id: 'n1', title: 'Başlık', message: 'İçerik', is_read: false, is_archived: false, notification_type: 'message', created_at: '2026-04-17T00:00:00.000Z' }],
      unreadCount: 2,
      showArchived: false,
      actionInProgress: null,
      error: extractNotificationCenterMessage({ data: { success: true, message: 'Tamam' } }, 'Hata'),
    });

    expect(html).toContain('Bildirimler');
    expect(html).toContain('Başlık');
    expect(html).toContain('Tamam');
  });
});
