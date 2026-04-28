#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scopeArg = process.argv.find((arg) => arg.startsWith('--scope='));
const scope = (scopeArg ? scopeArg.split('=')[1] : 'all').toLowerCase();

const scopeSteps = {
  core: ['npm run astro:sync', 'npm run type-check'],
  content: [
    'npm run images:check-external',
    'npm run images:validate',
    'npm run images:quality',
    'npm run images:moderate',
    'npm run categories:coverage:gate',
    'npm run content:cluster:quality',
    'npm run content:programmatic:quality',
  ],
  social: ['npm run social:db:first:gate', 'npm run social:core:gate', 'npm run smoke:api:critical'],
  landing: ['npm run smoke:pages:critical', 'npm run seo:geo:gate', 'npm run canonical:domain:gate'],
  security: ['npm run env:gate', 'npm run security:scan-secrets', 'npm run security:defaults:gate'],
  release: [
    'npm run type-check',
    'npm run build',
    'npm run db:migrate:check-duplicates',
    'npm run test:api-contract:coverage',
    'npm run openapi:sync:routes:gate',
    'npm run problemjson:strict',
  ],
};

const allOrder = ['core', 'content', 'social', 'landing', 'security', 'release'];

function run(cmd) {
  console.log(`[targeted-batch] ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

function resolveScopes(value) {
  if (value === 'all') return allOrder;
  if (value === 'release-lite') return ['core', 'security', 'release'];
  const parsed = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parsed.length === 0) return allOrder;
  for (const key of parsed) {
    if (!(key in scopeSteps)) {
      throw new Error(
        `unknown scope: ${key}. valid scopes: ${Object.keys(scopeSteps).join(', ')}, all, release-lite`,
      );
    }
  }
  return parsed;
}

let exitCode = 0;

try {
  const selected = resolveScopes(scope);
  console.log(`[targeted-batch] scopes=${selected.join(',')}`);
  for (const key of selected) {
    for (const step of scopeSteps[key]) run(step);
  }
  console.log('[targeted-batch] completed');
} catch (error) {
  exitCode = 1;
  console.error(`[targeted-batch] ${error instanceof Error ? error.message : 'unknown error'}`);
} finally {
  run('npm run -s dev:isolated:stop');
  run('npm run -s runtime:cleanup:listeners');
  run('npm run -s dev:isolated:check-no-orphan');
}

process.exit(exitCode);
