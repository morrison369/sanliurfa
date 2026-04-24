/**
 * Environment Variable Validator Stub
 * Validates and provides type-safe access to environment variables
 */

export interface EnvVars {
  PORT?: string;
  DATABASE_URL: string;
  DATABASE_POOL_SIZE?: string;
  REDIS_URL?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  BCRYPT_ROUNDS?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_ENABLED?: string;
  ENABLE_ANALYTICS?: string;
  ENABLE_NOTIFICATIONS?: string;
  MAINTENANCE_MODE?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SENTRY_DSN?: string;
  GA_TRACKING_ID?: string;
  LOG_LEVEL?: string;
  API_BASE_URL?: string;
  API_TIMEOUT?: string;
  [key: string]: string | undefined;
}

export function getEnv(): EnvVars {
  return {
    PORT: process.env.PORT || '4321',
    DATABASE_URL: process.env.DATABASE_URL || '',
    DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET || '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
    ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS,
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    SENTRY_DSN: process.env.SENTRY_DSN,
    GA_TRACKING_ID: process.env.GA_TRACKING_ID,
    LOG_LEVEL: process.env.LOG_LEVEL,
    API_BASE_URL: process.env.API_BASE_URL,
    API_TIMEOUT: process.env.API_TIMEOUT,
  };
}

export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const env = getEnv();
  
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }
  if (!env.SUPABASE_URL) {
    errors.push('SUPABASE_URL is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default getEnv;
