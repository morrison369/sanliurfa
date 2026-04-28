import { logger } from './logging';
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

function getEnvValue(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Check critical server-side vars only on server
  if (typeof window === 'undefined') {
    for (const key of requiredServerVars) {
      const value = getEnvValue(key);
      if (!value) {
        missing.push(key);
      }
    }
  }

  // Check client-side public vars (optional, but log if missing)
  for (const key of requiredClientVars) {
    if (!getEnvValue(key)) {
      logger.warn(`Optional client var missing: ${key}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

export function getEnv(): EnvConfig {
  const dbUrl = getEnvValue('DATABASE_URL');
  const jwtSecret = getEnvValue('JWT_SECRET');
  const redisUrl = getEnvValue('REDIS_URL') || 'redis://127.0.0.1:6381';

  if (!dbUrl || !jwtSecret) {
    throw new Error('Missing critical env vars: DATABASE_URL and JWT_SECRET must be set');
  }

  const siteUrl =
    getEnvValue('PUBLIC_SITE_URL') ||
    getEnvValue('SITE_URL') ||
    'http://localhost:4321';
  const nodeEnv = (getEnvValue('NODE_ENV') || 'development') as EnvConfig['NODE_ENV'];
  const port = parseInt(getEnvValue('PORT') || '4321', 10);

  return {
    SUPABASE_URL: getEnvValue('PUBLIC_SUPABASE_URL') || '',
    SUPABASE_ANON_KEY: getEnvValue('PUBLIC_SUPABASE_ANON_KEY') || '',
    SITE_URL: siteUrl,
    NODE_ENV: nodeEnv,
    PORT: Number.isNaN(port) ? 4321 : port,
    DATABASE_URL: dbUrl,
    JWT_SECRET: jwtSecret,
    REDIS_URL: redisUrl,
    REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || 'sanliurfa:'
  };
}

export const env = {
  isDev: () => (getEnvValue('NODE_ENV') || 'development') === 'development',
  isProd: () => (getEnvValue('NODE_ENV') || 'development') === 'production',
  isServer: () => typeof window === 'undefined',
  isClient: () => typeof window !== 'undefined',
  
  get: (key: string, defaultValue?: string): string => {
    const value = getEnvValue(key);
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value || defaultValue || '';
  },
  
  getBool: (key: string, defaultValue = false): boolean => {
    const value = getEnvValue(key);
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1';
  },
  
  getInt: (key: string, defaultValue = 0): number => {
    const value = getEnvValue(key);
    if (value === undefined) return defaultValue;
    return parseInt(value, 10);
  }
};
