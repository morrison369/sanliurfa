#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const npmConfigDisabled = (name) => {
  const raw = process.env[`npm_config_${name}`];
  return raw === 'false' || raw === '0';
};

const includeE2E =
  !process.argv.includes('--no-e2e') &&
  !npmConfigDisabled('e2e') &&
  process.env.RELEASE_PUBLIC_E2E !== '0';
const includeProd =
  !process.argv.includes('--no-prod') &&
  !npmConfigDisabled('prod') &&
  process.env.RELEASE_PUBLIC_PROD_SMOKE !== '0';

const commands = [
  ['npm', ['run', 'type-check']],
  ['npm', ['run', '-s', 'public:cache:contract:gate']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'frontend:release:ready:gate']],
  ['npm', ['run', 'smoke:pages:critical']],
  ['npm', ['run', 'smoke:images:critical']],
  ['npm', ['run', '-s', 'smoke:http:local']],
  ['npm', ['run', '-s', 'sitemap:routes:local']],
  [process.execPath, ['scripts/ci/city-data-freshness-gate.mjs', '--pages']],
];

if (includeProd) {
  commands.push(['npm', ['run', '-s', 'smoke:http:prod']]);
  commands.push(['npm', ['run', '-s', 'sitemap:routes:prod']]);
  commands.push(['npm', ['run', '-s', 'city:data:freshness:prod']]);
  commands.push(['npm', ['run', '-s', 'home:performance:prod']]);
  commands.push(['npm', ['run', '-s', 'public:performance:prod']]);
}

if (includeE2E) {
  commands.push([
    process.execPath,
    [
      './node_modules/@playwright/test/cli.js',
      'test',
      '--config=playwright.config.ts',
      'e2e/homepage.spec.ts',
      '--project=chromium',
      '--workers=1',
    ],
    {
      PLAYWRIGHT_DISABLE_WEBSERVER: '1',
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321',
      ASTRO_DEV_TOOLBAR: '0',
    },
  ]);
}

for (const [cmd, args, extraEnv] of commands) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...(extraEnv || {}),
    },
  });
  if (result.status !== 0) {
    console.error(`[release-public-gate] failed: ${cmd} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

console.log('release-public-gate: PASS');
