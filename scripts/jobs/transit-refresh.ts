import { query, pool } from '../../src/lib/postgres';
import { collectTransportProviderSnapshots } from '../../src/lib/transport/providers';

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
  const providerSnapshots = await collectTransportProviderSnapshots();
  const healthyProviders = providerSnapshots.filter((x) => x.ok).length;
  await upsertSetting(
    'transport.lastUpdated',
    {
      updatedAt: now,
      sources: ['bus', 'flight'],
      freshnessMinutes: 60,
      note: 'Transit verileri periyodik ingest job ile güncellendi',
      providerSnapshots,
      healthyProviders,
    },
    'Otobüs/uçak veri güncellik metadatası',
  );
  console.log(`transport metadata refreshed at ${now}`);
}

main()
  .catch((error) => {
    console.error(`transport refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
