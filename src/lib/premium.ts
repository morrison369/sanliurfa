import { pool } from './postgres';
import { logger } from './logging';

export type MembershipTier = 'free' | 'premium' | 'pro';

export async function getUserMembership(userId: string): Promise<{ tier: MembershipTier; status: string } | null> {
  try {
    const result = await pool.query(
      `SELECT tier, status FROM memberships WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || { tier: 'free', status: 'active' };
  } catch (error) {
    logger.error('Membership lookup failed', error instanceof Error ? error : new Error(String(error)));
    return { tier: 'free', status: 'active' };
  }
}

export async function isPremium(userId: string): Promise<boolean> {
  const membership = await getUserMembership(userId);
  return membership?.tier === 'premium' || membership?.tier === 'pro';
}

export async function upgradeMembership(userId: string, tier: MembershipTier): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO memberships (user_id, tier, status, started_at, expires_at)
       VALUES ($1, $2, 'active', NOW(), $3)
       ON CONFLICT (user_id) DO UPDATE SET tier = $2, expires_at = $3`,
      [userId, tier, expiresAt]
    );
    logger.info('Membership upgraded', { userId, tier });
    return true;
  } catch (error) {
    logger.error('Membership upgrade failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export const PREMIUM_FEATURES = {
  adFree: true,
  advancedFilters: true,
  analyticsAccess: true,
  dataExport: true,
  earlyAccess: true
};
