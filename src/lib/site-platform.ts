import { query, queryOne } from './postgres';
import { auditSiteChange, type SiteAuditContext } from './site-content';

export type HomepageSectionRow = {
  id: string;
  section_key: string;
  title: string;
  description?: string | null;
  config: Record<string, any>;
  is_active: boolean;
  sort_order: number;
};

export type SiteServiceEntryRow = {
  id: string;
  service_key: string;
  service_group: string;
  title: string;
  slug: string;
  summary?: string | null;
  href: string;
  icon?: string | null;
  badge?: string | null;
  freshness_key?: string | null;
  payload: Record<string, any>;
  is_active: boolean;
  sort_order: number;
};

export type SeoOverrideRow = {
  id: string;
  entity_type: string;
  entity_key: string;
  canonical_path: string;
  seo_payload: Record<string, any>;
  is_active: boolean;
};

export type SiteMediaAssetRow = {
  id: string;
  asset_key: string;
  url: string;
  alt?: string | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export type SiteMediaUsageRow = {
  id: string;
  asset_key: string;
  entity_type: string;
  entity_key: string;
  placement_key: string;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export async function listHomepageSections(): Promise<HomepageSectionRow[]> {
  const result = await query<HomepageSectionRow>(
    `SELECT id, section_key, title, description, config, is_active, sort_order
     FROM homepage_sections
     ORDER BY sort_order ASC, section_key ASC`,
  );
  return result.rows;
}

export async function listActiveHomepageSections(): Promise<HomepageSectionRow[]> {
  const rows = await listHomepageSections();
  return rows.filter((row) => row.is_active);
}

export async function upsertHomepageSection(
  section: Partial<HomepageSectionRow> &
    Pick<HomepageSectionRow, 'section_key' | 'title'>,
  ctx: SiteAuditContext,
): Promise<HomepageSectionRow> {
  const id = section.id || crypto.randomUUID();
  const row = await queryOne<HomepageSectionRow>(
    `INSERT INTO homepage_sections (
        id, section_key, title, description, config, is_active, sort_order, updated_at
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,NOW())
      ON CONFLICT (section_key)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        config = EXCLUDED.config,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id, section_key, title, description, config, is_active, sort_order`,
    [
      id,
      section.section_key,
      section.title,
      section.description || null,
      JSON.stringify(section.config || {}),
      section.is_active ?? true,
      section.sort_order ?? 0,
    ],
  );

  await auditSiteChange(`homepage-section:${section.section_key}`, 'publish', ctx, {
    title: section.title,
    active: section.is_active ?? true,
    sortOrder: section.sort_order ?? 0,
  });

  if (!row) throw new Error('Homepage section write failed');
  return row;
}

export async function deleteHomepageSection(
  sectionKey: string,
  ctx: SiteAuditContext,
): Promise<void> {
  await query(`DELETE FROM homepage_sections WHERE section_key = $1`, [sectionKey]);
  await auditSiteChange(`homepage-section:${sectionKey}`, 'publish', ctx, { action: 'delete' });
}

export async function listSiteServiceEntries(group?: string): Promise<SiteServiceEntryRow[]> {
  const result = group
    ? await query<SiteServiceEntryRow>(
        `SELECT id, service_key, service_group, title, slug, summary, href, icon, badge, freshness_key, payload, is_active, sort_order
         FROM site_service_entries
         WHERE service_group = $1
         ORDER BY sort_order ASC, title ASC`,
        [group],
      )
    : await query<SiteServiceEntryRow>(
        `SELECT id, service_key, service_group, title, slug, summary, href, icon, badge, freshness_key, payload, is_active, sort_order
         FROM site_service_entries
         ORDER BY service_group ASC, sort_order ASC, title ASC`,
      );
  return result.rows;
}

export async function listActiveSiteServiceEntries(group?: string): Promise<SiteServiceEntryRow[]> {
  const rows = await listSiteServiceEntries(group);
  return rows.filter((row) => row.is_active);
}

export async function upsertSiteServiceEntry(
  entry: Partial<SiteServiceEntryRow> & Pick<SiteServiceEntryRow, 'service_key' | 'service_group' | 'title' | 'slug' | 'href'>,
  ctx: SiteAuditContext,
): Promise<SiteServiceEntryRow> {
  const id = entry.id || crypto.randomUUID();
  const row = await queryOne<SiteServiceEntryRow>(
    `INSERT INTO site_service_entries (
        id, service_key, service_group, title, slug, summary, href, icon, badge, freshness_key, payload, is_active, sort_order, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,NOW())
      ON CONFLICT (service_key)
      DO UPDATE SET
        service_group = EXCLUDED.service_group,
        title = EXCLUDED.title,
        slug = EXCLUDED.slug,
        summary = EXCLUDED.summary,
        href = EXCLUDED.href,
        icon = EXCLUDED.icon,
        badge = EXCLUDED.badge,
        freshness_key = EXCLUDED.freshness_key,
        payload = EXCLUDED.payload,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id, service_key, service_group, title, slug, summary, href, icon, badge, freshness_key, payload, is_active, sort_order`,
    [
      id,
      entry.service_key,
      entry.service_group,
      entry.title,
      entry.slug,
      entry.summary || null,
      entry.href,
      entry.icon || null,
      entry.badge || null,
      entry.freshness_key || null,
      JSON.stringify(entry.payload || {}),
      entry.is_active ?? true,
      entry.sort_order ?? 0,
    ],
  );

  await auditSiteChange(`service:${entry.service_key}`, 'publish', ctx, {
    group: entry.service_group,
    href: entry.href,
  });

  if (!row) throw new Error('Service entry write failed');
  return row;
}

export async function deleteSiteServiceEntry(serviceKey: string, ctx: SiteAuditContext): Promise<void> {
  await query(`DELETE FROM site_service_entries WHERE service_key = $1`, [serviceKey]);
  await auditSiteChange(`service:${serviceKey}`, 'publish', ctx, { action: 'delete' });
}

export async function listSeoOverrides(entityType?: string): Promise<SeoOverrideRow[]> {
  const result = entityType
    ? await query<SeoOverrideRow>(
        `SELECT id, entity_type, entity_key, canonical_path, seo_payload, is_active
         FROM seo_overrides
         WHERE entity_type = $1
         ORDER BY entity_key ASC`,
        [entityType],
      )
    : await query<SeoOverrideRow>(
        `SELECT id, entity_type, entity_key, canonical_path, seo_payload, is_active
         FROM seo_overrides
         ORDER BY entity_type ASC, entity_key ASC`,
      );
  return result.rows;
}

export async function getSeoOverride(
  entityType: string,
  entityKey: string,
): Promise<SeoOverrideRow | null> {
  return (
    (await queryOne<SeoOverrideRow>(
      `SELECT id, entity_type, entity_key, canonical_path, seo_payload, is_active
       FROM seo_overrides
       WHERE entity_type = $1 AND entity_key = $2 AND is_active = true
       LIMIT 1`,
      [entityType, entityKey],
    )) || null
  );
}

export async function upsertSeoOverride(
  override: Partial<SeoOverrideRow> & Pick<SeoOverrideRow, 'entity_type' | 'entity_key' | 'canonical_path'>,
  ctx: SiteAuditContext,
): Promise<SeoOverrideRow> {
  const id = override.id || crypto.randomUUID();
  const row = await queryOne<SeoOverrideRow>(
    `INSERT INTO seo_overrides (
        id, entity_type, entity_key, canonical_path, seo_payload, is_active, updated_at
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,NOW())
      ON CONFLICT (entity_type, entity_key)
      DO UPDATE SET
        canonical_path = EXCLUDED.canonical_path,
        seo_payload = EXCLUDED.seo_payload,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id, entity_type, entity_key, canonical_path, seo_payload, is_active`,
    [
      id,
      override.entity_type,
      override.entity_key,
      override.canonical_path,
      JSON.stringify(override.seo_payload || {}),
      override.is_active ?? true,
    ],
  );

  await auditSiteChange(`seo:${override.entity_type}:${override.entity_key}`, 'publish', ctx, {
    canonical: override.canonical_path,
  });

  if (!row) throw new Error('SEO override write failed');
  return row;
}

export async function deleteSeoOverride(
  entityType: string,
  entityKey: string,
  ctx: SiteAuditContext,
): Promise<void> {
  await query(`DELETE FROM seo_overrides WHERE entity_type = $1 AND entity_key = $2`, [
    entityType,
    entityKey,
  ]);
  await auditSiteChange(`seo:${entityType}:${entityKey}`, 'publish', ctx, { action: 'delete' });
}

export async function listMediaAssets(bucket?: string): Promise<SiteMediaAssetRow[]> {
  const result = bucket
    ? await query<SiteMediaAssetRow>(
        `SELECT
           id, asset_key, url, alt, mime_type, width, height, metadata, created_at, updated_at
         FROM site_media_assets
         WHERE metadata->>'bucket' = $1
         ORDER BY updated_at DESC, asset_key ASC`,
        [bucket],
      )
    : await query<SiteMediaAssetRow>(
        `SELECT
           id, asset_key, url, alt, mime_type, width, height, metadata, created_at, updated_at
         FROM site_media_assets
         ORDER BY updated_at DESC, asset_key ASC`,
      );
  return result.rows;
}

export async function getMediaAsset(assetKey: string): Promise<SiteMediaAssetRow | null> {
  return (
    (await queryOne<SiteMediaAssetRow>(
      `SELECT
         id, asset_key, url, alt, mime_type, width, height, metadata, created_at, updated_at
       FROM site_media_assets
       WHERE asset_key = $1
       LIMIT 1`,
      [assetKey],
    )) || null
  );
}

export async function upsertMediaAsset(
  asset: Pick<SiteMediaAssetRow, 'asset_key' | 'url'> &
    Partial<
      Pick<SiteMediaAssetRow, 'alt' | 'mime_type' | 'width' | 'height' | 'metadata'>
    >,
  ctx: SiteAuditContext,
): Promise<SiteMediaAssetRow> {
  const row = await queryOne<SiteMediaAssetRow>(
    `INSERT INTO site_media_assets (
        asset_key, url, alt, mime_type, width, height, metadata, updated_by, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW())
      ON CONFLICT (asset_key)
      DO UPDATE SET
        url = EXCLUDED.url,
        alt = EXCLUDED.alt,
        mime_type = EXCLUDED.mime_type,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        metadata = EXCLUDED.metadata,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING id, asset_key, url, alt, mime_type, width, height, metadata, created_at, updated_at`,
    [
      asset.asset_key,
      asset.url,
      asset.alt || null,
      asset.mime_type || null,
      asset.width || null,
      asset.height || null,
      JSON.stringify(asset.metadata || {}),
      ctx.userId || null,
    ],
  );

  await auditSiteChange(asset.asset_key, 'media_import', ctx, {
    action: 'upsert',
    bucket: asset.metadata?.bucket || null,
    provider: asset.metadata?.provider || null,
    url: asset.url,
  });

  if (!row) throw new Error('Media asset write failed');
  return row;
}

export async function deleteMediaAsset(assetKey: string, ctx: SiteAuditContext): Promise<void> {
  await query(`DELETE FROM site_media_assets WHERE asset_key = $1`, [assetKey]);
  await auditSiteChange(assetKey, 'media_import', ctx, { action: 'delete' });
}

export async function listMediaUsage(assetKey?: string): Promise<SiteMediaUsageRow[]> {
  const result = assetKey
    ? await query<SiteMediaUsageRow>(
        `SELECT
           id, asset_key, entity_type, entity_key, placement_key, metadata, created_at, updated_at
         FROM site_media_asset_usage
         WHERE asset_key = $1
         ORDER BY updated_at DESC, entity_type ASC, entity_key ASC`,
        [assetKey],
      )
    : await query<SiteMediaUsageRow>(
        `SELECT
           id, asset_key, entity_type, entity_key, placement_key, metadata, created_at, updated_at
         FROM site_media_asset_usage
         ORDER BY updated_at DESC, entity_type ASC, entity_key ASC`,
      );
  return result.rows;
}

export async function upsertMediaUsage(
  usage: Pick<SiteMediaUsageRow, 'asset_key' | 'entity_type' | 'entity_key' | 'placement_key'> &
    Partial<Pick<SiteMediaUsageRow, 'id' | 'metadata'>>,
  ctx: SiteAuditContext,
): Promise<SiteMediaUsageRow> {
  const id = usage.id || crypto.randomUUID();
  const row = await queryOne<SiteMediaUsageRow>(
    `INSERT INTO site_media_asset_usage (
        id, asset_key, entity_type, entity_key, placement_key, metadata, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
      ON CONFLICT (asset_key, entity_type, entity_key, placement_key)
      DO UPDATE SET
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id, asset_key, entity_type, entity_key, placement_key, metadata, created_at, updated_at`,
    [
      id,
      usage.asset_key,
      usage.entity_type,
      usage.entity_key,
      usage.placement_key,
      JSON.stringify(usage.metadata || {}),
    ],
  );

  await auditSiteChange(`media-usage:${usage.asset_key}`, 'media_import', ctx, {
    entityType: usage.entity_type,
    entityKey: usage.entity_key,
    placementKey: usage.placement_key,
  });

  if (!row) throw new Error('Media usage write failed');
  return row;
}

export async function deleteMediaUsage(
  assetKey: string,
  entityType: string,
  entityKey: string,
  placementKey: string,
  ctx: SiteAuditContext,
): Promise<void> {
  await query(
    `DELETE FROM site_media_asset_usage
     WHERE asset_key = $1 AND entity_type = $2 AND entity_key = $3 AND placement_key = $4`,
    [assetKey, entityType, entityKey, placementKey],
  );
  await auditSiteChange(`media-usage:${assetKey}`, 'media_import', ctx, {
    action: 'delete',
    entityType,
    entityKey,
    placementKey,
  });
}

export async function getSitePlatformSummary() {
  const [sections, services, seo, media, mediaUsage] = await Promise.all([
    queryOne<{ total: number; active: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active = true)::int AS active FROM homepage_sections`,
    ),
    queryOne<{ total: number; active: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active = true)::int AS active FROM site_service_entries`,
    ),
    queryOne<{ total: number; active: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active = true)::int AS active FROM seo_overrides`,
    ),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM site_media_assets`),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM site_media_asset_usage`),
  ]);

  const [sectionRows, serviceRows, seoRows, mediaUsageRows] = await Promise.all([
    listHomepageSections(),
    listSiteServiceEntries('city-services'),
    listSeoOverrides(),
    listMediaUsage(),
  ]);

  return {
    counts: {
      homepageSections: sections || { total: 0, active: 0 },
      serviceEntries: services || { total: 0, active: 0 },
      seoOverrides: seo || { total: 0, active: 0 },
      mediaAssets: media?.total || 0,
      mediaUsage: mediaUsage?.total || 0,
    },
    samples: {
      homepageSections: sectionRows.slice(0, 6),
      serviceEntries: serviceRows.slice(0, 6),
      seoOverrides: seoRows.slice(0, 6),
      mediaUsage: mediaUsageRows.slice(0, 6),
    },
  };
}
