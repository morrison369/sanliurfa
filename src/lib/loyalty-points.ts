// @ts-nocheck
/**
 * Loyalty Points Module
 * Manages user loyalty points, transactions, and rewards
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

export interface LoyaltyPoints {
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'spend' | 'expire';
  description: string;
  createdAt: Date;
}

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'sanliurfa:loyalty';

/**
 * Get user's current loyalty points
 */
export async function getUserPoints(userId: string): Promise<LoyaltyPoints> {
  try {
    // Check cache first
    const cached = await getCache(`${CACHE_PREFIX}:balance:${userId}`);
    if (cached) {
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }

    // Fetch from database
    const result = await queryOne(
      `SELECT 
        COALESCE(current_balance, 0) as current_balance,
        COALESCE(lifetime_earned, 0) as lifetime_earned,
        COALESCE(lifetime_spent, 0) as lifetime_spent
      FROM user_loyalty 
      WHERE user_id = $1`,
      [userId]
    );

    if (!result) {
      return { currentBalance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
    }

    const points: LoyaltyPoints = {
      lifetimeEarned: parseInt(result.lifetime_earned || '0'),
      lifetimeSpent: parseInt(result.lifetime_spent || '0'),
      currentBalance: parseInt(result.current_balance || '0')
    };

    // Cache the result
    await setCache(`${CACHE_PREFIX}:balance:${userId}`, JSON.stringify(points), CACHE_TTL);

    return points;
  } catch (error) {
    logger.error('Failed to get user points', Object.assign(new Error('Failed to get user points'), { userId, error: error as Error }));
    return { currentBalance: 0, lifetimeEarned: 0, lifetimeSpent: 0 };
  }
}

/**
 * Award points to a user
 */
export async function awardPoints(
  userId: string, 
  points: number, 
  description: string,
  _type: string = 'manual',
  _referenceId?: string
): Promise<boolean> {
  try {
    // Insert transaction
    await insert('loyalty_transactions', {
      user_id: userId,
      points_amount: points,
      transaction_type: 'earn',
      transaction_reason: description,
      created_at: new Date().toISOString()
    });

    // Update user balance
    const existing = await queryOne('SELECT id FROM user_loyalty WHERE user_id = $1', [userId]);
    if (existing) {
      await update('user_loyalty', existing.id, {
        current_balance: { sql: 'current_balance + $1', params: [points] },
        lifetime_earned: { sql: 'lifetime_earned + $1', params: [points] }
      });
    } else {
      await insert('user_loyalty', {
        user_id: userId,
        current_balance: points,
        lifetime_earned: points,
        lifetime_spent: 0
      });
    }

    // Invalidate cache
    await deleteCache(`${CACHE_PREFIX}:balance:${userId}`);

    logger.info('Points awarded', { userId, points, description });
    return true;
  } catch (error) {
    logger.error('Failed to award points', Object.assign(new Error('Failed to award points'), { userId, points, error: error as Error }));
    return false;
  }
}

/**
 * Spend points from user's balance
 */
export async function spendPoints(
  userId: string,
  points: number,
  description: string,
  _referenceId?: string
): Promise<boolean> {
  try {
    // Check balance
    const balance = await getUserPoints(userId);
    if (balance.currentBalance < points) {
      return false;
    }

    // Insert transaction
    await insert('loyalty_transactions', {
      user_id: userId,
      points_amount: points,
      transaction_type: 'spend',
      transaction_reason: description,
      created_at: new Date().toISOString()
    });

    // Update user balance
    const existing = await queryOne('SELECT id FROM user_loyalty WHERE user_id = $1', [userId]);
    if (existing) {
      await update('user_loyalty', existing.id, {
        current_balance: { sql: 'current_balance - $1', params: [points] },
        lifetime_spent: { sql: 'lifetime_spent + $1', params: [points] }
      });
    }

    // Invalidate cache
    await deleteCache(`${CACHE_PREFIX}:balance:${userId}`);

    logger.info('Points spent', { userId, points, description });
    return true;
  } catch (error) {
    logger.error('Failed to spend points', Object.assign(new Error('Failed to spend points'), { userId, points, error: error as Error }));
    return false;
  }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(userId: string, limit: number = 50): Promise<LoyaltyTransaction[]> {
  try {
    const results = await queryMany(
      `SELECT id, user_id, points_amount as points, transaction_type as type, transaction_reason as description, created_at
       FROM loyalty_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    ) as any[];

    return results.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      points: Math.abs(parseInt(row.points)),
      type: row.type === 'spend' ? 'spend' : 'earn',
      description: row.description,
      createdAt: new Date(row.created_at)
    }));
  } catch (error) {
    logger.error('Failed to get transaction history', Object.assign(new Error('Failed to get transaction history'), { userId, error: error as Error }));
    return [];
  }
}

/**
 * Get leaderboard of top users by points
 */
export async function getLeaderboard(limit: number = 10): Promise<{ userId: string; balance: number }[]> {
  try {
    const results = await queryMany(
      `SELECT user_id, current_balance as balance
       FROM user_loyalty 
       WHERE current_balance > 0
       ORDER BY current_balance DESC
       LIMIT $1`,
      [limit]
    ) as any[];

    return results.map((row: any) => ({
      userId: row.user_id,
      balance: parseInt(row.balance)
    }));
  } catch (error) {
    logger.error('Failed to get leaderboard', Object.assign(new Error('Failed to get leaderboard'), { error: error as Error }));
    return [];
  }
}

// Legacy class-based API for backward compatibility
export class LoyaltyPointsManager {
  async getUserPoints(userId: string): Promise<LoyaltyPoints> {
    return getUserPoints(userId);
  }

  async addPoints(userId: string, points: number, description: string): Promise<boolean> {
    return awardPoints(userId, points, description);
  }

  async spendPoints(userId: string, points: number, description: string): Promise<boolean> {
    return spendPoints(userId, points, description);
  }

  async getTransactionHistory(userId: string, limit?: number): Promise<LoyaltyTransaction[]> {
    return getTransactionHistory(userId, limit);
  }
}

export const loyaltyPointsManager = new LoyaltyPointsManager();
