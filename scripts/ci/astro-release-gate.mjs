#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const steps = [
  ['frontend quality', 'npm', ['run', '-s', 'frontend:quality:gate']],
  ['public city structure', 'npm', ['run', '-s', 'public:city:structure:gate']],
  ['public theme surface', 'npm', ['run', '-s', 'public:theme:surface:gate']],
  ['unit tests', 'npm', ['run', '-s', 'test:unit']],
  ['build', 'npm', ['run', '-s', 'build']],
  ['quality metrics', 'npm', ['run', '-s', 'quality:metrics']],
  ['secret scan', 'npm', ['run', '-s', 'security:scan-secrets']],
  ['prod dependency audit', 'npm', ['audit', '--omit=dev']],
  ['migration duplicate check', 'npm', ['run', '-s', 'db:migrate:check-duplicates']],
  ['release readiness', 'npm', ['run', '-s', 'release:readiness:report']],
];

for (const [label, cmd, args] of steps) {
  console.log(`\n[astro-release-gate] ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[astro-release-gate] FAIL: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log('\nastro-release-gate: PASS');
