import { query, pool } from '../../src/lib/postgres';

function parseDays(value: string | undefined, fallback: number): number {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(3650, Math.trunc(n)));
}

async function main() {
  const socialDays = parseDays(process.env.SOCIAL_EVENTS_RETENTION_DAYS, 90);
  const lifecycleDays = parseDays(process.env.PLACE_LIFECYCLE_RETENTION_DAYS, 365);
  const archiveDays = parseDays(process.env.SOCIAL_EVENTS_ARCHIVE_DAYS, socialDays);
  const tenantId = (process.env.SOCIAL_DEFAULT_TENANT_ID || 'default').trim() || 'default';

  const archiveInsert = await query(
    `INSERT INTO social_event_store_archive
      (id, tenant_id, event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at)
     SELECT id, COALESCE(tenant_id, $2), event_type, actor_user_id, target_user_id, conversation_id, metadata, created_at
     FROM social_event_store
     WHERE created_at < NOW() - ($1::text || ' days')::interval
     ON CONFLICT DO NOTHING`,
    [String(archiveDays), tenantId],
  ).catch(() => ({ rowCount: 0 } as any));

  const socialDelete = await query(
    `DELETE FROM social_event_store
     WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [String(archiveDays)],
  );
  const lifecycleDelete = await query(
    `DELETE FROM place_lifecycle_events
     WHERE created_at < NOW() - ($1::text || ' days')::interval`,
    [String(lifecycleDays)],
  );

  const payload = {
    success: true,
    tenantId,
    archiveDays,
    socialRetentionDays: socialDays,
    lifecycleRetentionDays: lifecycleDays,
    archivedSocialEvents: archiveInsert.rowCount ?? 0,
    deletedSocialEvents: socialDelete.rowCount ?? 0,
    deletedLifecycleEvents: lifecycleDelete.rowCount ?? 0,
    at: new Date().toISOString(),
  };

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
    [
      'jobs.socialRetention.lastRun',
      JSON.stringify(payload),
      'Social event retention/archive job son çalışma özeti',
    ],
  );

  console.log(
    JSON.stringify(payload, null, 2),
  );
}

main()
  .catch((error) => {
    console.error(`social-event-retention failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
