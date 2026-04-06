import type { APIRoute } from 'astro';
import { query, queryOne, insert } from '../../../lib/postgres';

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
    const { amount, reason, type = 'earn' } = body;

    if (!amount || !reason) {
      return new Response(JSON.stringify({ error: 'Amount and reason required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transaction kaydet
    const transaction = await insert('points_transactions', {
      user_id: user.id,
      amount: type === 'spend' ? -amount : amount,
      type,
      reason,
      created_at: new Date().toISOString()
    });

    // Kullanıcı puanını güncelle
    const profile = await queryOne('SELECT points FROM users WHERE id = $1', [user.id]);
    const newPoints = (profile?.points || 0) + (type === 'spend' ? -amount : amount);

    await query('UPDATE users SET points = $1 WHERE id = $2', [newPoints, user.id]);

    return new Response(JSON.stringify({
      success: true,
      transaction,
      newPoints
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Points API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
