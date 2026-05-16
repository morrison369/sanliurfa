import type { APIRoute } from 'astro';
import { apiResponse, HttpStatus, safeErrorDetail, safeIntParam } from '../../../../lib/api';
import { auditLogger } from '../../../../lib/audit';
import {
  buildClassifiedDuplicateMaps,
  extractClassifiedReasonCode,
  getClassifiedRiskScore,
  getClassifiedSignalFlags,
} from '../../../../lib/admin/classified-moderation';
import {
  deriveAdCrmFields,
  deriveEventCrmFields,
  deriveMatchProfileCrmFields,
  deriveMessageCrmFields,
  derivePharmacyCrmFields,
  derivePlaceCrmFields,
  deriveReportCrmFields,
  deriveReviewCrmFields,
  deriveSeoPageCrmFields,
  deriveUserCrmFields,
} from '../../../../lib/admin/crm-derived';
import { ensureClassifiedSchemaAndCategories } from '../../../../lib/classifieds';
import { query } from '../../../../lib/postgres';

type ResourceKey =
  | 'categories'
  | 'districts'
  | 'neighborhoods'
  | 'events'
  | 'pharmacies'
  | 'reviews'
  | 'ads'
  | 'places'
  | 'users'
  | 'match-profiles'
  | 'reports'
  | 'messages'
  | 'classified-listings'
  | 'seo-pages'
  | 'seo-overrides';
type FieldType = 'string' | 'nullable-string' | 'slug' | 'number' | 'boolean' | 'nullable-number';

interface ResourceConfig {
  table: string;
  idColumn: string;
  idExpr: string;
  idType: 'number' | 'string';
  searchExpr: string;
  selectSql: string;
  orderSql: string;
  fields: Record<string, FieldType>;
  requiredOnCreate: string[];
  hasUpdatedAt: boolean;
}

const RESOURCE_CONFIG: Record<ResourceKey, ResourceConfig> = {
  categories: {
    table: 'categories',
    idColumn: 'id',
    idExpr: 'c.id',
    idType: 'number',
    searchExpr: '(c.name ILIKE $VALUE OR c.slug ILIKE $VALUE)',
    selectSql: `
      SELECT c.id, c.name, c.slug, c.description, c.icon, c.color, c.is_active, c.sort_order,
        c.parent_id, c.meta_title, c.meta_description, COUNT(p.id)::int AS place_count
      FROM categories c
      LEFT JOIN places p ON p.category_id = c.id AND p.status = 'active'
      __WHERE__
      GROUP BY c.id
    `,
    orderSql: 'ORDER BY c.sort_order ASC NULLS LAST, c.name ASC',
    fields: {
      name: 'string',
      slug: 'slug',
      description: 'string',
      icon: 'string',
      color: 'string',
      is_active: 'boolean',
      sort_order: 'nullable-number',
      parent_id: 'nullable-number',
      meta_title: 'string',
      meta_description: 'string',
    },
    requiredOnCreate: ['name', 'slug'],
    hasUpdatedAt: true,
  },
  districts: {
    table: 'districts',
    idColumn: 'id',
    idExpr: 'd.id',
    idType: 'number',
    searchExpr: '(d.name ILIKE $VALUE OR d.slug ILIKE $VALUE)',
    selectSql: `
      SELECT d.id, d.name, d.slug, d.description, d.meta_title, d.meta_description,
        d.latitude, d.longitude, d.population, d.image, d.is_central, d.sort_order,
        COUNT(p.id)::int AS place_count
      FROM districts d
      LEFT JOIN places p ON p.district_id = d.id AND p.status = 'active'
      __WHERE__
      GROUP BY d.id
    `,
    orderSql: 'ORDER BY d.sort_order ASC NULLS LAST, d.name ASC',
    fields: {
      name: 'string',
      slug: 'slug',
      description: 'string',
      meta_title: 'string',
      meta_description: 'string',
      latitude: 'nullable-number',
      longitude: 'nullable-number',
      population: 'nullable-number',
      image: 'string',
      is_central: 'boolean',
      sort_order: 'nullable-number',
    },
    requiredOnCreate: ['name', 'slug'],
    hasUpdatedAt: true,
  },
  neighborhoods: {
    table: 'neighborhoods',
    idColumn: 'id',
    idExpr: 'n.id',
    idType: 'number',
    searchExpr: '(n.name ILIKE $VALUE OR n.slug ILIKE $VALUE OR d.name ILIKE $VALUE)',
    selectSql: `
      SELECT n.id, n.name, n.slug, n.district_id, d.name AS district_name,
        n.latitude, n.longitude, n.population, n.postal_code, COUNT(p.id)::int AS place_count
      FROM neighborhoods n
      LEFT JOIN districts d ON d.id = n.district_id
      LEFT JOIN places p ON p.neighborhood_id = n.id AND p.status = 'active'
      __WHERE__
      GROUP BY n.id, d.name
    `,
    orderSql: 'ORDER BY d.name ASC NULLS LAST, n.name ASC',
    fields: {
      name: 'string',
      slug: 'slug',
      district_id: 'number',
      latitude: 'nullable-number',
      longitude: 'nullable-number',
      population: 'nullable-number',
      postal_code: 'string',
    },
    requiredOnCreate: ['name', 'slug', 'district_id'],
    hasUpdatedAt: false,
  },
  events: {
    table: 'events',
    idColumn: 'id',
    idExpr: 'e.id',
    idType: 'string',
    searchExpr: '(e.title ILIKE $VALUE OR e.slug ILIKE $VALUE OR e.location ILIKE $VALUE)',
    selectSql: `
      SELECT e.id, e.title, e.slug, e.description, e.category, e.start_date, e.end_date,
        e.location, e.organizer, e.image_url, e.is_online, e.is_free, e.price,
        e.capacity, e.attendee_count, e.status, e.view_count
      FROM events e
      __WHERE__
    `,
    orderSql: 'ORDER BY e.start_date DESC NULLS LAST, e.created_at DESC',
    fields: {
      title: 'string',
      slug: 'slug',
      description: 'string',
      category: 'string',
      start_date: 'string',
      end_date: 'string',
      location: 'string',
      organizer: 'string',
      image_url: 'string',
      is_online: 'boolean',
      is_free: 'boolean',
      price: 'nullable-number',
      capacity: 'nullable-number',
      status: 'string',
    },
    requiredOnCreate: ['title', 'slug'],
    hasUpdatedAt: true,
  },
  pharmacies: {
    table: 'pharmacies',
    idColumn: 'id',
    idExpr: 'p.id',
    idType: 'number',
    searchExpr: '(p.name ILIKE $VALUE OR p.slug ILIKE $VALUE OR p.address ILIKE $VALUE OR d.name ILIKE $VALUE)',
    selectSql: `
      SELECT p.id, p.name, p.slug, p.address, p.phone, p.district_id, d.name AS district_name,
        p.neighborhood_id, p.latitude, p.longitude, p.is_on_duty, p.duty_date, p.opening_hours
      FROM pharmacies p
      LEFT JOIN districts d ON d.id = p.district_id
      __WHERE__
    `,
    orderSql: 'ORDER BY p.is_on_duty DESC, d.name ASC NULLS LAST, p.name ASC',
    fields: {
      name: 'string',
      slug: 'slug',
      address: 'string',
      phone: 'string',
      district_id: 'nullable-number',
      neighborhood_id: 'nullable-number',
      latitude: 'nullable-number',
      longitude: 'nullable-number',
      is_on_duty: 'boolean',
      duty_date: 'string',
      opening_hours: 'string',
    },
    requiredOnCreate: ['name', 'address'],
    hasUpdatedAt: true,
  },
  reviews: {
    table: 'reviews',
    idColumn: 'id',
    idExpr: 'r.id',
    idType: 'string',
    searchExpr: '(r.title ILIKE $VALUE OR r.content ILIKE $VALUE OR p.name ILIKE $VALUE OR u.full_name ILIKE $VALUE)',
    selectSql: `
      SELECT r.id, r.place_id, p.name AS place_name, p.slug AS place_slug,
        r.user_id, COALESCE(u.full_name, u.name, u.email, 'Anonim') AS user_name,
        r.title, r.content, r.rating, r.status, r.is_moderated, r.is_hidden,
        r.is_verified, r.helpful_count, r.unhelpful_count, r.created_at
      FROM reviews r
      LEFT JOIN places p ON p.id = r.place_id
      LEFT JOIN users u ON u.id = r.user_id
      __WHERE__
    `,
    orderSql: 'ORDER BY r.is_moderated ASC, r.created_at DESC',
    fields: {
      place_id: 'string',
      user_id: 'string',
      title: 'string',
      content: 'string',
      rating: 'number',
      status: 'string',
      is_moderated: 'boolean',
      is_hidden: 'boolean',
      is_verified: 'boolean',
    },
    requiredOnCreate: ['place_id', 'user_id', 'content', 'rating'],
    hasUpdatedAt: true,
  },
  ads: {
    table: 'advertisements',
    idColumn: 'id',
    idExpr: 'a.id',
    idType: 'string',
    searchExpr: '(a.title ILIKE $VALUE OR a.content ILIKE $VALUE OR a.ad_type ILIKE $VALUE OR p.name ILIKE $VALUE)',
    selectSql: `
      SELECT a.id, a.vendor_id, a.place_id, p.name AS place_name, p.slug AS place_slug,
        a.ad_type, a.title, a.content, a.budget, a.spent, a.impressions, a.clicks,
        a.status, a.started_at, a.ended_at, a.created_at
      FROM advertisements a
      LEFT JOIN places p ON p.id = a.place_id
      __WHERE__
    `,
    orderSql: 'ORDER BY a.status ASC, a.ended_at ASC NULLS LAST, a.created_at DESC',
    fields: {
      vendor_id: 'string',
      place_id: 'string',
      ad_type: 'string',
      title: 'string',
      content: 'string',
      budget: 'nullable-number',
      spent: 'nullable-number',
      impressions: 'nullable-number',
      clicks: 'nullable-number',
      status: 'string',
      started_at: 'string',
      ended_at: 'string',
    },
    requiredOnCreate: ['vendor_id', 'title'],
    hasUpdatedAt: false,
  },
  places: {
    table: 'places',
    idColumn: 'id',
    idExpr: 'p.id',
    idType: 'string',
    searchExpr: '(p.name ILIKE $VALUE OR p.slug ILIKE $VALUE OR p.address ILIKE $VALUE OR d.name ILIKE $VALUE)',
    selectSql: `
      SELECT p.id, p.name, p.slug, p.address, p.status, p.latitude, p.longitude,
        p.district_id, d.name AS district_name, p.neighborhood_id,
        p.category_id, c.name AS category_name, p.updated_at
      FROM places p
      LEFT JOIN districts d ON d.id = p.district_id
      LEFT JOIN categories c ON c.id = p.category_id
      __WHERE__
    `,
    orderSql: 'ORDER BY p.updated_at DESC NULLS LAST, p.name ASC',
    fields: {
      name: 'string',
      slug: 'slug',
      address: 'string',
      status: 'string',
      latitude: 'nullable-number',
      longitude: 'nullable-number',
      district_id: 'nullable-number',
      neighborhood_id: 'nullable-number',
    },
    requiredOnCreate: ['name', 'slug'],
    hasUpdatedAt: true,
  },
  users: {
    table: 'users',
    idColumn: 'id',
    idExpr: 'u.id',
    idType: 'string',
    searchExpr: '(u.full_name ILIKE $VALUE OR u.name ILIKE $VALUE OR u.email ILIKE $VALUE OR u.role ILIKE $VALUE)',
    selectSql: `
      SELECT u.id, COALESCE(NULLIF(u.full_name, ''), NULLIF(u.name, ''), u.email) AS display_name,
        u.full_name, u.name, u.email, u.role, u.status, u.points, u.subscription_tier,
        u.two_factor_enabled, u.oauth_provider, u.provider, u.created_at, u.updated_at,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT p.id)::int AS place_count,
        COUNT(DISTINCT rep.id)::int AS report_count
      FROM users u
      LEFT JOIN reviews r ON r.user_id = u.id
      LEFT JOIN places p ON p.owner_id = u.id AND p.status != 'deleted'
      LEFT JOIN reports rep ON rep.reported_user_id = u.id AND rep.status IN ('pending', 'under_review', 'open', 'investigating')
      __WHERE__
      GROUP BY u.id
    `,
    orderSql: 'ORDER BY u.created_at DESC',
    fields: {
      full_name: 'string',
      name: 'string',
      role: 'string',
      status: 'string',
      points: 'nullable-number',
      subscription_tier: 'string',
    },
    requiredOnCreate: ['email', 'full_name'],
    hasUpdatedAt: true,
  },
  'match-profiles': {
    table: 'user_match_profiles',
    idColumn: 'user_id',
    idExpr: 'ump.user_id',
    idType: 'string',
    searchExpr: '(ump.bio ILIKE $VALUE OR ump.preferred_district ILIKE $VALUE OR ump.looking_for ILIKE $VALUE OR u.full_name ILIKE $VALUE OR u.email ILIKE $VALUE)',
    selectSql: `
      SELECT ump.user_id AS id, ump.user_id, COALESCE(u.full_name, u.name, u.email) AS user_name,
        u.email, u.status AS user_status, ump.bio, ump.photos, ump.is_discoverable,
        ump.preferred_district, ump.looking_for, ump.age_range_min, ump.age_range_max,
        ump.profile_completeness, ump.updated_at
      FROM user_match_profiles ump
      LEFT JOIN users u ON u.id = ump.user_id
      __WHERE__
    `,
    orderSql: 'ORDER BY ump.updated_at DESC NULLS LAST',
    fields: {
      bio: 'string',
      is_discoverable: 'boolean',
      preferred_district: 'string',
      looking_for: 'string',
      age_range_min: 'nullable-number',
      age_range_max: 'nullable-number',
      profile_completeness: 'nullable-number',
    },
    requiredOnCreate: ['user_id'],
    hasUpdatedAt: true,
  },
  reports: {
    table: 'reports',
    idColumn: 'id',
    idExpr: 'rep.id',
    idType: 'string',
    searchExpr: '(rep.reason ILIKE $VALUE OR rep.description ILIKE $VALUE OR rep.content_type ILIKE $VALUE OR reporter.email ILIKE $VALUE OR reported.email ILIKE $VALUE)',
    selectSql: `
      SELECT rep.id, rep.reporter_id, COALESCE(reporter.full_name, reporter.email) AS reporter_name,
        rep.reported_user_id, COALESCE(reported.full_name, reported.email) AS reported_user_name,
        rep.content_type, rep.content_id, rep.reason, rep.description, rep.status,
        rep.resolution_note, rep.created_at, rep.updated_at, rep.resolved_at
      FROM reports rep
      LEFT JOIN users reporter ON reporter.id = rep.reporter_id
      LEFT JOIN users reported ON reported.id = rep.reported_user_id
      __WHERE__
    `,
    orderSql: 'ORDER BY rep.created_at DESC',
    fields: {
      status: 'string',
      reason: 'string',
      description: 'string',
      resolution_note: 'string',
    },
    requiredOnCreate: ['reporter_id', 'content_type', 'content_id', 'reason'],
    hasUpdatedAt: true,
  },
  messages: {
    table: 'messages',
    idColumn: 'id',
    idExpr: 'm.id',
    idType: 'string',
    searchExpr: '(m.subject ILIKE $VALUE OR m.body ILIKE $VALUE OR m.email ILIKE $VALUE OR m.name ILIKE $VALUE OR u.email ILIKE $VALUE)',
    selectSql: `
      SELECT m.id, m.sender_id, COALESCE(u.full_name, u.email, m.name) AS sender_name,
        m.name, m.email, m.subject, m.body, m.status, m.created_at, m.updated_at
      FROM messages m
      LEFT JOIN users u ON u.id = m.sender_id
      __WHERE__
    `,
    orderSql: 'ORDER BY m.created_at DESC',
    fields: {
      name: 'string',
      email: 'string',
      subject: 'string',
      body: 'string',
      status: 'string',
    },
    requiredOnCreate: ['body'],
    hasUpdatedAt: true,
  },
  'classified-listings': {
    table: 'classified_listings',
    idColumn: 'id',
    idExpr: 'cl.id',
    idType: 'string',
    searchExpr: '(cl.title ILIKE $VALUE OR cl.description ILIKE $VALUE OR cl.district ILIKE $VALUE OR cc.name ILIKE $VALUE OR u.email ILIKE $VALUE)',
    selectSql: `
      SELECT cl.id, cl.user_id, COALESCE(u.full_name, u.name, u.email) AS owner_name,
        u.email AS owner_email, cl.category_id, cc.name AS category_name, pc.name AS parent_category_name,
        cl.title, cl.slug, cl.description, cl.price, cl.currency, cl.district, cl.neighborhood,
        cl.address, cl.city, cl.phone, cl.images, cl.condition, cl.status, cl.view_count,
        cl.contact_count, cl.published_at, cl.expires_at, cl.moderation_note, cl.moderated_by,
        cl.moderated_at, cl.created_at, cl.updated_at
      FROM classified_listings cl
      LEFT JOIN users u ON u.id = cl.user_id
      LEFT JOIN classified_categories cc ON cc.id = cl.category_id
      LEFT JOIN classified_categories pc ON pc.id = cc.parent_id
      __WHERE__
    `,
    orderSql: 'ORDER BY cl.status ASC, cl.created_at DESC',
    fields: {
      user_id: 'string',
      category_id: 'number',
      title: 'string',
      description: 'string',
      price: 'nullable-number',
      district: 'string',
      neighborhood: 'string',
      address: 'string',
        phone: 'string',
        condition: 'string',
        status: 'string',
        published_at: 'nullable-string',
        moderation_note: 'nullable-string',
        moderated_by: 'string',
        moderated_at: 'nullable-string',
      },
    requiredOnCreate: ['user_id', 'category_id', 'title', 'description', 'district'],
    hasUpdatedAt: true,
  },
  'seo-pages': {
    table: 'seo_pages',
    idColumn: 'id',
    idExpr: 'sp.id',
    idType: 'number',
    searchExpr: '(sp.slug ILIKE $VALUE OR sp.title ILIKE $VALUE OR sp.meta_title ILIKE $VALUE OR sp.heading ILIKE $VALUE)',
    selectSql: `
      SELECT sp.id, sp.slug, sp.title, sp.meta_title, sp.meta_description, sp.heading,
        sp.intro_text, sp.category_filter, sp.district_filter, sp.sort_by, sp.limit_count,
        sp.is_active, sp.created_at, sp.updated_at
      FROM seo_pages sp
      __WHERE__
    `,
    orderSql: 'ORDER BY sp.updated_at DESC NULLS LAST, sp.slug ASC',
    fields: {
      slug: 'slug',
      title: 'string',
      meta_title: 'string',
      meta_description: 'string',
      heading: 'string',
      intro_text: 'string',
      category_filter: 'string',
      district_filter: 'nullable-number',
      sort_by: 'string',
      limit_count: 'nullable-number',
      is_active: 'boolean',
    },
    requiredOnCreate: ['slug', 'title'],
    hasUpdatedAt: true,
  },
  'seo-overrides': {
    table: 'seo_overrides',
    idColumn: 'id',
    idExpr: 'so.id',
    idType: 'string',
    searchExpr: '(so.entity_type ILIKE $VALUE OR so.entity_key ILIKE $VALUE OR so.canonical_path ILIKE $VALUE)',
    selectSql: `
      SELECT so.id, so.entity_type, so.entity_key, so.canonical_path,
        so.is_active, so.created_at, so.updated_at
      FROM seo_overrides so
      __WHERE__
    `,
    orderSql: 'ORDER BY so.updated_at DESC NULLS LAST, so.entity_type ASC, so.entity_key ASC',
    fields: {
      entity_type: 'string',
      entity_key: 'string',
      canonical_path: 'string',
      is_active: 'boolean',
    },
    requiredOnCreate: ['entity_type', 'entity_key', 'canonical_path'],
    hasUpdatedAt: true,
  },
};

function json(data: unknown, status: number = HttpStatus.OK) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

function getConfig(resource: string | undefined): ResourceConfig | null {
  if (!resource || !(resource in RESOURCE_CONFIG)) return null;
  return RESOURCE_CONFIG[resource as ResourceKey];
}

function normalizeValue(field: string, type: FieldType, raw: unknown) {
  if (raw === undefined) return { skipped: true as const };

  if (type === 'boolean') {
    if (typeof raw === 'boolean') return { value: raw };
    if (raw === 'true') return { value: true };
    if (raw === 'false') return { value: false };
    return { error: `${field} boolean olmalı` };
  }

  if (type === 'number' || type === 'nullable-number') {
    if (raw === null || raw === '') {
      if (type === 'nullable-number') return { value: null };
      return { error: `${field} zorunlu sayı olmalı` };
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return { error: `${field} geçerli sayı olmalı` };
    return { value };
  }

  if (type === 'nullable-string') {
    if (raw === null || raw === '') return { value: null };
    const value = String(raw).trim();
    if (value.length > 4000) return { error: `${field} çok uzun` };
    return { value };
  }

  const value = raw === null ? '' : String(raw).trim();
  if (type === 'slug' && !/^[a-z0-9-]+$/.test(value)) {
    return { error: `${field} sadece küçük harf, rakam ve tire içerebilir` };
  }
  if (value.length > 1000) return { error: `${field} 1000 karakterden uzun olamaz` };
  return { value };
}

function buildPayload(config: ResourceConfig, body: Record<string, unknown>) {
  const columns: string[] = [];
  const values: unknown[] = [];

  for (const [field, type] of Object.entries(config.fields)) {
    const normalized = normalizeValue(field, type, body[field]);
    if ('skipped' in normalized) continue;
    if ('error' in normalized) return { error: normalized.error };
    columns.push(field);
    values.push(normalized.value);
  }

  return { columns, values };
}

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);

  const config = getConfig(params.resource);
  if (!config) return json({ error: 'Geçersiz CRM kaynağı' }, HttpStatus.NOT_FOUND);
  if (params.resource === 'classified-listings') await ensureClassifiedSchemaAndCategories();

  const limit = safeIntParam(url.searchParams.get('limit'), 50, 1, 250);
  const offset = safeIntParam(url.searchParams.get('offset'), 0, 0, 1_000_000);
  const search = String(url.searchParams.get('q') || '').trim();
  const id = url.searchParams.get('id');

  const where: string[] = [];
  const values: unknown[] = [];

  if (id) {
    values.push(config.idType === 'number' ? Number(id) : id);
    where.push(`${config.idExpr} = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    where.push(config.searchExpr.replaceAll('$VALUE', `$${values.length}`));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    values.push(limit, offset);
    const rows = await query(
      `${config.selectSql.replace('__WHERE__', whereSql)} ${config.orderSql} LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    let items = rows.rows;
    if (params.resource === 'classified-listings') {
      const duplicateMaps = buildClassifiedDuplicateMaps(items);
      items = items.map((row) => ({
        ...row,
        signal_flags: getClassifiedSignalFlags(row, duplicateMaps),
        risk_score: getClassifiedRiskScore(row, duplicateMaps),
        reason_code: extractClassifiedReasonCode(row.moderation_note),
      }));
    } else if (params.resource === 'users') {
      items = items.map((row) => ({ ...row, ...deriveUserCrmFields(row) }));
    } else if (params.resource === 'match-profiles') {
      items = items.map((row) => ({ ...row, ...deriveMatchProfileCrmFields(row) }));
    } else if (params.resource === 'reports') {
      items = items.map((row) => ({ ...row, ...deriveReportCrmFields(row) }));
    } else if (params.resource === 'messages') {
      items = items.map((row) => ({ ...row, ...deriveMessageCrmFields(row) }));
    } else if (params.resource === 'places') {
      items = items.map((row) => ({ ...row, ...derivePlaceCrmFields(row) }));
    } else if (params.resource === 'events') {
      items = items.map((row) => ({ ...row, ...deriveEventCrmFields(row) }));
    } else if (params.resource === 'pharmacies') {
      items = items.map((row) => ({ ...row, ...derivePharmacyCrmFields(row) }));
    } else if (params.resource === 'reviews') {
      items = items.map((row) => ({ ...row, ...deriveReviewCrmFields(row) }));
    } else if (params.resource === 'ads') {
      items = items.map((row) => ({ ...row, ...deriveAdCrmFields(row) }));
    } else if (params.resource === 'seo-pages') {
      items = items.map((row) => ({ ...row, ...deriveSeoPageCrmFields(row) }));
    }
    return json({ success: true, items, limit, offset });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'CRM listesi okunamadı') }, 500);
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);

  const config = getConfig(params.resource);
  if (!config) return json({ error: 'Geçersiz CRM kaynağı' }, HttpStatus.NOT_FOUND);
  if (params.resource === 'classified-listings') await ensureClassifiedSchemaAndCategories();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON' }, HttpStatus.BAD_REQUEST);
  }

  for (const field of config.requiredOnCreate) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return json({ error: `${field} zorunlu` }, HttpStatus.BAD_REQUEST);
    }
  }

  const payload = buildPayload(config, body);
  if ('error' in payload) return json({ error: payload.error }, HttpStatus.BAD_REQUEST);
  if (payload.columns.length === 0) return json({ error: 'Kaydedilecek alan yok' }, HttpStatus.BAD_REQUEST);

  try {
    const placeholders = payload.columns.map((_, index) => `$${index + 1}`);
    const result = await query(
      `INSERT INTO ${config.table} (${payload.columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      payload.values,
    );
    return json({ success: true, item: result.rows[0] }, HttpStatus.CREATED);
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'CRM kaydı oluşturulamadı') }, 500);
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);

  const config = getConfig(params.resource);
  if (!config) return json({ error: 'Geçersiz CRM kaynağı' }, HttpStatus.NOT_FOUND);
  if (params.resource === 'classified-listings') await ensureClassifiedSchemaAndCategories();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON' }, HttpStatus.BAD_REQUEST);
  }

  if (params.resource === 'classified-listings' && Array.isArray(body.ids) && body.ids.length > 0) {
    const rawIds = body.ids
      .map((value) => String(value || '').trim())
      .filter((value) => value && value.length <= 80);
    if (!rawIds.length) return json({ error: 'Geçerli ilan id listesi zorunlu' }, HttpStatus.BAD_REQUEST);

    const bulkBody: Record<string, unknown> = {};
    for (const [field] of Object.entries(config.fields)) {
      if (body[field] !== undefined) bulkBody[field] = body[field];
    }
    if (bulkBody.status !== undefined || bulkBody.moderation_note !== undefined) {
      bulkBody.moderated_at = new Date().toISOString();
      if (locals.user?.id) bulkBody.moderated_by = String(locals.user.id);
    }
    if (bulkBody.status === 'active' && bulkBody.published_at === undefined) {
      bulkBody.published_at = new Date().toISOString();
    }
    if (bulkBody.status === 'pending' || bulkBody.status === 'rejected' || bulkBody.status === 'archived' || bulkBody.status === 'expired') {
      bulkBody.published_at = null;
    }

    const payload = buildPayload(config, bulkBody);
    if ('error' in payload) return json({ error: payload.error }, HttpStatus.BAD_REQUEST);
    if (payload.columns.length === 0) return json({ error: 'Güncellenecek alan yok' }, HttpStatus.BAD_REQUEST);

    const setParts = payload.columns.map((column, index) => `${column} = $${index + 1}`);
    if (config.hasUpdatedAt) setParts.push('updated_at = NOW()');
    const idStart = payload.values.length + 1;
    const inParams = rawIds.map((_, index) => `$${idStart + index}`);

    try {
      const result = await query(
        `UPDATE ${config.table}
         SET ${setParts.join(', ')}
         WHERE ${config.idColumn} IN (${inParams.join(', ')})
         RETURNING *`,
        [...payload.values, ...rawIds],
      );
      if (params.resource === 'classified-listings') {
        auditLogger.log('classified.bulk_moderation', 'classified_listings', locals.user?.id, {
          ids: rawIds,
          status: bulkBody.status ?? null,
          moderation_note: bulkBody.moderation_note ?? null,
          updated: result.rowCount || result.rows.length,
        });
      }
      return json({ success: true, items: result.rows, updated: result.rowCount || result.rows.length });
    } catch (error) {
      return json({ success: false, error: safeErrorDetail(error, 'CRM toplu güncelleme yapılamadı') }, 500);
    }
  }

  const id = config.idType === 'number' ? Number(body.id) : String(body.id || '').trim();
  if (config.idType === 'number' && (!Number.isInteger(id) || Number(id) <= 0)) {
    return json({ error: 'Geçerli id zorunlu' }, HttpStatus.BAD_REQUEST);
  }
  if (config.idType === 'string' && (!id || String(id).length > 80)) {
    return json({ error: 'Geçerli id zorunlu' }, HttpStatus.BAD_REQUEST);
  }

  if (params.resource === 'classified-listings') {
    if (body.status !== undefined || body.moderation_note !== undefined) {
      body.moderated_at = new Date().toISOString();
      if (locals.user?.id) body.moderated_by = String(locals.user.id);
    }
    if (body.status === 'active' && body.published_at === undefined) {
      body.published_at = new Date().toISOString();
    }
    if (body.status === 'pending' || body.status === 'rejected' || body.status === 'archived' || body.status === 'expired') {
      body.published_at = null;
    }
  }

  const payload = buildPayload(config, body);
  if ('error' in payload) return json({ error: payload.error }, HttpStatus.BAD_REQUEST);
  if (payload.columns.length === 0) return json({ error: 'Güncellenecek alan yok' }, HttpStatus.BAD_REQUEST);

  const setParts = payload.columns.map((column, index) => `${column} = $${index + 1}`);
  if (config.hasUpdatedAt) setParts.push('updated_at = NOW()');

  try {
    const result = await query(
      `UPDATE ${config.table}
       SET ${setParts.join(', ')}
       WHERE ${config.idColumn} = $${payload.values.length + 1}
       RETURNING *`,
      [...payload.values, id],
    );

    if (!result.rows[0]) return json({ error: 'Kayıt bulunamadı' }, HttpStatus.NOT_FOUND);
    if (params.resource === 'classified-listings') {
      auditLogger.log('classified.single_moderation', 'classified_listings', locals.user?.id, {
        id,
        status: body.status ?? null,
        moderation_note: body.moderation_note ?? null,
      });
    }
    return json({ success: true, item: result.rows[0] });
  } catch (error) {
    return json({ success: false, error: safeErrorDetail(error, 'CRM kaydı güncellenemedi') }, 500);
  }
};
