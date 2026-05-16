#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'pagespeed-api-less-lighthouse-report.json');
const outMd = path.join(docsDir, 'pagespeed-api-less-lighthouse-report.md');
const rawDir = path.join(docsDir, 'lighthouse-api-less');
const lighthouseCli = path.join(root, 'node_modules', 'lighthouse', 'cli', 'index.js');

const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('=') || '1');
}

const defaultUrls = [
  'https://sanliurfa.com/',
  'https://sanliurfa.com/blog',
  'https://sanliurfa.com/gezilecek-yerler',
];

const urls = (args.get('url') ? [args.get('url')] : (process.env.LIGHTHOUSE_URLS || defaultUrls.join(',')).split(','))
  .map((url) => url.trim())
  .filter(Boolean)
  .slice(0, Number(args.get('max-urls') || process.env.LIGHTHOUSE_MAX_URLS || 1));

const strategy = args.get('strategy') || process.env.LIGHTHOUSE_STRATEGY || 'mobile';
const threshold = {
  performance: Number(args.get('min-performance') || process.env.LIGHTHOUSE_MIN_PERFORMANCE || 0.6),
  accessibility: Number(args.get('min-accessibility') || process.env.LIGHTHOUSE_MIN_ACCESSIBILITY || 0.85),
  bestPractices: Number(args.get('min-best-practices') || process.env.LIGHTHOUSE_MIN_BEST_PRACTICES || 0.85),
  seo: Number(args.get('min-seo') || process.env.LIGHTHOUSE_MIN_SEO || 0.9),
};

function safeName(url) {
  return url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'home';
}

function scoreOf(categories, key) {
  return typeof categories?.[key]?.score === 'number' ? categories[key].score : null;
}

function metricValue(audits, key) {
  const audit = audits?.[key];
  return audit
    ? {
        displayValue: audit.displayValue || null,
        numericValue: audit.numericValue ?? null,
      }
    : null;
}

function classifyBestPracticeReview(audits) {
  const thirdPartyCookieItems = audits?.['third-party-cookies']?.details?.items || [];
  const consoleScore = audits?.['errors-in-console']?.score;
  const inspectorItems = audits?.['inspector-issues']?.details?.items || [];
  const inspectorOnlyCookie = inspectorItems.length > 0 &&
    inspectorItems.every((item) => String(item.issueType || '').toLowerCase() === 'cookie');
  const hasThirdPartyCookie = thirdPartyCookieItems.length > 0;
  const consoleClean = consoleScore === 1 || consoleScore === null || consoleScore === undefined;

  if (hasThirdPartyCookie && consoleClean && inspectorOnlyCookie) {
    return {
      classification: 'external_expected_review',
      blocker: false,
      reason: 'AdSense third-party test_cookie is expected while ads are enabled; console/CSP errors are clean.',
      externalServices: ['Google AdSense / DoubleClick'],
    };
  }

  return {
    classification: 'site_or_mixed_review',
    blocker: false,
    reason: hasThirdPartyCookie
      ? 'Third-party cookie is present, but there may be additional site/mixed best-practices issues.'
      : 'Best-practices review is not explained by expected AdSense cookie alone.',
    externalServices: hasThirdPartyCookie ? ['Google AdSense / DoubleClick'] : [],
  };
}

function runLighthouse(url) {
  const rawPath = path.join(rawDir, `${safeName(url)}-${strategy}.json`);
  const commandArgs = [
    url,
    '--quiet',
    '--output=json',
    `--output-path=${rawPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags=--headless=new --no-sandbox',
  ];
  if (strategy === 'desktop') commandArgs.push('--preset=desktop');

  execFileSync(process.execPath, [lighthouseCli, ...commandArgs], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath(),
    },
    timeout: Number(args.get('timeout-ms') || process.env.LIGHTHOUSE_TIMEOUT_MS || 180000),
  });

  const lhr = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const categories = lhr.categories || {};
  const audits = lhr.audits || {};
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
  const bestPracticesReview = classifyBestPracticeReview(audits);

  return {
    url,
    finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl || url,
    strategy,
    status: issues.length ? 'review' : 'ok',
    lighthouseVersion: lhr.lighthouseVersion || null,
    fetchTime: lhr.fetchTime || null,
    scores,
    metrics: {
      firstContentfulPaint: metricValue(audits, 'first-contentful-paint'),
      largestContentfulPaint: metricValue(audits, 'largest-contentful-paint'),
      totalBlockingTime: metricValue(audits, 'total-blocking-time'),
      cumulativeLayoutShift: metricValue(audits, 'cumulative-layout-shift'),
      speedIndex: metricValue(audits, 'speed-index'),
    },
    issues,
    reviewClassification: {
      bestPractices: bestPracticesReview,
    },
    rawReport: path.relative(root, rawPath).replaceAll(path.sep, '/'),
  };
}

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(rawDir, { recursive: true });

const results = [];
if (!fs.existsSync(lighthouseCli)) {
  results.push({
    url: urls[0] || defaultUrls[0],
    strategy,
    status: 'failed',
    error: 'lighthouse dependency is not installed',
  });
} else {
  for (const url of urls) {
    process.stdout.write(`lighthouse ${strategy} ${url} `);
    try {
      const result = runLighthouse(url);
      results.push(result);
      console.log(result.status);
    } catch (error) {
      results.push({
        url,
        strategy,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('failed');
    }
  }
}

const failed = results.filter((result) => result.status === 'failed');
const review = results.filter((result) => result.status === 'review');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length ? 'failed' : review.length ? 'review' : 'ok',
  source: 'Lighthouse CLI without PageSpeed API',
  apiUsed: false,
  apiKeyRequired: false,
  strategy,
  threshold,
  summary: {
    checks: results.length,
    ok: results.filter((result) => result.status === 'ok').length,
    review: review.length,
    failed: failed.length,
  },
  policy: {
    useAsPrimaryAutomatedPerformanceGate: true,
    pageSpeedApiIsOptionalExternalEvidence: true,
    localStorageOnly: true,
    expectedExternalReviewIsNotReleaseBlocker: true,
  },
  results,
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# PageSpeed API-less Lighthouse Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Source: ${report.source}`,
    `- API used: ${report.apiUsed ? 'yes' : 'no'}`,
    `- Strategy: ${report.strategy}`,
    `- Checks: ${report.summary.checks}`,
    `- OK: ${report.summary.ok}`,
    `- Review: ${report.summary.review}`,
    `- Failed: ${report.summary.failed}`,
    '',
    '| URL | Status | Perf | A11y | Best | SEO | LCP | CLS | TBT | Classification | Issues |',
    '|---|---|---:|---:|---:|---:|---|---|---|---|---|',
    ...results.map((item) => `| ${item.url} | ${item.status} | ${item.scores?.performance ?? ''} | ${item.scores?.accessibility ?? ''} | ${item.scores?.bestPractices ?? ''} | ${item.scores?.seo ?? ''} | ${item.metrics?.largestContentfulPaint?.displayValue ?? ''} | ${item.metrics?.cumulativeLayoutShift?.displayValue ?? ''} | ${item.metrics?.totalBlockingTime?.displayValue ?? ''} | ${item.reviewClassification?.bestPractices?.classification ?? '-'} | ${(item.issues || [item.error]).filter(Boolean).join(', ') || '-'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`pagespeed-api-less-lighthouse-report: ${report.status.toUpperCase()} ok=${report.summary.ok} review=${report.summary.review} failed=${report.summary.failed}`);
process.exit(report.status === 'failed' ? 1 : 0);
