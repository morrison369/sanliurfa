import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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
  const root = process.cwd();
  const candidates = [
    path.join(root, '.env.production'),
    path.join(root, '.env.local'),
    path.join(root, '.env'),
  ];
  for (const candidate of candidates) loadEnvFile(candidate);
}

async function upsertSetting(
  query: <T = any>(text: string, params?: any[]) => Promise<T>,
  key: string,
  value: Record<string, unknown>,
  description: string,
) {
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
  loadRuntimeEnv();

  const { query, pool } = await import('../../src/lib/postgres');
  const { getSanliurfaWeather } = await import('../../src/lib/weather/open-meteo');
  const now = new Date().toISOString();
  let payload: any;
  let fromCache = false;
  let upstreamError: string | null = null;

  try {
    const result = await getSanliurfaWeather({ forceRefresh: true });
    payload = result.payload;
    fromCache = result.fromCache;
  } catch (error) {
    upstreamError = error instanceof Error ? error.message : String(error);
    const previous = await query<{ setting_value: Record<string, any> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'weather.lastUpdated' LIMIT 1`,
    );
    const previousValue = previous?.rows?.[0]?.setting_value || {};
    payload = {
      fetchedAt: previousValue.updatedAt || now,
      source: previousValue.source || 'open-meteo',
      location: previousValue.location || {
        name: 'Şanlıurfa',
        latitude: 37.1674,
        longitude: 38.7955,
        timezone: 'Europe/Istanbul',
      },
      current: previousValue.current || {
        temperature: null,
        feelsLike: null,
        humidity: null,
        windSpeed: null,
        visibilityKm: null,
        uvIndex: null,
        weatherCode: null,
        weatherLabel: 'Güncel',
      },
      forecast: previousValue.forecast || [],
    };
    fromCache = true;
  }

  await upsertSetting(
    query,
    'weather.lastUpdated',
    {
      updatedAt: now,
      source: payload.source,
      fromCache,
      upstreamError,
      location: payload.location,
      current: payload.current,
      forecast: payload.forecast || [],
    },
    'Şanlıurfa hava durumu tazeleme metadatası',
  );

  console.log(
    `weather metadata refreshed at ${now} (fromCache=${fromCache ? '1' : '0'}${upstreamError ? `, upstreamError=${upstreamError}` : ''})`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error(`weather refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
