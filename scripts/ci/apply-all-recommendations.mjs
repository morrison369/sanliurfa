#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const FULL_STEPS = [
  'npm run db:migrate',
  'npm run images:pipeline:db',
  'npm run jobs:transit:refresh',
  'npm run jobs:weather:refresh',
  'npm run jobs:places:sla-alert',
  'npm run jobs:social:retention',
  'npm run api:release:gate',
  'npm run gate:done',
];

const QUICK_STEPS = [
  'npm run db:migrate',
  'npm run smoke:site-settings:schema',
  'npm run openapi:sync:routes:gate',
  'npm run smoke:api:critical',
  'npm run release:readiness:report',
];

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'full';
const steps = mode === 'quick' ? QUICK_STEPS : FULL_STEPS;

function run(cmd) {
  console.log(`\n[ops] ${cmd}`);
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
  console.log(`[ops] apply-all-recommendations mode=${mode}`);
  for (const step of steps) {
    run(step);
  }
  console.log('\n[ops] all recommendation steps completed');
} catch (error) {
  console.error(`\n[ops] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  // Always cleanup daemon processes even if a step fails.
  try {
    run('npm run -s dev:isolated:stop');
  } catch {}
  try {
    run('npm run -s dev:isolated:check-no-orphan');
  } catch {}
}
