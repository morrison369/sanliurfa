import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredDependencies = [
  '@astrojs/mdx',
  '@astrojs/node',
  '@astrojs/partytown',
  '@astrojs/react',
  '@astrojs/sitemap',
  '@tailwindcss/vite',
  'astro',
  'astro-icon',
  'sharp',
];

const requiredDevDependencies = [
  '@astrojs/check',
  '@axe-core/playwright',
  '@playwright/test',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint',
  'eslint-plugin-astro',
  'playwright',
  'typescript',
  'vitest',
];

function hasPackage(name) {
  return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]);
}

function run(command) {
  console.log(`[ensure-astro-stack] ${command}`);
  execSync(command, { stdio: 'inherit' });
}

const missingDependencies = requiredDependencies.filter((name) => !hasPackage(name));
const missingDevDependencies = requiredDevDependencies.filter((name) => !hasPackage(name));

if (missingDependencies.length > 0) {
  run(`npm install ${missingDependencies.join(' ')}`);
}

if (missingDevDependencies.length > 0) {
  run(`npm install --save-dev ${missingDevDependencies.join(' ')}`);
}

let needsNodeAdapterUpdate = false;
try {
  const nodeAdapter = require('@astrojs/node/package.json');
  if (!String(nodeAdapter.peerDependencies?.astro || '').includes('^6.3.0')) {
    needsNodeAdapterUpdate = true;
  }
} catch {
  needsNodeAdapterUpdate = true;
}

if (needsNodeAdapterUpdate) {
  run('npm install @astrojs/node@latest');
}

try {
  const { chromium } = await import('playwright');
  const executablePath = chromium.executablePath();
  if (!fs.existsSync(executablePath)) {
    run('npx playwright install chromium');
  }
} catch {
  run('npx playwright install chromium');
}

run('npm run astro:stack:audit');
console.log('[ensure-astro-stack] PASS');
