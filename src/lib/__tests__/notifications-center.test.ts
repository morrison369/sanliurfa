import { describe, expect, it } from 'vitest';

import {
  extractNotificationsCenterData,
  extractNotificationsCenterMessage,
  renderNotificationsCenter,
} from '../notifications-center';

describe('notifications center helpers', () => {
  it('unwraps nested notifications payload', () => {
    const data = extractNotificationsCenterData({
      data: {
        success: true,
        data: {
          data: [
            {
              id: 'n1',
              type: 'message',
              message: 'Yeni yorum',
              created_at: '2026-04-17T00:00:00.000Z',
              read_at: null,
            },
          ],
          count: 1,
          filter: 'unread',
        },
      },
    });

    expect(data.notifications).toHaveLength(1);
    expect(data.count).toBe(1);
    expect(data.filter).toBe('unread');
  });

  it('reads nested message and renders notifications html', () => {
    const html = renderNotificationsCenter({
      notifications: [
        {
          id: 'n1',
          type: 'message',
          message: 'Yeni mesaj',
          created_at: '2026-04-17T00:00:00.000Z',
          read_at: null,
        },
      ],
      filter: 'all',
      actionInProgress: null,
      bulkActionInProgress: false,
      error: extractNotificationsCenterMessage({ data: { success: true, message: 'Tamam' } }, 'Hata'),
    });

    expect(html).toContain('Bildirim merkezi');
    expect(html).toContain('Yeni mesaj');
    expect(html).toContain('Tamam');
    expect(html).toContain('Tüm okunmamışları okundu olarak işaretle');
  });
});
