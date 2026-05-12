#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type SiteSettingRow = {
  setting_key: string;
  setting_value: Record<string, unknown> | null;
};

const ROOT = process.cwd();

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadRuntimeEnv() {
  const candidates = [
    path.join(ROOT, '.env.production'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
}

async function main() {
  loadRuntimeEnv();

  const [{ pool, query }, { validateSiteSetting }, { validateSiteSettingWithZod }] = await Promise.all([
    import('../../src/lib/postgres'),
    import('../../src/lib/site-settings-schema'),
    import('../../src/lib/site-settings-zod'),
  ]);

  const requiredKeys = [
    'homepage.hero',
    'homepage.mainCta',
    'homepage.cta',
    'homepage.sectionOrder',
    'homepage.theme',
    'header.utilityLinks',
    'homepage.primaryActions',
    'homepage.mvpQuickStart',
    'homepage.quickCategories',
    'homepage.featuredGuides',
    'homepage.faq',
    'homepage.heroQuickLinks',
    'homepage.liveStatusCards',
    'homepage.serviceQuickLinks',
    'homepage.communityPanel',
    'homepage.trendingFallbackQueries',
    'homepage.sections',
    'homepage.sectionStyles',
    'footer.links',
    'reviews.antiSpam',
  ];

  const result = await query<SiteSettingRow>(
    `SELECT setting_key, setting_value
     FROM site_settings
     WHERE setting_key = ANY($1::text[])`,
    [requiredKeys],
  );

  const failures: string[] = [];
  const existingKeys = new Set(result.rows.map((row) => row.setting_key));
  const missingKeys = requiredKeys.filter((key) => !existingKeys.has(key));
  for (const key of missingKeys) failures.push(`${key}: missing in site_settings`);

  for (const row of result.rows) {
    const value = row.setting_value ?? {};
    const base = validateSiteSetting(row.setting_key, value);
    if (!base.ok) {
      failures.push(`${row.setting_key}: ${base.error}`);
      continue;
    }
    const zod = validateSiteSettingWithZod(row.setting_key, value);
    if (!zod.ok) failures.push(`${row.setting_key}: ${zod.error}`);
  }

  console.log('site-settings schema smoke');
  console.log(` - checked: ${result.rows.length}`);
  console.log(` - failed: ${failures.length}`);
  if (failures.length > 0) {
    console.error('FAILED: invalid site settings detected');
    for (const failure of failures.slice(0, 20)) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('OK: site settings schema valid');

  await pool.end();
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
