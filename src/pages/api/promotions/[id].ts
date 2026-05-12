import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/promotions-update-unauthorized',
        instance: `/api/promotions/${context.params.id}`,
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
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Promosyon bulunamadı',
        type: '/problems/promotions-update-not-found',
        instance: `/api/promotions/${id}`,
      });
    }

    const promotion = promoResult.rows[0];

    // Yetki: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    if (auth.user.role === 'admin') {
      // admin tüm promosyonları güncelleyebilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [promotion.place_id, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu promosyon için yetkiniz yok',
          type: '/problems/promotions-update-forbidden',
          instance: `/api/promotions/${id}`,
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin promosyon güncelleyebilir',
        type: '/problems/promotions-update-forbidden',
        instance: `/api/promotions/${id}`,
      });
    }

    const allowedFields = ['status', 'featured', 'title', 'description', 'end_date'];

    if (body.title !== undefined && body.title !== null && (typeof body.title !== 'string' || body.title.length > 200)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Başlık 200 karakterden uzun olamaz', type: '/problems/promotions-update-title-too-long', instance: `/api/promotions/${id}` });
    if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 5000)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Açıklama 5000 karakterden uzun olamaz', type: '/problems/promotions-update-description-too-long', instance: `/api/promotions/${id}` });
    const VALID_PROMO_STATUSES = new Set(['active', 'draft', 'paused', 'expired', 'scheduled']);
    if (body.status !== undefined && body.status !== null && (typeof body.status !== 'string' || !VALID_PROMO_STATUSES.has(body.status))) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz promosyon durumu', type: '/problems/promotions-update-status-invalid', instance: `/api/promotions/${id}` });

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Güncellenecek geçerli alan yok',
        type: '/problems/promotions-update-no-fields',
        instance: `/api/promotions/${id}`,
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE promotions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return apiResponse({
      success: true,
      promotion: result.rows[0]
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Update promotion error:', error);
    return problemJson({
      status: 500,
      title: 'Promosyon Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/promotions-update-failed',
      instance: `/api/promotions/${context.params.id}`,
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/promotions-delete-unauthorized',
        instance: `/api/promotions/${context.params.id}`,
      });
    }

    const { id } = context.params;

    await query('DELETE FROM promotions WHERE id = $1', [id]);

    return apiResponse({
      success: true,
      message: 'Promotion deleted'
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Delete promotion error:', error);
    return problemJson({
      status: 500,
      title: 'Promosyon Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/promotions-delete-failed',
      instance: `/api/promotions/${context.params.id}`,
    });
  }
};
