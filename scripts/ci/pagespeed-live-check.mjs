#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('=') || '1');
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, 'scripts/.env.scripts'),
  path.join(root, '.env.production'),
  path.join(root, '.env.local'),
  path.join(root, '.env'),
]) {
  loadEnv(file);
}

const defaultUrls = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/blog',
  'https://sanliurfa.com/gezilecek-yerler',
];
const urls = (args.get('url') ? [args.get('url')] : (process.env.PAGESPEED_URLS || defaultUrls.join(',')).split(','))
  .map((url) => url.trim())
  .filter(Boolean)
  .slice(0, Number(args.get('max-urls') || process.env.PAGESPEED_MAX_URLS || 3));
const strategies = (args.get('strategy') ? [args.get('strategy')] : ['mobile', 'desktop'])
  .map((strategy) => strategy.trim())
  .filter((strategy) => ['mobile', 'desktop'].includes(strategy));
const threshold = {
  performance: Number(args.get('min-performance') || process.env.PAGESPEED_MIN_PERFORMANCE || 0.6),
  accessibility: Number(args.get('min-accessibility') || process.env.PAGESPEED_MIN_ACCESSIBILITY || 0.85),
  bestPractices: Number(args.get('min-best-practices') || process.env.PAGESPEED_MIN_BEST_PRACTICES || 0.85),
  seo: Number(args.get('min-seo') || process.env.PAGESPEED_MIN_SEO || 0.9),
};
const noApiKey = args.has('no-api-key') || process.env.PAGESPEED_NO_API_KEY === '1';
const apiKey = noApiKey ? '' : process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || '';
const outJson = path.join(docsDir, 'pagespeed-live-check-report.json');
const outMd = path.join(docsDir, 'pagespeed-live-check-report.md');
const quotaReportPath = path.join(docsDir, 'pagespeed-quota-management-report.json');

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function scoreOf(categories, key) {
  return typeof categories?.[key]?.score === 'number' ? categories[key].score : null;
}

function metricValue(audits, key) {
  const audit = audits?.[key];
  return audit ? { displayValue: audit.displayValue || null, numericValue: audit.numericValue ?? null } : null;
}

async function runPageSpeed(url, strategy) {
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  api.searchParams.set('url', url);
  api.searchParams.set('strategy', strategy);
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    api.searchParams.append('category', category);
  }
  if (apiKey) api.searchParams.set('key', apiKey);

  const res = await fetch(api, { signal: AbortSignal.timeout(90000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    const quotaLimited = /quota exceeded|Queries per day/i.test(message);
    return {
      url,
      strategy,
      status: quotaLimited ? 'quota-limited' : 'failed',
      error: message,
      apiKeyMode: apiKey ? 'keyed' : 'anonymous',
      advisory: quotaLimited
        ? 'PageSpeed daily quota dolu; Cloud Console kotası yenilenince veya API key kotası ayrılınca tekrar çalıştır.'
        : null,
    };
  }

  const lighthouse = data.lighthouseResult || {};
  const categories = lighthouse.categories || {};
  const audits = lighthouse.audits || {};
  const scores = {
    performance: scoreOf(categories, 'performance'),
    accessibility: scoreOf(categories, 'accessibility'),
    bestPractices: scoreOf(categories, 'best-practices'),
    seo: scoreOf(categories, 'seo'),
  };
  const issues = [];
  if ((scores.performance ?? 0) < threshold.performance) issues.push('performance-under-threshold');
  if ((scores.accessibility ?? 0) < threshold.accessibility) issues.push('accessibility-under-threshold');
  if ((scores.bestPractices ?? 0) < threshold.bestPractices) issues.push('best-practices-under-threshold');
  if ((scores.seo ?? 0) < threshold.seo) issues.push('seo-under-threshold');

  return {
    url,
    strategy,
    status: issues.length ? 'review' : 'ok',
    apiKeyMode: apiKey ? 'keyed' : 'anonymous',
    fetchTime: lighthouse.fetchTime || null,
    scores,
    metrics: {
      firstContentfulPaint: metricValue(audits, 'first-contentful-paint'),
      largestContentfulPaint: metricValue(audits, 'largest-contentful-paint'),
      totalBlockingTime: metricValue(audits, 'total-blocking-time'),
      cumulativeLayoutShift: metricValue(audits, 'cumulative-layout-shift'),
      speedIndex: metricValue(audits, 'speed-index'),
    },
    issues,
  };
}

fs.mkdirSync(docsDir, { recursive: true });
const previousQuotaReport = readJsonSafe(quotaReportPath);
const nextRetryAt = previousQuotaReport?.nextRetryAt ? Date.parse(previousQuotaReport.nextRetryAt) : 0;
const force = args.has('force') || process.env.PAGESPEED_FORCE_LIVE === '1';
if (!force && nextRetryAt && Date.now() < nextRetryAt) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'review',
    source: 'Google PageSpeed Insights API',
    skipped: true,
    skipReason: 'quota-retry-window-not-due',
    nextRetryAt: previousQuotaReport.nextRetryAt,
    apiKeyPresent: Boolean(apiKey),
    apiKeyMode: apiKey ? 'keyed' : 'anonymous',
    threshold,
    summary: {
      checks: 0,
      ok: 0,
      review: 1,
      failed: 0,
      quotaLimited: Number(previousQuotaReport?.liveCheck?.quotaLimited ?? 1),
    },
    results: [
      {
        url: urls[0] || 'https://sanliurfa.com/',
        strategy: strategies[0] || 'mobile',
        status: 'quota-retry-window-not-due',
        advisory: `PageSpeed quota retry window ${previousQuotaReport.nextRetryAt} sonrasına kadar bekliyor. Zorlamak için --force veya PAGESPEED_FORCE_LIVE=1 kullan.`,
      },
    ],
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    outMd,
    [
      '# PageSpeed Live Check Report',
      '',
      `- Status: ${report.status}`,
      `- Generated: ${report.generatedAt}`,
      `- Skipped: yes`,
      `- Reason: ${report.skipReason}`,
      `- Next retry at: ${report.nextRetryAt}`,
      `- API key mode: ${report.apiKeyMode}`,
      '',
      'Quota penceresi dolmadan canlı Google PageSpeed sorgusu tekrar çalıştırılmadı.',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`pagespeed-live-check: REVIEW skipped=quota-retry-window-not-due nextRetryAt=${report.nextRetryAt}`);
  process.exit(0);
}

const results = [];
for (const url of urls) {
  for (const strategy of strategies) {
    process.stdout.write(`pagespeed ${strategy} ${url} `);
    try {
      const result = await runPageSpeed(url, strategy);
      results.push(result);
      console.log(result.status);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      results.push({ url, strategy, status: 'failed', error: error.message });
      console.log(`failed: ${error.message}`);
    }
  }
}

const failed = results.filter((result) => !['ok', 'review', 'quota-limited'].includes(result.status));
const review = results.filter((result) => result.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 && review.length === 0 ? 'ok' : failed.length === 0 ? 'review' : 'failed',
  source: 'Google PageSpeed Insights API',
  apiKeyPresent: Boolean(apiKey),
  apiKeyMode: apiKey ? 'keyed' : 'anonymous',
  threshold,
  summary: {
    checks: results.length,
    ok: results.filter((result) => result.status === 'ok').length,
    review: review.length,
    failed: failed.length,
    quotaLimited: results.filter((result) => result.status === 'quota-limited').length,
  },
  results,
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# PageSpeed Live Check Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Checks: ${report.summary.checks}`,
    `- OK: ${report.summary.ok}`,
    `- Review: ${report.summary.review}`,
    '',
    '| URL | Strategy | Status | Perf | A11y | Best | SEO | Issues |',
    '|---|---|---|---:|---:|---:|---:|---|',
    ...results.map((item) => `| ${item.url} | ${item.strategy} | ${item.status} | ${item.scores?.performance ?? ''} | ${item.scores?.accessibility ?? ''} | ${item.scores?.bestPractices ?? ''} | ${item.scores?.seo ?? ''} | ${(item.issues || [item.error]).filter(Boolean).join(', ') || '-'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`pagespeed-live-check: ${report.status.toUpperCase()} ok=${report.summary.ok} review=${report.summary.review}`);
process.exit(report.status === 'failed' ? 1 : 0);
