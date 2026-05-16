#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const liveMode = process.argv.includes('--live');
const baseUrl = process.env.PUBLISHER_CENTER_BASE_URL || 'https://sanliurfa.com';

const checks = [];
function add(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const layout = read('src/layouts/Layout.astro');
const rss = read('src/pages/rss.xml.ts');
const publisherEndpoint = read('src/pages/publisher-center.json.ts');
const docs = read('docs/PUBLISHER_CENTER_SETUP.md');

add('NewsMediaOrganization schema', layout.includes('NewsMediaOrganization'), 'src/layouts/Layout.astro');
add('publishing principles schema', layout.includes('publishingPrinciples'), 'src/layouts/Layout.astro');
add('ownership funding schema', layout.includes('ownershipFundingInfo'), 'src/layouts/Layout.astro');
add('RSS content type', rss.includes('application/rss+xml'), 'src/pages/rss.xml.ts');
add('RSS self atom link', rss.includes('atom:link') && rss.includes('/rss.xml'), 'src/pages/rss.xml.ts');
add('RSS editor contact', rss.includes('managingEditor') && rss.includes('webMaster'), 'src/pages/rss.xml.ts');
add('Publisher Center JSON endpoint', publisherEndpoint.includes('primaryFeed') && publisherEndpoint.includes('sections'), 'src/pages/publisher-center.json.ts');
add('Publisher Center docs', docs.includes('Primary RSS feed') && docs.includes('Google Cloud CLI'), 'docs/PUBLISHER_CENTER_SETUP.md');

if (liveMode) {
  async function fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'SanliurfaPublisherCenterReadiness/1.0' } });
    return { res, text: await res.text() };
  }

  const [home, feed, json, sitemap, robots] = await Promise.all([
    fetchText(`${baseUrl}/`),
    fetchText(`${baseUrl}/rss.xml`),
    fetchText(`${baseUrl}/publisher-center.json`),
    fetchText(`${baseUrl}/sitemap.xml`),
    fetchText(`${baseUrl}/robots.txt`),
  ]);

  add('live home NewsMediaOrganization', home.res.ok && home.text.includes('NewsMediaOrganization'), `${home.res.status} /`);
  add('live RSS status', feed.res.ok && /application\/rss\+xml|application\/xml|text\/xml/i.test(feed.res.headers.get('content-type') || ''), `${feed.res.status} ${feed.res.headers.get('content-type') || ''}`);
  add('live RSS items', feed.text.includes('<rss') && feed.text.includes('<item>'), '/rss.xml');
  add('live publisher-center json', json.res.ok && json.text.includes('"primaryFeed"') && json.text.includes('/rss.xml'), `${json.res.status} /publisher-center.json`);
  add('live sitemap status', sitemap.res.ok && sitemap.text.includes('sitemap'), `${sitemap.res.status} /sitemap.xml`);
  add('live robots status', robots.res.ok && robots.text.includes('Sitemap:'), `${robots.res.status} /robots.txt`);
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
const baseName = liveMode ? 'publisher-center-live-readiness-report' : 'publisher-center-readiness-report';
fs.writeFileSync(path.join(docsDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  path.join(docsDir, `${baseName}.md`),
  [
    '# Publisher Center Readiness Report',
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
);

console.log(`publisher-center-readiness-report: ${report.status.toUpperCase()} (${failed.length} failed)`);
process.exit(failed.length === 0 ? 0 : 1);
