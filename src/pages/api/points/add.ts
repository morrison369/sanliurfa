import type { APIRoute } from 'astro';
import { queryOne, insert } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

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

    const amountNum = parseInt(String(amount), 10);
    if (!reason || !Number.isFinite(amountNum) || amountNum <= 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Amount pozitif tam sayı, reason zorunlu',
        type: '/problems/points-add-validation',
        instance: '/api/points/add',
      });
    }

    const VALID_TYPES = new Set(['earn', 'spend', 'bonus', 'penalty']);
    if (!VALID_TYPES.has(type)) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz işlem tipi', type: '/problems/points-add-type-invalid', instance: '/api/points/add' });
    }

    // Transaction kaydet
    const transaction = await insert('points_transactions', {
      user_id: user.id,
      amount: type === 'spend' ? -amountNum : amountNum,
      type,
      reason,
      created_at: new Date().toISOString()
    });

    // Atomik UPDATE — eliminates SELECT→UPDATE lost-update race (HARD RULE #47)
    const delta = type === 'spend' ? -amountNum : amountNum;
    const updated = await queryOne<{ points: number }>(
      'UPDATE users SET points = COALESCE(points, 0) + $1 WHERE id = $2 RETURNING points',
      [delta, user.id]
    );
    const newPoints = updated?.points ?? 0;

    return apiResponse({
      success: true,
      transaction,
      newPoints
    }, HttpStatus.OK);

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
