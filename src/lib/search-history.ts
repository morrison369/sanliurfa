/**
 * Search History Library
 * User search history and saved searches
 */
import { query, queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

export async function getSearchHistory(userId: string, limit: number = 20): Promise<any[]> {
  try {
    const history = await queryRows(`
      SELECT
        id,
        search_query,
        search_type,
        result_count,
        filters,
        created_at
      FROM search_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return history;
  } catch (error) {
    logger.error('Failed to get search history', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function clearSearchHistory(userId: string, beforeDate?: Date): Promise<void> {
  try {
    let sql = 'DELETE FROM search_history WHERE user_id = $1';
    const params: any[] = [userId];

    if (beforeDate) {
      sql += ' AND created_at < $2';
      params.push(beforeDate);
    }

    await queryOne(sql, params);
    logger.info('Search history cleared', { userId });
  } catch (error) {
    logger.error('Failed to clear search history', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function saveSearch(
  userId: string,
  searchName: string,
  searchQuery: string,
  searchType: string,
  filters?: any
): Promise<string> {
  try {
    const id = crypto.randomUUID();
    await insert('saved_searches', {
      id,
      user_id: userId,
      search_name: searchName,
      search_query: searchQuery,
      search_type: searchType,
      filters: filters ? JSON.stringify(filters) : null
    });

    logger.info('Search saved', { userId, searchName });
    return id;
  } catch (error) {
    logger.error('Failed to save search', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getSavedSearches(userId: string, favoriteOnly: boolean = false): Promise<any[]> {
  try {
    let query = `
      SELECT id, search_name, search_query, search_type, filters, is_favorite, last_result_count, created_at
      FROM saved_searches
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (favoriteOnly) {
      query += ` AND is_favorite = true`;
    }

    query += ` ORDER BY ${favoriteOnly ? 'created_at DESC' : 'is_favorite DESC, created_at DESC'}`;

    const searches = await queryRows(query, params);
    return searches;
  } catch (error) {
    logger.error('Failed to get saved searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function toggleSavedSearchFavorite(savedSearchId: string, userId: string): Promise<void> {
  try {
    const search = await queryOne(
      'SELECT is_favorite FROM saved_searches WHERE id = $1 AND user_id = $2',
      [savedSearchId, userId]
    );

    if (!search) throw new Error('Saved search not found');

    await update('saved_searches', { id: savedSearchId }, {
      is_favorite: !search.is_favorite,
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to toggle favorite', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function deleteSavedSearch(savedSearchId: string, userId: string): Promise<void> {
  try {
    const search = await queryOne(
      'SELECT id FROM saved_searches WHERE id = $1 AND user_id = $2',
      [savedSearchId, userId]
    );

    if (!search) throw new Error('Saved search not found');

    await query('DELETE FROM saved_searches WHERE id = $1', [savedSearchId]);
    logger.info('Saved search deleted', { savedSearchId, userId });
  } catch (error) {
    logger.error('Failed to delete saved search', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function updateSavedSearchResults(savedSearchId: string, resultCount: number): Promise<void> {
  try {
    await update('saved_searches', { id: savedSearchId }, {
      last_result_count: resultCount,
      last_run_at: new Date(),
      updated_at: new Date()
    });
  } catch (error) {
    logger.error('Failed to update saved search results', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getRecentSearches(userId: string | undefined, limit: number = 5): Promise<string[]> {
  try {
    if (!userId) {
      // Return global trending for anonymous users
      const trending = await queryRows(`
        SELECT DISTINCT search_query FROM search_analytics
        WHERE is_trending = true
        ORDER BY trend_score DESC
        LIMIT $1
      `, [limit]);
      return trending.map((t: any) => t.search_query);
    }

    const recent = await queryRows(`
      SELECT DISTINCT search_query FROM search_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return recent.map((r: any) => r.search_query);
  } catch (error) {
    logger.error('Failed to get recent searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
