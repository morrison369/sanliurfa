#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const includeBuild = process.argv.includes('--build');

const steps = [
  ['npm', ['run', '-s', 'smoke:city-content:acceptance']],
  ['npm', ['run', '-s', 'public:city:structure:gate']],
  ['npm', ['run', '-s', 'public:theme:surface:gate']],
  ['npm', ['run', '-s', 'docs:terminology:gate']],
  ['npm', ['run', '-s', 'smoke:city-content-agents']],
  ['npm', ['run', '-s', 'seo:geo:gate']],
  ['npm', ['run', '-s', 'seo:internal-links:report']],
  ['npx', ['astro', 'check', '--minimumFailingSeverity', 'error']],
];

if (includeBuild) {
  steps.push(['npm', ['run', '-s', 'build']]);
}

for (const [command, args] of steps) {
  const label = `${command} ${args.join(' ')}`;
  console.log(`[public-city-gate] running: ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[public-city-gate] failed: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log(
  includeBuild
    ? '[public-city-gate] ok: public city acceptance, city agents, SEO/GEO, internal links, Astro check and build passed'
    : '[public-city-gate] ok: public city acceptance, city agents, SEO/GEO, internal links and Astro check passed',
);
