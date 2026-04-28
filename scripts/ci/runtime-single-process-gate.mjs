#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const errors = [];

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const scripts = pkg?.scripts || {};

const requiredScripts = [
  'dev:isolated:ensure',
  'dev:isolated:check-no-orphan',
  'runtime:preflight:isolation',
];

for (const s of requiredScripts) {
  if (!scripts[s]) errors.push(`package.json scripts: missing "${s}"`);
}

const requiredFiles = [
  'scripts/runtime/preflight-isolation.mjs',
  'scripts/runtime/check-no-orphan-dev.mjs',
  'scripts/runtime/dev-daemon.mjs',
];

for (const f of requiredFiles) {
  if (!existsSync(resolve(root, f))) errors.push(`${f}: missing`);
}

if (errors.length) {
  console.error('[runtime-single-process-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[runtime-single-process-gate] ok');

