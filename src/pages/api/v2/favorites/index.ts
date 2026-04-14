/**
 * Mobile App API v2 - User Favorites
 */

import type { APIRoute } from 'astro';
import { verifyToken } from '../../../../lib/auth';
import { query } from '../../../../lib/postgres';

// GET /api/v2/favorites - List user favorites
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const user = verifyToken(token);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(`
      SELECT 
        f.id as favorite_id,
        f.created_at as favorited_at,
        p.id, p.name, p.slug, p.rating, p.review_count,
        p.price_level, p.address, p.district,
        c.name as category_name, c.icon as category_icon
      FROM favorites f
      JOIN places p ON f.place_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE f.user_id = $1 AND p.status = 'active'
      ORDER BY f.created_at DESC
    `, [user.sub]);

    return new Response(JSON.stringify({
      success: true,
      data: result.rows,
      count: result.rows.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/v2/favorites - Add to favorites
export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const user = verifyToken(token);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { place_id } = body;

    if (!place_id) {
      return new Response(JSON.stringify({ success: false, error: 'Place ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await query(
      `INSERT INTO favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user.sub, place_id]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/v2/favorites - Remove from favorites
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const user = verifyToken(token);
    
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const placeId = url.searchParams.get('place_id');
    if (!placeId) {
      return new Response(JSON.stringify({ success: false, error: 'Place ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await query(
      `DELETE FROM favorites WHERE user_id = $1 AND place_id = $2`,
      [user.sub, placeId]
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
