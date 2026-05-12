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
  const { getTransportStatusSnapshot } = await import('../../src/lib/transport/status');
  const snapshot = await getTransportStatusSnapshot();

  await upsertSetting(
    query,
    'transport.lastUpdated',
    {
      updatedAt: new Date().toISOString(),
      sources: snapshot.sources,
      freshnessMinutes: 60,
      note: 'Transit verileri periyodik ingest job ile güncellendi',
      providerSnapshots: snapshot.providerSnapshots,
      healthyProviders: snapshot.healthyProviders,
      busRoutesCount: snapshot.busRoutesCount,
      busSchedulesCount: snapshot.busSchedulesCount,
      nextBus: snapshot.nextBus,
    },
    'Otobüs/uçak veri güncellik metadatası',
  );

  console.log(
    `transport metadata refreshed: providers=${snapshot.healthyProviders}/${snapshot.providerSnapshots.length} busRoutes=${snapshot.busRoutesCount} busSchedules=${snapshot.busSchedulesCount}`,
  );

  await pool.end();
}

main().catch((error) => {
  console.error(`transport refresh failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
