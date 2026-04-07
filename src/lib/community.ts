import { pool } from './postgres';
import { logger } from './logging';

export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [followerId, followingId]
    );
    return true;
  } catch (error) {
    logger.error('Follow failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    await pool.query(
      `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    return true;
  } catch (error) {
    logger.error('Unfollow failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getFollowers(userId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name FROM users u
       JOIN user_follows uf ON u.id = uf.follower_id
       WHERE uf.following_id = $1`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Get followers failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getFollowing(userId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name FROM users u
       JOIN user_follows uf ON u.id = uf.following_id
       WHERE uf.follower_id = $1`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Get following failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function grantBadge(userId: string, badge_type: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO user_badges (user_id, badge_type) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, badge_type]
    );
    return true;
  } catch (error) {
    logger.error('Badge grant failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function voteReview(review_id: string, user_id: string, helpful: boolean): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO review_votes (review_id, user_id, helpful) VALUES ($1, $2, $3)
       ON CONFLICT (review_id, user_id) DO UPDATE SET helpful = $3`,
      [review_id, user_id, helpful]
    );
    return true;
  } catch (error) {
    logger.error('Review vote failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function addReviewComment(review_id: string, user_id: string, text: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO review_comments (review_id, user_id, text) VALUES ($1, $2, $3)`,
      [review_id, user_id, text]
    );
    return true;
  } catch (error) {
    logger.error('Comment add failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
