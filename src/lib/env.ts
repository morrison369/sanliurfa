// Çevre değişkeni doğrulama ve yönetimi

interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SITE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
}

const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY'
] as const;

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const key of requiredVars) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}

export function getEnv(): EnvConfig {
  return {
    SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
    SITE_URL: import.meta.env.PUBLIC_SITE_URL || 'http://localhost:1111',
    NODE_ENV: (import.meta.env.NODE_ENV as any) || 'development',
    PORT: parseInt(import.meta.env.PORT || '1111')
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
