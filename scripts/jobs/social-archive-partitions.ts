import { query, pool } from '../../src/lib/postgres';
import { pathToFileURL } from 'node:url';

function parseNum(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function ym(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
}

function addMonths(date: Date, n: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1, 0, 0, 0));
}

async function ensurePartition(fromDate: Date, toDate: Date) {
  const partName = `social_event_store_archive_${ym(fromDate)}`;
  const from = fromDate.toISOString();
  const to = toDate.toISOString();
  await query(`
    CREATE TABLE IF NOT EXISTS ${partName}
    PARTITION OF social_event_store_archive
    FOR VALUES FROM ('${from}'::timestamptz) TO ('${to}'::timestamptz)
  `);
  return partName;
}

async function dropOldPartitions(keepMonths: number) {
  const threshold = addMonths(monthStart(new Date()), -keepMonths).toISOString();
  const candidates = await query(
    `SELECT c.relname AS partition_name, pg_get_expr(c.relpartbound, c.oid) AS bound
     FROM pg_class c
     JOIN pg_inherits i ON i.inhrelid = c.oid
     JOIN pg_class p ON p.oid = i.inhparent
     WHERE p.relname = 'social_event_store_archive'
       AND c.relname LIKE 'social_event_store_archive_%'
       AND c.relname <> 'social_event_store_archive_default'`,
  );

  const dropped: string[] = [];
  for (const row of candidates.rows) {
    const bound = String(row.bound || '');
    const match = bound.match(/FROM \('([^']+)'\) TO \('([^']+)'\)/);
    const toValue = match?.[2];
    if (!toValue) continue;
    if (new Date(toValue).toISOString() < threshold) {
      const partition = String(row.partition_name);
      await query(`DROP TABLE IF EXISTS ${partition} CASCADE`);
      dropped.push(partition);
    }
  }
  return dropped;
}

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

export async function runSocialArchivePartitionsJob() {
  const createAheadMonths = parseNum(process.env.SOCIAL_ARCHIVE_CREATE_AHEAD_MONTHS, 3, 1, 24);
  const keepMonths = parseNum(process.env.SOCIAL_ARCHIVE_KEEP_MONTHS, 24, 1, 120);

  const created: string[] = [];
  const base = monthStart(new Date());
  for (let i = 0; i < createAheadMonths; i++) {
    const from = addMonths(base, i);
    const to = addMonths(base, i + 1);
    const partition = await ensurePartition(from, to);
    created.push(partition);
  }

  const dropped = await dropOldPartitions(keepMonths);

  const payload = {
    success: true,
    createAheadMonths,
    keepMonths,
    created,
    dropped,
    at: new Date().toISOString(),
  };

  await upsertSetting(
    'jobs.socialArchivePartitions.lastRun',
    payload,
    'Social archive partition maintenance job son çalışma özeti',
  );

  console.log(JSON.stringify(payload, null, 2));
}

const isMain = process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false;
if (isMain) {
  runSocialArchivePartitionsJob()
    .catch((error) => {
      console.error(
        `social-archive-partitions failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
