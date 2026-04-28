import { queryOne, pool } from '../../src/lib/postgres';

async function main() {
  const row = await queryOne<{ setting_value: Record<string, any> }>(
    `SELECT setting_value FROM site_settings WHERE setting_key = 'transport.lastUpdated' LIMIT 1`,
  );
  if (!row?.setting_value) {
    console.error('FAILED: transport.lastUpdated kaydı bulunamadı');
    process.exit(1);
  }
  const updatedAt = row.setting_value.updatedAt;
  const freshnessMinutes = Number(row.setting_value.freshnessMinutes || 60);
  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Number.POSITIVE_INFINITY;
  const stale = !updatedAt || ageMs > freshnessMinutes * 60 * 1000;
  console.log('transport freshness smoke');
  console.log(` - updatedAt: ${updatedAt || 'null'}`);
  console.log(` - freshnessMinutes: ${freshnessMinutes}`);
  console.log(` - stale: ${stale}`);
  if (stale) {
    console.error('FAILED: transport metadata stale');
    process.exit(1);
  }
  console.log('OK: transport metadata fresh');
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
