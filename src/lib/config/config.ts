/**
 * Environment-specific Configuration
 * Centralized config management for different environments
 */

import { getEnv } from './env-validator';
import { getPublicAppUrl } from '../public-app-url';

export type Environment = 'development' | 'staging' | 'production' | 'test';

interface Config {
  env: Environment;
  isDev: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // Server
  port: number;
  host: string;
  
  // Database
  database: {
    url: string;
    poolSize: number;
    ssl: boolean;
  };
  
  // Redis
  redis: {
    url?: string;
    enabled: boolean;
  };
  
  // Security
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    bcryptRounds: number;
    allowedOrigins: string[];
    rateLimitEnabled: boolean;
  };
  
  // Features
  features: {
    analytics: boolean;
    notifications: boolean;
    maintenanceMode: boolean;
  };
  
  // External Services
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  
  // Monitoring
  monitoring: {
    sentryDsn?: string;
    gaTrackingId?: string;
    logLevel: string;
  };
  
  // API
  api: {
    version: string;
    baseUrl: string;
    timeout: number;
  };
}

function getEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV as Environment;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'staging') return 'staging';
  if (nodeEnv === 'test') return 'test';
  return 'development';
}

function loadConfig(): Config {
  const env = getEnvironment();
  const envVars = getEnv();
  const publicAppUrl = getPublicAppUrl();
  
  // Environment-specific defaults
  const defaults: Record<Environment, Partial<Config>> = {
      development: {
      security: {
        jwtSecret: '',
        jwtExpiresIn: '7d',
        bcryptRounds: 10,
        allowedOrigins: ['https://sanliurfa.com'],
        rateLimitEnabled: false,
      },
      features: {
        analytics: false,
        notifications: true,
        maintenanceMode: false,
      },
      monitoring: {
        logLevel: 'debug',
      },
    },
    
    staging: {
      security: {
        jwtSecret: '',
        jwtExpiresIn: '7d',
        bcryptRounds: 12,
        allowedOrigins: ['https://sanliurfa.com'],
        rateLimitEnabled: true,
      },
      features: {
        analytics: true,
        notifications: true,
        maintenanceMode: false,
      },
      monitoring: {
        logLevel: 'info',
      },
    },
    
    production: {
      security: {
        jwtSecret: '',
        jwtExpiresIn: '7d',
        bcryptRounds: 12,
        allowedOrigins: ['https://sanliurfa.com'],
        rateLimitEnabled: true,
      },
      features: {
        analytics: true,
        notifications: true,
        maintenanceMode: false,
      },
      monitoring: {
        logLevel: 'warn',
      },
    },
    
    test: {
      security: {
        jwtSecret: '',
        jwtExpiresIn: '7d',
        bcryptRounds: 4, // Faster for tests
        allowedOrigins: ['https://sanliurfa.com'],
        rateLimitEnabled: false,
      },
      features: {
        analytics: false,
        notifications: false,
        maintenanceMode: false,
      },
      monitoring: {
        logLevel: 'silent',
      },
    },
  };
  
  const defaultConfig = defaults[env];
  
  return {
    env,
    isDev: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    isTest: env === 'test',
    
    port: parseInt(envVars.PORT || '4321', 10),
    host: process.env.HOST || '0.0.0.0',
    
    database: {
      url: envVars.DATABASE_URL,
      poolSize: parseInt(envVars.DATABASE_POOL_SIZE || (env === 'production' ? '5' : '10'), 10),
      ssl: env === 'production',
    },
    
    redis: {
      url: envVars.REDIS_URL,
      enabled: !!envVars.REDIS_URL,
    },
    
    security: {
      jwtSecret: envVars.JWT_SECRET,
      jwtExpiresIn: envVars.JWT_EXPIRES_IN || '7d',
      bcryptRounds: defaultConfig.security?.bcryptRounds || 10,
      allowedOrigins: envVars.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['https://sanliurfa.com'],
      rateLimitEnabled: envVars.RATE_LIMIT_ENABLED === 'true' || defaultConfig.security?.rateLimitEnabled || false,
    },
    
    features: {
      analytics: envVars.ENABLE_ANALYTICS === 'true' || defaultConfig.features?.analytics || false,
      notifications: envVars.ENABLE_NOTIFICATIONS === 'true' || defaultConfig.features?.notifications || false,
      maintenanceMode: envVars.MAINTENANCE_MODE === 'true' || defaultConfig.features?.maintenanceMode || false,
    },
    
    supabase: {
      url: envVars.SUPABASE_URL,
      anonKey: envVars.SUPABASE_ANON_KEY,
      serviceRoleKey: envVars.SUPABASE_SERVICE_ROLE_KEY,
    },
    
    monitoring: {
      sentryDsn: envVars.SENTRY_DSN,
      gaTrackingId: envVars.GA_TRACKING_ID,
      logLevel: envVars.LOG_LEVEL || defaultConfig.monitoring?.logLevel || 'info',
    },
    
    api: {
      version: 'v1',
      baseUrl: envVars.API_BASE_URL || (env === 'production' ? `${publicAppUrl}/api` : 'http://localhost:4321/api'),
      timeout: parseInt(envVars.API_TIMEOUT || '30000', 10),
    },
  };
}

// Singleton config instance
let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}

// Reload config (useful for testing)
export function reloadConfig(): Config {
  config = loadConfig();
  return config;
}

export default getConfig;
