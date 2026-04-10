/**
 * Rewards Catalog Management
 * Browse, redeem, and track rewards
 */

import { randomBytes } from 'node:crypto';
import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { redeemPoints } from './loyalty-system';
import { createNotification } from './notifications-queue';
import { logger } from './logging';

export interface Reward {
  id: string;
  reward_name: string;
  description?: string;
  image_url?: string;
  reward_type: string;
  points_cost: number;
  tier_requirement?: string;
  quantity_available?: number;
  quantity_redeemed: number;
  featured: boolean;
  status: string;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  redemption_code?: string;
  fulfilled_at?: string;
  created_at: string;
}

export function generateCatalogRedemptionCode(): string {
  return `RWD-${Date.now()}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

export function generateCatalogDiscountCode(): string {
  return `DSCNT-${Date.now()}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

/**
 * Get rewards catalog (with pagination and filters)
 */
export async function getRewardsCatalog(
  limit: number = 20,
  offset: number = 0,
  filters?: {
    tier_requirement?: string;
    reward_type?: string;
    max_cost?: number;
  }
): Promise<{ rewards: Reward[]; total: number }> {
  const cacheKey = `sanliurfa:rewards:catalog:${limit}:${offset}:${JSON.stringify(filters || {})}`;

  try {
    const cached = await getCache<{ rewards: Reward[]; total: number }>(cacheKey);
    if (cached) return cached;

    let sql = 'SELECT * FROM rewards_catalog WHERE status = $1';
    const params: any[] = ['active'];
    let paramIndex = 2;

    if (filters?.tier_requirement) {
      sql += ` AND (tier_requirement IS NULL OR tier_requirement = $${paramIndex})`;
      params.push(filters.tier_requirement);
      paramIndex++;
    }

    if (filters?.reward_type) {
      sql += ` AND reward_type = $${paramIndex}`;
      params.push(filters.reward_type);
      paramIndex++;
    }

    if (filters?.max_cost) {
      sql += ` AND points_cost <= $${paramIndex}`;
      params.push(filters.max_cost);
      paramIndex++;
    }

    sql += ` ORDER BY featured DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const rewards = await queryRows(sql, params);

    const countSql = 'SELECT COUNT(*) as total FROM rewards_catalog WHERE status = $1' +
      (filters?.tier_requirement ? ` AND (tier_requirement IS NULL OR tier_requirement = '${filters.tier_requirement}')` : '') +
      (filters?.reward_type ? ` AND reward_type = '${filters.reward_type}'` : '') +
      (filters?.max_cost ? ` AND points_cost <= ${filters.max_cost}` : '');

    const countResult = await queryOne(countSql, []);

    const data = {
      rewards,
      total: parseInt(countResult?.total || '0')
    };

    await setCache(cacheKey, data, 600);
    return data;
  } catch (error) {
    logger.error('Failed to get rewards catalog', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get single reward details
 */
export async function getRewardDetails(rewardId: string): Promise<Reward | null> {
  const cacheKey = `sanliurfa:reward:${rewardId}`;

  try {
    const cached = await getCache<Reward>(cacheKey);
    if (cached) return cached;

    const reward = await queryOne('SELECT * FROM rewards_catalog WHERE id = $1', [rewardId]);
    if (reward) {
      await setCache(cacheKey, reward, 600);
    }
    return reward;
  } catch (error) {
    logger.error('Failed to get reward details', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Redeem a reward
 */
export async function redeemReward(
  userId: string,
  rewardId: string,
  userPoints: number
): Promise<RewardRedemption> {
  try {
    const reward = await getRewardDetails(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (userPoints < reward.points_cost) {
      throw new Error('Insufficient points');
    }

    if (reward.quantity_available && reward.quantity_redeemed >= reward.quantity_available) {
      throw new Error('Reward out of stock');
    }

    // Deduct points
    await redeemPoints(userId, reward.points_cost, `Reward redeemed: ${reward.reward_name}`, rewardId);

    // Generate redemption code
    const redemptionCode = generateCatalogRedemptionCode();

    // Create redemption record
    const redemption = await insert('reward_redemptions', {
      user_id: userId,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      status: 'pending',
      redemption_code: redemptionCode
    });

    // Update reward quantity
    if (reward.quantity_available) {
      await update(
        'rewards_catalog',
        { id: rewardId },
        { quantity_redeemed: reward.quantity_redeemed + 1 }
      );
    }

    // Clear caches
    await deleteCache(`sanliurfa:reward:${rewardId}`);
    await deleteCachePattern(`sanliurfa:rewards:catalog:*`);

    // Send notification
    await createNotification(
      userId,
      `Ödül başarıyla talep edildi`,
      `Redemption code: ${redemptionCode}`,
      'success',
      {
        actionUrl: `/kullanici/oduller/${redemption.id}`,
        actionLabel: 'Detayları Gör'
      }
    );

    logger.info('Reward redeemed', { userId, rewardId, code: redemptionCode });
    return redemption;
  } catch (error) {
    logger.error('Failed to redeem reward', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get user's redemptions
 */
export async function getUserRedemptions(
  userId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  redemptions: (RewardRedemption & { reward: Reward })[];
  total: number;
}> {
  try {
    let sql = `SELECT r.*, rw.reward_name, rw.description, rw.image_url, rw.reward_type, rw.points_cost
               FROM reward_redemptions r
               JOIN rewards_catalog rw ON r.reward_id = rw.id
               WHERE r.user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      sql += ` AND r.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const redemptions = await queryRows(sql, params);

    const countSql = `SELECT COUNT(*) as total FROM reward_redemptions WHERE user_id = $1${status ? ` AND status = $2` : ''}`;
    const countParams = [userId];
    if (status) countParams.push(status);
    const countResult = await queryOne(countSql, countParams);

    return {
      redemptions,
      total: parseInt(countResult?.total || '0')
    };
  } catch (error) {
    logger.error('Failed to get user redemptions', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get featured rewards
 */
export async function getFeaturedRewards(limit: number = 8): Promise<Reward[]> {
  const cacheKey = `sanliurfa:rewards:featured:${limit}`;

  try {
    const cached = await getCache<Reward[]>(cacheKey);
    if (cached) return cached;

    const rewards = await queryRows(
      `SELECT * FROM rewards_catalog
       WHERE status = 'active' AND featured = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    await setCache(cacheKey, rewards, 600);
    return rewards;
  } catch (error) {
    logger.error('Failed to get featured rewards', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get rewards by type
 */
export async function getRewardsByType(
  rewardType: string,
  limit: number = 20
): Promise<Reward[]> {
  const cacheKey = `sanliurfa:rewards:type:${rewardType}:${limit}`;

  try {
    const cached = await getCache<Reward[]>(cacheKey);
    if (cached) return cached;

    const rewards = await queryRows(
      `SELECT * FROM rewards_catalog
       WHERE status = 'active' AND reward_type = $1
       ORDER BY featured DESC, created_at DESC
       LIMIT $2`,
      [rewardType, limit]
    );

    await setCache(cacheKey, rewards, 600);
    return rewards;
  } catch (error) {
    logger.error('Failed to get rewards by type', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Generate discount code from reward
 */
export async function generateDiscountCode(
  redemptionId: string,
  userId: string,
  discountPercentage?: number,
  discountAmount?: number,
  validDays: number = 30
): Promise<{ code: string }> {
  try {
    const code = generateCatalogDiscountCode();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    await insert('discount_codes', {
      code,
      user_id: userId,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      max_uses: 1,
      valid_from: new Date(),
      valid_until: validUntil,
      created_from_redemption_id: redemptionId
    });

    logger.info('Discount code generated', { code, userId });
    return { code };
  } catch (error) {
    logger.error('Failed to generate discount code', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Validate and use discount code
 */
export async function useDiscountCode(code: string): Promise<{ discount_percentage?: number; discount_amount?: number }> {
  try {
    const discountCode = await queryOne(
      `SELECT * FROM discount_codes
       WHERE code = $1
         AND valid_from <= NOW()
         AND valid_until >= NOW()
         AND current_uses < max_uses`,
      [code]
    );

    if (!discountCode) {
      throw new Error('Invalid or expired discount code');
    }

    // Increment usage
    await update(
      'discount_codes',
      { code },
      { current_uses: discountCode.current_uses + 1 }
    );

    return {
      discount_percentage: discountCode.discount_percentage,
      discount_amount: discountCode.discount_amount
    };
  } catch (error) {
    logger.error('Failed to use discount code', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
