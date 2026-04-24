#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function mustInclude(rel, text) {
  const content = read(rel);
  if (!content.includes(text)) {
    errors.push(`${rel}: missing "${text}"`);
  }
}

mustInclude('src/lib/runtime/phase-policy.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/subscriptions/checkout.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/billing/checkout.ts', 'PHASE1_FREE_MODE');
mustInclude('src/pages/api/subscriptions/tiers.ts', 'phase1FreeMode');
mustInclude('src/components/PricingPlans.tsx', 'phase1FreeMode');
mustInclude('src/components/PremiumFeatureGuard.tsx', 'PHASE1_FREE_MODE');

if (errors.length > 0) {
  console.error('[phase1-free-mode-gate] FAILED');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log('[phase1-free-mode-gate] ok');

