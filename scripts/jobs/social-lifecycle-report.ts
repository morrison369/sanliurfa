import { query, queryOne, pool } from '../../src/lib/postgres';
import { sendEmail } from '../../src/lib/email';

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
  const hoursRaw = Number(process.env.SOCIAL_LIFECYCLE_REPORT_HOURS || 24);
  const hours = Number.isFinite(hoursRaw) ? Math.max(1, Math.min(720, Math.trunc(hoursRaw))) : 24;
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.FROM_EMAIL || '').trim();

  const [eventsByType, lifecycleByStatus, pendingRow] = await Promise.all([
    query(
      `SELECT event_type, COUNT(*)::int AS count
       FROM social_event_store
       WHERE created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY event_type
       ORDER BY count DESC`,
      [String(hours)],
    ),
    query(
      `SELECT to_status, COUNT(*)::int AS count
       FROM place_lifecycle_events
       WHERE created_at >= NOW() - ($1::text || ' hours')::interval
       GROUP BY to_status
       ORDER BY count DESC`,
      [String(hours)],
    ),
    queryOne(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'needs_info')::int AS needs_info_count
       FROM places
       WHERE owner_id IS NOT NULL`,
    ),
  ]);

  const payload = {
    success: true,
    windowHours: hours,
    generatedAt: new Date().toISOString(),
    eventsByType: eventsByType.rows,
    lifecycleByStatus: lifecycleByStatus.rows,
    pendingSnapshot: pendingRow || { pending_count: 0, needs_info_count: 0 },
  };

  await upsertSetting(
    'jobs.socialLifecycleReport.lastRun',
    payload,
    'Social + lifecycle rapor job son çalışma özeti',
  );

  if (adminEmail) {
    const socialList = eventsByType.rows
      .slice(0, 10)
      .map((x: any) => `<li>${x.event_type}: <strong>${x.count}</strong></li>`)
      .join('');
    const lifecycleList = lifecycleByStatus.rows
      .slice(0, 10)
      .map((x: any) => `<li>${x.to_status}: <strong>${x.count}</strong></li>`)
      .join('');

    await sendEmail({
      to: adminEmail,
      subject: `[Sanliurfa.com] Social/Lifecycle Rapor (${hours}s)`,
      html: `
        <h2>Social + Lifecycle Raporu</h2>
        <p>Zaman penceresi: <strong>${hours} saat</strong></p>
        <h3>Sosyal Event Dağılımı</h3>
        <ul>${socialList || '<li>Veri yok</li>'}</ul>
        <h3>Lifecycle Geçiş Dağılımı</h3>
        <ul>${lifecycleList || '<li>Veri yok</li>'}</ul>
        <h3>Snapshot</h3>
        <p>Pending: ${payload.pendingSnapshot.pending_count} | Needs Info: ${payload.pendingSnapshot.needs_info_count}</p>
      `,
      text: `Social/Lifecycle rapor (${hours}s) oluşturuldu.`,
    });
  }

  console.log(JSON.stringify(payload, null, 2));
}

main()
  .catch((error) => {
    console.error(`social-lifecycle-report failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

