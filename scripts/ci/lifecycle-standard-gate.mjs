#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

const required = [
  'src/pages/api/admin/places/lifecycle.ts',
  'src/pages/api/admin/places/lifecycle/sla.ts',
  'src/pages/admin/places/lifecycle.astro',
  'src/lib/place/lifecycle.ts',
  'src/lib/place/lifecycle-events.ts',
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) errors.push(`${rel}: missing`);
}

function mustInclude(rel, token) {
  const content = readFileSync(resolve(root, rel), 'utf8');
  if (!content.includes(token)) errors.push(`${rel}: missing "${token}"`);
}

mustInclude('src/pages/api/admin/places/lifecycle.ts', 'place_lifecycle_events');
mustInclude('src/pages/api/admin/places/lifecycle/sla.ts', 'sla');
mustInclude('src/lib/place/lifecycle-events.ts', 'recordPlaceLifecycleEvent');

if (errors.length) {
  console.error('[lifecycle-standard-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[lifecycle-standard-gate] ok');
