import { pool } from './postgres';
import { logger } from './logging';
import { prefixKey, deleteCache } from './cache';

export async function saveSear (userId: string, name: string, query: string, filters?: any): Promise<string | null> {
  try {
    const result = await pool.query(
      `INSERT INTO saved_searches (user_id, name, query, filters) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name) DO UPDATE SET query = $3, filters = $4
       RETURNING id`,
      [userId, name, query, filters || null]
    );
    await deleteCache(prefixKey(`saved_searches:${userId}`));
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Save search failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getUserSavedSearches(userId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, name, query, filters, created_at FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Get saved searches failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function deleteSavedSearch(id: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM saved_searches WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if ((result.rowCount || 0) > 0) {
      await deleteCache(prefixKey(`saved_searches:${userId}`));
    }
    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Delete saved search failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
