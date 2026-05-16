import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail, safeIntParam } from '../../../lib/api';
import { derivePlaceCrmFields } from '../../../lib/admin/crm-derived';
import { canTransitionPlaceStatus } from '../../../lib/place/lifecycle';
import { recordPlaceLifecycleEvent } from '../../../lib/place/lifecycle-events';
import { deleteCachePattern } from '../../../lib/cache';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-places-unauthorized',
        instance: '/api/admin/places',
      });
    }

    const url = new URL(context.request.url);
    const VALID_PLACE_STATUSES = new Set(['all', 'active', 'pending', 'rejected', 'suspended', 'deleted', 'published', 'draft', 'archived']);
    const rawStatus = url.searchParams.get('status') || 'all';
    const status = VALID_PLACE_STATUSES.has(rawStatus) ? rawStatus : 'all';
    const rawSearch = url.searchParams.get('search');
    const search = rawSearch ? rawSearch.substring(0, 200) : null;
    const page = safeIntParam(url.searchParams.get('page'), 1, 1, 100_000);
    const limit = safeIntParam(url.searchParams.get('limit'), 20, 1, 1_000);
    const offset = (page - 1) * limit;

    const categoryId = safeIntParam(url.searchParams.get('category_id'), 0, 0, 1_000_000);
    const districtId = safeIntParam(url.searchParams.get('district_id'), 0, 0, 10_000);
    const isFeatured = url.searchParams.get('is_featured');
    const missingRaw = url.searchParams.get('missing') || '';
    const missing = new Set(missingRaw.split(',').filter(Boolean));

    let sql = `
      SELECT
        p.id, p.name, p.slug, p.status, p.category, p.category_id,
        p.district_id, p.neighborhood_id, p.address, p.phone,
        p.latitude, p.longitude,
        p.thumbnail_url, p.images,
        COALESCE(p.thumbnail_url, p.images[1]) as resolved_image,
        p.meta_description, p.short_description,
        p.is_featured, p.featured, p.avg_rating, p.view_count,
        p.created_at, p.updated_at, p.approved_at,
        c.name as category_name,
        d.name as district_name,
        u.name as owner_name, u.email as owner_email,
        COUNT(DISTINCT r.id) as review_count
      FROM places p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN districts d ON d.id = p.district_id
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN reviews r ON r.place_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status !== 'all') {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      sql += ` AND to_tsvector('turkish', coalesce(p.name,'') || ' ' || coalesce(p.address,'')) @@ plainto_tsquery('turkish', $${paramIndex})`;
      params.push(search);
      paramIndex++;
    }

    if (categoryId > 0) {
      sql += ` AND p.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    if (districtId > 0) {
      sql += ` AND p.district_id = $${paramIndex}`;
      params.push(districtId);
      paramIndex++;
    }

    if (isFeatured === 'true') {
      sql += ` AND (p.is_featured = true OR p.featured = true)`;
    } else if (isFeatured === 'false') {
      sql += ` AND (p.is_featured IS NOT TRUE AND p.featured IS NOT TRUE)`;
    }

    if (missing.has('image')) {
      sql += ` AND p.thumbnail_url IS NULL AND (p.images IS NULL OR array_length(p.images, 1) IS NULL)`;
    }
    if (missing.has('coords')) {
      sql += ` AND p.latitude IS NULL`;
    }
    if (missing.has('seo')) {
      sql += ` AND p.meta_description IS NULL`;
    }
    if (missing.has('phone')) {
      sql += ` AND p.phone IS NULL`;
    }

    sql += ` GROUP BY p.id, c.name, d.name, u.name, u.email ORDER BY p.created_at DESC`;

    // Count + data in parallel — params not mutated between queries
    const countSql = sql.replace(/SELECT.*?FROM/s, 'SELECT COUNT(DISTINCT p.id) FROM').replace(/GROUP BY.*/, '');
    const dataSql = sql + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    const [countResult, result] = await Promise.all([
      query(countSql, params),
      query(dataSql, [...params, limit, offset]),
    ]);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const places = result.rows.map((row) => ({
      ...row,
      image_url: row.resolved_image,
      ...derivePlaceCrmFields(row),
    }));

    return apiResponse({
      success: true,
      places,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Admin places error:', error);
    return problemJson({
      status: 500,
      title: 'Mekan Listesi Alınamadı',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/admin-places-fetch-failed',
      instance: '/api/admin/places',
    });
  }
};

// Bulk update places
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-places-unauthorized',
        instance: '/api/admin/places',
      });
    }

    const body = await context.request.json();
    const { placeIds, action } = body;

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0 || placeIds.length > 1000) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeIds array required (max 1000)',
        type: '/problems/admin-places-validation',
        instance: '/api/admin/places',
      });
    }

    const targetStatusMap: Record<string, string> = {
      approve: 'active',
      reject: 'rejected',
      suspend: 'suspended',
      delete: 'deleted',
    };
    const targetStatus = targetStatusMap[action];
    const existing = await query(`SELECT id, status FROM places WHERE id = ANY($1)`, [placeIds]);
    const statusById = new Map<string, string>();
    for (const row of existing.rows) statusById.set(String(row.id), String(row.status));
    const validPlaceIds =
      targetStatus
        ? existing.rows
            .filter((row) => canTransitionPlaceStatus(String(row.status), targetStatus, 'admin'))
            .map((row) => row.id)
        : placeIds;

    if (targetStatus && validPlaceIds.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Durum Geçişi',
        detail: `Seçilen kayıtlar için ${targetStatus} geçişi uygun değil`,
        type: '/problems/admin-places-transition-invalid',
        instance: '/api/admin/places',
      });
    }

    const result = await (async () => {
      switch (action) {
        case 'approve':
          return query(
            `UPDATE places SET status = 'active', approved_at = NOW() WHERE id = ANY($1) RETURNING id`,
            [validPlaceIds]
          );
        case 'reject':
          return query(
            `UPDATE places SET status = 'rejected' WHERE id = ANY($1) RETURNING id`,
            [validPlaceIds]
          );
        case 'suspend':
          return query(
            `UPDATE places SET status = 'suspended' WHERE id = ANY($1) RETURNING id`,
            [validPlaceIds]
          );
        case 'delete':
          return query(
            `UPDATE places SET status = 'deleted', deleted_at = NOW() WHERE id = ANY($1) RETURNING id`,
            [validPlaceIds]
          );
        case 'feature':
          return query(
            `UPDATE places SET featured = true WHERE id = ANY($1) RETURNING id`,
            [placeIds]
          );
        default:
          return null;
      }
    })();

    if (!result) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Aksiyon',
        detail: 'Invalid action',
        type: '/problems/admin-places-invalid-action',
        instance: '/api/admin/places',
      });
    }

    if (targetStatus) {
      await Promise.all(
        (result.rows || []).map(async (row) => {
          const placeId = String(row.id);
          await recordPlaceLifecycleEvent({
            placeId,
            fromStatus: statusById.get(placeId) || null,
            toStatus: targetStatus,
            actorUserId: auth.user.id,
            reason: `admin_bulk_${action}`,
            metadata: {
              action,
              skippedCount: Math.max(0, placeIds.length - validPlaceIds.length),
            },
          }).catch(() => null);
        }),
      );
    }

    // Invalidate public places cache after any bulk mutation
    await Promise.all([
      deleteCachePattern('places:list:*'),
      deleteCachePattern('places:detail:*'),
    ]).catch(() => null);

    return apiResponse({
      success: true,
      updated: result.rows.length,
      action,
      skipped: Math.max(0, placeIds.length - (targetStatus ? validPlaceIds.length : placeIds.length)),
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Bulk update places error:', error);
    return problemJson({
      status: 500,
      title: 'Toplu Mekan Güncelleme Başarısız',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/admin-places-update-failed',
      instance: '/api/admin/places',
    });
  }
};
