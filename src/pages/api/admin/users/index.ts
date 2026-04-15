/**
 * Admin Users Management API
 * GET: Kullanıcıları filtrele/listele
 * PUT: Toplu işlem (activate, suspend, delete)
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  || '1'));
    const limit  = Math.min(50, parseInt(url.searchParams.get('limit') || '20'));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const role   = url.searchParams.get('role')   || '';
    const status = url.searchParams.get('status') || '';

    const params: any[] = [];
    let where = `WHERE u.status != 'deleted'`;
    let idx = 1;

    if (search) {
      where += ` AND (u.name ILIKE $${idx} OR u.email ILIKE $${idx})`;
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
         u.id, u.name, u.email, u.role, u.status, u.created_at,
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

    return new Response(JSON.stringify({
      success: true,
      users: dataResult.rows,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    logger.error('Admin users GET error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Toplu işlem
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { userIds, action } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userIds gerekli' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const statusMap: Record<string, string> = {
      activate: 'active',
      suspend:  'suspended',
      delete:   'deleted',
    };

    if (!statusMap[action]) {
      return new Response(JSON.stringify({ error: 'Geçersiz action' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    await query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = ANY($2)`,
      [statusMap[action], userIds]
    );

    return new Response(JSON.stringify({ success: true, action, count: userIds.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Admin users PUT error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
