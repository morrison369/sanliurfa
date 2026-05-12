#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredDocs = [
  'docs/FRONTEND_RELEASE_CHECKLIST.md',
  'docs/PERFORMANCE_BUDGET.md',
  'docs/PAGE_TEMPLATE_SYSTEM.md',
  'docs/SEO_TEMPLATE_STANDARD.md',
  'docs/SSR_PWA_RUNTIME_CHECKLIST.md',
  'docs/CONTENT_PIPELINE_STANDARD.md',
];

for (const rel of requiredDocs) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`frontend-release-checklist-gate: missing ${rel}`);
    process.exit(1);
  }
}

console.log('frontend-release-checklist-gate: PASS');
