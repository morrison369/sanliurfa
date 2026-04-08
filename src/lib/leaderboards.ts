/**
 * Leaderboards Library
 * Leaderboard calculations and management
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';

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
    let query = '';
    
    if (leaderboardType === 'reputation') {
      query = `
        SELECT u.id, r.total_score as score
        FROM users u
        LEFT JOIN user_reputation r ON u.id = r.user_id
        ORDER BY r.total_score DESC NULLS LAST
      `;
    } else if (leaderboardType === 'reviews') {
      query = `
        SELECT u.id, COUNT(r.id) as score
        FROM users u
        LEFT JOIN reviews r ON u.id = r.user_id
        GROUP BY u.id
        ORDER BY score DESC
      `;
    } else if (leaderboardType === 'helpful') {
      query = `
        SELECT u.id, r.helpful_score as score
        FROM users u
        LEFT JOIN user_reputation r ON u.id = r.user_id
        ORDER BY r.helpful_score DESC NULLS LAST
      `;
    }

    if (!query) return;

    const rankings = await queryMany(query);

    for (let i = 0; i < rankings.length; i++) {
      const user = rankings[i];
      const existing = await queryOne(
        'SELECT id FROM leaderboards WHERE user_id = $1 AND leaderboard_type = $2 AND period = $3',
        [user.id, leaderboardType, period]
      );

      if (existing) {
        await update('leaderboards', { user_id: user.id, leaderboard_type: leaderboardType, period }, {
          rank: i + 1,
          score: user.score,
          updated_at: new Date()
        });
      } else {
        await insert('leaderboards', {
          leaderboard_type: leaderboardType,
          user_id: user.id,
          rank: i + 1,
          score: user.score,
          period
        });
      }
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
