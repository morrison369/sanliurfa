#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const steps = [
  ['npm', ['run', '-s', 'type-check']],
  ['npm', ['run', '-s', 'lint']],
  ['npm', ['run', '-s', 'frontend:theme:gate']],
];

for (const [cmd, args] of steps) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log('frontend-quality-gate: PASS');
