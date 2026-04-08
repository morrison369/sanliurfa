/**
 * Loyalty Points Library
 * Points earning, spending, and transaction management
 */
import { query, queryOne, queryMany, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export async function getUserPoints(userId: string): Promise<any> {
  const cacheKey = `sanliurfa:loyalty:balance:${userId}`;

  try {
    // Check cache first (optimized)
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    let points = await queryOne('SELECT * FROM loyalty_points WHERE user_id = $1', [userId]);

    if (!points) {
      await insert('loyalty_points', { user_id: userId });
      points = await queryOne('SELECT * FROM loyalty_points WHERE user_id = $1', [userId]);
    }

    const result = {
      currentBalance: points.current_balance,
      lifetimeEarned: points.lifetime_earned,
      lifetimeSpent: points.lifetime_spent,
      pendingPoints: points.pending_points,
      lastEarned: points.last_earned_at
    };

    // Cache for 5 minutes (300s)
    await setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    logger.error('Failed to get user points', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function awardPoints(userId: string, points: number, reason: string, relatedEntityType?: string, relatedEntityId?: string, expiryDays?: number): Promise<boolean> {
  try {
    const userPoints = await queryOne('SELECT current_balance FROM loyalty_points WHERE user_id = $1', [userId]);
    if (!userPoints) {
      await insert('loyalty_points', { user_id: userId });
    }

    const newBalance = (userPoints?.current_balance || 0) + points;
    const expiresAt = expiryDays ? new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000)) : null;

    await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'earn',
      points_amount: points,
      transaction_reason: reason,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      balance_before: userPoints?.current_balance || 0,
      balance_after: newBalance,
      expires_at: expiresAt
    });

    await update('loyalty_points', { user_id: userId }, {
      current_balance: newBalance,
      lifetime_earned: (userPoints?.lifetime_earned || 0) + points,
      last_earned_at: new Date(),
      updated_at: new Date()
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:loyalty:balance:${userId}`);

    logger.info('Points awarded', { userId, points, reason });
    return true;
  } catch (error) {
    logger.error('Failed to award points', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function spendPoints(userId: string, points: number, reason: string, relatedEntityId?: string): Promise<boolean> {
  try {
    const userPoints = await queryOne('SELECT current_balance FROM loyalty_points WHERE user_id = $1', [userId]);
    if (!userPoints) {
      logger.warn('User has no points account', { userId });
      return false;
    }

    if (userPoints.current_balance < points) {
      logger.warn('Insufficient points', { userId, available: userPoints.current_balance, required: points });
      return false;
    }

    const newBalance = userPoints.current_balance - points;

    await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'spend',
      points_amount: points,
      transaction_reason: reason,
      related_entity_id: relatedEntityId,
      balance_before: userPoints.current_balance,
      balance_after: newBalance
    });

    await update('loyalty_points', { user_id: userId }, {
      current_balance: newBalance,
      lifetime_spent: (userPoints.lifetime_spent || 0) + points,
      last_spent_at: new Date(),
      updated_at: new Date()
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:loyalty:balance:${userId}`);

    logger.info('Points spent', { userId, points, reason });
    return true;
  } catch (error) {
    logger.error('Failed to spend points', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getPointsHistory(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const history = await queryMany(`
      SELECT
        id,
        transaction_type,
        points_amount,
        transaction_reason,
        balance_before,
        balance_after,
        created_at
      FROM loyalty_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return history;
  } catch (error) {
    logger.error('Failed to get points history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getEarningRules(): Promise<any[]> {
  try {
    const rules = await queryMany(`
      SELECT * FROM earning_rules
      WHERE is_active = true
      ORDER BY rule_name
    `);
    return rules;
  } catch (error) {
    logger.error('Failed to get earning rules', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function expirePoints(): Promise<number> {
  try {
    const result = await queryOne(`
      UPDATE loyalty_transactions
      SET is_expired = true
      WHERE expires_at < NOW() AND is_expired = false
      RETURNING COUNT(*) as count
    `);

    const count = parseInt(result?.count || '0');
    if (count > 0) {
      logger.info('Expired points', { count });
    }
    return count;
  } catch (error) {
    logger.error('Failed to expire points', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}
