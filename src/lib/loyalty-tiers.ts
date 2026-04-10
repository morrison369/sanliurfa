/**
 * Loyalty Tiers Library
 * Tier system management, progression, and benefits
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { deleteCache, getCache, setCache } from './cache';

export async function getUserTierInfo(userId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:tier:user:${userId}`;
    let tierInfo = await getCache(cacheKey);

    if (!tierInfo) {
      tierInfo = await queryOne(`
        SELECT
          utm.*,
          lt.tier_key,
          lt.tier_name,
          lt.tier_level,
          lt.points_multiplier,
          lt.color,
          lt.icon_url,
          lt.perks
        FROM user_tier_membership utm
        JOIN loyalty_tiers lt ON utm.current_tier_id = lt.id
        WHERE utm.user_id = $1
        AND utm.is_active = true
      `, [userId]);

      if (tierInfo) {
        await setCache(cacheKey, tierInfo, 1800);
      }
    }

    return tierInfo || null;
  } catch (error) {
    logger.error('Failed to get user tier info', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function calculateUserTier(userId: string): Promise<any | null> {
  try {
    const points = await queryOne(
      'SELECT current_balance FROM loyalty_points WHERE user_id = $1',
      [userId]
    );

    if (!points) {
      return null;
    }

    const tier = await queryOne(`
      SELECT *
      FROM loyalty_tiers
      WHERE min_points_required <= $1
      AND is_active = true
      ORDER BY tier_level DESC
      LIMIT 1
    `, [points.current_balance]);

    return tier || null;
  } catch (error) {
    logger.error('Failed to calculate user tier', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function updateUserTier(userId: string, newTierId: string, reason?: string): Promise<boolean> {
  try {
    const currentTierInfo = await queryOne(
      'SELECT current_tier_id FROM user_tier_membership WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    const previousTierId = currentTierInfo?.current_tier_id;

    // Update or create membership record
    const existing = await queryOne(
      'SELECT id FROM user_tier_membership WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      await update(
        'user_tier_membership',
        { user_id: userId },
        {
          current_tier_id: newTierId,
          tier_achieved_at: new Date(),
          is_active: true,
          updated_at: new Date()
        }
      );
    } else {
      await insert('user_tier_membership', {
        user_id: userId,
        current_tier_id: newTierId,
        tier_achieved_at: new Date(),
        is_active: true
      });
    }

    // Record tier progression history
    if (previousTierId && previousTierId !== newTierId) {
      await insert('tier_history', {
        user_id: userId,
        previous_tier_id: previousTierId,
        new_tier_id: newTierId,
        promotion_reason: reason
      });
    }

    await deleteCache(`sanliurfa:tier:user:${userId}`);

    logger.info('User tier updated', { userId, newTierId, previousTierId, reason });
    return true;
  } catch (error) {
    logger.error('Failed to update user tier', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getTierBenefits(tierId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:tier:benefits:${tierId}`;
    let benefits = await getCache(cacheKey);

    if (!benefits) {
      benefits = await queryOne(`
        SELECT
          id,
          tier_key,
          tier_name,
          tier_level,
          points_multiplier,
          exclusive_rewards,
          birthday_bonus,
          annual_gift_points,
          perks,
          color,
          icon_url,
          description
        FROM loyalty_tiers
        WHERE id = $1
      `, [tierId]);

      if (benefits) {
        await setCache(cacheKey, benefits, 3600);
      }
    }

    return benefits || null;
  } catch (error) {
    logger.error('Failed to get tier benefits', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getTierList(): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:tiers:list';
    let tiers = await getCache(cacheKey);

    if (!tiers) {
      tiers = await queryRows(`
        SELECT
          id,
          tier_key,
          tier_name,
          tier_level,
          min_points_required,
          points_multiplier,
          color,
          icon_url,
          description,
          display_order,
          is_active
        FROM loyalty_tiers
        WHERE is_active = true
        ORDER BY tier_level ASC
      `);

      if (tiers) {
        await setCache(cacheKey, tiers, 3600);
      }
    }

    return tiers;
  } catch (error) {
    logger.error('Failed to get tier list', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function processBirthdayBonus(userId: string): Promise<boolean> {
  try {
    const tierInfo = await getUserTierInfo(userId);
    if (!tierInfo || !tierInfo.birthday_bonus || tierInfo.birthday_bonus <= 0) {
      return false;
    }

    // Award birthday bonus points
    const points = await queryOne(
      'SELECT current_balance FROM loyalty_points WHERE user_id = $1',
      [userId]
    );

    if (!points) {
      return false;
    }

    const newBalance = points.current_balance + tierInfo.birthday_bonus;

    await update(
      'loyalty_points',
      { user_id: userId },
      {
        current_balance: newBalance,
        lifetime_earned: (points.lifetime_earned || 0) + tierInfo.birthday_bonus,
        last_earned_at: new Date()
      }
    );

    // Record transaction
    await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'birthday_bonus',
      points_amount: tierInfo.birthday_bonus,
      transaction_reason: 'Birthday bonus',
      balance_before: points.current_balance,
      balance_after: newBalance
    });

    await deleteCache(`sanliurfa:loyalty:points:${userId}`);

    logger.info('Birthday bonus awarded', { userId, bonus: tierInfo.birthday_bonus });
    return true;
  } catch (error) {
    logger.error('Failed to process birthday bonus', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function processAnnualReset(userId: string): Promise<boolean> {
  try {
    const tierInfo = await getUserTierInfo(userId);
    if (!tierInfo) {
      return false;
    }

    // Get annual gift points if applicable
    const annualGift = tierInfo.annual_gift_points || 0;

    // Get current points
    const points = await queryOne(
      'SELECT current_balance FROM loyalty_points WHERE user_id = $1',
      [userId]
    );

    if (!points) {
      return false;
    }

    // Reset points in tier but keep overall loyalty
    await insert('tier_reset_schedule', {
      user_id: userId,
      reset_date: new Date(),
      points_reset: points.current_balance,
      new_tier_id: tierInfo.current_tier_id,
      is_completed: true
    });

    // Optionally reset balance to 0 and award annual gift
    if (annualGift > 0) {
      await update(
        'loyalty_points',
        { user_id: userId },
        {
          current_balance: annualGift,
          lifetime_earned: (points.lifetime_earned || 0) + annualGift,
          pending_points: 0,
          last_earned_at: new Date()
        }
      );

      await insert('loyalty_transactions', {
        user_id: userId,
        transaction_type: 'annual_reset',
        points_amount: annualGift,
        transaction_reason: 'Annual gift points',
        balance_before: points.current_balance,
        balance_after: annualGift
      });
    }

    await deleteCache(`sanliurfa:loyalty:points:${userId}`);
    await deleteCache(`sanliurfa:tier:user:${userId}`);

    logger.info('Annual reset processed', { userId, annualGift });
    return true;
  } catch (error) {
    logger.error('Failed to process annual reset', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getUserTierHistory(userId: string, limit: number = 20): Promise<any[]> {
  try {
    const history = await queryRows(`
      SELECT
        th.*,
        pt.tier_name as previous_tier_name,
        nt.tier_name as new_tier_name
      FROM tier_history th
      LEFT JOIN loyalty_tiers pt ON th.previous_tier_id = pt.id
      LEFT JOIN loyalty_tiers nt ON th.new_tier_id = nt.id
      WHERE th.user_id = $1
      ORDER BY th.created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return history;
  } catch (error) {
    logger.error('Failed to get tier history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getTierStats(): Promise<any | null> {
  try {
    const cacheKey = 'sanliurfa:tier:stats';
    let stats = await getCache(cacheKey);

    if (!stats) {
      stats = await queryOne(`
        SELECT
          lt.tier_key,
          lt.tier_name,
          lt.tier_level,
          COUNT(utm.id) as member_count,
          AVG(lp.current_balance) as avg_points,
          MAX(lp.current_balance) as max_points,
          MIN(lp.current_balance) as min_points
        FROM loyalty_tiers lt
        LEFT JOIN user_tier_membership utm ON lt.id = utm.current_tier_id AND utm.is_active = true
        LEFT JOIN loyalty_points lp ON utm.user_id = lp.user_id
        WHERE lt.is_active = true
        GROUP BY lt.id, lt.tier_key, lt.tier_name, lt.tier_level
        ORDER BY lt.tier_level ASC
      `);

      if (stats) {
        await setCache(cacheKey, stats, 3600);
      }
    }

    return stats || null;
  } catch (error) {
    logger.error('Failed to get tier stats', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
