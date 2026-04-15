import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    // Get promotion info
    const promoResult = await query(
      'SELECT * FROM promotions WHERE id = $1',
      [id]
    );

    if (promoResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Promotion not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const promotion = promoResult.rows[0];

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [promotion.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const allowedFields = ['status', 'featured', 'title', 'description', 'end_date'];
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE promotions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return new Response(JSON.stringify({
      success: true,
      promotion: result.rows[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Update promotion error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;

    await query('DELETE FROM promotions WHERE id = $1', [id]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Promotion deleted'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Delete promotion error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
