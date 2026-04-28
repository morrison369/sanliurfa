#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function readIfExists(rel) {
  const path = resolve(root, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function mustInclude(rel, text) {
  const content = read(rel);
  if (!content.includes(text)) {
    errors.push(`${rel}: missing "${text}"`);
  }
}

function mustIncludeAny(files, text, label) {
  if (!files.some((rel) => readIfExists(rel).includes(text))) {
    errors.push(`${label}: missing "${text}" in [${files.join(', ')}]`);
  }
}

mustInclude('src/lib/runtime/phase-policy.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/subscriptions/checkout.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/billing/checkout.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/subscriptions/tiers.ts', 'phase1FreeMode');
mustInclude('src/components/PricingPlans.tsx', 'phase1FreeMode');
mustIncludeAny(
  [
    'src/components/PremiumFeatureGuard.tsx',
    'src/lib/feature/feature-gating.ts',
    'src/lib/usage/usage-tracking.ts',
    'src/pages/api/user/subscription.ts',
  ],
  'PHASE1_FREE_MODE',
  'phase1 feature gating surface'
);

if (errors.length > 0) {
  console.error('[phase1-free-mode-gate] FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('[phase1-free-mode-gate] ok');
