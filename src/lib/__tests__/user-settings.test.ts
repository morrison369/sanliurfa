import { describe, expect, it } from 'vitest';
import {
  createDefaultUserSettingsState,
  extractTwoFactorStatus,
  extractUserSettingsMessage,
  extractUserSettingsProfile,
  renderUserSettings,
} from '../user-settings';

describe('user-settings helpers', () => {
  it('extracts nested profile and 2fa payloads', () => {
    const profile = extractUserSettingsProfile({
      data: {
        success: true,
        data: {
          id: 'u1',
          email: 'test@example.com',
          full_name: 'Test Kullanıcı',
          language_preference: 'tr',
          theme_preference: 'dark',
          email_verified: false,
          notification_preferences: { email: true, push: false, in_app: true, digest: 'weekly' },
          privacy_settings: { profile_public: true, show_email: false, allow_messages: true },
          two_factor_enabled: true,
        },
      },
    });

    expect(profile?.full_name).toBe('Test Kullanıcı');
    expect(profile?.theme_preference).toBe('dark');
    expect(extractTwoFactorStatus({ data: { success: true, twoFactorEnabled: true, backupCodesRemaining: 6 } })).toEqual({
      enabled: true,
      backupCodesRemaining: 6,
    });
  });

  it('renders settings with Turkish-only language option and 2fa setup mode', () => {
    const state = createDefaultUserSettingsState();
    state.profile = {
      id: 'u1',
      email: 'test@example.com',
      full_name: 'Test Kullanıcı',
      username: 'test',
      avatar_url: '',
      bio: 'Merhaba',
      language_preference: 'tr',
      theme_preference: 'light',
      email_verified: false,
      notification_preferences: { email: true, push: true, in_app: true, digest: 'weekly' },
      privacy_settings: { profile_public: true, show_email: false, allow_messages: true },
      two_factor_enabled: false,
    };
    state.activeTab = 'settings';
    const settingsHtml = renderUserSettings(state);

    expect(settingsHtml).toContain('<option value="tr" selected>Türkçe</option>');
    expect(settingsHtml).not.toContain('English');

    state.activeTab = 'security';
    state.twoFactor.setupMode = true;
    state.twoFactor.setup.secret = 'SECRET123';
    const securityHtml = renderUserSettings(state);
    expect(securityHtml).toContain('2FA Kurulumu');
    expect(securityHtml).toContain('SECRET123');
  });

  it('extracts message from envelope or error object', () => {
    expect(extractUserSettingsMessage({ data: { success: true, message: 'Kaydedildi' } }, 'fallback')).toBe(
      'Kaydedildi',
    );
    expect(extractUserSettingsMessage({ error: { message: 'Hata' } }, 'fallback')).toBe('Hata');
  });
});
