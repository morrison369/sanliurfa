import { defineConfig, devices } from '@playwright/test';
import { runtimeDefaults } from './config/runtime-defaults.mjs';

const e2eHost = process.env.PLAYWRIGHT_HOST || runtimeDefaults.host;
const e2eAppPort = Number(process.env.PLAYWRIGHT_PORT || runtimeDefaults.appPort);
const e2eDbPort = Number(process.env.DB_PORT || runtimeDefaults.dbPort);
const e2eRedisPort = Number(process.env.REDIS_PORT || runtimeDefaults.redisPort);
const e2eDatabaseUrl =
  process.env.DATABASE_URL || `postgresql://postgres:postgres@${e2eHost}:${e2eDbPort}/sanliurfa`;
const e2eRedisUrl = process.env.REDIS_URL || `redis://${e2eHost}:${e2eRedisPort}`;
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === '1';

export default defineConfig({
  testDir: './e2e',
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
  projects: [
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
  ],
  webServer: disableWebServer
    ? undefined
    : {
        command: `npm run build && npx astro preview --host ${e2eHost} --port ${e2eAppPort}`,
        url: `http://${e2eHost}:${e2eAppPort}`,
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
          DATABASE_URL: e2eDatabaseUrl,
          REDIS_URL: e2eRedisUrl,
          DB_HOST: process.env.DB_HOST || e2eHost,
          DB_PORT: String(e2eDbPort),
          DB_NAME: process.env.DB_NAME || 'sanliurfa',
          DB_USER: process.env.DB_USER || 'postgres',
          DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
          PORT: String(e2eAppPort),
          E2E_SEED: process.env.E2E_SEED || '20260418',
          E2E_ADMIN_BYPASS: process.env.E2E_ADMIN_BYPASS || '1',
          JWT_SECRET:
            process.env.JWT_SECRET || 'e2e-jwt-secret-2026-sanliurfa-min-32-characters',
          SESSION_SECRET:
            process.env.SESSION_SECRET || 'e2e-session-secret-2026-sanliurfa-min-32-characters',
        },
        reuseExistingServer: !process.env.CI,
        timeout: 300000,
      },
});
