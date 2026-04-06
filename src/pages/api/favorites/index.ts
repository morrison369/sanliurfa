// API: Favori işlemleri (PostgreSQL)
import type { APIRoute } from 'astro';
import { query, queryOne, insert, remove } from '../../../lib/postgres';

// Get user favorites
export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Oturum açmanız gerekiyor' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await query(
      `SELECT f.*, p.name as place_name, p.images as place_images, p.rating as place_rating
       FROM favorites f 
       JOIN places p ON f.place_id = p.id 
       WHERE f.user_id = $1 
       ORDER BY f.created_at DESC`,
      [user.id]
    );

    return new Response(
      JSON.stringify({ data: result.rows }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Favorites fetch error:', err);
    return new Response(
      JSON.stringify({ error: 'Favoriler getirilirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Add to favorites
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Oturum açmanız gerekiyor' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { placeId } = body;

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Mekan ID gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already favorited
    const existing = await queryOne(
      'SELECT id FROM favorites WHERE place_id = $1 AND user_id = $2',
      [placeId, user.id]
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Bu mekan zaten favorilerinizde' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await insert('favorites', {
      place_id: placeId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

    // Add points (5 puan)
    await query(
      'UPDATE users SET points = COALESCE(points, 0) + 5 WHERE id = $1',
      [user.id]
    );

    return new Response(
      JSON.stringify({ data, message: 'Favorilere eklendi' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Favorite add error:', err);
    return new Response(
      JSON.stringify({ error: 'Favori eklenirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Remove from favorites
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Oturum açmanız gerekiyor' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { placeId } = body;

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Mekan ID gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await query(
      'DELETE FROM favorites WHERE place_id = $1 AND user_id = $2',
      [placeId, user.id]
    );

    return new Response(
      JSON.stringify({ message: 'Favorilerden kaldırıldı' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Favorite remove error:', err);
    return new Response(
      JSON.stringify({ error: 'Favori kaldırılırken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
