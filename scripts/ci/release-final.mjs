#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s storage:local:gate',
  'npm run -s quality:reports:refresh',
  'npm run -s quality:metrics',
];

if (process.env.RELEASE_FINAL_SMOKE_E2E === '1') {
  steps.push('node scripts/runtime/run-with-cleanup.mjs "node scripts/ci/e2e-report.mjs --suite=smoke"');
}

steps.push(
  'npm run -s release:candidate',
  'npm run -s release:handoff',
  'npm run -s release:artifacts:fresh',
  'npm run -s quality:metrics',
);

function run(command) {
  console.log(`[release-final] ${command}`);
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`step failed: ${command} (exit=${result.status ?? 'null'})`);
  }
}

try {
  for (const step of steps) run(step);
  console.log('[release-final] completed');
} catch (error) {
  console.error(`[release-final] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
