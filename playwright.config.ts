import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import { runtimeDefaults } from './config/runtime-defaults.mjs';

function readDotEnvValue(key: string) {
  if (!fs.existsSync('.env')) return undefined;
  const line = fs
    .readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((row) => row.trim().startsWith(`${key}=`));
  return line?.slice(line.indexOf('=') + 1).trim();
}

const e2eHost = process.env.PLAYWRIGHT_HOST || runtimeDefaults.host;
const e2eAppPort = Number(process.env.PLAYWRIGHT_PORT || runtimeDefaults.appPort);
const e2eDbPort = Number(process.env.DB_PORT || runtimeDefaults.dbPort);
const e2eRedisPort = Number(process.env.REDIS_PORT || runtimeDefaults.redisPort);
const e2eRedisPassword = process.env.REDIS_PASSWORD || readDotEnvValue('REDIS_PASSWORD');
const e2eDatabaseUrl =
  process.env.DATABASE_URL || `postgresql://postgres:postgres@${e2eHost}:${e2eDbPort}/sanliurfa`;
const e2eRedisUrl =
  process.env.REDIS_URL ||
  readDotEnvValue('REDIS_URL') ||
  (e2eRedisPassword
    ? `redis://:${encodeURIComponent(e2eRedisPassword)}@${e2eHost}:${e2eRedisPort}`
    : `redis://${e2eHost}:${e2eRedisPort}`);
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === '1';
const includeVisual = process.env.PLAYWRIGHT_INCLUDE_VISUAL === '1';
const fullMatrix = process.env.PLAYWRIGHT_FULL_MATRIX === '1';
const projects = fullMatrix
  ? [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'Mobile Chrome',
        use: { ...devices['Pixel 5'] },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ]
  : [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
    ];

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/tests/**',
    ...(includeVisual ? [] : ['**/*.visual.spec.ts']),
    '**/payment.spec.ts',
    '**/stripe-integration.spec.ts',
    '**/subscription.spec.ts',
    '**/onboarding.spec.ts',
    '**/recommendations.spec.ts',
    '**/photos.spec.ts',
    '**/webhooks.spec.ts',
    '**/collections.spec.ts',
    '**/messaging.spec.ts',
    '**/places.spec.ts',
    '**/privacy.spec.ts',
    '**/profile.spec.ts',
    '**/social-features.spec.ts',
    '**/social-phase1.spec.ts',
    '**/social/**',
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://${e2eHost}:${e2eAppPort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      'x-e2e-seed': process.env.E2E_SEED || '20260418',
    },
  },
  projects,
  webServer: disableWebServer
    ? undefined
    : {
        command: `npm run build && npx astro preview --host ${e2eHost} --port ${e2eAppPort}`,
        // Health endpoint check — basit root path yerine application-level readiness verify
        // (DB+Redis connection + integrations summary). Build pass + preview start
        // arasındaki gap'te root 200 dönebilir ama infra hazır olmayabilir.
        url: `http://${e2eHost}:${e2eAppPort}/api/health`,
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
          DATABASE_URL: e2eDatabaseUrl,
          REDIS_URL: e2eRedisUrl,
          REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || 'e2e:sanliurfa:',
          DB_HOST: process.env.DB_HOST || e2eHost,
          DB_PORT: String(e2eDbPort),
          DB_NAME: process.env.DB_NAME || 'sanliurfa',
          DB_USER: process.env.DB_USER || 'postgres',
          DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
          PORT: String(e2eAppPort),
          E2E_SEED: process.env.E2E_SEED || '20260418',
          E2E_ADMIN_BYPASS: process.env.E2E_ADMIN_BYPASS || '1',
          E2E_RATE_LIMIT_BYPASS: process.env.E2E_RATE_LIMIT_BYPASS || '1',
          JWT_SECRET:
            process.env.JWT_SECRET || 'e2e-jwt-secret-2026-sanliurfa-min-32-characters',
          SESSION_SECRET:
            process.env.SESSION_SECRET || 'e2e-session-secret-2026-sanliurfa-min-32-characters',
        },
        reuseExistingServer: !process.env.CI,
        // 90s timeout — build (~11s) + preview start (~3s) + safety margin.
        // Eski 300s timeout, hung server'da CI'i 5 dakika boş bekletiyordu.
        // Failure feedback faster, debug verimli.
        timeout: 90_000,
      },
});
