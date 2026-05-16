#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s db:retirement:observe',
  'npm run -s db:p0:quarantine:plan',
  'npm run -s db:observation:cadence',
  'npm run -s db:observation:calendar',
  'npm run -s db:manual:decision:readiness',
  'npm run -s db:registry:classification',
  'npm run -s db:runtime-hold:plan',
  'npm run -s redis:runtime:health:report',
  'npm run -s warmup:safety:report',
  'npm run -s storage:local:gate',
  'npm run -s images:uploads:parity',
  'npm run -s images:uploads:bucket-quota',
  'npm run -s images:uploads:archive-candidates',
  'npm run -s images:integrity:gate',
  'npm run -s media:readiness',
  'npm run -s admin:strict-role:gate',
  'npm run -s blog:keyword:research',
  'npm run -s blog:duplicate-risk:gate',
  'npm run -s content:agents:drafts:report',
  'npm run -s pagespeed:api-less',
  'npm run -s adsense:readiness:live',
  'npm run -s publisher:center:readiness:live',
  'npm run -s quality:reports:refresh',
  'npm run -s quality:metrics',
  'npm run -s release:next-actions',
  'npm run -s release:readiness:report',
  'npm run -s release:readiness:dashboard',
  'npm run -s release:handoff',
  'npm run -s release:executive:summary',
  'npm run -s release:artifacts:fresh',
  'npm run -s quality:metrics',
];

function run(command) {
  console.log(`[release-daily-readiness] ${command}`);
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
  console.log('[release-daily-readiness] completed');
} catch (error) {
  console.error(`[release-daily-readiness] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
