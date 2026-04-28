#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};
const sentryDeps = Object.keys(deps).filter((name) => name.startsWith('@sentry/'));
const activePaths = [
  'astro.config.mjs',
  'src',
  'scripts',
  'sentry.client.config.ts',
  'sentry.server.config.ts',
].map((item) => path.join(root, item));

const offenders = [];
if (sentryDeps.length > 0) offenders.push(`package deps: ${sentryDeps.join(', ')}`);

function scanFile(filePath) {
  const relPath = path.relative(root, filePath).replaceAll('\\', '/');
  if (relPath === 'scripts/ci/no-sentry-gate.mjs') return;
  const content = readFileSync(filePath, 'utf8');
  if (/@sentry\/|SENTRY_DSN|sentry\.io|Sentry\./.test(content)) {
    offenders.push(relPath);
  }
}

function walk(entry) {
  if (!existsSync(entry)) return;
  const stat = statSync(entry);
  if (stat.isDirectory()) {
    for (const child of readdirSync(entry)) {
      if (child === 'node_modules' || child === 'dist' || child === '.git') continue;
      walk(path.join(entry, child));
    }
    return;
  }
  if (/\.(ts|tsx|js|mjs|astro|cjs|json)$/.test(entry)) scanFile(entry);
}

for (const activePath of activePaths) walk(activePath);

if (offenders.length > 0) {
  console.error(`Sentry yasak: ${offenders.join(', ')}`);
  process.exit(1);
}

console.log('[no-sentry-gate] ok');
