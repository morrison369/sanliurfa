#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run public:city:gate',
  'npm run recommendations:apply',
  'npm run gate:isolated',
  'npm run jobs:nightly:core',
  'npm run recommendations:apply:quick',
];

function run(cmd) {
  console.log(`[next-bulk] ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

let exitCode = 0;
try {
  for (const step of steps) run(step);
  console.log('[next-bulk] completed');
} catch (error) {
  exitCode = 1;
  console.error(`[next-bulk] ${error instanceof Error ? error.message : 'unknown error'}`);
} finally {
  run('npm run -s dev:isolated:stop');
  run('npm run -s runtime:cleanup:listeners');
  run('npm run -s dev:isolated:check-no-orphan');
  run('npm run -s redis:isolated:stop');
}

process.exit(exitCode);
