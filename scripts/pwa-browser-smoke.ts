import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.PWA_SMOKE_BASE_URL ?? 'http://127.0.0.1:1111';
const STARTUP_TIMEOUT_MS = 90_000;

async function isServerReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function startServer() {
  const command =
    process.platform === 'win32'
      ? 'npx.cmd astro dev --port 1111 --host 127.0.0.1 --strictPort'
      : 'npx astro dev --port 1111 --host 127.0.0.1 --strictPort';

  return spawn(command, {
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/sanliurfa',
      READ_REPLICA_URL: process.env.READ_REPLICA_URL ?? '',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    },
    stdio: 'ignore',
    shell: true,
  });
}

async function waitForServer(url: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    if (await isServerReady(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`PWA smoke server did not become ready within ${STARTUP_TIMEOUT_MS}ms (${url})`);
}

async function main(): Promise<void> {
  const readyProbe = `${BASE_URL}/`;
  const reuseExistingServer = await isServerReady(readyProbe);
  const child = reuseExistingServer ? null : startServer();
  const browser = await chromium.launch();

  try {
    if (!reuseExistingServer) {
      await waitForServer(readyProbe);
    }

    const context = await browser.newContext();
    await context.grantPermissions(['notifications'], { origin: BASE_URL });
    const page = await context.newPage();

    const manifestResponse = await page.request.get(`${BASE_URL}/manifest.json`);
    if (!manifestResponse.ok()) {
      throw new Error(`manifest fetch failed: ${manifestResponse.status()}`);
    }

    const manifest = await manifestResponse.json();
    if (!String(manifest.name ?? '').includes('Şanlıurfa')) {
      throw new Error('manifest name check failed');
    }

    const offlineResponse = await page.request.get(`${BASE_URL}/offline.html`);
    if (!offlineResponse.ok()) {
      throw new Error(`offline fallback fetch failed: ${offlineResponse.status()}`);
    }

    const offlineHtml = await offlineResponse.text();
    if (!offlineHtml.includes('Çevrimdışı')) {
      throw new Error('offline fallback content check failed');
    }

    const swResponse = await page.request.get(`${BASE_URL}/sw.js`);
    if (!swResponse.ok()) {
      throw new Error(`service worker fetch failed: ${swResponse.status()}`);
    }

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const pwaCapabilities = await page.evaluate(async () => {
      const notificationPermission =
        'Notification' in window ? await Notification.requestPermission() : 'unsupported';

      return {
        hasManifestLink: Boolean(document.querySelector('link[rel="manifest"]')),
        notificationPermission,
        serviceWorkerSupported: 'serviceWorker' in navigator,
      };
    });

    if (!pwaCapabilities.hasManifestLink) {
      throw new Error('PWA DOM capability check failed');
    }

    if (!pwaCapabilities.serviceWorkerSupported) {
      throw new Error('service worker API unsupported in browser smoke');
    }

    if (pwaCapabilities.notificationPermission !== 'granted') {
      throw new Error(`notification permission check failed: ${pwaCapabilities.notificationPermission}`);
    }

    const serviceWorkerRegistered = await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      return Boolean(registration?.active || registration?.installing || registration?.waiting);
    });

    if (!serviceWorkerRegistered) {
      throw new Error('service worker registration check failed');
    }

    console.log('pwa-browser-smoke: OK');
  } finally {
    await browser.close();

    if (child && !child.killed) {
      child.kill('SIGTERM');
    }

    if (child && process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
        stdio: 'ignore',
        shell: true,
      });
      await new Promise((resolve) => killer.on('exit', resolve));
    }
  }
}

main().catch((error) => {
  console.error('pwa-browser-smoke failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
