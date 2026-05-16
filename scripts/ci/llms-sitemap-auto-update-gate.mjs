#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'llms-sitemap-auto-update-gate.json');
const outMd = path.join(docsDir, 'llms-sitemap-auto-update-gate.md');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function checkSource(file, label, signals) {
  const source = read(file);
  const missing = signals.filter((signal) => !source.includes(signal));
  return {
    label,
    file,
    status: missing.length === 0 ? 'ok' : 'failed',
    missing,
  };
}

const checks = [
  checkSource('src/pages/llms.txt.ts', 'llms.txt dynamic blog source', [
    'FROM blog_posts',
    "WHERE status = 'published'",
    'ORDER BY published_at DESC',
    'getCachedPublicRouteData',
    'Güncel Blog Yazıları',
    'Sitemap:',
  ]),
  checkSource('src/pages/llms-full.txt.ts', 'llms-full.txt dynamic source', [
    'FROM blog_posts',
    'FROM recipes',
    'FROM historical_sites',
    'FROM places',
    'FROM events',
    'Updated:',
  ]),
  checkSource('src/pages/sitemap.xml.ts', 'sitemap index auto lastmod', [
    '/sitemap-dynamic.xml',
    '/sitemap-pages.xml',
    '/sitemap-blog.xml',
    'MAX(GREATEST(updated_at, published_at))',
    "FROM blog_posts WHERE status = 'published'",
    'buildSitemapIndexXml',
  ]),
  checkSource('src/pages/sitemap-[name].xml.ts', 'section sitemap db-driven content', [
    "'blog'",
    'buildBlogEntries',
    'FROM blog_posts',
    "WHERE status = 'published' AND published_at <= NOW()",
    'buildUrlsetXml',
    'NEWS_WINDOW_HOURS',
  ]),
  checkSource('src/pages/sitemap-dynamic.xml.ts', 'critical dynamic sitemap', [
    'CORE_DYNAMIC_URLS',
    '/mekanlar',
    '/ilceler',
    '/yemek-tarifleri',
    '/saglik/nobetci-eczaneler',
    '/ulasim/otobus-saatleri',
    '/ulasim/ucak-saatleri',
    '/etkinlikler',
  ]),
  checkSource('src/pages/robots.txt.ts', 'robots sitemap discovery', [
    'Sitemap:',
    '/sitemap.xml',
    '/sitemap-dynamic.xml',
    'GPTBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
  ]),
];

const failed = checks.filter((check) => check.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'ok' : 'failed',
  policy: {
    language: 'tr',
    autoPublish: false,
    llmsDynamic: true,
    sitemapDynamic: true,
    localStorageOnly: true,
  },
  summary: {
    checks: checks.length,
    ok: checks.filter((check) => check.status === 'ok').length,
    failed: failed.length,
  },
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# LLMS + Sitemap Auto Update Gate',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Checks: ${report.summary.checks}`,
    `- OK: ${report.summary.ok}`,
    `- Failed: ${report.summary.failed}`,
    '',
    '| Check | Status | File | Missing Signals |',
    '|---|---|---|---|',
    ...checks.map((check) => `| ${check.label} | ${check.status} | \`${check.file}\` | ${check.missing.join(', ') || '-'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`llms-sitemap-auto-update-gate: ${report.status.toUpperCase()} ok=${report.summary.ok} failed=${report.summary.failed}`);
process.exit(report.status === 'ok' ? 0 : 1);
