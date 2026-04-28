import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { safeErrorDetail } from '../../../lib/api';

const REQUIRED_TABLES = [
  'site_settings',
  'site_change_audit',
  'tenant_social_policies',
  'conversations',
  'direct_messages',
];

export const GET: APIRoute = async () => {
  try {
    const result = await query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'`,
    );
    const existing = new Set(result.rows.map((row) => row.table_name));
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));
    const ready = missing.length === 0;

    return new Response(
      JSON.stringify({
        status: ready ? 'ready' : 'not_ready',
        requiredTables: REQUIRED_TABLES,
        missingTables: missing,
        checkedAt: new Date().toISOString(),
      }),
      {
        status: ready ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        error: safeErrorDetail(error, 'schema check failed'),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
