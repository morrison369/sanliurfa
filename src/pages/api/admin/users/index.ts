/**
 * Admin Users Management API
 * GET: Kullanıcıları filtrele/listele
 * PUT: Toplu işlem (activate, suspend, delete)
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeIntParam } from '../../../../lib/api';
import {
  type AdminUserStatusAction,
  normalizeAdminUserStatusAction,
  updateAdminUsersStatusBulk,
} from '../../../../lib/admin/admin-users';

export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-users-unauthorized',
      instance: '/api/admin/users',
    });
  }

  try {
    const url = new URL(request.url);
    const page   = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
    const limit  = safeIntParam(url.searchParams.get('limit'), 20, 1, 50);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const role   = url.searchParams.get('role')   || '';
    const status = url.searchParams.get('status') || '';

    if (search.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'search 200 karakterden uzun olamaz', type: '/problems/admin-users-search-too-long', instance: '/api/admin/users' });
    const VALID_USER_ROLES    = new Set(['user', 'admin', 'moderator', 'vendor']);
    const VALID_USER_STATUSES = new Set(['active', 'banned', 'suspended', 'deleted', 'inactive']);
    if (role !== undefined && role !== null && (typeof role !== 'string' || !VALID_USER_ROLES.has(role)))       return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz rol', type: '/problems/admin-users-role-invalid', instance: '/api/admin/users' });
    if (status !== undefined && status !== null && (typeof status !== 'string' || !VALID_USER_STATUSES.has(status)))  return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz durum', type: '/problems/admin-users-status-invalid', instance: '/api/admin/users' });

    const params: unknown[] = [];
    let where = `WHERE u.status != 'deleted'`;
    let idx = 1;

    if (search) {
      where += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (role) {
      where += ` AND u.role = $${idx}`;
      params.push(role);
      idx++;
    }
    if (status) {
      where += ` AND u.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count || '0');

    const dataResult = await query(
      `SELECT
         u.id, u.full_name AS name, u.email, u.role, u.status, u.created_at,
         u.is_banned, u.ban_reason, u.ban_expires_at, u.is_suspended, u.suspension_reason,
         COUNT(DISTINCT r.id) AS review_count,
         COUNT(DISTINCT p.id) AS place_count
       FROM users u
       LEFT JOIN reviews r  ON r.user_id  = u.id
       LEFT JOIN places  p  ON p.owner_id = u.id AND p.status != 'deleted'
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return apiResponse({
      success: true,
      users: dataResult.rows,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
      },
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Admin users GET error:', error);
    return problemJson({
      status: 500,
      title: 'Kullanıcılar Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/admin-users-get-failed',
      instance: '/api/admin/users',
    });
  }
};

// Toplu işlem
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-users-unauthorized',
      instance: '/api/admin/users',
    });
  }

  try {
    const { userIds, action } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'userIds gerekli',
        type: '/problems/admin-users-validation',
        instance: '/api/admin/users',
      });
    }

    let normalizedAction: AdminUserStatusAction;
    try {
      normalizedAction = normalizeAdminUserStatusAction(action);
    } catch {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçersiz action',
        type: '/problems/admin-users-action-invalid',
        instance: '/api/admin/users',
      });
    }

    const result = await updateAdminUsersStatusBulk(userIds, locals.user.id, normalizedAction);

    return apiResponse(result, HttpStatus.OK);

  } catch (error) {
    logger.error('Admin users PUT error:', error);
    return problemJson({
      status: 500,
      title: 'Toplu İşlem Başarısız',
      detail: 'Sunucu hatası',
      type: '/problems/admin-users-put-failed',
      instance: '/api/admin/users',
    });
  }
};
