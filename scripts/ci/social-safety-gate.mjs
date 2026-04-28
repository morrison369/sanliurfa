#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

const required = [
  'src/lib/review/review-antispam.ts',
  'src/pages/api/admin/social/risk.ts',
  'src/pages/api/admin/social/policies.ts',
  'src/pages/api/social/messages.ts',
  'src/pages/api/social/swipe.ts',
  'src/pages/api/social/follow.ts',
  'src/pages/api/admin/moderation/queue.ts',
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) {
    errors.push(`${rel}: missing`);
  }
}

function ensure(rel, token) {
  const content = readFileSync(resolve(root, rel), 'utf8');
  if (!content.includes(token)) errors.push(`${rel}: missing "${token}"`);
}

ensure('src/pages/api/admin/social/risk.ts', 'social_abuse');
ensure('src/pages/api/admin/social/policies.ts', 'swipe_limit');
ensure('src/pages/api/social/swipe.ts', 'social_abuse');
ensure('src/pages/api/social/messages.ts', 'social_abuse');
ensure('src/pages/api/social/follow.ts', 'social_abuse');

if (errors.length) {
  console.error('[social-safety-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[social-safety-gate] ok');
