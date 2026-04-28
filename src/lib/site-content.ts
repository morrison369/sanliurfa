import { query, queryOne } from './postgres';
import { deleteCachePattern } from './cache/cache';
import { SITE_CONTENT_PRESETS } from './site-content-presets';

export interface SiteSettingRow {
  setting_key: string;
  setting_value: Record<string, any>;
  description?: string | null;
  updated_at?: string;
}

const SITE_SETTING_CACHE_TTL_MS = Number(process.env.SITE_SETTING_CACHE_TTL_MS || 30_000);
const siteSettingCache = new Map<string, { expiresAt: number; row: SiteSettingRow | null }>();
const siteSettingInflight = new Map<string, Promise<SiteSettingRow | null>>();

export type SiteAuditContext = {
  userId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function loadSiteSettingRow(key: string): Promise<SiteSettingRow | null> {
  const cached = siteSettingCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.row;
  }

  const inflight = siteSettingInflight.get(key);
  if (inflight) return inflight;

  const promise = queryOne<SiteSettingRow>(
    `SELECT setting_key, setting_value, description, updated_at
     FROM site_settings
     WHERE setting_key = $1`,
    [key],
  )
    .then((row) => {
      siteSettingCache.set(key, {
        expiresAt: Date.now() + SITE_SETTING_CACHE_TTL_MS,
        row,
      });
      return row;
    })
    .finally(() => {
      siteSettingInflight.delete(key);
    });

  siteSettingInflight.set(key, promise);
  return promise;
}

function invalidateSiteSettingMemoryCache(key: string): void {
  siteSettingCache.delete(key);
  siteSettingInflight.delete(key);
}

export async function getSiteSetting<T extends Record<string, any>>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const row = await loadSiteSettingRow(key);

    if (!row?.setting_value || typeof row.setting_value !== 'object') {
      return fallback;
    }

    return { ...fallback, ...row.setting_value } as T;
  } catch {
    // Table may not exist before migration, fail safe with fallback
    return fallback;
  }
}

export async function getSiteSettingRequired<T extends Record<string, any>>(
  key: string,
): Promise<T> {
  const fallback = SITE_CONTENT_PRESETS[0]?.settings?.[key];
  try {
    const row = await loadSiteSettingRow(key);

    if (!row?.setting_value || typeof row.setting_value !== 'object') {
      if (fallback && typeof fallback === 'object') {
        return fallback as T;
      }
      throw new Error(`site_settings kaydı zorunlu fakat bulunamadı: ${key}`);
    }

    return row.setting_value as T;
  } catch {
    if (fallback && typeof fallback === 'object') {
      return fallback as T;
    }
    throw new Error(`site_settings kaydı zorunlu fakat bulunamadı: ${key}`);
  }
}

export async function getSiteSettingDraft<T extends Record<string, any>>(
  key: string,
  fallback: T,
): Promise<T> {
  try {
    const row = await queryOne<{ setting_value: Record<string, any> }>(
      `SELECT setting_value
       FROM site_setting_drafts
       WHERE setting_key = $1`,
      [key],
    );
    if (!row?.setting_value || typeof row.setting_value !== 'object') return fallback;
    return { ...fallback, ...row.setting_value } as T;
  } catch {
    return fallback;
  }
}

export async function upsertSiteSetting(
  key: string,
  value: Record<string, any>,
  description: string | null,
  updatedBy: string | null,
): Promise<void> {
  await query(
    `
      INSERT INTO site_settings (setting_key, setting_value, description, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = COALESCE(EXCLUDED.description, site_settings.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `,
    [key, JSON.stringify(value), description, updatedBy],
  );
  await invalidateSiteCaches(key);
}

export async function saveSiteSettingDraft(
  key: string,
  value: Record<string, any>,
  note: string | null,
  updatedBy: string | null,
): Promise<void> {
  await query(
    `
      INSERT INTO site_setting_drafts (setting_key, setting_value, note, updated_by, updated_at)
      VALUES ($1, $2::jsonb, $3, $4, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `,
    [key, JSON.stringify(value), note, updatedBy],
  );
}

export async function publishSiteSetting(
  key: string,
  value: Record<string, any>,
  description: string | null,
  note: string | null,
  ctx: SiteAuditContext,
): Promise<void> {
  const versionRow = await queryOne<{ next_version: number }>(
    `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
     FROM site_setting_versions
     WHERE setting_key = $1`,
    [key],
  );
  const nextVersion = Number(versionRow?.next_version || 1);

  await upsertSiteSetting(key, value, description, ctx.userId || null);

  await query(
    `INSERT INTO site_setting_versions (setting_key, version_no, setting_value, note, changed_by)
     VALUES ($1, $2, $3::jsonb, $4, $5)`,
    [key, nextVersion, JSON.stringify(value), note, ctx.userId || null],
  );

  await query(
    `DELETE FROM site_setting_drafts WHERE setting_key = $1`,
    [key],
  );

  await auditSiteChange(key, 'publish', ctx, { version: nextVersion, note });
  await invalidateSiteCaches(key);
}

export async function rollbackSiteSetting(
  key: string,
  versionNo: number,
  ctx: SiteAuditContext,
): Promise<void> {
  const version = await queryOne<{ setting_value: Record<string, any> }>(
    `SELECT setting_value
     FROM site_setting_versions
     WHERE setting_key = $1 AND version_no = $2`,
    [key, versionNo],
  );

  if (!version?.setting_value) {
    throw new Error('Surum bulunamadi');
  }

  await publishSiteSetting(key, version.setting_value, null, `Rollback to v${versionNo}`, ctx);
  await auditSiteChange(key, 'rollback', ctx, { fromVersion: versionNo });
}

export async function listSiteSettingHistory(key: string): Promise<any[]> {
  const result = await query(
    `SELECT version_no, note, changed_by, setting_value, created_at
     FROM site_setting_versions
     WHERE setting_key = $1
     ORDER BY version_no DESC
     LIMIT 30`,
    [key],
  );
  const rows = result.rows || [];
  const withDiff = rows.map((row: any, idx: number) => {
    const prev = rows[idx + 1]?.setting_value || {};
    const curr = row.setting_value || {};
    const prevKeys = new Set(Object.keys(prev));
    const currKeys = new Set(Object.keys(curr));
    const added = Array.from(currKeys).filter((k) => !prevKeys.has(k));
    const removed = Array.from(prevKeys).filter((k) => !currKeys.has(k));
    const changed = Array.from(currKeys).filter((k) => prevKeys.has(k) && JSON.stringify(prev[k]) !== JSON.stringify(curr[k]));
    return {
      version_no: row.version_no,
      note: row.note,
      changed_by: row.changed_by,
      created_at: row.created_at,
      diff: {
        addedKeys: added,
        removedKeys: removed,
        changedKeys: changed,
      },
    };
  });
  return withDiff;
}

export async function requestSiteSettingApproval(
  key: string,
  value: Record<string, any>,
  note: string | null,
  requestedBy: string | null,
): Promise<void> {
  await query(
    `INSERT INTO site_setting_approvals (setting_key, draft_value, note, status, requested_by, created_at, updated_at)
     VALUES ($1, $2::jsonb, $3, 'pending', $4, NOW(), NOW())`,
    [key, JSON.stringify(value), note, requestedBy],
  );
}

export async function listPendingSiteSettingApprovals(key?: string): Promise<any[]> {
  const result = key
    ? await query(
        `SELECT id, setting_key, note, requested_by, created_at
         FROM site_setting_approvals
         WHERE status = 'pending' AND setting_key = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [key],
      )
    : await query(
        `SELECT id, setting_key, note, requested_by, created_at
         FROM site_setting_approvals
         WHERE status = 'pending'
         ORDER BY created_at DESC
         LIMIT 100`,
      );
  return result.rows || [];
}

export async function approveAndPublishSiteSetting(
  approvalId: string,
  approverUserId: string | null,
  ctx: SiteAuditContext,
): Promise<{ key: string }> {
  const approval = await queryOne<{ id: string; setting_key: string; draft_value: Record<string, any>; note: string | null }>(
    `SELECT id, setting_key, draft_value, note
     FROM site_setting_approvals
     WHERE id = $1 AND status = 'pending'`,
    [approvalId],
  );
  if (!approval) throw new Error('Onay kaydı bulunamadı');

  await publishSiteSetting(approval.setting_key, approval.draft_value || {}, null, approval.note || null, ctx);
  await query(
    `UPDATE site_setting_approvals
     SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [approvalId, approverUserId],
  );
  return { key: approval.setting_key };
}

export async function auditSiteChange(
  key: string,
  action: 'draft_save' | 'publish' | 'rollback' | 'media_import' | 'social_abuse',
  ctx: SiteAuditContext,
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    await query(
      `INSERT INTO site_change_audit (setting_key, action, actor_user_id, actor_email, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7::jsonb)`,
      [
        key,
        action,
        ctx.userId || null,
        ctx.actorEmail || null,
        ctx.ipAddress || null,
        ctx.userAgent || null,
        JSON.stringify(metadata),
      ],
    );
  } catch {
    // auditing should not block response path
  }
}

export async function invalidateSiteCaches(key: string): Promise<void> {
  invalidateSiteSettingMemoryCache(key);
  const patterns = ['homepage:*'];
  if (key.startsWith('header.') || key.startsWith('footer.')) {
    patterns.push('layout:*');
  }
  for (const pattern of patterns) {
    await deleteCachePattern(pattern);
  }
}
