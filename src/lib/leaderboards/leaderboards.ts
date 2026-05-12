/**
 * Leaderboards Library
 * Leaderboard calculations and management
 */
import { query, queryOne, queryMany, insert } from '../postgres';
import { logger } from '../logger';

export async function getLeaderboard(leaderboardType: string, limit: number = 100, period: string = 'all_time'): Promise<any[]> {
  try {
    const users = await queryMany(`
      SELECT
        lb.rank,
        lb.score,
        u.id,
        u.full_name,
        u.email,
        r.trust_score
      FROM leaderboards lb
      JOIN users u ON lb.user_id = u.id
      LEFT JOIN user_reputation r ON u.id = r.user_id
      WHERE lb.leaderboard_type = $1 AND lb.period = $2
      ORDER BY lb.rank ASC
      LIMIT $3
    `, [leaderboardType, period, limit]);
    return users;
  } catch (error) {
    logger.error('Failed to get leaderboard', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getUserLeaderboardRank(userId: string, leaderboardType: string, period: string = 'all_time'): Promise<any> {
  try {
    const result = await queryOne(`
      SELECT rank, score FROM leaderboards
      WHERE user_id = $1 AND leaderboard_type = $2 AND period = $3
    `, [userId, leaderboardType, period]);

    if (!result) {
      return { rank: 0, score: 0 };
    }

    return {
      rank: result.rank,
      score: result.score
    };
  } catch (error) {
    logger.error('Failed to get user rank', error instanceof Error ? error : new Error(String(error)));
    return { rank: 0, score: 0 };
  }
}

export async function updateLeaderboard(leaderboardType: string, period: string = 'all_time'): Promise<void> {
  try {
    // Get all users with their scores based on leaderboard type
    let sql = '';
    
    if (leaderboardType === 'reputation') {
      sql = `
        SELECT u.id, r.total_score as score
        FROM users u
        LEFT JOIN user_reputation r ON u.id = r.user_id
        ORDER BY r.total_score DESC NULLS LAST
      `;
    } else if (leaderboardType === 'reviews') {
      sql = `
        SELECT u.id, COUNT(r.id) as score
        FROM users u
        LEFT JOIN reviews r ON u.id = r.user_id
        GROUP BY u.id
        ORDER BY score DESC
      `;
    } else if (leaderboardType === 'helpful') {
      sql = `
        SELECT u.id, r.helpful_score as score
        FROM users u
        LEFT JOIN user_reputation r ON u.id = r.user_id
        ORDER BY r.helpful_score DESC NULLS LAST
      `;
    }

    if (!sql) return;

    const rankings = await queryMany(sql) as any[];

    for (let i = 0; i < rankings.length; i++) {
      const user = rankings[i];
      // HARD RULE #47: atomic upsert — ON CONFLICT eliminates SELECT+INSERT/UPDATE race window
      await query(
        `INSERT INTO leaderboards (user_id, leaderboard_type, rank, score, period)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, leaderboard_type, period)
         DO UPDATE SET rank = EXCLUDED.rank, score = EXCLUDED.score, updated_at = NOW()`,
        [user.id, leaderboardType, i + 1, user.score, period]
      );
    }

    logger.info('Leaderboard updated', { leaderboardType, period, count: rankings.length });
  } catch (error) {
    logger.error('Failed to update leaderboard', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getLeaderboards(): Promise<string[]> {
  return ['reputation', 'reviews', 'helpful', 'community'];
}

export async function saveLeaderboardSnapshot(leaderboardType: string): Promise<void> {
  try {
    const topUsers = await getLeaderboard(leaderboardType, 100);

    await insert('leaderboard_snapshots', {
      leaderboard_type: leaderboardType,
      snapshot_date: new Date().toISOString().split('T')[0],
      top_users: JSON.stringify(topUsers)
    }, true);

    logger.info('Leaderboard snapshot saved', { leaderboardType });
  } catch (error) {
    logger.error('Failed to save snapshot', error instanceof Error ? error : new Error(String(error)));
  }
}


