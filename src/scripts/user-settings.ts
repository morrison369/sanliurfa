import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  createDefaultUserSettingsState,
  extractPrivacySettings,
  extractTwoFactorSetup,
  extractTwoFactorStatus,
  extractUserSettingsMessage,
  extractUserSettingsProfile,
  renderUserSettings,
  type PrivacySettings,
  type UserSettingsState,
  type UserSettingsTab,
} from '../lib/user-settings';

type UserSettingsRoot = HTMLElement & { dataset: DOMStringMap };

const states = new WeakMap<UserSettingsRoot, UserSettingsState>();

function getState(root: UserSettingsRoot): UserSettingsState {
  const existing = states.get(root);
  if (existing) return existing;
  const next = createDefaultUserSettingsState();
  states.set(root, next);
  return next;
}

function clearMessages(state: UserSettingsState) {
  state.error = null;
  state.successMessage = null;
}

async function fetchJson(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json();
  return { response, payload };
}

async function loadProfile(root: UserSettingsRoot) {
  const state = getState(root);
  state.loading = true;
  clearMessages(state);
  try {
    const { response, payload } = await fetchJson('/api/users/profile');
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, 'Profil yüklenemedi'));
    const profile = extractUserSettingsProfile(payload);
    if (!profile) throw new Error('Profil yüklenemedi');

    state.profile = profile;
    state.profileForm = {
      full_name: profile.full_name,
      username: profile.username || '',
      avatar_url: profile.avatar_url || '',
      bio: profile.bio || '',
    };
    state.settingsForm = {
      language_preference: 'tr',
      theme_preference: profile.theme_preference || 'light',
    };
    state.preferencesForm = { ...profile.notification_preferences };
    state.privacyForm = {
      profile_public: profile.privacy_settings.profile_public,
      show_email: profile.privacy_settings.show_email,
      allow_messages: profile.privacy_settings.allow_messages,
    };
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Profil yüklenemedi';
  } finally {
    state.loading = false;
  }
}

async function ensureTwoFactorStatus(root: UserSettingsRoot) {
  const state = getState(root);
  if (state.twoFactor.status || state.twoFactor.loading) return;
  state.twoFactor.loading = true;
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/2fa/status');
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, '2FA durumu alınamadı'));
    state.twoFactor.status = extractTwoFactorStatus(payload);
  } catch (error) {
    state.error = error instanceof Error ? error.message : '2FA durumu alınamadı';
  } finally {
    state.twoFactor.loading = false;
  }
}

async function saveProfile(root: UserSettingsRoot) {
  const state = getState(root);
  state.saving = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.profileForm),
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, 'Profil güncellenemedi'));
    const profile = extractUserSettingsProfile(payload);
    if (profile) {
      state.profile = profile;
      state.profileForm = {
        full_name: profile.full_name,
        username: profile.username || '',
        avatar_url: profile.avatar_url || '',
        bio: profile.bio || '',
      };
    }
    state.successMessage = extractUserSettingsMessage(payload, 'Profil başarıyla güncellendi');
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Profil güncellenemedi';
  } finally {
    state.saving = false;
    await renderRoot(root);
  }
}

async function saveSettings(root: UserSettingsRoot) {
  const state = getState(root);
  state.saving = true;
  state.settingsForm.language_preference = 'tr';
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...state.settingsForm,
        notification_preferences: state.preferencesForm,
      }),
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, 'Ayarlar güncellenemedi'));
    if (state.profile) {
      state.profile.language_preference = 'tr';
      state.profile.theme_preference = state.settingsForm.theme_preference;
      state.profile.notification_preferences = { ...state.preferencesForm };
    }
    state.successMessage = extractUserSettingsMessage(payload, 'Ayarlar başarıyla güncellendi');
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Ayarlar güncellenemedi';
  } finally {
    state.saving = false;
    await renderRoot(root);
  }
}

async function savePrivacy(root: UserSettingsRoot) {
  const state = getState(root);
  state.saving = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/privacy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.privacyForm),
    });
    if (!response.ok) {
      throw new Error(extractUserSettingsMessage(payload, 'Gizlilik ayarları güncellenemedi'));
    }
    const privacy = extractPrivacySettings(payload);
    state.privacyForm = privacy;
    if (state.profile) {
      state.profile.privacy_settings = {
        ...state.profile.privacy_settings,
        ...privacy,
      } as PrivacySettings;
    }
    state.successMessage = extractUserSettingsMessage(
      payload,
      'Gizlilik ayarları başarıyla güncellendi',
    );
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Gizlilik ayarları güncellenemedi';
  } finally {
    state.saving = false;
    await renderRoot(root);
  }
}

async function savePassword(root: UserSettingsRoot) {
  const state = getState(root);
  state.saving = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.passwordForm),
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, 'Şifre değiştirilemedi'));
    state.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
    state.successMessage = extractUserSettingsMessage(payload, 'Şifre başarıyla değiştirildi');
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Şifre değiştirilemedi';
  } finally {
    state.saving = false;
    await renderRoot(root);
  }
}

async function resendVerification(root: UserSettingsRoot) {
  const state = getState(root);
  state.resendingVerification = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(extractUserSettingsMessage(payload, 'Doğrulama e-postası gönderilemedi'));
    }
    state.successMessage = extractUserSettingsMessage(
      payload,
      'Doğrulama e-postası başarıyla gönderildi',
    );
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Doğrulama e-postası gönderilemedi';
  } finally {
    state.resendingVerification = false;
    await renderRoot(root);
  }
}

async function startTwoFactorSetup(root: UserSettingsRoot) {
  const state = getState(root);
  state.twoFactor.loading = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/2fa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, '2FA ayarı başlatılamadı'));
    state.twoFactor.setup = extractTwoFactorSetup(payload);
    state.twoFactor.setupMode = true;
  } catch (error) {
    state.error = error instanceof Error ? error.message : '2FA ayarı başlatılamadı';
  } finally {
    state.twoFactor.loading = false;
    await renderRoot(root);
  }
}

async function verifyTwoFactor(root: UserSettingsRoot) {
  const state = getState(root);
  if (!/^\d{6}$/.test(state.twoFactor.verificationCode)) {
    state.error = 'Kod 6 haneli bir sayı olmalıdır';
    await renderRoot(root);
    return;
  }
  state.twoFactor.verifying = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: state.twoFactor.verificationCode }),
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, '2FA doğrulanamadı'));
    state.twoFactor.setup = extractTwoFactorSetup(payload);
    state.twoFactor.setupMode = false;
    state.twoFactor.verificationCode = '';
    state.twoFactor.status = {
      enabled: true,
      backupCodesRemaining: state.twoFactor.setup.backupCodes.length,
    };
    if (state.profile) state.profile.two_factor_enabled = true;
    state.successMessage = extractUserSettingsMessage(payload, '2FA başarıyla etkinleştirildi');
  } catch (error) {
    state.error = error instanceof Error ? error.message : '2FA doğrulanamadı';
  } finally {
    state.twoFactor.verifying = false;
    await renderRoot(root);
  }
}

async function disableTwoFactor(root: UserSettingsRoot) {
  const state = getState(root);
  state.twoFactor.disabling = true;
  clearMessages(state);
  await renderRoot(root);
  try {
    const { response, payload } = await fetchJson('/api/users/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: state.twoFactor.disablePassword }),
    });
    if (!response.ok) throw new Error(extractUserSettingsMessage(payload, '2FA devre dışı bırakılamadı'));
    state.twoFactor.status = { enabled: false, backupCodesRemaining: 0 };
    state.twoFactor.disablePassword = '';
    state.twoFactor.setup.backupCodes = [];
    if (state.profile) state.profile.two_factor_enabled = false;
    state.successMessage = extractUserSettingsMessage(payload, '2FA devre dışı bırakıldı');
  } catch (error) {
    state.error = error instanceof Error ? error.message : '2FA devre dışı bırakılamadı';
  } finally {
    state.twoFactor.disabling = false;
    await renderRoot(root);
  }
}

function bindTabs(root: UserSettingsRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-user-settings-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.userSettingsTab as UserSettingsTab | undefined;
      if (!next) return;
      const state = getState(root);
      state.activeTab = next;
      state.error = null;
      state.successMessage = null;
      void renderRoot(root);
    });
  });
}

function bindProfileAndSettings(root: UserSettingsRoot, content: HTMLElement) {
  const state = getState(root);

  content.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-user-settings-field]').forEach((field) => {
    field.addEventListener('input', () => {
      const key = field.dataset.userSettingsField as string;
      if (state.activeTab === 'profile' && key in state.profileForm) {
        (state.profileForm as Record<string, string>)[key] = field.value;
      }
      if (state.activeTab === 'settings' && key in state.settingsForm) {
        (state.settingsForm as Record<string, string>)[key] = field.value;
      }
    });
    field.addEventListener('change', () => {
      const key = field.dataset.userSettingsField as string;
      if (state.activeTab === 'settings' && key in state.settingsForm) {
        (state.settingsForm as Record<string, string>)[key] = field.value;
      }
    });
  });

  content.querySelector<HTMLFormElement>('[data-user-settings-profile-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void saveProfile(root);
  });
  content.querySelector<HTMLFormElement>('[data-user-settings-settings-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void saveSettings(root);
  });
}

function bindPreferences(root: UserSettingsRoot, content: HTMLElement) {
  const state = getState(root);
  content.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-user-settings-preference]').forEach((field) => {
    field.addEventListener('change', () => {
      const key = field.dataset.userSettingsPreference as keyof typeof state.preferencesForm;
      state.preferencesForm[key] =
        'checked' in field && field.type === 'checkbox' ? field.checked : field.value;
    });
  });
}

function bindPrivacy(root: UserSettingsRoot, content: HTMLElement) {
  const state = getState(root);
  content.querySelectorAll<HTMLInputElement>('[data-user-settings-privacy]').forEach((field) => {
    field.addEventListener('change', () => {
      const key = field.dataset.userSettingsPrivacy as keyof PrivacySettings;
      state.privacyForm[key] = field.checked;
    });
  });
  content.querySelector<HTMLFormElement>('[data-user-settings-privacy-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void savePrivacy(root);
  });
}

function bindPassword(root: UserSettingsRoot, content: HTMLElement) {
  const state = getState(root);
  content.querySelectorAll<HTMLInputElement>('[data-user-settings-password]').forEach((field) => {
    field.addEventListener('input', () => {
      const key = field.dataset.userSettingsPassword as keyof typeof state.passwordForm;
      state.passwordForm[key] = field.value;
    });
  });
  content.querySelector<HTMLFormElement>('[data-user-settings-password-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void savePassword(root);
  });
}

function bindVerification(root: UserSettingsRoot, content: HTMLElement) {
  content.querySelector<HTMLElement>('[data-user-settings-resend-verification]')?.addEventListener('click', () => {
    void resendVerification(root);
  });
}

function bindTwoFactor(root: UserSettingsRoot, content: HTMLElement) {
  const state = getState(root);
  content.querySelector<HTMLElement>('[data-user-settings-2fa-start]')?.addEventListener('click', () => {
    void startTwoFactorSetup(root);
  });
  content.querySelector<HTMLElement>('[data-user-settings-2fa-verify]')?.addEventListener('click', () => {
    void verifyTwoFactor(root);
  });
  content.querySelector<HTMLElement>('[data-user-settings-2fa-cancel]')?.addEventListener('click', () => {
    state.twoFactor.setupMode = false;
    state.twoFactor.verificationCode = '';
    state.twoFactor.setup = { qrCodeUrl: null, secret: null, backupCodes: [] };
    state.error = null;
    void renderRoot(root);
  });
  content.querySelector<HTMLInputElement>('[data-user-settings-2fa-code]')?.addEventListener('input', (event) => {
    state.twoFactor.verificationCode = (event.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
  });
  content.querySelector<HTMLInputElement>('[data-user-settings-2fa-disable-password]')?.addEventListener('input', (event) => {
    state.twoFactor.disablePassword = (event.currentTarget as HTMLInputElement).value;
  });
  content.querySelector<HTMLElement>('[data-user-settings-2fa-disable]')?.addEventListener('click', () => {
    void disableTwoFactor(root);
  });
}

function bindActions(root: UserSettingsRoot, content: HTMLElement) {
  bindTabs(root, content);
  bindProfileAndSettings(root, content);
  bindPreferences(root, content);
  bindPrivacy(root, content);
  bindPassword(root, content);
  bindVerification(root, content);
  bindTwoFactor(root, content);
}

async function renderRoot(root: UserSettingsRoot) {
  const loading = root.querySelector<HTMLElement>('[data-user-settings-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-settings-content]');
  if (!loading || !content) return;

  const state = getState(root);
  if (!state.profile && !state.loading && !state.error) {
    await loadProfile(root);
  }
  if (state.activeTab === 'security' && !state.twoFactor.status && !state.twoFactor.setupMode) {
    await ensureTwoFactorStatus(root);
  }

  setElementHtml(content, renderUserSettings(state));
  bindActions(root, content);
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
}

export function initUserSettings() {
  const roots = Array.from(document.querySelectorAll<UserSettingsRoot>('[data-user-settings]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    const state = getState(root);
    state.loading = false;
    void renderRoot(root);
  }
}
