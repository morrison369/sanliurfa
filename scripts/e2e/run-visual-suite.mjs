#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  PLAYWRIGHT_INCLUDE_VISUAL: '1',
};

const preflight = spawnSync('npm', ['run', '-s', 'test:e2e:preflight'], {
  shell: true,
  stdio: 'inherit',
  env,
});

if ((preflight.status ?? 1) !== 0) {
  process.exit(preflight.status || 1);
}

const result = spawnSync(
  'node',
  [
    './node_modules/@playwright/test/cli.js',
    'test',
    '--config=playwright.config.ts',
    'e2e/home.visual.spec.ts',
    '--project=chromium',
  ],
  {
    shell: true,
    stdio: 'inherit',
    env,
  },
);

process.exit(result.status || 0);
