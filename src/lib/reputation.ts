/**
 * Reputation System Library
 * User reputation calculation and management
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

export async function getUserReputation(userId: string): Promise<any> {
  try {
    let rep = await queryOne('SELECT * FROM user_reputation WHERE user_id = $1', [userId]);

    if (!rep) {
      await insert('user_reputation', { user_id: userId });
      rep = await queryOne('SELECT * FROM user_reputation WHERE user_id = $1', [userId]);
    }

    return {
      totalScore: rep.total_score,
      reviewScore: rep.review_score,
      commentScore: rep.comment_score,
      helpfulScore: rep.helpful_score,
      communityScore: rep.community_score,
      trustScore: rep.trust_score,
      lastUpdated: rep.last_updated_at
    };
  } catch (error) {
    logger.error('Failed to get reputation', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function addReputationScore(userId: string, scoreType: string, points: number): Promise<void> {
  try {
    const rep = await queryOne('SELECT * FROM user_reputation WHERE user_id = $1', [userId]);

    if (!rep) {
      await insert('user_reputation', { user_id: userId });
    }

    const updates: any = { last_updated_at: new Date() };

    switch (scoreType) {
      case 'review':
        updates.review_score = (rep?.review_score || 0) + points;
        break;
      case 'comment':
        updates.comment_score = (rep?.comment_score || 0) + points;
        break;
      case 'helpful':
        updates.helpful_score = (rep?.helpful_score || 0) + points;
        break;
      case 'community':
        updates.community_score = (rep?.community_score || 0) + points;
        break;
    }

    updates.total_score = (rep?.total_score || 0) + points;

    // Update trust score based on reputation
    updates.trust_score = Math.min(100, 50 + (updates.total_score / 10));

    await update('user_reputation', { user_id: userId }, updates);

    logger.info('Reputation score added', { userId, scoreType, points });
  } catch (error) {
    logger.error('Failed to add reputation score', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getRepuationTier(totalScore: number): string {
  if (totalScore < 100) return 'Yeni Üye';
  if (totalScore < 500) return 'Aktif Üye';
  if (totalScore < 1000) return 'Katkıda Bulunan';
  if (totalScore < 2500) return 'Uzman';
  if (totalScore < 5000) return 'Yıldız Uzman';
  return 'Efsanevi';
}

export async function calculateTrustScore(userId: string): Promise<number> {
  try {
    // Get reputation metrics
    const rep = await queryOne(`
      SELECT total_score, helpful_score FROM user_reputation WHERE user_id = $1
    `, [userId]);

    if (!rep) return 50;

    // Get activity metrics
    const activity = await queryOne(`
      SELECT
        COUNT(DISTINCT r.id) as review_count,
        COUNT(DISTINCT c.id) as comment_count
      FROM reviews r
      LEFT JOIN comments c ON r.user_id = c.user_id
      WHERE r.user_id = $1 OR c.user_id = $1
    `, [userId]);

    // Trust score formula: base score + reputation factor + activity factor
    let trustScore = 50;

    // Reputation factor (max +30)
    trustScore += Math.min(30, rep.total_score / 100);

    // Helpful factor (max +15)
    trustScore += Math.min(15, rep.helpful_score / 50);

    // Activity factor (max +5)
    const totalActivity = (activity?.review_count || 0) + (activity?.comment_count || 0);
    trustScore += Math.min(5, totalActivity / 50);

    // Cap at 100
    return Math.min(100, trustScore);
  } catch (error) {
    logger.error('Failed to calculate trust score', error instanceof Error ? error : new Error(String(error)));
    return 50;
  }
}

export async function getUserReputationRank(userId: string): Promise<number> {
  try {
    const result = await queryOne(`
      SELECT COUNT(*) as rank FROM user_reputation
      WHERE total_score > (SELECT total_score FROM user_reputation WHERE user_id = $1)
    `, [userId]);

    return (result?.rank || 0) + 1;
  } catch (error) {
    logger.error('Failed to get reputation rank', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

export async function awardReputation(userId: string, reason: string, points: number): Promise<void> {
  try {
    await addReputationScore(userId, 'community', points);
    logger.info('Reputation awarded', { userId, reason, points });
  } catch (error) {
    logger.error('Failed to award reputation', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getTopUsers(limit: number = 10): Promise<any[]> {
  try {
    const users = await queryMany(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        r.total_score,
        r.trust_score,
        COUNT(DISTINCT rev.id) as review_count
      FROM users u
      LEFT JOIN user_reputation r ON u.id = r.user_id
      LEFT JOIN reviews rev ON u.id = rev.user_id
      GROUP BY u.id, r.id
      ORDER BY r.total_score DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    return users;
  } catch (error) {
    logger.error('Failed to get top users', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
