import type { APIRoute } from 'astro';
import { query, queryOne, insert } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/points-add-unauthorized',
        instance: '/api/points/add',
      });
    }

    const body = await request.json();
    const { amount, reason, type = 'earn' } = body;

    if (!amount || !reason) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Amount ve reason gerekli',
        type: '/problems/points-add-validation',
        instance: '/api/points/add',
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
    logger.error('Points API error:', error);
    return problemJson({
      status: 500,
      title: 'Puan İşlemi Başarısız',
      detail: 'Sunucu hatası',
      type: '/problems/points-add-failed',
      instance: '/api/points/add',
    });
  }
};
