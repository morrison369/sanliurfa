#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const criticalSpecs = [
  'e2e/homepage.spec.ts',
  'e2e/auth.spec.ts',
  'e2e/admin.spec.ts',
];

const command = [
  'npm run -s test:e2e:preflight',
  '&&',
  'node ./node_modules/@playwright/test/cli.js test',
  '--config=playwright.config.ts',
  criticalSpecs.join(' '),
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
