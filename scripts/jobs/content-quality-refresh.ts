#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { query, pool } from '../../src/lib/postgres';

function runStep(cmd: string) {
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

function safeReadJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  runStep('npm run -s images:quality');
  runStep('npm run -s images:moderate');
  runStep('npm run -s content:cluster:quality');
  runStep('npm run -s content:programmatic:quality');
  runStep('npm run -s categories:gap:report');

  const docsDir = resolve(process.cwd(), 'docs');
  const categoryGap = safeReadJson(resolve(docsDir, 'category-gap-report.json'));
  const imageModeration = safeReadJson(resolve(docsDir, 'image-moderation-report.json'));
  const clusterQuality = safeReadJson(resolve(docsDir, 'content-cluster-quality-report.json'));
  const programmaticQuality = safeReadJson(resolve(docsDir, 'content-programmatic-quality-report.json'));

  const summary = {
    at: new Date().toISOString(),
    categoryGap: {
      missingMekanSlugsInDb: categoryGap?.gaps?.missingMekanSlugsInDb?.length || 0,
      missingOnHomepageQuick: categoryGap?.gaps?.missingOnHomepageQuick?.length || 0,
    },
    imageModeration: {
      flaggedCount: imageModeration?.summary?.flaggedCount || 0,
      reviewedCount: imageModeration?.summary?.reviewedCount || 0,
    },
    contentClusterQuality: {
      status: clusterQuality?.status || 'unknown',
      criticalCount: clusterQuality?.summary?.criticalCount || 0,
    },
    contentProgrammaticQuality: {
      status: programmaticQuality?.status || 'unknown',
      criticalCount: programmaticQuality?.summary?.criticalCount || 0,
    },
  };

  await query(
    `INSERT INTO site_settings (setting_key, setting_value, description, updated_at)
     VALUES ('jobs.contentQuality.lastRun', $1::jsonb, 'Nightly content/image quality summary', NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
    [JSON.stringify(summary)],
  );

  console.log(JSON.stringify({ success: true, ...summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
