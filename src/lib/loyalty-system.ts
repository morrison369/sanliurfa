/**
 * Loyalty System Core
 * Points management, tier progression, and balance tracking
 */

import { query, queryOne, queryMany, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { createNotification } from './notifications-queue';
import { logger } from './logging';

export interface LoyaltyBalance {
  id: string;
  user_id: string;
  total_points: number;
  available_points: number;
  redeemed_points: number;
  lifetime_points: number;
  current_tier: string;
  points_last_earned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  reason: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_points: number;
  max_points?: number;
  point_multiplier: number;
  benefits: Record<string, any>;
}

/**
 * Initialize loyalty balance for new user
 */
export async function initializeLoyaltyBalance(userId: string): Promise<LoyaltyBalance> {
  try {
    const balance = await insert('user_loyalty_balance', {
      user_id: userId,
      total_points: 0,
      available_points: 0,
      redeemed_points: 0,
      lifetime_points: 0,
      current_tier: 'bronze'
    });

    logger.info('Loyalty balance initialized', { userId });
    return balance;
  } catch (error) {
    logger.error('Failed to initialize loyalty balance', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get user's loyalty balance
 */
export async function getLoyaltyBalance(userId: string): Promise<LoyaltyBalance | null> {
  const cacheKey = `sanliurfa:loyalty:balance:${userId}`;

  try {
    const cached = await getCache<LoyaltyBalance>(cacheKey);
    if (cached) return cached;

    const balance = await queryOne('SELECT * FROM user_loyalty_balance WHERE user_id = $1', [userId]);
    if (balance) {
      await setCache(cacheKey, balance, 300);
    }
    return balance;
  } catch (error) {
    logger.error('Failed to get loyalty balance', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string
): Promise<{ transaction: LoyaltyTransaction; newBalance: LoyaltyBalance }> {
  try {
    // Get current balance
    let balance = await getLoyaltyBalance(userId);
    if (!balance) {
      balance = await initializeLoyaltyBalance(userId);
    }

    // Apply tier multiplier
    const tier = await getLoyaltyTier(balance.current_tier);
    const multiplier = tier?.point_multiplier || 1.0;
    const awardedAmount = Math.floor(amount * multiplier);

    // Create transaction
    const transaction = await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'earn',
      amount: awardedAmount,
      reason,
      reference_type: referenceType,
      reference_id: referenceId
    });

    // Update balance
    const updated = await update(
      'user_loyalty_balance',
      { user_id: userId },
      {
        total_points: balance.total_points + awardedAmount,
        available_points: balance.available_points + awardedAmount,
        lifetime_points: balance.lifetime_points + awardedAmount,
        points_last_earned_at: new Date(),
        updated_at: new Date()
      }
    );

    // Clear cache
    await deleteCache(`sanliurfa:loyalty:balance:${userId}`);

    // Check for tier promotion
    await checkAndPromoteTier(userId, updated.total_points);

    logger.info('Points awarded', { userId, amount: awardedAmount, reason });

    return {
      transaction,
      newBalance: updated
    };
  } catch (error) {
    logger.error('Failed to award points', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Redeem points
 */
export async function redeemPoints(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string
): Promise<{ transaction: LoyaltyTransaction; newBalance: LoyaltyBalance }> {
  try {
    const balance = await getLoyaltyBalance(userId);
    if (!balance || balance.available_points < amount) {
      throw new Error('Insufficient points');
    }

    // Create transaction
    const transaction = await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'redeem',
      amount,
      reason,
      reference_id: referenceId
    });

    // Update balance
    const updated = await update(
      'user_loyalty_balance',
      { user_id: userId },
      {
        available_points: balance.available_points - amount,
        redeemed_points: balance.redeemed_points + amount,
        updated_at: new Date()
      }
    );

    // Clear cache
    await deleteCache(`sanliurfa:loyalty:balance:${userId}`);

    logger.info('Points redeemed', { userId, amount, reason });

    return {
      transaction,
      newBalance: updated
    };
  } catch (error) {
    logger.error('Failed to redeem points', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get loyalty tier info
 */
export async function getLoyaltyTier(tierName: string): Promise<LoyaltyTier | null> {
  try {
    const tier = await queryOne('SELECT * FROM loyalty_tiers WHERE tier_name = $1', [tierName]);
    return tier;
  } catch (error) {
    logger.error('Failed to get loyalty tier', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get all tiers
 */
export async function getAllLoyaltyTiers(): Promise<LoyaltyTier[]> {
  const cacheKey = 'sanliurfa:loyalty:tiers:all';

  try {
    const cached = await getCache<LoyaltyTier[]>(cacheKey);
    if (cached) return cached;

    const tiers = await queryMany('SELECT * FROM loyalty_tiers ORDER BY tier_level ASC');
    await setCache(cacheKey, tiers.rows, 3600);
    return tiers.rows;
  } catch (error) {
    logger.error('Failed to get loyalty tiers', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check and promote tier if applicable
 */
export async function checkAndPromoteTier(userId: string, currentPoints: number): Promise<void> {
  try {
    const balance = await getLoyaltyBalance(userId);
    if (!balance) return;

    // Get next tier based on points
    const tiers = await getAllLoyaltyTiers();
    let newTier = balance.current_tier;

    for (const tier of tiers) {
      if (currentPoints >= tier.min_points && (!tier.max_points || currentPoints < tier.max_points)) {
        newTier = tier.tier_name;
        break;
      }
    }

    // If tier changed, update and notify
    if (newTier !== balance.current_tier) {
      await update(
        'user_loyalty_balance',
        { user_id: userId },
        { current_tier: newTier, updated_at: new Date() }
      );

      // Record tier promotion
      await insert('user_tier_history', {
        user_id: userId,
        previous_tier: balance.current_tier,
        new_tier: newTier,
        milestone_points: currentPoints
      });

      // Clear cache
      await deleteCache(`sanliurfa:loyalty:balance:${userId}`);

      // Send notification
      await createNotification(
        userId,
        `Tebrikler! ${newTier} seviyesine yükseldiniz`,
        'Daha fazla avantajı açın ve eksklusif ödüllerden faydalanın',
        'success'
      );

      logger.info('User promoted to tier', { userId, newTier, points: currentPoints });
    }
  } catch (error) {
    logger.error('Failed to check tier promotion', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get user transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: LoyaltyTransaction[]; total: number }> {
  try {
    const transactions = await queryMany(
      `SELECT * FROM loyalty_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne(
      'SELECT COUNT(*) as total FROM loyalty_transactions WHERE user_id = $1',
      [userId]
    );

    return {
      transactions: transactions.rows,
      total: parseInt(countResult?.total || '0')
    };
  } catch (error) {
    logger.error('Failed to get transaction history', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get points earning rules
 */
export async function getPointsEarningRules(): Promise<any[]> {
  const cacheKey = 'sanliurfa:loyalty:earning-rules:all';

  try {
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const rules = await queryMany('SELECT * FROM points_earning_rules WHERE enabled = true');
    await setCache(cacheKey, rules.rows, 3600);
    return rules.rows;
  } catch (error) {
    logger.error('Failed to get earning rules', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get points for activity
 */
export async function getPointsForActivity(activityType: string, baseMultiplier: number = 1.0): Promise<number> {
  try {
    const rule = await queryOne(
      'SELECT base_points, multiplier FROM points_earning_rules WHERE activity_type = $1 AND enabled = true',
      [activityType]
    );

    if (!rule) return 0;

    return Math.floor(rule.base_points * rule.multiplier * baseMultiplier);
  } catch (error) {
    logger.error('Failed to get points for activity', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Check active bonus campaigns
 */
export async function getActiveBonusCampaigns(): Promise<any[]> {
  try {
    const now = new Date().toISOString();
    const campaigns = await queryMany(
      `SELECT * FROM bonus_point_campaigns
       WHERE status = 'active' AND start_date <= $1 AND end_date >= $1
       ORDER BY bonus_multiplier DESC`,
      [now]
    );
    return campaigns.rows;
  } catch (error) {
    logger.error('Failed to get bonus campaigns', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
