#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('[runtime] usage: node scripts/runtime/run-with-cleanup.mjs <command...>');
  process.exit(2);
}

function run(cmd, allowFail = false) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (!allowFail && result.status !== 0) {
    throw new Error(`command failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
  return result.status ?? 1;
}

const target = args.join(' ');
let exitCode = 0;

try {
  run(target);
} catch (error) {
  exitCode = 1;
  console.error(`[runtime] ${error instanceof Error ? error.message : 'unknown error'}`);
} finally {
  run('npm run -s dev:isolated:stop', true);
  run('npm run -s runtime:cleanup:listeners', true);
  run('npm run -s dev:isolated:check-no-orphan', true);
}

process.exit(exitCode);
