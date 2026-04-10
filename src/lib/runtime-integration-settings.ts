import { logger } from './logging';

const SETTINGS_KEY_RESEND = 'integration.resend_api_key';
const SETTINGS_KEY_ANALYTICS = 'integration.analytics_id';
const CACHE_TTL_MS = 60_000;

type IntegrationSettingsCache = {
  expiresAt: number;
  value: RuntimeIntegrationSettings;
};

export type RuntimeIntegrationSettings = {
  resendApiKey: string;
  analyticsId: string;
  source: {
    resendApiKey: 'env' | 'admin' | 'none';
    analyticsId: 'env' | 'admin' | 'none';
  };
};

export type IntegrationVerificationStatus = 'verified' | 'invalid' | 'unreachable' | 'not_configured';

export type RuntimeIntegrationVerificationEntry = {
  status: IntegrationVerificationStatus;
  scope: 'provider' | 'runtime';
  checkedAt: string;
  message: string;
};

export type RuntimeIntegrationVerification = {
  resend: RuntimeIntegrationVerificationEntry;
  analytics: RuntimeIntegrationVerificationEntry;
  summary: {
    healthy: boolean;
    checkedAt: string;
  };
};

let cache: IntegrationSettingsCache | null = null;

const resendPlaceholderPatterns = [/^re_x+$/i, /^your_/i, /^changeme$/i];
const analyticsPlaceholderPatterns = [/^g-xxxxxxxxxx$/i, /^g-x+$/i, /^your_/i];

function normalizeValue(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function hasNonPlaceholder(value: string, placeholderPatterns: RegExp[]): boolean {
  if (!value) {
    return false;
  }

  return !placeholderPatterns.some((pattern) => pattern.test(value));
}

export function isValidResendKey(value: string): boolean {
  return hasNonPlaceholder(value, resendPlaceholderPatterns) && /^re_[a-z0-9]+$/i.test(value);
}

export function isValidAnalyticsId(value: string): boolean {
  return hasNonPlaceholder(value, analyticsPlaceholderPatterns) && /^G-[A-Z0-9]+$/i.test(value);
}

async function readGlobalSetting(settingKey: string): Promise<string | null> {
  try {
    const { queryOne } = await import('./postgres');
    const row = await queryOne(
      `SELECT setting_value
       FROM admin_dashboard_settings
       WHERE setting_key = $1
         AND is_global = true
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [settingKey]
    );

    const raw = row?.setting_value;
    if (!raw) {
      return null;
    }

    if (typeof raw === 'string') {
      return normalizeValue(raw);
    }

    if (typeof raw === 'object' && raw !== null) {
      const candidate = (raw as Record<string, unknown>).value;
      return normalizeValue(typeof candidate === 'string' ? candidate : '');
    }

    return null;
  } catch (error) {
    logger.warn('Failed to read global integration setting, falling back to env', {
      settingKey,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

function buildFromEnv(): RuntimeIntegrationSettings {
  const envResend = normalizeValue(process.env.RESEND_API_KEY);
  const envAnalyticsCandidates = [
    normalizeValue(process.env.PUBLIC_GOOGLE_ANALYTICS_ID),
    normalizeValue(process.env.GOOGLE_ANALYTICS_ID),
    normalizeValue(process.env.GA_TRACKING_ID)
  ];

  const resendApiKey = isValidResendKey(envResend) ? envResend : '';
  const analyticsId = envAnalyticsCandidates.find((candidate) => isValidAnalyticsId(candidate)) || '';

  return {
    resendApiKey,
    analyticsId,
    source: {
      resendApiKey: resendApiKey ? 'env' : 'none',
      analyticsId: analyticsId ? 'env' : 'none'
    }
  };
}

export async function getRuntimeIntegrationSettings(forceRefresh = false): Promise<RuntimeIntegrationSettings> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const current = buildFromEnv();

  if (!current.resendApiKey) {
    const adminResend = normalizeValue(await readGlobalSetting(SETTINGS_KEY_RESEND));
    if (isValidResendKey(adminResend)) {
      current.resendApiKey = adminResend;
      current.source.resendApiKey = 'admin';
    }
  }

  if (!current.analyticsId) {
    const adminAnalytics = normalizeValue(await readGlobalSetting(SETTINGS_KEY_ANALYTICS));
    if (isValidAnalyticsId(adminAnalytics)) {
      current.analyticsId = adminAnalytics;
      current.source.analyticsId = 'admin';
    }
  }

  cache = {
    value: current,
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return current;
}

export function clearRuntimeIntegrationSettingsCache(): void {
  cache = null;
}

async function verifyResendKey(apiKey: string): Promise<RuntimeIntegrationVerificationEntry> {
  const checkedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      status: 'not_configured',
      scope: 'provider',
      checkedAt,
      message: 'RESEND API anahtarı tanımlı değil'
    };
  }

  if (!isValidResendKey(apiKey)) {
    return {
      status: 'invalid',
      scope: 'provider',
      checkedAt,
      message: 'RESEND API anahtarı format doğrulamasını geçemedi'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal
    });

    if (response.ok) {
      return {
        status: 'verified',
        scope: 'provider',
        checkedAt,
        message: 'RESEND sağlayıcı doğrulaması başarılı'
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        status: 'invalid',
        scope: 'provider',
        checkedAt,
        message: 'RESEND anahtarı sağlayıcı tarafından reddedildi'
      };
    }

    return {
      status: 'unreachable',
      scope: 'provider',
      checkedAt,
      message: `RESEND doğrulaması beklenmeyen yanıt döndürdü (${response.status})`
    };
  } catch (error) {
    return {
      status: 'unreachable',
      scope: 'provider',
      checkedAt,
      message: error instanceof Error ? error.message : 'RESEND doğrulaması başarısız'
    };
  } finally {
    clearTimeout(timeout);
  }
}

function verifyAnalyticsRuntime(analyticsId: string): RuntimeIntegrationVerificationEntry {
  const checkedAt = new Date().toISOString();

  if (!analyticsId) {
    return {
      status: 'not_configured',
      scope: 'runtime',
      checkedAt,
      message: 'Analytics ID tanımlı değil'
    };
  }

  if (!isValidAnalyticsId(analyticsId)) {
    return {
      status: 'invalid',
      scope: 'runtime',
      checkedAt,
      message: 'Analytics ID format doğrulamasını geçemedi'
    };
  }

  return {
    status: 'verified',
    scope: 'runtime',
    checkedAt,
    message: 'Layout runtime analytics kimliğini tüketmeye hazır'
  };
}

export async function verifyRuntimeIntegrationSettings(
  settings?: RuntimeIntegrationSettings
): Promise<RuntimeIntegrationVerification> {
  const current = settings ?? await getRuntimeIntegrationSettings();
  const resend = await verifyResendKey(current.resendApiKey);
  const analytics = verifyAnalyticsRuntime(current.analyticsId);
  const checkedAt = new Date().toISOString();

  return {
    resend,
    analytics,
    summary: {
      healthy: resend.status === 'verified' && analytics.status === 'verified',
      checkedAt
    }
  };
}

export async function saveRuntimeIntegrationSetting(options: {
  settingKey: 'resendApiKey' | 'analyticsId';
  value: string;
  adminId: string;
}): Promise<void> {
  const value = normalizeValue(options.value);
  if (options.settingKey === 'resendApiKey' && value && !isValidResendKey(value)) {
    throw new Error('Invalid RESEND API key format');
  }
  if (options.settingKey === 'analyticsId' && value && !isValidAnalyticsId(value)) {
    throw new Error('Invalid Google Analytics ID format');
  }

  const databaseSettingKey =
    options.settingKey === 'resendApiKey' ? SETTINGS_KEY_RESEND : SETTINGS_KEY_ANALYTICS;

  const { query } = await import('./postgres');
  await query(
    `DELETE FROM admin_dashboard_settings
     WHERE setting_key = $1
       AND is_global = true`,
    [databaseSettingKey]
  );

  if (value) {
    await query(
      `INSERT INTO admin_dashboard_settings (
         id,
         admin_id,
         setting_key,
         setting_value,
         is_global,
         created_at,
         updated_at
       )
       VALUES (
         gen_random_uuid(),
         $1,
         $2,
         $3::jsonb,
         true,
         NOW(),
         NOW()
       )`,
      [options.adminId, databaseSettingKey, JSON.stringify({ value })]
    );
  }

  clearRuntimeIntegrationSettingsCache();
}
