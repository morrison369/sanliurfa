import type { APIRoute } from 'astro';
import { insert, queryOne, update as updateDb } from '../../../lib/postgres';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { place_id, rating, title, content, images = [] } = body;

    if (!place_id || !rating || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Yorum kaydet
    const review = await insert('reviews', {
      place_id,
      user_id: user.id,
      rating,
      title,
      content,
      images,
      created_at: new Date().toISOString()
    });

    // Puan ekle (yorum için 50 puan)
    await insert('points_transactions', {
      user_id: user.id,
      amount: 50,
      type: 'earn',
      reason: 'Yorum yapıldı',
      reference_id: review.id
    });

    // Profili güncelle
    const profile = await queryOne('SELECT points FROM users WHERE id = $1', [user.id]);
    await updateDb('users', user.id, { 
      points: (profile?.points || 0) + 50 
    });

    return new Response(JSON.stringify({
      success: true,
      review,
      pointsEarned: 50
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Review API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
