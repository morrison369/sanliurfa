#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const linkerPath = path.join(root, 'src/lib/seo/internal-linker.ts');
const componentPath = path.join(root, 'src/components/seo/InternalBacklinks.astro');
const blogPath = path.join(root, 'src/pages/blog/[slug].astro');
const stylePath = path.join(root, 'src/styles/global.css');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'internal-linking-report.json');
const outMd = path.join(docsDir, 'internal-linking-report.md');

const criticalUrls = [
  '/mekanlar',
  '/gezilecek-yerler',
  '/yemek-tarifleri',
  '/saglik/nobetci-eczaneler',
  '/ulasim/otobus-saatleri',
  '/ulasim/ucak-saatleri',
  '/etkinlikler',
  '/topluluk',
  '/isletme-kayit',
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const linker = read(linkerPath);
const component = read(componentPath);
const blog = read(blogPath);
const styles = read(stylePath);
const ruleUrls = [...linker.matchAll(/url:\s*'([^']+)'/g)].map((match) => match[1]);
const uniqueUrls = [...new Set(ruleUrls)];
const missingCriticalUrls = criticalUrls.filter((url) => !uniqueUrls.includes(url));

const checks = [
  {
    name: 'internal-linker registry',
    ok: fs.existsSync(linkerPath) && ruleUrls.length >= 25 && uniqueUrls.length >= 20,
    detail: `${ruleUrls.length} rules, ${uniqueUrls.length} unique URLs`,
  },
  {
    name: 'critical SEO hubs covered',
    ok: missingCriticalUrls.length === 0,
    detail: missingCriticalUrls.length ? `missing: ${missingCriticalUrls.join(', ')}` : 'all critical hubs present',
  },
  {
    name: 'sidebar component',
    ok: fs.existsSync(componentPath) && component.includes('InternalLinkSuggestion'),
    detail: 'src/components/seo/InternalBacklinks.astro',
  },
  {
    name: 'blog detail integration',
    ok:
      blog.includes('getInternalLinkSuggestions') &&
      blog.includes('linkifyContent') &&
      blog.includes('<InternalBacklinks'),
    detail: 'src/pages/blog/[slug].astro',
  },
  {
    name: 'inline link style',
    ok: styles.includes('.il-link'),
    detail: 'src/styles/global.css',
  },
];

const failed = checks.filter((check) => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'passed' : 'failed',
  ruleCount: ruleUrls.length,
  uniqueUrlCount: uniqueUrls.length,
  criticalUrls,
  missingCriticalUrls,
  checks,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Internal Linking Report',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  `- Rule Count: ${report.ruleCount}`,
  `- Unique URL Count: ${report.uniqueUrlCount}`,
  '',
  '## Checks',
  '',
  ...checks.map((check) => `- ${check.ok ? 'OK' : 'FAIL'}: ${check.name} (${check.detail})`),
  '',
];
fs.writeFileSync(outMd, lines.join('\n'), 'utf8');

console.log(`internal-linking-report: ${report.status} (${report.ruleCount} rules, ${report.uniqueUrlCount} URLs)`);
if (failed.length) process.exit(1);
