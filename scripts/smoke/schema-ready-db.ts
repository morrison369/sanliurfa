#!/usr/bin/env node
import { query, pool } from '../../src/lib/postgres';

const REQUIRED_TABLES = [
  'site_settings',
  'site_change_audit',
  'tenant_social_policies',
  'conversations',
  'direct_messages',
];

async function main() {
  const result = await query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'`,
  );
  const existing = new Set(result.rows.map((row) => row.table_name));
  const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

  console.log('schema-ready db smoke');
  console.log(` - required: ${REQUIRED_TABLES.length}`);
  console.log(` - missing: ${missing.length}`);
  if (missing.length > 0) {
    console.error(`FAILED: missing tables => ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('OK: schema ready');
}

main()
  .catch((error) => {
    console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
