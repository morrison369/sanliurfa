/**
 * Unit Tests - deployment/deployment.ts environment config helpers
 *
 * - getEnvironmentConfig (development/staging/production env resolution)
 * - getCurrentEnvironment (NODE_ENV-driven)
 * - enableMaintenanceMode / disableMaintenanceMode (state mutate)
 * - getDeploymentChecklist (env-driven boolean checks)
 * - getReadinessStatus (passedChecks / totalChecks * 100)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getEnvironmentConfig,
  getCurrentEnvironment,
  enableMaintenanceMode,
  disableMaintenanceMode,
  getDeploymentChecklist,
  getReadinessStatus,
} from '../deployment/deployment';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getEnvironmentConfig', () => {
  it('development env - localhost URL + debug log + sslEnabled false', () => {
    const c = getEnvironmentConfig('development');
    expect(c.name).toBe('development');
    expect(c.url).toBe('http://localhost:4321');
    expect(c.logLevel).toBe('debug');
    expect(c.sslEnabled).toBe(false);
  });

  it('staging env - HTTPS + info log', () => {
    const c = getEnvironmentConfig('staging');
    expect(c.name).toBe('staging');
    expect(c.logLevel).toBe('info');
    expect(c.sslEnabled).toBe(true);
  });

  it('production env - sslEnabled true + warn log', () => {
    const c = getEnvironmentConfig('production');
    expect(c.name).toBe('production');
    expect(c.logLevel).toBe('warn');
    expect(c.sslEnabled).toBe(true);
  });

  it('bilinmeyen env → production fallback', () => {
    const c = getEnvironmentConfig('invalid' as any);
    expect(c.name).toBe('production');
  });
});

describe('getCurrentEnvironment', () => {
  it('NODE_ENV=production → production config', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getCurrentEnvironment().name).toBe('production');
  });

  it('NODE_ENV=development → development config', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getCurrentEnvironment().name).toBe('development');
  });

  it('NODE_ENV=test → development fallback (production check only)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(getCurrentEnvironment().name).toBe('development');
  });
});

describe('enable / disableMaintenanceMode', () => {
  it('enableMaintenanceMode - staging → true + maintenanceMode set', () => {
    expect(enableMaintenanceMode('staging')).toBe(true);
    expect(getEnvironmentConfig('staging').maintenanceMode).toBe(true);
    // cleanup
    disableMaintenanceMode('staging');
  });

  it('disableMaintenanceMode - production → true + maintenanceMode false', () => {
    enableMaintenanceMode('production');
    expect(disableMaintenanceMode('production')).toBe(true);
    expect(getEnvironmentConfig('production').maintenanceMode).toBe(false);
  });
});

describe('getDeploymentChecklist', () => {
  it('checklist - 10 check key', () => {
    const c = getDeploymentChecklist();
    expect(Object.keys(c).length).toBe(10);
    expect(c).toHaveProperty('Environment variables configured');
    expect(c).toHaveProperty('SSL enabled');
    expect(c).toHaveProperty('Email service configured');
  });

  it('SSL enabled - NODE_ENV=production → true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const c = getDeploymentChecklist();
    expect(c['SSL enabled']).toBe(true);
  });

  it('SSL enabled - NODE_ENV=development → false', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const c = getDeploymentChecklist();
    expect(c['SSL enabled']).toBe(false);
  });

  it('Email service configured - RESEND_API_KEY env-driven', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    expect(getDeploymentChecklist()['Email service configured']).toBe(true);
  });
});

describe('getReadinessStatus', () => {
  it('ready percentage 0-100 + total checks count', () => {
    const r = getReadinessStatus();
    expect(r.readyPercentage).toBeGreaterThanOrEqual(0);
    expect(r.readyPercentage).toBeLessThanOrEqual(100);
    expect(typeof r.ready).toBe('boolean');
    expect(Object.keys(r.checks).length).toBeGreaterThan(0);
  });

  it('ready - tüm check pass → true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://x');
    vi.stubEnv('REDIS_URL', 'redis://x');
    vi.stubEnv('RESEND_API_KEY', 'r');
    vi.stubEnv('STRIPE_SECRET_KEY', 's');
    vi.stubEnv('CORS_ORIGINS', 'c');
    const r = getReadinessStatus();
    expect(r.ready).toBe(true);
  });
});
