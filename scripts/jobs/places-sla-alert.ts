import { query, pool } from '../../src/lib/postgres';
import { sendEmail } from '../../src/lib/email';
import { getPendingSlaHours } from '../../src/lib/place/lifecycle-events';

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
  const slaHours = getPendingSlaHours();
  const cooldownHoursRaw = Number(process.env.PLACE_SLA_ALERT_COOLDOWN_HOURS || 24);
  const cooldownHours = Number.isFinite(cooldownHoursRaw)
    ? Math.max(1, Math.min(168, Math.trunc(cooldownHoursRaw)))
    : 24;
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || '').trim();

  const summaryResult = await query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
      COUNT(*) FILTER (WHERE status = 'needs_info')::int AS needs_info_count,
      COUNT(*) FILTER (
        WHERE status = 'pending' AND created_at < NOW() - ($1::text || ' hours')::interval
      )::int AS pending_breached_count
     FROM places
     WHERE owner_id IS NOT NULL`,
    [String(slaHours)],
  );

  const breachedResult = await query(
    `SELECT id, name, created_at
     FROM places
     WHERE status = 'pending'
       AND created_at < NOW() - ($1::text || ' hours')::interval
     ORDER BY created_at ASC
     LIMIT 20`,
    [String(slaHours)],
  );
  const breachedIds = breachedResult.rows.map((x: any) => String(x.id));
  let unsentBreached = breachedResult.rows;
  if (breachedIds.length) {
    const stateResult = await query(
      `SELECT place_id, last_alert_at
       FROM place_sla_alert_state
       WHERE place_id = ANY($1)
         AND last_alert_at >= NOW() - ($2::text || ' hours')::interval`,
      [breachedIds, String(cooldownHours)],
    );
    const muted = new Set(stateResult.rows.map((x: any) => String(x.place_id)));
    unsentBreached = breachedResult.rows.filter((x: any) => !muted.has(String(x.id)));
  }

  const summary = summaryResult.rows[0] || {
    pending_count: 0,
    needs_info_count: 0,
    pending_breached_count: 0,
  };

  if (unsentBreached.length) {
    const idsToUpsert = unsentBreached.map((x: any) => String(x.id));
    await query(
      `INSERT INTO place_sla_alert_state (place_id, last_alert_at, updated_at)
       SELECT UNNEST($1::uuid[]), NOW(), NOW()
       ON CONFLICT (place_id)
       DO UPDATE SET last_alert_at = NOW(), updated_at = NOW()`,
      [idsToUpsert],
    );
  }

  const payload = {
    success: true,
    slaHours,
    cooldownHours,
    summary,
    breachedCount: breachedResult.rows.length,
    alertedCount: unsentBreached.length,
    at: new Date().toISOString(),
  };

  if (adminEmail && unsentBreached.length > 0) {
    const rowsHtml = unsentBreached
      .map(
        (x: any) =>
          `<li><strong>${String(x.name || x.id)}</strong> — ${new Date(x.created_at).toLocaleString('tr-TR')}</li>`,
      )
      .join('');
    await sendEmail({
      to: adminEmail,
      subject: `[Sanliurfa.com] Mekan SLA İhlali (${summary.pending_breached_count})`,
      html: `
        <h2>Mekan Lifecycle SLA İhlali</h2>
        <p>Pending SLA: <strong>${slaHours} saat</strong></p>
        <p>Pending: <strong>${summary.pending_count}</strong></p>
        <p>Needs Info: <strong>${summary.needs_info_count}</strong></p>
        <p>İhlal: <strong>${summary.pending_breached_count}</strong></p>
        <h3>İlk 20 Kayıt</h3>
        <ul>${rowsHtml || '<li>Kayıt yok</li>'}</ul>
      `,
      text: `SLA ihlali: ${summary.pending_breached_count}, pending: ${summary.pending_count}, needs_info: ${summary.needs_info_count}`,
    });
  }

  await upsertSetting(
    'jobs.placesSlaAlert.lastRun',
    payload,
    'Place lifecycle SLA alert job son çalışma özeti',
  );

  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(`places-sla-alert failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
