#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outFile = path.join(root, 'docs', 'release-readiness-dashboard.json');
const checks = [
  'docs/FRONTEND_RELEASE_CHECKLIST.md',
  'docs/PAGE_TEMPLATE_SYSTEM.md',
  'docs/PERFORMANCE_BUDGET.md',
  'docs/SEO_TEMPLATE_STANDARD.md',
  'docs/SSR_PWA_RUNTIME_CHECKLIST.md',
  'docs/CONTENT_PIPELINE_STANDARD.md',
  'docs/ROUTE_OWNERSHIP.md',
  'scripts/ci/visual-regression-gate.mjs',
  'scripts/ci/page-template-system-gate.mjs',
  'scripts/ci/template-adoption-gate.mjs',
  'scripts/ci/seo-helper-adoption-gate.mjs',
  'scripts/ci/home-section-contract-gate.mjs',
  'scripts/ci/release-readiness-admin-gate.mjs',
  'src/pages/admin/release-readiness.astro',
];

const result = {
  generatedAt: new Date().toISOString(),
  ready: true,
  checks: checks.map((rel) => {
    const ok = fs.existsSync(path.join(root, rel));
    return { rel, ok };
  }),
};
result.ready = result.checks.every((c) => c.ok);
fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(`release-readiness-dashboard: wrote ${path.relative(root, outFile)} ready=${result.ready}`);
