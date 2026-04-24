#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s gate:agency',
  'npm run -s jobs:nightly:core',
  'npm run -s recommendations:apply:quick',
];

function run(cmd) {
  console.log(`[agency-all] ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

try {
  for (const s of steps) run(s);
  console.log('[agency-all] completed');
} catch (error) {
  console.error(`[agency-all] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
