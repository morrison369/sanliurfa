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
  REDIS_KEY_PREFIX: string;
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
      const value = process.env[key] || import.meta.env[key];
      if (!value) {
        missing.push(key);
      }
    }
  }

  // Check client-side public vars (optional, but log if missing)
  for (const key of requiredClientVars) {
    if (!import.meta.env[key]) {
      console.warn(`Optional client var missing: ${key}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export function getEnv(): EnvConfig {
  const dbUrl = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET || import.meta.env.JWT_SECRET;
  const redisUrl = process.env.REDIS_URL || import.meta.env.REDIS_URL || 'redis://localhost:6379';

  if (!dbUrl || !jwtSecret) {
    throw new Error('Missing critical env vars: DATABASE_URL and JWT_SECRET must be set');
  }

  return {
    SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
    SITE_URL: import.meta.env.PUBLIC_SITE_URL || 'http://localhost:1111',
    NODE_ENV: (import.meta.env.MODE as any) || 'development',
    PORT: parseInt(import.meta.env.PORT || '3000'),
    DATABASE_URL: dbUrl,
    JWT_SECRET: jwtSecret,
    REDIS_URL: redisUrl,
    REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || 'sanliurfa:'
  };
}

export const env = {
  isDev: () => import.meta.env.DEV,
  isProd: () => import.meta.env.PROD,
  isServer: () => typeof window === 'undefined',
  isClient: () => typeof window !== 'undefined',
  
  get: (key: string, defaultValue?: string): string => {
    const value = import.meta.env[key];
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value || defaultValue || '';
  },
  
  getBool: (key: string, defaultValue = false): boolean => {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  },
  
  getInt: (key: string, defaultValue = 0): number => {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    return parseInt(value, 10);
  }
};
