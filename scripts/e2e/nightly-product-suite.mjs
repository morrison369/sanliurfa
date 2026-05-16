#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const productSpecs = [
  'e2e/places.spec.ts',
  'e2e/profile.spec.ts',
  'e2e/quotas.spec.ts',
  'e2e/social-phase1.spec.ts',
];

if (process.env.NIGHTLY_INCLUDE_MUTATION_E2E === '1') {
  productSpecs.push('e2e/photos.spec.ts');
}

const command = [
  'npm run -s test:e2e:preflight',
  '&&',
  'node ./node_modules/@playwright/test/cli.js test',
  '--config=playwright.config.ts',
  productSpecs.join(' '),
  '--project=chromium',
  '--workers=1',
  '--reporter=line',
].join(' ');

const result = spawnSync(process.execPath, ['scripts/runtime/run-with-cleanup.mjs', command], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
