/**
 * Search Engine Library
 * Full-text search, filtering, and ranking
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

export async function searchPlaces(
  query: string,
  filters?: any,
  sortBy: string = 'relevance',
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    let sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.city,
        p.district,
        p.latitude,
        p.longitude,
        p.rating,
        p.review_count,
        p.created_at,
        ts_rank(
          to_tsvector('turkish', p.name || ' ' || COALESCE(p.description, '')),
          plainto_tsquery('turkish', $1)
        ) as relevance_score
      FROM places p
      WHERE to_tsvector('turkish', p.name || ' ' || COALESCE(p.description, ''))
            @@ plainto_tsquery('turkish', $1)
    `;

    const params: any[] = [query];
    let paramIndex = 2;

    // Add filters
    if (filters?.category) {
      sql += ` AND p.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.minRating) {
      sql += ` AND p.rating >= $${paramIndex}`;
      params.push(filters.minRating);
      paramIndex++;
    }

    if (filters?.city) {
      sql += ` AND p.city = $${paramIndex}`;
      params.push(filters.city);
      paramIndex++;
    }

    // Sorting
    if (sortBy === 'rating') {
      sql += ' ORDER BY p.rating DESC, p.review_count DESC';
    } else if (sortBy === 'newest') {
      sql += ' ORDER BY p.created_at DESC';
    } else if (sortBy === 'reviews') {
      sql += ' ORDER BY p.review_count DESC';
    } else {
      sql += ' ORDER BY relevance_score DESC, p.rating DESC';
    }

    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const results = await queryRows(sql, params);
    return results;
  } catch (error) {
    logger.error('Search places failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function searchReviews(
  query: string,
  filters?: any,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    let sql = `
      SELECT
        r.id,
        r.title,
        r.content,
        r.rating,
        r.user_id,
        r.place_id,
        r.created_at,
        u.full_name as user_name,
        p.name as place_name,
        ts_rank(
          to_tsvector('turkish', r.title || ' ' || r.content),
          plainto_tsquery('turkish', $1)
        ) as relevance_score
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN places p ON r.place_id = p.id
      WHERE to_tsvector('turkish', r.title || ' ' || r.content)
            @@ plainto_tsquery('turkish', $1)
    `;

    const params: any[] = [query];
    let paramIndex = 2;

    if (filters?.minRating) {
      sql += ` AND r.rating >= $${paramIndex}`;
      params.push(filters.minRating);
      paramIndex++;
    }

    if (filters?.placeId) {
      sql += ` AND r.place_id = $${paramIndex}`;
      params.push(filters.placeId);
      paramIndex++;
    }

    sql += ` ORDER BY relevance_score DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const results = await queryRows(sql, params);
    return results;
  } catch (error) {
    logger.error('Search reviews failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function searchEvents(
  query: string,
  filters?: any,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    let sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.city,
        e.category,
        e.created_at,
        ts_rank(
          to_tsvector('turkish', e.title || ' ' || COALESCE(e.description, '')),
          plainto_tsquery('turkish', $1)
        ) as relevance_score
      FROM events e
      WHERE to_tsvector('turkish', e.title || ' ' || COALESCE(e.description, ''))
            @@ plainto_tsquery('turkish', $1)
    `;

    const params: any[] = [query];
    let paramIndex = 2;

    if (filters?.category) {
      sql += ` AND e.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.city) {
      sql += ` AND e.city = $${paramIndex}`;
      params.push(filters.city);
      paramIndex++;
    }

    if (filters?.upcomingOnly) {
      sql += ` AND e.event_date >= NOW()`;
    }

    sql += ` ORDER BY relevance_score DESC, e.event_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const results = await queryRows(sql, params);
    return results;
  } catch (error) {
    logger.error('Search events failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordSearchQuery(
  userId: string | undefined,
  searchQuery: string,
  searchType: string,
  resultCount: number,
  filters?: any
): Promise<void> {
  try {
    await insert('search_history', {
      user_id: userId,
      search_query: searchQuery,
      search_type: searchType,
      result_count: resultCount,
      filters: filters ? JSON.stringify(filters) : null
    });

    // Update analytics
    const existing = await queryOne(
      'SELECT id FROM search_analytics WHERE search_query = $1 AND search_type = $2',
      [searchQuery, searchType]
    );

    if (existing) {
      await update('search_analytics', { search_query: searchQuery, search_type: searchType }, {
        search_count: (await queryOne(
          'SELECT COUNT(*) as count FROM search_history WHERE search_query = $1 AND search_type = $2',
          [searchQuery, searchType]
        )).count || 0,
        last_searched_at: new Date()
      });
    } else {
      await insert('search_analytics', {
        search_query: searchQuery,
        search_type: searchType,
        search_count: 1,
        avg_result_count: resultCount,
        last_searched_at: new Date()
      });
    }
  } catch (error) {
    logger.error('Failed to record search', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getTrendingSearches(searchType: string = 'places', limit: number = 10): Promise<any[]> {
  try {
    const results = await queryRows(`
      SELECT
        search_query,
        search_count,
        trend_score,
        last_searched_at
      FROM search_analytics
      WHERE search_type = $1 AND is_trending = true
      ORDER BY trend_score DESC
      LIMIT $2
    `, [searchType, limit]);
    return results;
  } catch (error) {
    logger.error('Failed to get trending searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getSearchFilters(searchType: string): Promise<any[]> {
  try {
    const filters = await queryRows(`
      SELECT
        filter_key,
        filter_label,
        filter_values
      FROM search_filters
      WHERE search_type = $1 AND is_active = true
      ORDER BY display_order ASC
    `, [searchType]);
    return filters;
  } catch (error) {
    logger.error('Failed to get search filters', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordSearchClick(
  searchQuery: string,
  resultId: string,
  resultType: string,
  position: number,
  dwellTime: number = 0,
  userId?: string
): Promise<void> {
  try {
    await insert('search_clicks', {
      search_query: searchQuery,
      result_id: resultId,
      result_type: resultType,
      user_id: userId,
      position,
      dwell_time_seconds: dwellTime
    });
  } catch (error) {
    logger.error('Failed to record search click', error instanceof Error ? error : new Error(String(error)));
  }
}
