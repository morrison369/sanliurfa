/**
 * Promotions & Coupons Management Library
 * Handle business promotions, discounts, and coupon validation
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface Promotion {
  id: string;
  place_id: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  coupon_code?: string;
  start_date: string;
  end_date: string;
  max_uses?: number;
  current_uses: number;
  minimum_purchase?: number;
  applicable_categories?: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionStats {
  totalRedemptions: number;
  totalDiscountGiven: number;
  activeCount: number;
  expiredCount: number;
}

/**
 * Get promotion by ID
 */
export async function getPromotion(promotionId: string): Promise<Promotion | null> {
  try {
    const cacheKey = `sanliurfa:promotion:${promotionId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryOne(
      'SELECT * FROM promotions WHERE id = $1',
      [promotionId]
    );

    if (!result) {
      return null;
    }

    const promotion: Promotion = {
      id: result.id,
      place_id: result.place_id,
      title: result.title,
      description: result.description,
      discount_type: result.discount_type,
      discount_value: result.discount_value,
      coupon_code: result.coupon_code,
      start_date: result.start_date,
      end_date: result.end_date,
      max_uses: result.max_uses,
      current_uses: result.current_uses,
      minimum_purchase: result.minimum_purchase,
      applicable_categories: result.applicable_categories,
      is_active: result.is_active,
      created_by: result.created_by,
      created_at: result.created_at,
      updated_at: result.updated_at
    };

    await setCache(cacheKey, JSON.stringify(promotion), 600);

    return promotion;
  } catch (error) {
    logger.error('Failed to get promotion', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get all active promotions for a place
 */
export async function getPlacePromotions(placeId: string): Promise<Promotion[]> {
  try {
    const cacheKey = `sanliurfa:place:promotions:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT * FROM promotions
       WHERE place_id = $1 AND is_active = true AND end_date > NOW()
       ORDER BY start_date ASC`,
      [placeId]
    );

    const promotions: Promotion[] = results.map((r: any) => ({
      id: r.id,
      place_id: r.place_id,
      title: r.title,
      description: r.description,
      discount_type: r.discount_type,
      discount_value: r.discount_value,
      coupon_code: r.coupon_code,
      start_date: r.start_date,
      end_date: r.end_date,
      max_uses: r.max_uses,
      current_uses: r.current_uses,
      minimum_purchase: r.minimum_purchase,
      applicable_categories: r.applicable_categories,
      is_active: r.is_active,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    await setCache(cacheKey, JSON.stringify(promotions), 300);

    return promotions;
  } catch (error) {
    logger.error('Failed to get place promotions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Validate and apply a coupon code
 */
export async function validatePromotion(
  couponCode: string,
  purchaseAmount: number
): Promise<{ valid: boolean; promotion?: Promotion; discount?: number; message: string }> {
  try {
    const promotion = await queryOne(
      `SELECT * FROM promotions
       WHERE coupon_code = $1
         AND is_active = true
         AND start_date <= NOW()
         AND end_date > NOW()
         AND (max_uses IS NULL OR current_uses < max_uses)`,
      [couponCode.toUpperCase()]
    );

    if (!promotion) {
      return {
        valid: false,
        message: 'Kupon kodu geçersiz veya süresi dolmuş'
      };
    }

    if (promotion.minimum_purchase && purchaseAmount < promotion.minimum_purchase) {
      return {
        valid: false,
        message: `Minimum ${promotion.minimum_purchase}₺ alış gerekli`
      };
    }

    let discount = 0;
    if (promotion.discount_type === 'percentage') {
      discount = (purchaseAmount * promotion.discount_value) / 100;
    } else {
      discount = promotion.discount_value;
    }

    const promotionData: Promotion = {
      id: promotion.id,
      place_id: promotion.place_id,
      title: promotion.title,
      description: promotion.description,
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      coupon_code: promotion.coupon_code,
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      max_uses: promotion.max_uses,
      current_uses: promotion.current_uses,
      minimum_purchase: promotion.minimum_purchase,
      applicable_categories: promotion.applicable_categories,
      is_active: promotion.is_active,
      created_by: promotion.created_by,
      created_at: promotion.created_at,
      updated_at: promotion.updated_at
    };

    return {
      valid: true,
      promotion: promotionData,
      discount,
      message: `${discount.toFixed(2)}₺ indirim uygulandı`
    };
  } catch (error) {
    logger.error('Failed to validate promotion', error instanceof Error ? error : new Error(String(error)));
    return {
      valid: false,
      message: 'Kupon doğrulama başarısız'
    };
  }
}

/**
 * Search promotions by title or coupon code
 */
export async function searchPromotions(query: string, limit: number = 20): Promise<Promotion[]> {
  try {
    const results = await queryRows(
      `SELECT * FROM promotions
       WHERE is_active = true
         AND end_date > NOW()
         AND (title ILIKE $1 OR coupon_code ILIKE $1)
       ORDER BY start_date ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      place_id: r.place_id,
      title: r.title,
      description: r.description,
      discount_type: r.discount_type,
      discount_value: r.discount_value,
      coupon_code: r.coupon_code,
      start_date: r.start_date,
      end_date: r.end_date,
      max_uses: r.max_uses,
      current_uses: r.current_uses,
      minimum_purchase: r.minimum_purchase,
      applicable_categories: r.applicable_categories,
      is_active: r.is_active,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  } catch (error) {
    logger.error('Failed to search promotions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Record promotion redemption and update usage count
 */
export async function redeemPromotion(promotionId: string, userId: string, discountAmount: number): Promise<boolean> {
  try {
    // Check if user already redeemed this promotion
    const existing = await queryOne(
      'SELECT id FROM promotion_redemptions WHERE promotion_id = $1 AND user_id = $2',
      [promotionId, userId]
    );

    if (existing) {
      logger.warn('User already redeemed promotion', { promotionId, userId });
      return false;
    }

    // Record redemption
    await insert('promotion_redemptions', {
      promotion_id: promotionId,
      user_id: userId,
      discount_amount: discountAmount
    });

    // Increment usage count
    await query(
      'UPDATE promotions SET current_uses = current_uses + 1 WHERE id = $1',
      [promotionId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:promotion:${promotionId}`);

    logger.info('Promotion redeemed', { promotionId, userId, discountAmount });

    return true;
  } catch (error) {
    logger.error('Failed to redeem promotion', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get promotion statistics
 */
export async function getPromotionStats(placeId: string): Promise<PromotionStats> {
  try {
    const cacheKey = `sanliurfa:promotion:stats:${placeId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const redemptionResult = await queryOne(
      `SELECT COUNT(*) as count, SUM(discount_amount) as total
       FROM promotion_redemptions pr
       INNER JOIN promotions p ON pr.promotion_id = p.id
       WHERE p.place_id = $1`,
      [placeId]
    );

    const activeResult = await queryOne(
      `SELECT COUNT(*) as count FROM promotions
       WHERE place_id = $1 AND is_active = true AND end_date > NOW()`,
      [placeId]
    );

    const expiredResult = await queryOne(
      `SELECT COUNT(*) as count FROM promotions
       WHERE place_id = $1 AND end_date <= NOW()`,
      [placeId]
    );

    const stats: PromotionStats = {
      totalRedemptions: parseInt(redemptionResult?.count || '0'),
      totalDiscountGiven: parseFloat(redemptionResult?.total || '0'),
      activeCount: parseInt(activeResult?.count || '0'),
      expiredCount: parseInt(expiredResult?.count || '0')
    };

    await setCache(cacheKey, JSON.stringify(stats), 3600);

    return stats;
  } catch (error) {
    logger.error('Failed to get promotion stats', error instanceof Error ? error : new Error(String(error)));
    return {
      totalRedemptions: 0,
      totalDiscountGiven: 0,
      activeCount: 0,
      expiredCount: 0
    };
  }
}

/**
 * Get trending promotions
 */
export async function getTrendingPromotions(limit: number = 10): Promise<Promotion[]> {
  try {
    const cacheKey = `sanliurfa:promotions:trending:${limit}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT p.* FROM promotions p
       LEFT JOIN promotion_redemptions pr ON p.id = pr.promotion_id
       WHERE p.is_active = true AND p.end_date > NOW()
       GROUP BY p.id
       ORDER BY COUNT(pr.id) DESC
       LIMIT $1`,
      [limit]
    );

    const promotions: Promotion[] = results.map((r: any) => ({
      id: r.id,
      place_id: r.place_id,
      title: r.title,
      description: r.description,
      discount_type: r.discount_type,
      discount_value: r.discount_value,
      coupon_code: r.coupon_code,
      start_date: r.start_date,
      end_date: r.end_date,
      max_uses: r.max_uses,
      current_uses: r.current_uses,
      minimum_purchase: r.minimum_purchase,
      applicable_categories: r.applicable_categories,
      is_active: r.is_active,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    await setCache(cacheKey, JSON.stringify(promotions), 600);

    return promotions;
  } catch (error) {
    logger.error('Failed to get trending promotions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
