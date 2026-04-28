#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

function main() {
  run('npm run -s categories:gap:report');
  const reportPath = resolve(process.cwd(), 'docs', 'category-gap-report.json');
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));

  const missingMekan = Number(report?.gaps?.missingMekanSlugsInDb?.length || 0);
  const missingQuick = Number(report?.gaps?.missingOnHomepageQuick?.length || 0);
  const dbAvailable = Boolean(report?.database?.available);

  if (!dbAvailable || missingMekan > 0 || missingQuick > 0) {
    console.error('[category-coverage-gate] FAILED');
    console.error(` - dbAvailable: ${dbAvailable}`);
    console.error(` - missingMekanSlugsInDb: ${missingMekan}`);
    console.error(` - missingOnHomepageQuick: ${missingQuick}`);
    process.exit(1);
  }

  console.log('[category-coverage-gate] ok');
}

try {
  main();
} catch (error) {
  console.error(`[category-coverage-gate] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
