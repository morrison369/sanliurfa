import { getSanliurfaWeather } from '../../src/lib/weather/open-meteo';
import { query, pool } from '../../src/lib/postgres';

async function upsertSetting(key: string, value: Record<string, unknown>, description: string) {
  await query(
    `
    INSERT INTO site_settings (setting_key, setting_value, description, updated_at)
    VALUES ($1, $2::jsonb, $3, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      description = EXCLUDED.description,
      updated_at = NOW()
    `,
    [key, JSON.stringify(value), description],
  );
}

async function main() {
  const now = new Date().toISOString();
  const { payload, fromCache } = await getSanliurfaWeather({ forceRefresh: true });

  await upsertSetting(
    'weather.lastUpdated',
    {
      updatedAt: now,
      source: payload.source,
      fromCache,
      location: payload.location,
      current: payload.current,
    },
    'Şanlıurfa hava durumu tazeleme metadatası',
  );

  console.log(`weather metadata refreshed at ${now} (fromCache=${fromCache ? '1' : '0'})`);
}

main()
  .catch((error) => {
    console.error(`weather refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

