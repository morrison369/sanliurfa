#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expectedAdsTxt = 'google.com, pub-7160871802649062, DIRECT, f08c47fec0942fa0';
const expectedMeta = '<meta name="google-adsense-account" content="ca-pub-7160871802649062"';
const expectedScript = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7160871802649062';
const expectedDynamicLoaderId = 'sf-adsense-loader';
const liveMode = process.argv.includes('--live');
const baseUrl = process.env.ADSENSE_LIVE_BASE_URL || process.env.SITE_URL || 'https://sanliurfa.com';

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SanliurfaAdsenseReadiness/1.0)',
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      body: await response.text(),
      url: response.url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      body: '',
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchTextWithUserAgent(url, userAgent) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': userAgent,
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      cacheControl: response.headers.get('cache-control') || '',
      xRobotsTag: response.headers.get('x-robots-tag') || '',
      body: await response.text(),
      url: response.url,
      userAgent,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      contentType: '',
      cacheControl: '',
      xRobotsTag: '',
      body: '',
      url,
      userAgent,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const checks = [
  {
    name: 'public ads.txt exists',
    ok: fs.existsSync(path.join(root, 'public/ads.txt')),
    detail: 'public/ads.txt',
  },
  {
    name: 'public ads.txt exact publisher line',
    ok: (() => {
      try {
        return fs.readFileSync(path.join(root, 'public/ads.txt'), 'utf8').trim() === expectedAdsTxt;
      } catch {
        return false;
      }
    })(),
    detail: expectedAdsTxt,
  },
  {
    name: 'layout adsense meta',
    ok: (() => {
      try {
        return fs.readFileSync(path.join(root, 'src/layouts/Layout.astro'), 'utf8').includes(expectedMeta);
      } catch {
        return false;
      }
    })(),
    detail: expectedMeta,
  },
  {
    name: 'layout adsense loader script',
    ok: (() => {
      try {
        const layout = fs.readFileSync(path.join(root, 'src/layouts/Layout.astro'), 'utf8');
        return (
          layout.includes(expectedScript) &&
          layout.includes(expectedDynamicLoaderId) &&
          (layout.includes('crossOrigin') || layout.includes('crossorigin="anonymous"'))
        );
      } catch {
        return false;
      }
    })(),
    detail: `${expectedScript} via ${expectedDynamicLoaderId}`,
  },
  {
    name: 'robots explicit ads access',
    ok: (() => {
      try {
        const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
        return robots.includes('User-agent: Mediapartners-Google') && robots.includes('Allow: /ads.txt');
      } catch {
        return false;
      }
    })(),
    detail: 'Mediapartners-Google + /ads.txt',
  },
];

if (liveMode) {
  const origin = new URL(baseUrl).origin;
  const ads = await fetchText(`${origin}/ads.txt`);
  const home = await fetchText(`${origin}/`);
  const robots = await fetchText(`${origin}/robots.txt`);
  const liveOrigins = Array.from(
    new Set([
      origin,
      origin.replace('https://', 'http://'),
      origin.includes('://www.') ? origin.replace('://www.', '://') : origin.replace('://', '://www.'),
    ]),
  );
  const crawlerChecks = [];
  for (const liveOrigin of liveOrigins) {
    for (const userAgent of ['Mediapartners-Google', 'AdsBot-Google', 'Googlebot']) {
      crawlerChecks.push(await fetchTextWithUserAgent(`${liveOrigin}/ads.txt`, userAgent));
    }
  }

  checks.push(
    {
      name: 'live ads.txt status',
      ok: ads.ok && ads.status === 200,
      detail: `${ads.status} ${ads.url}`,
    },
    {
      name: 'live ads.txt content-type',
      ok: /text\/plain/i.test(ads.contentType),
      detail: ads.contentType || 'missing',
    },
    {
      name: 'live ads.txt exact publisher line',
      ok: ads.body.trim() === expectedAdsTxt,
      detail: ads.body.trim(),
    },
    {
      name: 'live ads.txt no html fallback',
      ok: !/<html[\s>]/i.test(ads.body) && !/<!doctype html/i.test(ads.body),
      detail: ads.body.slice(0, 80).replace(/\s+/g, ' '),
    },
    {
      name: 'live ads.txt crawler variants',
      ok: crawlerChecks.every(
        (item) =>
          item.ok &&
          item.status === 200 &&
          /text\/plain/i.test(item.contentType) &&
          item.body.trim() === expectedAdsTxt,
      ),
      detail: crawlerChecks
        .map((item) => `${item.userAgent}:${item.status}:${new URL(item.url).host}`)
        .join(', '),
    },
    {
      name: 'live adsense meta',
      ok: home.ok && home.body.includes(expectedMeta),
      detail: `${home.status} ${home.url}`,
    },
    {
      name: 'live adsense loader script',
      ok: home.ok && home.body.includes(expectedScript) && home.body.includes(expectedDynamicLoaderId),
      detail: `${home.status} ${home.url}`,
    },
    {
      name: 'live robots adsense crawler',
      ok: robots.ok && robots.body.includes('User-agent: Mediapartners-Google') && robots.body.includes('Allow: /ads.txt'),
      detail: `${robots.status} ${robots.url}`,
    },
  );
}

const failed = checks.filter((check) => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  mode: liveMode ? 'live' : 'local',
  baseUrl: liveMode ? baseUrl : null,
  status: failed.length === 0 ? 'passed' : 'failed',
  checks,
};

const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });
const outBaseName = liveMode ? 'adsense-live-readiness-report' : 'adsense-readiness-report';
fs.writeFileSync(path.join(docsDir, `${outBaseName}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(docsDir, `${outBaseName}.md`),
  [
    '# AdSense Readiness Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    ...(report.baseUrl ? [`- Base URL: ${report.baseUrl}`] : []),
    `- Status: ${report.status}`,
    '',
    '| Check | Status | Detail |',
    '|---|---|---|',
    ...checks.map((check) => `| ${check.name} | ${check.ok ? 'ok' : 'failed'} | \`${check.detail}\` |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`adsense-readiness-gate: ${report.status.toUpperCase()} (${failed.length} failed)`);
process.exit(failed.length === 0 ? 0 : 1);
