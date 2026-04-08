/**
 * Rewards Library
 * Rewards catalog, redemption, and inventory management
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { deleteCache, getCache, setCache } from './cache';

export async function getRewardsCatalog(filters?: { category?: string; tier?: string }): Promise<any[]> {
  try {
    let query = `
      SELECT
        r.*,
        COALESCE(ri.available_stock, 0) as available_stock
      FROM rewards r
      LEFT JOIN reward_inventory ri ON r.id = ri.reward_id
      WHERE r.is_active = true
    `;

    const params: any[] = [];
    if (filters?.category) {
      query += ` AND r.category = $${params.length + 1}`;
      params.push(filters.category);
    }
    if (filters?.tier) {
      query += ` AND r.tier_requirement = $${params.length + 1}`;
      params.push(filters.tier);
    }

    query += ` ORDER BY r.display_order ASC`;

    const rewards = await queryMany(query, params);
    return rewards;
  } catch (error) {
    logger.error('Failed to get rewards catalog', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getRewardDetails(rewardId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:reward:${rewardId}`;
    let reward = await getCache(cacheKey);

    if (!reward) {
      reward = await queryOne(`
        SELECT
          r.*,
          COALESCE(ri.available_stock, 0) as available_stock
        FROM rewards r
        LEFT JOIN reward_inventory ri ON r.id = ri.reward_id
        WHERE r.id = $1
      `, [rewardId]);

      if (reward) {
        await setCache(cacheKey, reward, 3600);
      }
    }

    return reward || null;
  } catch (error) {
    logger.error('Failed to get reward details', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function redeemReward(userId: string, rewardId: string): Promise<{ success: boolean; redemptionCode?: string; error?: string }> {
  try {
    const reward = await queryOne('SELECT * FROM rewards WHERE id = $1', [rewardId]);
    if (!reward) {
      return { success: false, error: 'Reward not found' };
    }

    const inventory = await queryOne(
      'SELECT available_stock FROM reward_inventory WHERE reward_id = $1',
      [rewardId]
    );

    if (inventory && inventory.available_stock <= 0) {
      return { success: false, error: 'Reward out of stock' };
    }

    const userPoints = await queryOne(
      'SELECT current_balance FROM loyalty_points WHERE user_id = $1',
      [userId]
    );

    if (!userPoints || userPoints.current_balance < reward.points_cost) {
      return { success: false, error: 'Insufficient points' };
    }

    const redemptionCode = `RWD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    await insert('reward_redemptions', {
      user_id: userId,
      reward_id: rewardId,
      points_spent: reward.points_cost,
      redemption_code: redemptionCode,
      status: 'pending'
    });

    await update(
      'loyalty_points',
      { user_id: userId },
      {
        current_balance: userPoints.current_balance - reward.points_cost,
        lifetime_spent: (userPoints.lifetime_spent || 0) + reward.points_cost,
        last_spent_at: new Date()
      }
    );

    if (inventory) {
      await update(
        'reward_inventory',
        { reward_id: rewardId },
        {
          claimed_stock: (inventory.claimed_stock || 0) + 1,
          available_stock: inventory.available_stock - 1
        }
      );
    }

    await deleteCache(`sanliurfa:loyalty:points:${userId}`);

    logger.info('Reward redeemed', { userId, rewardId, redemptionCode });
    return { success: true, redemptionCode };
  } catch (error) {
    logger.error('Failed to redeem reward', error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Redemption failed' };
  }
}

export async function getRedemptionHistory(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const history = await queryMany(`
      SELECT
        rr.*,
        r.reward_name,
        r.image_url,
        r.category
      FROM reward_redemptions rr
      JOIN rewards r ON rr.reward_id = r.id
      WHERE rr.user_id = $1
      ORDER BY rr.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return history;
  } catch (error) {
    logger.error('Failed to get redemption history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPromotionalOffers(): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:promo:offers';
    let offers = await getCache(cacheKey);

    if (!offers) {
      offers = await queryMany(`
        SELECT
          po.*,
          r.reward_name,
          r.image_url,
          r.points_cost,
          CASE
            WHEN po.points_discount IS NOT NULL THEN po.points_discount
            WHEN po.discount_percent IS NOT NULL THEN ROUND(r.points_cost * (po.discount_percent / 100))
            ELSE 0
          END as effective_discount,
          CASE
            WHEN po.max_redemptions IS NOT NULL THEN (po.max_redemptions - COALESCE(po.current_redemptions, 0))
            ELSE -1
          END as remaining_redemptions
        FROM promotional_offers po
        LEFT JOIN rewards r ON po.reward_id = r.id
        WHERE po.valid_from <= NOW()
        AND po.valid_until >= NOW()
        ORDER BY po.valid_until ASC
      `);

      await setCache(cacheKey, offers, 1800);
    }

    return offers;
  } catch (error) {
    logger.error('Failed to get promotional offers', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function updateRewardInventory(rewardId: string, newStock: number): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT total_stock, claimed_stock FROM reward_inventory WHERE reward_id = $1',
      [rewardId]
    );

    if (existing) {
      await update(
        'reward_inventory',
        { reward_id: rewardId },
        {
          total_stock: newStock,
          available_stock: newStock - (existing.claimed_stock || 0),
          last_updated_at: new Date()
        }
      );
    } else {
      await insert('reward_inventory', {
        reward_id: rewardId,
        total_stock: newStock,
        claimed_stock: 0,
        available_stock: newStock
      });
    }

    await deleteCache('sanliurfa:reward:' + rewardId);
    await deleteCache('sanliurfa:rewards:catalog');

    logger.info('Reward inventory updated', { rewardId, newStock });
    return true;
  } catch (error) {
    logger.error('Failed to update reward inventory', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function fulfillRedemption(redemptionId: string, adminId: string, notes?: string): Promise<boolean> {
  try {
    await update(
      'reward_redemptions',
      { id: redemptionId },
      {
        status: 'fulfilled',
        fulfilled_at: new Date(),
        fulfilled_by_admin_id: adminId,
        notes
      }
    );

    logger.info('Redemption fulfilled', { redemptionId, adminId });
    return true;
  } catch (error) {
    logger.error('Failed to fulfill redemption', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
