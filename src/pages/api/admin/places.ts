import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { canTransitionPlaceStatus } from '../../../lib/place/lifecycle';
import { recordPlaceLifecycleEvent } from '../../../lib/place/lifecycle-events';

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
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        p.*,
        COALESCE(p.thumbnail_url, p.images[1]) as image_url,
        u.name as owner_name, u.email as owner_email,
        COUNT(DISTINCT r.id) as review_count,
        COALESCE(SUM(a.views), 0) as total_views
      FROM places p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN reviews r ON r.place_id = p.id
      LEFT JOIN place_daily_analytics a ON a.place_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== 'all') {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY p.id, u.name, u.email ORDER BY p.created_at DESC`;

    // Count
    const countSql = sql.replace(/SELECT.*?FROM/s, 'SELECT COUNT(DISTINCT p.id) FROM').replace(/GROUP BY.*/, '');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    // Limit
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return new Response(JSON.stringify({
      success: true,
      places: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Admin places error:', error);
    return problemJson({
      status: 500,
      title: 'Mekan Listesi Alınamadı',
      detail: error instanceof Error ? error.message : 'server_error',
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

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeIds array required',
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
      for (const row of result.rows || []) {
        const placeId = String(row.id);
        const previousStatus = statusById.get(placeId) || null;
        await recordPlaceLifecycleEvent({
          placeId,
          fromStatus: previousStatus,
          toStatus: targetStatus,
          actorUserId: auth.user.id,
          reason: `admin_bulk_${action}`,
          metadata: {
            action,
            skippedCount: Math.max(0, placeIds.length - validPlaceIds.length),
          },
        }).catch(() => null);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      updated: result.rows.length,
      action,
      skipped: Math.max(0, placeIds.length - (targetStatus ? validPlaceIds.length : placeIds.length)),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Bulk update places error:', error);
    return problemJson({
      status: 500,
      title: 'Toplu Mekan Güncelleme Başarısız',
      detail: error instanceof Error ? error.message : 'server_error',
      type: '/problems/admin-places-update-failed',
      instance: '/api/admin/places',
    });
  }
};
