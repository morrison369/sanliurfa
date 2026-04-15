import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Bulk update places
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const { placeIds, action } = body;

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'placeIds array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;
    switch (action) {
      case 'approve':
        result = await query(
          `UPDATE places SET status = 'active', approved_at = NOW() WHERE id = ANY($1) RETURNING id`,
          [placeIds]
        );
        break;
      case 'reject':
        result = await query(
          `UPDATE places SET status = 'rejected' WHERE id = ANY($1) RETURNING id`,
          [placeIds]
        );
        break;
      case 'suspend':
        result = await query(
          `UPDATE places SET status = 'suspended' WHERE id = ANY($1) RETURNING id`,
          [placeIds]
        );
        break;
      case 'delete':
        result = await query(
          `UPDATE places SET status = 'deleted', deleted_at = NOW() WHERE id = ANY($1) RETURNING id`,
          [placeIds]
        );
        break;
      case 'feature':
        result = await query(
          `UPDATE places SET featured = true WHERE id = ANY($1) RETURNING id`,
          [placeIds]
        );
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({
      success: true,
      updated: result.rows.length,
      action
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Bulk update places error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
