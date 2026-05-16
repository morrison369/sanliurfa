#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s storage:local:gate',
  'npm run -s images:integrity:gate',
  'npm run -s media:readiness',
  'npm run -s admin:strict-role:gate',
  'npm run -s blog:duplicate-risk:gate',
  'npm run -s lighthouse:ci',
  'npm run -s adsense:readiness:live',
  'npm run -s publisher:center:readiness:live',
  'npm run -s home:images:html:prod',
  'npm run -s content:agents:drafts:report',
  'npm run -s db:observation:calendar',
  'npm run -s db:runtime-hold:plan',
  'npm run -s sql:parameter:safety',
  'npm run -s quality:reports:refresh',
  'npm run -s quality:metrics',
  'npm run -s visual:regression:gate',
  'npm run -s release:next-actions',
  'npm run -s release:readiness:report',
  'npm run -s release:readiness:dashboard',
  'npm run -s release:handoff',
  'npm run -s release:executive:summary',
  'npm run -s release:artifacts:fresh',
  'npm run -s quality:metrics',
];

function run(command) {
  console.log(`[release-local-fast] ${command}`);
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
  console.log('[release-local-fast] completed');
} catch (error) {
  console.error(`[release-local-fast] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
