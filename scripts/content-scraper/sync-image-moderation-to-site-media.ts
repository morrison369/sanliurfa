import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPool, query } from '../../src/lib/postgres';

type ModerationIssue = {
  severity: 'error' | 'warning';
  code: string;
  file: string;
  message: string;
};

type ModerationReport = {
  generatedAt: string;
  scanned: number;
  issueCount: number;
  issues: ModerationIssue[];
};

function loadReport(): ModerationReport | null {
  const reportPath = join(process.cwd(), 'docs', 'image-moderation-report.json');
  if (!existsSync(reportPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(reportPath, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.issues)) return null;
    return parsed as ModerationReport;
  } catch {
    return null;
  }
}

function normalizePath(file: string): string {
  const first = String(file || '').split(',')[0].trim();
  return first.startsWith('/') ? first : `/${first.replace(/^\/+/, '')}`;
}

async function main() {
  const report = loadReport();
  if (!report) {
    console.log('image moderation report bulunamadı, sync atlandı.');
    return;
  }

  const grouped = new Map<string, ModerationIssue[]>();
  for (const issue of report.issues || []) {
    const file = normalizePath(issue.file);
    const arr = grouped.get(file) || [];
    arr.push(issue);
    grouped.set(file, arr);
  }

  let updated = 0;
  for (const [url, issues] of grouped.entries()) {
    const status = issues.some((x) => x.severity === 'error') ? 'rejected' : 'warning';
    const payload = {
      status,
      issueCount: issues.length,
      issues,
      reportGeneratedAt: report.generatedAt,
      syncedAt: new Date().toISOString(),
    };
    const result = await query(
      `UPDATE site_media_assets
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('moderation', $2::jsonb),
           updated_at = NOW()
       WHERE url = $1`,
      [url, JSON.stringify(payload)],
    );
    updated += result.rowCount || 0;
  }

  await query(
    `INSERT INTO site_settings (setting_key, setting_value, description, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description, updated_at = NOW()`,
    [
      'images.moderation.lastSync',
      JSON.stringify({
        reportGeneratedAt: report.generatedAt,
        issueCount: report.issueCount,
        scanned: report.scanned,
        updatedAssets: updated,
      }),
      'Image moderation DB senkron özeti',
    ],
  );

  console.log(`image moderation sync tamamlandı: updatedAssets=${updated}`);
}

main()
  .catch((error) => {
    console.error(`image moderation sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  })
  .finally(async () => {
    await getPool().end();
  });

