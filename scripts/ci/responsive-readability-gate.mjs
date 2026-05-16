#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--') || !raw.includes('=')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('='));
}

const mode = args.get('mode') || process.env.RESPONSIVE_GATE_MODE || 'local';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.RESPONSIVE_GATE_BASE_URL || defaultBaseUrl);
const localDefaultBaseUrl = baseUrl.hostname === '127.0.0.1' && baseUrl.port === '4321';
let startedIsolatedDev = false;
const verbose =
  args.get('verbose') === '1' ||
  process.env.RESPONSIVE_GATE_VERBOSE === '1';
const routes = (args.get('routes') || process.env.RESPONSIVE_GATE_ROUTES || [
  '/',
  '/blog',
  '/blog/gobeklitepe-rehberi-ziyaret-bilgileri',
  '/mekanlar',
  '/isletme/balikligol',
].join(',')).split(',').map((route) => route.trim()).filter(Boolean);

const viewports = [
  { name: 'mobile', width: 390, height: 844, minBodyFont: 14 },
  { name: 'tablet', width: 768, height: 1024, minBodyFont: 15 },
  { name: 'desktop', width: 1440, height: 1000, minBodyFont: 15 },
];

function fail(message, details = []) {
  console.error(`[responsive-readability-gate] ${message}`);
  for (const detail of details.slice(0, 80)) console.error(`- ${detail}`);
  if (details.length > 80) console.error(`- ... ${details.length - 80} ek hata gizlendi`);
  process.exit(1);
}

function runNpmScript(script) {
  execSync(`npm run -s ${script}`, {
    cwd: process.cwd(),
    stdio: 'inherit',
    windowsHide: true,
  });
}

function getNpmScriptOutput(script) {
  try {
    return execSync(`npm run -s ${script}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (error) {
    return `${error.stdout || ''}\n${error.stderr || ''}`;
  }
}

function cleanupIsolatedDev() {
  if (!startedIsolatedDev) return;
  try {
    runNpmScript('dev:isolated:stop');
  } catch {
    // Best-effort cleanup.
  }
  try {
    runNpmScript('redis:isolated:stop');
  } catch {
    // Best-effort cleanup for preflight-started local Redis.
  }
}

process.on('exit', cleanupIsolatedDev);
process.on('SIGINT', () => {
  cleanupIsolatedDev();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupIsolatedDev();
  process.exit(143);
});

function routeUrl(route) {
  return new URL(route.startsWith('/') ? route : `/${route}`, baseUrl).href;
}

if (mode === 'local' && localDefaultBaseUrl) {
  const statusBefore = getNpmScriptOutput('dev:isolated:status');
  if (!/dev isolated status: running/.test(statusBefore)) {
    startedIsolatedDev = true;
    runNpmScript('dev:isolated:ensure');
  }
}

const browser = await chromium.launch({ headless: true });
const failures = [];
const checks = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    for (const route of routes) {
      const url = routeUrl(route);
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      if (!response || response.status() < 200 || response.status() >= 400) {
        failures.push(`${viewport.name} ${route}: status=${response?.status() || 0}`);
        continue;
      }
      await page.waitForTimeout(350);
      const result = await page.evaluate((expectedMinBodyFont) => {
        const doc = document.documentElement;
        const body = document.body;
        const overflowX = doc.scrollWidth - doc.clientWidth;
        const visibleHeadings = [...document.querySelectorAll('h1,h2,h3')]
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          })
          .map((el) => ({
            tag: el.tagName,
            text: (el.textContent || '').trim(),
            fontSize: Number.parseFloat(getComputedStyle(el).fontSize || '0'),
          }));
        const h1Count = visibleHeadings.filter((h) => h.tag === 'H1').length;
        const paragraphs = [...document.querySelectorAll('main p')]
          .filter((el) => (el.textContent || '').trim().length > 40)
          .slice(0, 12)
          .map((el) => Number.parseFloat(getComputedStyle(el).fontSize || '0'));
        const smallParagraphs = paragraphs.filter((fontSize) => fontSize < expectedMinBodyFont).length;
        const brokenImages = [...document.querySelectorAll('img')]
          .filter((img) => !img.closest('noscript') && img.complete && img.naturalWidth === 0)
          .map((img) => img.getAttribute('src') || '');
        const tinyTapTargets = [...document.querySelectorAll('main a, main button, header a, header button')]
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
            if (!text) return false;
            if (rect.width < 24 || rect.height < 24) return true;
            return false;
          })
          .slice(0, 20)
          .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}`);
        return {
          overflowX,
          h1Count,
          headingCount: visibleHeadings.length,
          smallParagraphs,
          paragraphCount: paragraphs.length,
          brokenImages,
          tinyTapTargets,
          bodyHeight: body.scrollHeight,
        };
      }, viewport.minBodyFont);

      if (result.overflowX > 2) failures.push(`${viewport.name} ${route}: horizontal overflow ${result.overflowX}px`);
      if (result.h1Count !== 1) failures.push(`${viewport.name} ${route}: visible H1 count ${result.h1Count}`);
      if (result.headingCount < 2) failures.push(`${viewport.name} ${route}: heading count too low (${result.headingCount})`);
      if (result.paragraphCount > 0 && result.smallParagraphs > 0) {
        failures.push(`${viewport.name} ${route}: small readable paragraphs ${result.smallParagraphs}/${result.paragraphCount}`);
      }
      if (result.brokenImages.length > 0) failures.push(`${viewport.name} ${route}: broken images ${result.brokenImages.join(', ')}`);
      if (result.tinyTapTargets.length > 0) failures.push(`${viewport.name} ${route}: tiny tap targets ${result.tinyTapTargets.join(', ')}`);
      if (result.bodyHeight < 500) failures.push(`${viewport.name} ${route}: body height too low (${result.bodyHeight}px)`);
      checks.push({
        viewport: viewport.name,
        route,
        ok:
          result.overflowX <= 2 &&
          result.h1Count === 1 &&
          result.headingCount >= 2 &&
          !(result.paragraphCount > 0 && result.smallParagraphs > 0) &&
          result.brokenImages.length === 0 &&
          result.tinyTapTargets.length === 0 &&
          result.bodyHeight >= 500,
      });
      if (verbose) {
        console.log(`ok ${viewport.name} ${route}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  fail('responsive/readability gate başarısız', failures);
}

if (!verbose) {
  const passedChecks = checks.filter((check) => check.ok).length;
  const failedChecks = checks.length - passedChecks;
  console.log(
    `responsive-readability-gate: checked ${checks.length} surfaces (${mode}, ok=${passedChecks}, fail=${failedChecks})`,
  );
}

console.log(`responsive-readability-gate: PASS (${mode}, routes=${routes.length}, viewports=${viewports.length})`);
