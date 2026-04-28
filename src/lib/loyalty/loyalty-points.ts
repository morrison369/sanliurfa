/**
 * Loyalty Points Library
 * Points earning, spending, and transaction management
 */
import { queryOne, queryMany, insert } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';
import { logger } from '../logger';

export async function getUserPoints(userId: string): Promise<any> {
  const cacheKey = `loyalty:balance:${userId}`;

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
    const expiresAt = expiryDays ? new Date(Date.now() + (expiryDays * 24 * 60 * 60 * 1000)) : null;

    // Atomic upsert: INSERT for new users, UPDATE for existing.
    // ON CONFLICT serializes concurrent awards via PostgreSQL row-level lock.
    const result = await queryOne<{ current_balance: number; balance_before: number }>(
      `INSERT INTO loyalty_points (user_id, current_balance, lifetime_earned, last_earned_at, updated_at)
       VALUES ($1, $2, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         current_balance = loyalty_points.current_balance + $2,
         lifetime_earned = loyalty_points.lifetime_earned + $2,
         last_earned_at  = NOW(),
         updated_at      = NOW()
       RETURNING current_balance, (current_balance - $2) AS balance_before`,
      [userId, points]
    );

    if (!result) {
      logger.warn('awardPoints: upsert returned no row', Object.assign(new Error('no row'), { userId, points }));
      return false;
    }

    await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'earn',
      points_amount: points,
      transaction_reason: reason,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      balance_before: result.balance_before,
      balance_after: result.current_balance,
      expires_at: expiresAt
    });

    // Invalidate cache
    await deleteCache(`loyalty:balance:${userId}`);

    logger.info('Points awarded', { userId, points, reason });
    return true;
  } catch (error) {
    logger.error('Failed to award points', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function spendPoints(userId: string, points: number, reason: string, relatedEntityId?: string): Promise<boolean> {
  try {
    // Atomic check-and-deduct: WHERE current_balance >= $1 prevents negative balance race condition.
    // PostgreSQL row-level lock serializes concurrent spend requests for the same user.
    const result = await queryOne<{ current_balance: number; balance_before: number }>(
      `UPDATE loyalty_points
       SET current_balance  = current_balance  - $1,
           lifetime_spent   = COALESCE(lifetime_spent, 0) + $1,
           last_spent_at    = NOW(),
           updated_at       = NOW()
       WHERE user_id = $2 AND current_balance >= $1
       RETURNING current_balance, (current_balance + $1) AS balance_before`,
      [points, userId]
    );

    if (!result) {
      logger.warn('Insufficient points or no account', Object.assign(new Error('Insufficient points or no account'), { userId, required: points }));
      return false;
    }

    await insert('loyalty_transactions', {
      user_id: userId,
      transaction_type: 'spend',
      points_amount: points,
      transaction_reason: reason,
      related_entity_id: relatedEntityId,
      balance_before: result.balance_before,
      balance_after: result.current_balance,
    });

    // Invalidate cache
    await deleteCache(`loyalty:balance:${userId}`);

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



