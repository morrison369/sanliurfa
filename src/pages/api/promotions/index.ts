import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';
import { deleteCachePattern } from '../../../lib/cache';

// List promotions
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const requestedStatus = url.searchParams.get('status');
    const status = requestedStatus || 'active';
    const featured = url.searchParams.get('featured');

    const VALID_PROMOTION_STATUSES = new Set(['active', 'draft', 'paused', 'expired', 'scheduled']);
    if (!VALID_PROMOTION_STATUSES.has(status)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçersiz promosyon durumu',
        type: '/problems/promotions-status-invalid',
        instance: '/api/promotions',
      });
    }

    const isAdmin = auth?.user.role === 'admin';
    const isVendor = auth?.user.role === 'vendor';
    const ownedPlaceIds = new Set(auth?.placeIds || []);
    const vendorOwnsRequestedPlace = placeId ? ownedPlaceIds.has(placeId) : false;
    const ownerScopedVendorRequest = isVendor && (!placeId || vendorOwnsRequestedPlace);

    if (!isAdmin && !ownerScopedVendorRequest && requestedStatus && requestedStatus !== 'active') {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece aktif promosyonlar herkese açıktır',
        type: '/problems/promotions-status-forbidden',
        instance: '/api/promotions',
      });
    }

    const effectiveStatus = isAdmin || ownerScopedVendorRequest ? status : 'active';

    let sql = `
      SELECT p.*, pl.name as place_name, pl.slug as place_slug
      FROM promotions p
      JOIN places pl ON p.place_id = pl.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (placeId) {
      sql += ` AND p.place_id = $${paramIndex}`;
      params.push(placeId);
      paramIndex++;
    }

    if (ownerScopedVendorRequest) {
      sql += ` AND pl.owner_id = $${paramIndex}`;
      params.push(auth!.user.id);
      paramIndex++;
    }

    if (effectiveStatus) {
      sql += ` AND p.status = $${paramIndex}`;
      params.push(effectiveStatus);
      paramIndex++;
    }

    if (featured === 'true') {
      sql += ` AND p.featured = true`;
    }

    sql += ` ORDER BY p.featured DESC, p.created_at DESC`;

    const result = await query(sql, params);

    return apiResponse({
      success: true,
      promotions: result.rows
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('List promotions error:', error);
    return problemJson({
      status: 500,
      title: 'Promosyonlar Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/promotions-get-failed',
      instance: '/api/promotions',
    });
  }
};

// Create promotion
export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/promotions-create-unauthorized',
        instance: '/api/promotions',
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
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Zorunlu alanlar eksik',
        type: '/problems/promotions-create-validation',
        instance: '/api/promotions',
      });
    }

    // Yetki: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    if (auth.user.role === 'admin') {
      // admin her mekan için promosyon oluşturabilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu işletme için yetkiniz yok',
          type: '/problems/promotions-create-forbidden',
          instance: '/api/promotions',
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin promosyon oluşturabilir',
        type: '/problems/promotions-create-forbidden',
        instance: '/api/promotions',
      });
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

    await deleteCachePattern('promotions:*').catch(() => null);

    return apiResponse({
      success: true,
      promotion: result.rows[0]
    }, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Create promotion error:', error);
    return problemJson({
      status: 500,
      title: 'Promosyon Oluşturulamadı',
      detail: 'Sunucu hatası',
      type: '/problems/promotions-create-failed',
      instance: '/api/promotions',
    });
  }
};
