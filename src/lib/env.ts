// Çevre değişkeni doğrulama ve yönetimi

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SITE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_URL: string;
  REDIS_DB: number;
  REDIS_KEY_PREFIX: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

// Critical server-side env vars (must exist)
const requiredServerVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL'
] as const;

// Public client-side vars (optional)
const requiredClientVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY'
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check critical server-side vars only on server
  if (typeof window === 'undefined') {
    for (const key of requiredServerVars) {
      const value = readProcessEnv(key);
      if (!value) {
        missing.push(key);
      }
    }
  }

  // Check client-side public vars (optional, but log if missing)
  for (const key of requiredClientVars) {
    if (!getPublicClientVar(key)) {
      console.warn(`Optional client var missing: ${key}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export function getEnv(): EnvConfig;
export function getEnv(key: string, defaultValue?: string): string;
export function getEnv(key?: string, defaultValue?: string): EnvConfig | string {
  if (key) {
    return readProcessEnv(key) || defaultValue || '';
  }

  const dbUrl = readProcessEnv('DATABASE_URL');
  const jwtSecret = readProcessEnv('JWT_SECRET');
  const redisDb = parseRedisDb(readProcessEnv('REDIS_DB'), 15);
  const redisUrl = resolveRedisUrl(readProcessEnv('REDIS_URL'), redisDb);

  if (!dbUrl || !jwtSecret) {
    throw new Error('Missing critical env vars: DATABASE_URL and JWT_SECRET must be set');
  }

  return {
    SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
    SITE_URL: readProcessEnv('SITE_URL') || import.meta.env.PUBLIC_SITE_URL || 'https://sanliurfa.com',
    NODE_ENV: (readProcessEnv('NODE_ENV') as any) || (import.meta.env.MODE as any) || 'development',
    PORT: parseInt(readProcessEnv('PORT') || '4321', 10),
    DATABASE_URL: dbUrl,
    JWT_SECRET: jwtSecret,
    REDIS_URL: redisUrl,
    REDIS_DB: redisDb,
    REDIS_KEY_PREFIX: readProcessEnv('REDIS_KEY_PREFIX') || 'sanliurfa:',
    STRIPE_SECRET_KEY: readProcessEnv('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: readProcessEnv('STRIPE_WEBHOOK_SECRET')
  };
}

export const env = {
  isDev: () => import.meta.env.DEV,
  isProd: () => import.meta.env.PROD,
  isServer: () => typeof window === 'undefined',
  isClient: () => typeof window !== 'undefined',

  get: (key: string, defaultValue?: string): string => {
    const value = readProcessEnv(key);
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value || defaultValue || '';
  },

  getBool: (key: string, defaultValue = false): boolean => {
    const value = readProcessEnv(key);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  },

  getInt: (key: string, defaultValue = 0): number => {
    const value = readProcessEnv(key);
    if (value === undefined) return defaultValue;
    return parseInt(value, 10);
  }
};

function readProcessEnv(key: string): string | undefined {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return globalProcess?.env?.[key];
}

function parseRedisDb(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((rawValue || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 15) {
    return fallback;
  }
  return parsed;
}

function resolveRedisUrl(rawUrl: string | undefined, redisDb: number): string {
  if (!rawUrl) {
    return `redis://127.0.0.1:6379/${redisDb}`;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
      return rawUrl;
    }

    const pathname = (parsed.pathname || '').trim();
    if (!pathname || pathname === '/') {
      parsed.pathname = `/${redisDb}`;
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function getPublicClientVar(key: (typeof requiredClientVars)[number]): string {
  switch (key) {
    case 'PUBLIC_SUPABASE_URL':
      return import.meta.env.PUBLIC_SUPABASE_URL || '';
    case 'PUBLIC_SUPABASE_ANON_KEY':
      return import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
    default:
      return '';
  }
}
