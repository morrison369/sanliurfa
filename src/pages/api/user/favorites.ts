import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';

// List user's favorite places
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(
      `SELECT p.id, p.name, p.slug, p.image_url, p.category, p.rating, p.price_range, p.address
       FROM user_favorites uf
       JOIN places p ON uf.place_id = p.id
       WHERE uf.user_id = $1 AND p.status = 'active'
       ORDER BY uf.created_at DESC`,
      [auth.user.id]
    );

    return new Response(JSON.stringify({
      success: true,
      favorites: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Get favorites error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Add to favorites
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
    const { placeId } = body;

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already favorited
    const existing = await query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [auth.user.id, placeId]
    );

    if (existing.rows.length > 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Already in favorites'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await query(
      'INSERT INTO user_favorites (user_id, place_id) VALUES ($1, $2)',
      [auth.user.id, placeId]
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Added to favorites'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Add favorite error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Remove from favorites
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND place_id = $2',
      [auth.user.id, placeId]
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Removed from favorites'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Remove favorite error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
