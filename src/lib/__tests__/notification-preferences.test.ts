import { describe, expect, it } from 'vitest';

import {
  createDefaultNotificationPreferences,
  extractNotificationPreferenceValue,
  extractNotificationPreferencesSuccessMessage,
  renderNotificationPreferencesContent,
} from '../notification-preferences';

describe('notification preferences helpers', () => {
  it('creates default state for all types', () => {
    const state = createDefaultNotificationPreferences();

    expect(state.message.frequency).toBe('immediate');
    expect(state.marketing.emailEnabled).toBe(false);
  });

  it('unwraps nested preferences envelope', () => {
    const preferences = extractNotificationPreferenceValue({
      data: {
        success: true,
        data: {
          notificationType: 'message',
          preferences: {
            inAppEnabled: false,
            pushEnabled: true,
            emailEnabled: false,
            frequency: 'daily',
          },
        },
      },
    });

    expect(preferences.inAppEnabled).toBe(false);
    expect(preferences.frequency).toBe('daily');
  });

  it('renders cards and success state', () => {
    const html = renderNotificationPreferencesContent({
      preferences: createDefaultNotificationPreferences(),
      savingType: null,
      message: { type: 'success', text: extractNotificationPreferencesSuccessMessage({ data: { success: true, message: 'Tercihler güncellendi' } }) },
    });

    expect(html).toContain('Bildirim Tercihleri');
    expect(html).toContain('Yeni Mesajlar');
    expect(html).toContain('Tercihler güncellendi');
  });
});
