export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  in_app: boolean;
  digest: string;
}

export interface PrivacySettings {
  profile_public: boolean;
  show_email: boolean;
  allow_messages: boolean;
}

export interface UserSettingsProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  language_preference: string;
  theme_preference: string;
  email_verified: boolean;
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  two_factor_enabled: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

export interface TwoFactorSetup {
  qrCodeUrl: string | null;
  secret: string | null;
  backupCodes: string[];
}

export type UserSettingsTab = 'profile' | 'settings' | 'privacy' | 'password' | 'security';

export interface UserSettingsState {
  profile: UserSettingsProfile | null;
  activeTab: UserSettingsTab;
  error: string | null;
  successMessage: string | null;
  loading: boolean;
  saving: boolean;
  resendingVerification: boolean;
  profileForm: {
    full_name: string;
    username: string;
    avatar_url: string;
    bio: string;
  };
  settingsForm: {
    language_preference: string;
    theme_preference: string;
  };
  passwordForm: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  };
  preferencesForm: NotificationPreferences;
  privacyForm: PrivacySettings;
  twoFactor: {
    loading: boolean;
    setupMode: boolean;
    verifying: boolean;
    disabling: boolean;
    status: TwoFactorStatus | null;
    setup: TwoFactorSetup;
    verificationCode: string;
    disablePassword: string;
  };
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
      return nestedData as Record<string, unknown>;
    }
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function createDefaultUserSettingsState(): UserSettingsState {
  return {
    profile: null,
    activeTab: 'profile',
    error: null,
    successMessage: null,
    loading: true,
    saving: false,
    resendingVerification: false,
    profileForm: {
      full_name: '',
      username: '',
      avatar_url: '',
      bio: '',
    },
    settingsForm: {
      language_preference: 'tr',
      theme_preference: 'light',
    },
    passwordForm: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
    preferencesForm: {
      email: true,
      push: true,
      in_app: true,
      digest: 'weekly',
    },
    privacyForm: {
      profile_public: true,
      show_email: false,
      allow_messages: true,
    },
    twoFactor: {
      loading: false,
      setupMode: false,
      verifying: false,
      disabling: false,
      status: null,
      setup: {
        qrCodeUrl: null,
        secret: null,
        backupCodes: [],
      },
      verificationCode: '',
      disablePassword: '',
    },
  };
}

export function extractUserSettingsProfile(payload: unknown): UserSettingsProfile | null {
  const data = resolveEnvelopeData(payload);
  const profile = isObject(data.data) ? data.data : data;
  if (!isObject(profile)) return null;
  if (typeof profile.id !== 'string' || typeof profile.email !== 'string') return null;

  const notification_preferences = isObject(profile.notification_preferences)
    ? (profile.notification_preferences as NotificationPreferences)
    : { email: true, push: true, in_app: true, digest: 'weekly' };
  const privacy_settings = isObject(profile.privacy_settings)
    ? (profile.privacy_settings as PrivacySettings)
    : { profile_public: true, show_email: false, allow_messages: true };

  return {
    id: profile.id,
    email: profile.email,
    full_name: String(profile.full_name ?? ''),
    username: typeof profile.username === 'string' ? profile.username : '',
    avatar_url: typeof profile.avatar_url === 'string' ? profile.avatar_url : '',
    bio: typeof profile.bio === 'string' ? profile.bio : '',
    language_preference:
      typeof profile.language_preference === 'string' ? profile.language_preference : 'tr',
    theme_preference:
      typeof profile.theme_preference === 'string' ? profile.theme_preference : 'light',
    email_verified: Boolean(profile.email_verified),
    notification_preferences,
    privacy_settings,
    two_factor_enabled: Boolean(profile.two_factor_enabled),
  };
}

export function extractNotificationPreferences(payload: unknown): NotificationPreferences {
  const data = resolveEnvelopeData(payload);
  const prefs = isObject(data.data) ? data.data : data;
  return {
    email: Boolean(prefs.email),
    push: Boolean(prefs.push),
    in_app: Boolean(prefs.in_app),
    digest: typeof prefs.digest === 'string' ? prefs.digest : 'weekly',
  };
}

export function extractPrivacySettings(payload: unknown): PrivacySettings {
  const data = resolveEnvelopeData(payload);
  const settings = isObject(data.data) ? data.data : data;
  return {
    profile_public: Boolean(settings.profile_public),
    show_email: Boolean(settings.show_email),
    allow_messages: Boolean(settings.allow_messages),
  };
}

export function extractTwoFactorStatus(payload: unknown): TwoFactorStatus {
  const data = resolveEnvelopeData(payload);
  return {
    enabled: Boolean(data.twoFactorEnabled ?? data.two_factor_enabled),
    backupCodesRemaining: Number(data.backupCodesRemaining ?? 0),
  };
}

export function extractTwoFactorSetup(payload: unknown): TwoFactorSetup {
  const data = resolveEnvelopeData(payload);
  return {
    qrCodeUrl: typeof data.qrCodeUrl === 'string' ? data.qrCodeUrl : null,
    secret: typeof data.secret === 'string' ? data.secret : null,
    backupCodes: Array.isArray(data.backupCodes) ? (data.backupCodes as string[]) : [],
  };
}

export function extractUserSettingsMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);
  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (isObject(error) && typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
  }

  return fallback;
}

function renderTabs(activeTab: UserSettingsTab): string {
  const tabs: Array<{ id: UserSettingsTab; label: string }> = [
    { id: 'profile', label: 'Profil' },
    { id: 'settings', label: 'Genel Ayarlar' },
    { id: 'privacy', label: 'Gizlilik' },
    { id: 'password', label: 'Şifre' },
    { id: 'security', label: 'Güvenlik' },
  ];

  return `
    <div class="mb-6 flex flex-wrap border-b border-gray-200 dark:border-gray-700">
      ${tabs
        .map((tab) => {
          const active =
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';
          return `<button type="button" data-user-settings-tab="${tab.id}" class="border-b-2 px-4 py-2 font-medium transition-colors ${active}">${tab.label}</button>`;
        })
        .join('')}
    </div>
  `;
}

function renderMessages(state: UserSettingsState): string {
  return `
    ${
      state.error
        ? `<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">${escapeHtml(state.error)}</div>`
        : ''
    }
    ${
      state.successMessage
        ? `<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-600 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">${escapeHtml(state.successMessage)}</div>`
        : ''
    }
  `;
}

function renderVerificationBanner(state: UserSettingsState): string {
  if (!state.profile || state.profile.email_verified) return '';

  return `
    <div class="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="mb-1 font-semibold text-yellow-900 dark:text-yellow-200">E-posta doğrulanmadı</h3>
          <p class="text-sm text-yellow-800 dark:text-yellow-300">Hesabınızın güvenliği için e-posta adresinizi doğrulayın: ${escapeHtml(state.profile.email)}</p>
        </div>
        <button type="button" data-user-settings-resend-verification ${state.resendingVerification ? 'disabled' : ''} class="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50">
          ${state.resendingVerification ? 'Gönderiliyor...' : 'Doğrula'}
        </button>
      </div>
    </div>
  `;
}

function renderProfileTab(state: UserSettingsState): string {
  return `
    <form data-user-settings-profile-form class="rounded-lg bg-white p-6 space-y-4 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Profil bilgileriniz</h2>
      <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">E-posta adresi</p>
            <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(state.profile?.email)}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="${state.profile?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">${state.profile?.email_verified ? '✓' : '!'}</span>
            <span class="text-sm ${state.profile?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}">${state.profile?.email_verified ? 'Doğrulanmış' : 'Doğrulanmadı'}</span>
          </div>
        </div>
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Ad soyad</label>
        <input data-user-settings-field="full_name" type="text" value="${escapeHtml(state.profileForm.full_name)}" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Kullanıcı adı</label>
        <input data-user-settings-field="username" type="text" value="${escapeHtml(state.profileForm.username)}" placeholder="Boş bırakabilirsiniz" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar bağlantısı</label>
        <input data-user-settings-field="avatar_url" type="url" value="${escapeHtml(state.profileForm.avatar_url)}" placeholder="https://..." class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Biyografi</label>
        <textarea data-user-settings-field="bio" rows="4" maxlength="500" class="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">${escapeHtml(state.profileForm.bio)}</textarea>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${state.profileForm.bio.length}/500</p>
      </div>
      <button type="submit" ${state.saving ? 'disabled' : ''} class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        ${state.saving ? 'Kaydediliyor...' : 'Profili kaydet'}
      </button>
    </form>
  `;
}

function renderSettingsTab(state: UserSettingsState): string {
  return `
    <form data-user-settings-settings-form class="rounded-lg bg-white p-6 space-y-4 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Genel ayarlar</h2>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Dil</label>
        <select data-user-settings-field="language_preference" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="tr" selected>Türkçe</option>
        </select>
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tema</label>
        <select data-user-settings-field="theme_preference" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="light" ${state.settingsForm.theme_preference === 'light' ? 'selected' : ''}>Açık</option>
          <option value="dark" ${state.settingsForm.theme_preference === 'dark' ? 'selected' : ''}>Koyu</option>
          <option value="auto" ${state.settingsForm.theme_preference === 'auto' ? 'selected' : ''}>Otomatik</option>
        </select>
      </div>
      <h3 class="pt-4 text-base font-semibold text-gray-900 dark:text-white">Bildirim tercihleri</h3>
      <div class="space-y-3">
        <label class="flex cursor-pointer items-center"><input data-user-settings-preference="email" type="checkbox" ${state.preferencesForm.email ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500" /><span class="ml-3 text-gray-700 dark:text-gray-300">E-posta bildirimleri</span></label>
        <label class="flex cursor-pointer items-center"><input data-user-settings-preference="push" type="checkbox" ${state.preferencesForm.push ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500" /><span class="ml-3 text-gray-700 dark:text-gray-300">Push bildirimleri</span></label>
        <label class="flex cursor-pointer items-center"><input data-user-settings-preference="in_app" type="checkbox" ${state.preferencesForm.in_app ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500" /><span class="ml-3 text-gray-700 dark:text-gray-300">Uygulama içi bildirimler</span></label>
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Özet sıklığı</label>
        <select data-user-settings-preference="digest" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
          <option value="never" ${state.preferencesForm.digest === 'never' ? 'selected' : ''}>Asla</option>
          <option value="daily" ${state.preferencesForm.digest === 'daily' ? 'selected' : ''}>Günlük</option>
          <option value="weekly" ${state.preferencesForm.digest === 'weekly' ? 'selected' : ''}>Haftalık</option>
          <option value="monthly" ${state.preferencesForm.digest === 'monthly' ? 'selected' : ''}>Aylık</option>
        </select>
      </div>
      <button type="submit" ${state.saving ? 'disabled' : ''} class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        ${state.saving ? 'Kaydediliyor...' : 'Ayarları kaydet'}
      </button>
    </form>
  `;
}

function renderPrivacyTab(state: UserSettingsState): string {
  const options: Array<{ key: keyof PrivacySettings; label: string }> = [
    { key: 'profile_public', label: 'Profilimi herkese görünür yap' },
    { key: 'show_email', label: 'E-posta adresimi göster' },
    { key: 'allow_messages', label: 'Bana direkt mesaj gönderilebilsin' },
  ];

  return `
    <form data-user-settings-privacy-form class="rounded-lg bg-white p-6 space-y-4 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Gizlilik ayarları</h2>
      <div class="space-y-3">
        ${options
          .map(
            (option) => `
              <label class="flex cursor-pointer items-center">
                <input data-user-settings-privacy="${option.key}" type="checkbox" ${state.privacyForm[option.key] ? 'checked' : ''} class="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500" />
                <span class="ml-3 text-gray-700 dark:text-gray-300">${option.label}</span>
              </label>
            `,
          )
          .join('')}
      </div>
      <button type="submit" ${state.saving ? 'disabled' : ''} class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        ${state.saving ? 'Kaydediliyor...' : 'Gizlilik ayarlarını kaydet'}
      </button>
    </form>
  `;
}

function renderPasswordTab(state: UserSettingsState): string {
  return `
    <form data-user-settings-password-form class="rounded-lg bg-white p-6 space-y-4 dark:bg-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Şifre değiştir</h2>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Mevcut şifre</label>
        <input data-user-settings-password="current_password" type="password" value="${escapeHtml(state.passwordForm.current_password)}" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Yeni şifre</label>
        <input data-user-settings-password="new_password" type="password" value="${escapeHtml(state.passwordForm.new_password)}" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Şifreyi onayla</label>
        <input data-user-settings-password="confirm_password" type="password" value="${escapeHtml(state.passwordForm.confirm_password)}" class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
      </div>
      <button type="submit" ${state.saving ? 'disabled' : ''} class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        ${state.saving ? 'Kaydediliyor...' : 'Şifreyi değiştir'}
      </button>
    </form>
  `;
}

function renderSecurityTab(state: UserSettingsState): string {
  const status = state.twoFactor.status;
  const setupMode = state.twoFactor.setupMode;

  if (setupMode) {
    return `
      <div class="space-y-4 rounded-lg bg-white p-6 dark:bg-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">2FA kurulumu</h2>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          <strong>Adım 1:</strong> Kimlik doğrulayıcı uygulamanızla QR bağlantısını açın veya gizli anahtarı girin.
        </div>
        ${state.twoFactor.setup.qrCodeUrl ? `<a href="${escapeHtml(state.twoFactor.setup.qrCodeUrl)}" target="_blank" rel="noreferrer" class="inline-flex rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">QR Bağlantısını Aç</a>` : ''}
        ${state.twoFactor.setup.secret ? `<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700"><p class="mb-2 text-sm text-gray-600 dark:text-gray-400">Gizli Anahtar</p><div class="break-all rounded bg-white p-3 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-white">${escapeHtml(state.twoFactor.setup.secret)}</div></div>` : ''}
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Doğrulama Kodu</label>
          <div class="flex gap-2">
            <input data-user-settings-2fa-code type="text" value="${escapeHtml(state.twoFactor.verificationCode)}" maxlength="6" placeholder="000000" class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-2xl tracking-widest text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <button type="button" data-user-settings-2fa-verify ${state.twoFactor.verifying || state.twoFactor.verificationCode.length !== 6 ? 'disabled' : ''} class="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">${state.twoFactor.verifying ? 'Doğrulanıyor...' : 'Doğrula'}</button>
          </div>
        </div>
        <button type="button" data-user-settings-2fa-cancel class="w-full text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">İptal Et</button>
      </div>
    `;
  }

  return `
    <div class="space-y-4 rounded-lg bg-white p-6 dark:bg-gray-800">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">İki Faktörlü Kimlik Doğrulama</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Hesabınızı ek güvenlik katmanı ile koruyun</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="${status?.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}">${status?.enabled ? '✓' : '—'}</span>
          <span class="text-sm ${status?.enabled ? 'font-medium text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}">${status?.enabled ? 'Etkinleştirildi' : 'Devre dışı'}</span>
        </div>
      </div>
      ${
        status?.enabled
          ? `<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">2FA etkin. Kalan yedek kod: ${status.backupCodesRemaining}</div>`
          : ''
      }
      ${
        !status?.enabled
          ? `<button type="button" data-user-settings-2fa-start ${state.twoFactor.loading ? 'disabled' : ''} class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">${state.twoFactor.loading ? 'Kuruluyor...' : 'Etkinleştir'}</button>`
          : `
            ${
              state.twoFactor.setup.backupCodes.length > 0
                ? `<div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700"><p class="mb-3 text-sm font-medium text-gray-900 dark:text-white">Yedek Kodlar</p><div class="space-y-2 font-mono text-sm">${state.twoFactor.setup.backupCodes.map((code) => `<div class="rounded bg-white p-2 text-gray-700 dark:bg-gray-800 dark:text-gray-300">${escapeHtml(code)}</div>`).join('')}</div></div>`
                : ''
            }
            <div class="border-t border-gray-200 pt-4 dark:border-gray-700">
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">2FA'yı kapatmak için şifrenizi girin</label>
              <div class="flex gap-2">
                <input data-user-settings-2fa-disable-password type="password" value="${escapeHtml(state.twoFactor.disablePassword)}" placeholder="Şifreniz" class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                <button type="button" data-user-settings-2fa-disable ${state.twoFactor.disabling || !state.twoFactor.disablePassword ? 'disabled' : ''} class="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">${state.twoFactor.disabling ? 'Kapatılıyor...' : 'Kapat'}</button>
              </div>
            </div>
          `
      }
    </div>
  `;
}

export function renderUserSettings(state: UserSettingsState): string {
  if (!state.profile && state.loading) {
    return '<div class="py-8 text-center text-gray-600 dark:text-gray-400">Ayarlar yükleniyor...</div>';
  }

  if (!state.profile) {
    return `
      <div>
        ${renderMessages(state)}
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">Profil bilgileri alınamadı.</div>
      </div>
    `;
  }

  let tabContent = '';
  if (state.activeTab === 'profile') tabContent = renderProfileTab(state);
  else if (state.activeTab === 'settings') tabContent = renderSettingsTab(state);
  else if (state.activeTab === 'privacy') tabContent = renderPrivacyTab(state);
  else if (state.activeTab === 'password') tabContent = renderPasswordTab(state);
  else tabContent = renderSecurityTab(state);

  return `
    <div class="space-y-6">
      ${renderTabs(state.activeTab)}
      ${renderMessages(state)}
      ${renderVerificationBanner(state)}
      ${tabContent}
    </div>
  `;
}
