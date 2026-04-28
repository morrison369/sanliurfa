#!/usr/bin/env node
import { pool, query } from '../../src/lib/postgres';
import { validateSiteSetting } from '../../src/lib/site-settings-schema';
import { validateSiteSettingWithZod } from '../../src/lib/site-settings-zod';

type SiteSettingRow = {
  setting_key: string;
  setting_value: Record<string, unknown> | null;
};

async function main() {
  const requiredKeys = [
    'homepage.hero',
    'homepage.mainCta',
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
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
