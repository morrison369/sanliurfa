#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const forceNonStrict = process.argv.includes('--non-strict');
const strict = !forceNonStrict;

function run(cmd, env = process.env) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env,
  });
  if (result.status !== 0) {
    throw new Error(`command failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

function cleanup(cmd) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0 && process.exitCode !== 1) {
    process.exitCode = 1;
  }
}

try {
  run('npm run -s dev:isolated:ensure');
  run('node scripts/smoke/social-place-phase1.mjs', {
    ...process.env,
    STRICT_PLACE_SUBMIT: strict ? '1' : process.env.STRICT_PLACE_SUBMIT || '0',
  });
} catch (error) {
  console.error(`[social-core-gate] ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally {
  cleanup('npm run -s dev:isolated:stop');
  cleanup('npm run -s redis:isolated:stop');
}
