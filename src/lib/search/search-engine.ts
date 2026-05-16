/**
 * Search Engine Library
 * Full-text search, filtering, and ranking
 */
import { queryOne, queryMany, queryReadMany, insert, update } from '../postgres';
import { logger } from '../logger';
import { hasColumn, pickFirstExistingColumn } from './schema-compat';
import { searchCuratedPlaceFallbacks } from '../../data/curated-place-fallbacks';
import {
  canonicalizeSearchQuery,
  expandSearchQueryVariants,
  normalizeSearchQuery,
  normalizeTurkishSearchText,
} from './search-normalization';

export async function searchPlaces(
  query: string,
  filters?: any,
  sortBy: string = 'relevance',
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const searchVariants = expandSearchQueryVariants(query);
    const [hasPlacesCity, hasPlacesDistrict, hasSearchVector] = await Promise.all([
      hasColumn('places', 'city'),
      hasColumn('places', 'district'),
      hasColumn('places', 'search_vector'),
    ]);

    const tsvec = hasSearchVector
      ? 'p.search_vector'
      : "to_tsvector('turkish', p.name || ' ' || COALESCE(p.description, ''))";

    // Two-stage match: (1) Turkish unaccent tsvector for stemmed search,
    // (2) accent-insensitive ILIKE on normalized text — catches "balik" → "Balıklıgöl".
    for (const searchVariant of searchVariants) {
      const normalizedQuery = normalizeSearchQuery(searchVariant);
      const normalizedLookup = normalizeTurkishSearchText(searchVariant);
      let sql = `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.short_description,
          p.image_url,
          p.category,
          ${hasPlacesCity ? 'p.city' : 'NULL::text AS city'},
          ${hasPlacesDistrict ? 'p.district' : 'NULL::text AS district'},
          p.latitude,
          p.longitude,
          p.rating,
          p.review_count,
          p.created_at,
          GREATEST(
            ts_rank(
              ${tsvec},
              plainto_tsquery('turkish', $1)
            ),
            CASE WHEN LOWER(p.name) LIKE '%' || $1 || '%' THEN 0.9 ELSE 0 END,
            CASE WHEN translate(LOWER(COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%' THEN 0.5 ELSE 0 END
          ) AS relevance_score
        FROM places p
        WHERE p.status = 'active' AND (
          ${tsvec} @@ plainto_tsquery('turkish', $1)
          OR LOWER(p.name) LIKE '%' || $1 || '%'
          OR translate(LOWER(COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%'
        )
      `;

      const params: any[] = [normalizedQuery, normalizedLookup];
      let paramIndex = 3;

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

      if (filters?.city && hasPlacesCity) {
        sql += ` AND p.city = $${paramIndex}`;
        params.push(filters.city);
        paramIndex++;
      }

      if (sortBy === 'rating') {
        sql += ' ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST, relevance_score DESC';
      } else if (sortBy === 'newest') {
        sql += ' ORDER BY p.created_at DESC';
      } else if (sortBy === 'reviews') {
        sql += ' ORDER BY p.review_count DESC NULLS LAST, relevance_score DESC';
      } else {
        sql += ' ORDER BY relevance_score DESC, p.rating DESC NULLS LAST';
      }

      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const results = await queryReadMany(sql, params) as any[];
      if (results.length > 0) {
        return results;
      }
    }
    return searchCuratedPlaceFallbacks(query, limit);
  } catch (error) {
    logger.error('Search places failed', error instanceof Error ? error : new Error(String(error)));
    return searchCuratedPlaceFallbacks(query, limit);
  }
}

export async function searchReviews(
  query: string,
  filters?: any,
  limit: number = 20,
  offset: number = 0
): Promise<any[]> {
  try {
    const normalizedQuery = normalizeSearchQuery(query);
    const normalizedLookup = normalizeTurkishSearchText(query);
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
        GREATEST(
          ts_rank(
            to_tsvector('turkish', r.title || ' ' || r.content),
            plainto_tsquery('turkish', $1)
          ),
          CASE WHEN translate(LOWER(COALESCE(r.title, '') || ' ' || COALESCE(r.content, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%' THEN 0.45 ELSE 0 END
        ) as relevance_score
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN places p ON r.place_id = p.id
      WHERE (
        to_tsvector('turkish', r.title || ' ' || r.content)
          @@ plainto_tsquery('turkish', $1)
        OR translate(LOWER(COALESCE(r.title, '') || ' ' || COALESCE(r.content, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%'
      )
    `;

    const params: any[] = [normalizedQuery, normalizedLookup];
    let paramIndex = 3;

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

    const results = await queryReadMany(sql, params) as any[];
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
    const normalizedQuery = normalizeSearchQuery(query);
    const normalizedLookup = normalizeTurkishSearchText(query);
    const hasEventsCity = await hasColumn('events', 'city');
    let sql = `
      SELECT
        e.id,
        e.title,
        e.description,
        e.start_date,
        ${hasEventsCity ? 'e.city' : 'NULL::text AS city'},
        e.category,
        e.created_at,
        GREATEST(
          ts_rank(
            to_tsvector('turkish', e.title || ' ' || COALESCE(e.description, '')),
            plainto_tsquery('turkish', $1)
          ),
          CASE WHEN translate(LOWER(COALESCE(e.title, '') || ' ' || COALESCE(e.description, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%' THEN 0.5 ELSE 0 END
        ) as relevance_score
      FROM events e
      WHERE e.status = 'published'
        AND (
          to_tsvector('turkish', e.title || ' ' || COALESCE(e.description, ''))
            @@ plainto_tsquery('turkish', $1)
          OR translate(LOWER(COALESCE(e.title, '') || ' ' || COALESCE(e.description, '')), 'ığşöüç', 'igsouc') LIKE '%' || $2 || '%'
        )
    `;

    const params: any[] = [normalizedQuery, normalizedLookup];
    let paramIndex = 3;

    if (filters?.category) {
      sql += ` AND e.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.city && hasEventsCity) {
      sql += ` AND e.city = $${paramIndex}`;
      params.push(filters.city);
      paramIndex++;
    }

    if (filters?.upcomingOnly) {
      sql += ` AND e.start_date >= NOW()`;
    }

    sql += ` ORDER BY relevance_score DESC, e.start_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const results = await queryReadMany(sql, params) as any[];
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
    const normalizedQuery = canonicalizeSearchQuery(searchQuery);
    const searchQueryColumn = await pickFirstExistingColumn('search_history', ['query', 'search_query']);
    const resultCountColumn = await pickFirstExistingColumn('search_history', ['results_count', 'result_count']);
    const searchTypeColumn = await pickFirstExistingColumn('search_history', ['search_type']);
    const filtersColumn = await pickFirstExistingColumn('search_history', ['filters']);

    if (!searchQueryColumn || !resultCountColumn) {
      return;
    }

    await insert('search_history', {
      user_id: userId,
      [searchQueryColumn]: normalizedQuery,
      ...(searchTypeColumn ? { [searchTypeColumn]: searchType } : {}),
      [resultCountColumn]: resultCount,
      ...(filtersColumn ? { [filtersColumn]: filters ? JSON.stringify(filters) : null } : {})
    });

    // Update analytics
    const analyticsHasSearchCount = await hasColumn('search_analytics', 'search_count');
    const analyticsHasAvgResultCount = await hasColumn('search_analytics', 'avg_result_count');
    const analyticsHasType = await hasColumn('search_analytics', 'search_type');
    if (!analyticsHasSearchCount) {
      return;
    }
    const analyticsWhere = analyticsHasType
      ? 'search_query = $1 AND search_type = $2'
      : 'search_query = $1';
    const analyticsParams = analyticsHasType ? [normalizedQuery, searchType] : [normalizedQuery];

    const existing = await queryOne(`SELECT id FROM search_analytics WHERE ${analyticsWhere}`, analyticsParams);

    if (existing) {
      const historyWhere = searchTypeColumn
        ? `${searchQueryColumn} = $1 AND ${searchTypeColumn} = $2`
        : `${searchQueryColumn} = $1`;
      const historyParams = searchTypeColumn ? [normalizedQuery, searchType] : [normalizedQuery];
      const countResult = await queryOne<{ count?: string }>(
        `SELECT COUNT(*) as count FROM search_history WHERE ${historyWhere}`,
        historyParams
      );

      await update(
        'search_analytics',
        analyticsHasType ? { search_query: normalizedQuery, search_type: searchType } : { search_query: normalizedQuery },
        {
          search_count: Number(countResult?.count || '0'),
          last_searched_at: new Date()
        }
      );
    } else {
      await insert('search_analytics', {
        search_query: normalizedQuery,
        ...(analyticsHasType ? { search_type: searchType } : {}),
        search_count: 1,
        ...(analyticsHasAvgResultCount ? { avg_result_count: resultCount } : {}),
        last_searched_at: new Date()
      });
    }
  } catch (error) {
    logger.error('Failed to record search', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getTrendingSearches(searchType: string = 'places', limit: number = 10): Promise<any[]> {
  try {
    const analyticsHasType = await hasColumn('search_analytics', 'search_type');
    const results = await queryMany(`
      SELECT
        search_query,
        search_count,
        trend_score,
        last_searched_at
      FROM search_analytics
      WHERE ${analyticsHasType ? 'search_type = $1 AND ' : ''}is_trending = true
      ORDER BY trend_score DESC
      LIMIT $${analyticsHasType ? 2 : 1}
    `, analyticsHasType ? [searchType, limit] : [limit]);
    return results;
  } catch (error) {
    logger.error('Failed to get trending searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getSearchFilters(searchType: string): Promise<any[]> {
  try {
    const filtersHasType = await hasColumn('search_filters', 'search_type');
    const filters = await queryMany(`
      SELECT
        filter_key,
        filter_label,
        filter_values
      FROM search_filters
      WHERE ${filtersHasType ? 'search_type = $1 AND ' : ''}is_active = true
      ORDER BY display_order ASC
    `, filtersHasType ? [searchType] : []);
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
