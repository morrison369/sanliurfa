#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  'npm run -s jobs:pharmacy:refresh',
  'npm run -s jobs:transit:refresh',
  'npm run -s jobs:weather:refresh',
  'npm run -s jobs:social:retention',
  'npm run -s jobs:places:sla-alert',
  'npm run -s jobs:reports:social-lifecycle',
  'npm run -s jobs:content:quality',
  'npm run -s smoke:transport:freshness',
];

function run(cmd) {
  console.log(`[nightly-core] ${cmd}`);
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
  for (const step of steps) run(step);
  console.log('[nightly-core] all steps completed');
} catch (error) {
  console.error(`[nightly-core] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
