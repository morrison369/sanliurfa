#!/usr/bin/env node

const args = new Map();
const flags = new Set();
for (const raw of process.argv.slice(2)) {
  if (raw.startsWith('--') && raw.includes('=')) {
    const [key, ...rest] = raw.slice(2).split('=');
    args.set(key, rest.join('='));
  } else if (raw.startsWith('--')) {
    flags.add(raw.slice(2));
  }
}

const mode = args.get('mode') || process.env.SITEMAP_ROUTE_MODE || 'local';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.SITEMAP_ROUTE_BASE_URL || defaultBaseUrl);
const canonicalOrigin = new URL(
  args.get('canonical-origin') || process.env.SITEMAP_ROUTE_CANONICAL_ORIGIN || 'https://sanliurfa.com',
).origin;
const sitemapPath = args.get('sitemap') || process.env.SITEMAP_ROUTE_PATH || '/sitemap.xml';
const timeoutMs = Math.max(1000, Number(args.get('timeout-ms') || process.env.SITEMAP_ROUTE_TIMEOUT_MS || '45000'));
const concurrency = Math.max(1, Number(args.get('concurrency') || process.env.SITEMAP_ROUTE_CONCURRENCY || '10'));
const maxFailures = Math.max(1, Number(args.get('max-failures') || process.env.SITEMAP_ROUTE_MAX_FAILURES || '40'));
const enforceFinalUrl =
  flags.has('strict-final-url') ||
  process.env.SITEMAP_ROUTE_STRICT_FINAL_URL === '1' ||
  (mode === 'prod' && process.env.SITEMAP_ROUTE_STRICT_FINAL_URL !== '0');
const maxUrlsRaw = args.get('max-urls') || process.env.SITEMAP_ROUTE_MAX_URLS || 'all';

function fail(message, details = []) {
  console.error(`[sitemap-route-integrity-gate] ${message}`);
  for (const detail of details.slice(0, maxFailures)) console.error(`- ${detail}`);
  if (details.length > maxFailures) {
    console.error(`- ... ${details.length - maxFailures} ek hata gizlendi`);
  }
  process.exit(1);
}

function decodeXmlText(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function extractLocUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXmlText(match[1].trim()));
}

function takeUrlBudget(urls) {
  if (maxUrlsRaw === 'all') return urls;
  const maxUrls = Math.max(1, Number(maxUrlsRaw));
  if (!Number.isFinite(maxUrls) || maxUrls >= urls.length) return urls;
  return urls.slice(0, maxUrls);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'Sanliurfa.com sitemap route integrity gate (+https://sanliurfa.com)',
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(rawUrl) {
  const startedAt = Date.now();
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, url: rawUrl, reason: 'invalid URL', durationMs: Date.now() - startedAt };
  }

  if (url.origin !== canonicalOrigin) {
    return {
      ok: false,
      url: rawUrl,
      reason: `wrong origin: ${url.origin}, expected ${canonicalOrigin}`,
      durationMs: Date.now() - startedAt,
    };
  }

  if (/^\/(?:en|tr)(?:\/|$)/i.test(url.pathname)) {
    return { ok: false, url: rawUrl, reason: 'language-prefixed URL is not allowed', durationMs: Date.now() - startedAt };
  }

  try {
    const targetUrl = new URL(`${url.pathname}${url.search}`, baseUrl);
    const response = await fetchWithTimeout(targetUrl, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
      },
    });
    const finalUrl = new URL(response.url);
    const finalPath = `${finalUrl.pathname}${finalUrl.search}`;
    const expectedPath = `${url.pathname}${url.search}`;
    const okStatus = response.status >= 200 && response.status < 300;
    const finalUrlOk = !enforceFinalUrl || finalPath === expectedPath;

    return {
      ok: okStatus && finalUrlOk,
      url: rawUrl,
      status: response.status,
      finalUrl: response.url,
      reason: okStatus ? `redirected to ${finalPath}, expected ${expectedPath}` : `status ${response.status}`,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      url: rawUrl,
      reason: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    };
  }
}

async function runQueue(urls) {
  let index = 0;
  const results = [];
  async function worker() {
    while (index < urls.length) {
      const url = urls[index++];
      results.push(await checkUrl(url));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

const sitemapUrl = new URL(sitemapPath, baseUrl);
const response = await fetchWithTimeout(sitemapUrl, {
  redirect: 'follow',
  headers: {
    Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5',
  },
});

if (response.status < 200 || response.status >= 300) {
  fail(`sitemap okunamadı: ${response.status} ${sitemapUrl.href}`);
}

const xml = await response.text();
const urls = extractLocUrls(xml);
if (urls.length === 0) fail('sitemap içinde <loc> bulunamadı');

const duplicates = [...new Set(urls.filter((url, index) => urls.indexOf(url) !== index))];
if (duplicates.length > 0) {
  fail('sitemap duplicate URL içeriyor', duplicates);
}

const checkedUrls = takeUrlBudget(urls);
console.log(
  `sitemap-route-integrity-gate: checking ${checkedUrls.length}/${urls.length} URLs (${mode}, fetch=${baseUrl.origin}, canonical=${canonicalOrigin}, strictFinal=${enforceFinalUrl})`,
);

const results = await runQueue(checkedUrls);
const failures = results.filter((result) => !result.ok);

for (const result of results) {
  const marker = result.ok ? 'ok' : 'fail';
  const status = result.status || 0;
  console.log(`${marker} ${status} ${result.url} (${result.durationMs}ms)`);
}

if (failures.length > 0) {
  fail('sitemap route bütünlüğü başarısız', failures.map((result) =>
    `${result.url}: ${result.reason}${result.finalUrl ? `, final=${result.finalUrl}` : ''}`,
  ));
}

const maxMs = Math.max(...results.map((result) => result.durationMs));
const avgMs = Math.round(results.reduce((sum, result) => sum + result.durationMs, 0) / results.length);
console.log(`sitemap-route-integrity-gate: PASS (${mode}, urls=${results.length}, max=${maxMs}ms, avg=${avgMs}ms)`);
