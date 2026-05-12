import AxeBuilder from '@axe-core/playwright';
import { chromium, devices } from 'playwright';
import { execSync, spawn } from 'node:child_process';

const mode = process.env.ASTRO_E2E_MODE || 'dev';
const baseURL =
  process.env.ASTRO_E2E_BASE_URL || (mode === 'preview' ? 'http://127.0.0.1:4322' : 'http://127.0.0.1:4321');
const expectedTitle =
  'Şanlıurfa Şehir Rehberi | Mekanlar, Gezilecek Yerler ve Etkinlikler';

const viewports = [
  { name: 'desktop', width: 1440, height: 1100, device: devices['Desktop Chrome'] },
  { name: 'tablet', width: 820, height: 1180, device: devices['iPad Pro 11'] },
  { name: 'mobile', width: 390, height: 844, device: devices['Pixel 5'] },
];

const requiredHeadings = [
  'Hızlı Erişim Kartları',
  'Popüler Kategoriler',
  'Öne Çıkan Şanlıurfa Rotaları',
  'İlçe Bazlı Keşif',
  'Bugün Şanlıurfa’da',
  'Şanlıurfa Topluluğu ve Eşleşme',
  'En Çok Arananlar',
  'Blog ve Rehber Yazıları',
  'Şanlıurfa’daki İşletmeni Daha Görünür Yap',
];

const criticalLinks = [
  '/mekanlar',
  '/gezilecek-yerler',
  '/etkinlikler',
  '/ilceler',
  '/blog',
  '/harita',
  '/topluluk',
  '/eslesme',
  '/mesajlar',
  '/isletme-kayit',
  '/saglik/nobetci-eczaneler',
  '/ulasim/otobus-saatleri',
  '/mekanlar/kebapcilar',
  '/blog/gobeklitepe-rehberi-ziyaret-bilgileri',
  '/blog/halfetide-1-gun-tekne-turu',
];

const criticalPublicRoutes = [
  { path: '/eslesme', heading: 'Şanlıurfa’da Eşleş, Kaydır ve Mesajlaş' },
  { path: '/topluluk', heading: 'Şanlıurfa Topluluğu' },
  { path: '/otomotiv', heading: 'Şanlıurfa Otomotiv' },
  { path: '/acil-durum', heading: 'Şanlıurfa Acil Durum' },
  { path: '/arama', heading: 'Mekan Ara' },
];

function fail(message, details) {
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

async function waitForHealthy() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const health = await fetch(`${baseURL}/api/health`);
      if (health.ok) return;
    } catch {
      // Server is still booting or health is not exposed.
    }
    try {
      const root = await fetch(`${baseURL}/`);
      if (root.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  fail(`Astro server hazır değil: ${baseURL}`);
}

function startPreviewServer() {
  console.log(`[astro-homepage-a11y] preview build hazırlanıyor: ${baseURL}`);
  execSync('npm run build', { stdio: 'inherit' });
  const url = new URL(baseURL);
  const child = spawn(process.execPath, ['./dist/server/entry.mjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: url.hostname,
      PORT: url.port || '4322',
    },
  });
  return child;
}

async function runViewportAudit(browser, viewport) {
  const context = await browser.newContext({
    ...viewport.device,
    viewport: { width: viewport.width, height: viewport.height },
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('sf_cookie', '1');
  });
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|Failed to load resource/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  const response = await page.goto('/', { waitUntil: 'networkidle' });
  assert(response?.ok(), `${viewport.name}: ana sayfa HTTP 200 dönmedi`, {
    status: response?.status(),
  });

  const pageTitle = await page.title();
  assert(pageTitle === expectedTitle, `${viewport.name}: title beklenenle aynı değil`, {
    pageTitle,
  });

  const visibleH1s = await page.locator('h1').evaluateAll((nodes) =>
    nodes
      .filter((node) => Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length))
      .map((node) => node.textContent?.trim()),
  );
  assert(visibleH1s.length === 1, `${viewport.name}: görünür ana sayfada tam 1 H1 olmalı`, {
    visibleH1s,
  });
  if (mode !== 'dev') {
    const h1Count = await page.locator('h1').count();
    assert(h1Count === 1, `${viewport.name}: production DOM içinde tam 1 H1 olmalı`, { h1Count });
  }
  await page.getByRole('heading', { level: 1, name: 'Şanlıurfa’yı Keşfetmenin En Kolay Yolu' }).waitFor();

  const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
  assert(Boolean(metaDescription), `${viewport.name}: meta description yok`);
  assert(metaDescription.length <= 156, `${viewport.name}: meta description 156 karakteri aşıyor`, {
    length: metaDescription.length,
  });

  const jsonLdCount = await page.locator('script[type="application/ld+json"]').count();
  assert(jsonLdCount === 4, `${viewport.name}: JSON-LD sayısı 4 olmalı`, { jsonLdCount });

  await page.getByPlaceholder('Mekan, ilçe, yemek, eczane veya gezilecek yer ara').waitFor();
  for (const heading of requiredHeadings) {
    await page.getByRole('heading', { name: heading }).waitFor();
  }
  for (const href of criticalLinks) {
    assert((await page.locator(`a[href="${href}"]`).count()) > 0, `${viewport.name}: kritik iç link eksik`, {
      href,
    });
  }

  if (viewport.width < 1024) {
    await page.locator('#mobileMenuBtn').waitFor();
    await page.locator('#mobileMenuBtn').click();
    await page.getByRole('navigation', { name: 'Mobil menü' }).waitFor();
  } else {
    await page.getByRole('navigation', { name: 'Ana menü' }).waitFor();
  }

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  assert(layout.scrollWidth <= layout.clientWidth + 2, `${viewport.name}: yatay taşma var`, layout);
  assert(layout.bodyWidth <= layout.viewportWidth + 2, `${viewport.name}: body yatay taşma var`, layout);

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => !img.closest('noscript'))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute('src')),
  );
  assert(brokenImages.length === 0, `${viewport.name}: kırık görsel var`, { brokenImages });

  const tinyTapTargets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a, button, summary, input'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const visible =
          rect.width > 0 &&
          rect.height > 0 &&
          getComputedStyle(el).visibility !== 'hidden' &&
          getComputedStyle(el).display !== 'none';
        return !el.classList.contains('sr-only') && visible && (rect.width < 32 || rect.height < 32);
      })
      .slice(0, 20)
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 60),
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
      })),
  );
  assert(tinyTapTargets.length === 0, `${viewport.name}: küçük tıklama hedefleri var`, {
    tinyTapTargets,
  });

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blockingViolations = axeResults.violations.filter((violation) =>
    ['critical', 'serious'].includes(violation.impact || ''),
  );
  assert(blockingViolations.length === 0, `${viewport.name}: axe critical/serious ihlal var`, {
    violations: blockingViolations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      nodes: violation.nodes.slice(0, 5).map((node) => node.target),
    })),
  });

  assert(pageErrors.length === 0, `${viewport.name}: page error var`, { pageErrors });
  assert(consoleErrors.length === 0, `${viewport.name}: console error var`, { consoleErrors });

  await context.close();
  console.log(`[astro-homepage-a11y] ${viewport.name}: PASS`);
}

async function runCriticalRouteSmoke(browser) {
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  for (const route of criticalPublicRoutes) {
    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    assert(response?.ok(), `kritik public route HTTP 200 dönmedi: ${route.path}`, {
      status: response?.status(),
    });
    await page.getByRole('heading', { level: 1, name: route.heading }).waitFor();
  }
  await context.close();
  console.log('[astro-homepage-a11y] critical routes: PASS');
}

let previewServer;
if (mode === 'dev') {
  console.log(`[astro-homepage-a11y] Astro dev server hazırlanıyor: ${baseURL}`);
  execSync('npm run dev:isolated:ensure', {
    stdio: 'inherit',
    env: { ...process.env, ASTRO_DEV_TOOLBAR: '0' },
  });
} else if (mode === 'preview') {
  previewServer = startPreviewServer();
} else if (mode === 'remote') {
  console.log(`[astro-homepage-a11y] remote/prod URL test ediliyor: ${baseURL}`);
} else {
  fail(`Bilinmeyen ASTRO_E2E_MODE: ${mode}`);
}
await waitForHealthy();

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    await runViewportAudit(browser, viewport);
  }
  await runCriticalRouteSmoke(browser);
  console.log('[astro-homepage-a11y] PASS');
} finally {
  await browser.close();
  if (previewServer) {
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /PID ${previewServer.pid} /T /F`, { stdio: 'ignore' });
      } catch {
        previewServer.kill();
      }
    } else {
      previewServer.kill();
    }
  }
}
