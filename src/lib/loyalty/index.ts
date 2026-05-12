/**
 * Loyalty & Rewards System
 * Points, tiers, badges, and rewards
 */

import { query } from '../postgres';

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints?: number;
  benefits: string[];
  multiplier: number;
}

export interface LoyaltyPoints {
  userId: string;
  total: number;
  available: number;
  lifetime: number;
  tier: string;
}

// Predefined tiers
const TIERS: LoyaltyTier[] = [
  { id: 'bronze', name: 'Bronz', minPoints: 0, maxPoints: 999, benefits: ['%5 indirim'], multiplier: 1 },
  { id: 'silver', name: 'Gumus', minPoints: 1000, maxPoints: 4999, benefits: ['%10 indirim'], multiplier: 1.2 },
  { id: 'gold', name: 'Altin', minPoints: 5000, maxPoints: 9999, benefits: ['%15 indirim'], multiplier: 1.5 },
  { id: 'platinum', name: 'Platin', minPoints: 10000, benefits: ['%20 indirim'], multiplier: 2 },
];

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  points: number,
  _reason: string
): Promise<void> {
  await query(
    `UPDATE users 
     SET loyalty_points = COALESCE(loyalty_points, 0) + $1,
         loyalty_points_lifetime = COALESCE(loyalty_points_lifetime, 0) + $1
     WHERE id = $2`,
    [points, userId]
  );
}

/**
 * Get user's loyalty points
 */
export async function getLoyaltyPoints(userId: string): Promise<LoyaltyPoints> {
  const result = await query(
    `SELECT loyalty_points, loyalty_points_lifetime, loyalty_tier
     FROM users WHERE id = $1`,
    [userId]
  );

  const row = result.rows[0] || {};
  
  return {
    userId,
    total: parseInt(row.loyalty_points, 10) || 0,
    available: parseInt(row.loyalty_points, 10) || 0,
    lifetime: parseInt(row.loyalty_points_lifetime, 10) || 0,
    tier: row.loyalty_tier || 'bronze'
  };
}

/**
 * Get all tiers
 */
export function getTiers(): LoyaltyTier[] {
  return TIERS;
}
