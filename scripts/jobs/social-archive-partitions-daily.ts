import { pool, query } from '../../src/lib/postgres';
import { sendEmail } from '../../src/lib/email';
import { triggerWebhook } from '../../src/lib/webhooks/index';
import { runSocialArchivePartitionsJob } from './social-archive-partitions';

async function upsertSetting(
  key: string,
  value: Record<string, unknown>,
  description: string,
): Promise<void> {
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
  const startedAt = new Date().toISOString();
  try {
    const result = await runSocialArchivePartitionsJob();
    const payload = {
      success: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
    };
    await upsertSetting(
      'jobs.socialArchivePartitions.daily.lastRun',
      payload,
      'Social archive partition daily wrapper son çalışma özeti',
    );
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'social_archive_partition_daily_failed_unknown';
    const payload = {
      success: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      error: message,
    };
    await upsertSetting(
      'jobs.socialArchivePartitions.daily.lastRun',
      payload,
      'Social archive partition daily wrapper son çalışma özeti',
    );

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || '').trim();
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: '[Sanliurfa.com] Social archive partition daily job FAILED',
        text: message,
        html: `<p>Social archive partition daily job başarısız oldu.</p><pre>${message}</pre>`,
      });
    }

    try {
      await triggerWebhook('admin.social_archive.daily.failed', payload);
    } catch (webhookError) {
      console.warn(
        `social-archive-partitions-daily webhook warning: ${
          webhookError instanceof Error ? webhookError.message : String(webhookError)
        }`,
      );
    }
    console.error(`social-archive-partitions-daily failed: ${message}`);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(
      `social-archive-partitions-daily fatal: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
