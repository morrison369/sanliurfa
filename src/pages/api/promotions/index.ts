import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';

// List promotions
export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const status = url.searchParams.get('status') || 'active';
    const featured = url.searchParams.get('featured');

    let sql = `
      SELECT p.*, pl.name as place_name, pl.slug as place_slug
      FROM promotions p
      JOIN places pl ON p.place_id = pl.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (placeId) {
      sql += ` AND p.place_id = $${paramIndex}`;
      params.push(placeId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (featured === 'true') {
      sql += ` AND p.featured = true`;
    }

    sql += ` ORDER BY p.featured DESC, p.created_at DESC`;

    const result = await query(sql, params);

    return new Response(JSON.stringify({
      success: true,
      promotions: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('List promotions error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Create promotion
export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const {
      placeId,
      title,
      description,
      promotionType,
      discountValue,
      discountPercent,
      startDate,
      endDate,
      promoCode,
      usageLimit,
      minPurchaseAmount,
      featured
    } = body;

    // Validation
    if (!placeId || !title || !description || !promotionType || !startDate || !endDate) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const result = await query(
      `INSERT INTO promotions (
        place_id, title, description, promotion_type,
        discount_value, discount_percent, min_purchase_amount,
        promo_code, usage_limit, start_date, end_date,
        featured, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13)
      RETURNING *`,
      [
        placeId, title, description, promotionType,
        discountValue || null, discountPercent || null, minPurchaseAmount || null,
        promoCode || null, usageLimit || null, startDate, endDate,
        featured || false, auth.user.id
      ]
    );

    return new Response(JSON.stringify({
      success: true,
      promotion: result.rows[0]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create promotion error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
