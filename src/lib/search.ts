/**
 * Advanced Search Sistemi
 * Full-text search, filtreler, sıralama
 */

import { pool } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';

export interface SearchFilters {
  query: string;
  type?: 'places' | 'reviews' | 'blog' | 'events' | 'all';
  category?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'relevance' | 'rating' | 'newest' | 'popular';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  places: any[];
  reviews: any[];
  blogPosts: any[];
  events: any[];
  total: number;
  query: string;
  executionTime: number;
}

/**
 * Yerler ara
 */
async function searchPlaces(query: string, filters?: any): Promise<any[]> {
  try {
    let sql = `
      SELECT id, name, slug, description, category, rating, rating_count,
             ts_rank(search_vector, query) as rank
      FROM places,
           plainto_tsquery('turkish', $1) query
      WHERE search_vector @@ query
    `;

    const params: any[] = [query];
    let paramCount = 2;

    if (filters?.category) {
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters?.minRating) {
      sql += ` AND rating >= $${paramCount}`;
      params.push(filters.minRating);
      paramCount++;
    }

    sql += ' ORDER BY rank DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Yerler aranırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Yorumlar ara
 */
async function searchReviews(query: string, filters?: any): Promise<any[]> {
  try {
    let sql = `
      SELECT r.id, r.place_id, r.title, r.content, r.rating, r.created_at,
             p.name as place_name, u.full_name as user_name,
             ts_rank(r.search_vector, query) as rank
      FROM reviews r
      LEFT JOIN places p ON r.place_id = p.id
      LEFT JOIN users u ON r.user_id = u.id,
           plainto_tsquery('turkish', $1) query
      WHERE r.search_vector @@ query
    `;

    const params: any[] = [query];
    let paramCount = 2;

    if (filters?.minRating) {
      sql += ` AND r.rating >= $${paramCount}`;
      params.push(filters.minRating);
      paramCount++;
    }

    sql += ' ORDER BY rank DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Yorumlar aranırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Blog yazıları ara
 */
async function searchBlogPosts(query: string, filters?: any): Promise<any[]> {
  try {
    let sql = `
      SELECT id, title, slug, content, author_id, published_at,
             ts_rank(search_vector, query) as rank
      FROM blog_posts,
           plainto_tsquery('turkish', $1) query
      WHERE search_vector @@ query AND published = true
    `;

    const params: any[] = [query];
    let paramCount = 2;

    if (filters?.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    sql += ' ORDER BY rank DESC, published_at DESC';

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Blog yazıları aranırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Etkinlikler ara
 */
async function searchEvents(query: string, filters?: any): Promise<any[]> {
  try {
    let sql = `
      SELECT id, title, slug, description, start_date, location,
             ts_rank(search_vector, query) as rank
      FROM events,
           plainto_tsquery('turkish', $1) query
      WHERE search_vector @@ query
    `;

    const params: any[] = [query];
    let paramCount = 2;

    if (filters?.startDate) {
      sql += ` AND start_date >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters?.limit) {
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    sql += ' ORDER BY rank DESC, start_date ASC';

    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Etkinlikler aranırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Kapsamlı arama
 */
export async function search(filters: SearchFilters): Promise<SearchResult> {
  const startTime = Date.now();
  const cacheKey = `sanliurfa:search:${filters.query}:${filters.type || 'all'}`;

  // Cache'den kontrol et
  const cached = await getCache(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const results: SearchResult = {
      places: [],
      reviews: [],
      blogPosts: [],
      events: [],
      total: 0,
      query: filters.query,
      executionTime: 0
    };

    const limit = filters.limit || 20;

    if (!filters.type || filters.type === 'all' || filters.type === 'places') {
      results.places = await searchPlaces(filters.query, { ...filters, limit });
    }

    if (!filters.type || filters.type === 'all' || filters.type === 'reviews') {
      results.reviews = await searchReviews(filters.query, { ...filters, limit });
    }

    if (!filters.type || filters.type === 'all' || filters.type === 'blog') {
      results.blogPosts = await searchBlogPosts(filters.query, { ...filters, limit });
    }

    if (!filters.type || filters.type === 'all' || filters.type === 'events') {
      results.events = await searchEvents(filters.query, { ...filters, limit });
    }

    results.total = results.places.length + results.reviews.length + results.blogPosts.length + results.events.length;
    results.executionTime = Date.now() - startTime;

    // Cache'e kaydet (5 dakika)
    await setCache(cacheKey, JSON.stringify(results), 300);

    // Arama geçmişine ekle
    await recordSearch(filters.query, results.total, Object.keys(results).filter(k => results[k as keyof SearchResult].length > 0));

    logger.debug('Arama yapıldı', {
      query: filters.query,
      total: results.total,
      executionTime: results.executionTime
    });

    return results;
  } catch (error) {
    logger.error('Arama sırasında hata', error instanceof Error ? error : new Error(String(error)));
    return {
      places: [],
      reviews: [],
      blogPosts: [],
      events: [],
      total: 0,
      query: filters.query,
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Arama geçmişine kaydet
 */
export async function recordSearch(query: string, resultsCount: number, resultTypes: string[]): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO search_history (query, results_count, result_types)
      VALUES ($1, $2, $3)`,
      [query, resultsCount, resultTypes]
    );

    // Trending searches'i güncelle
    await pool.query(
      `INSERT INTO trending_searches (query, search_count, last_searched_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (query) DO UPDATE SET
        search_count = search_count + 1,
        last_searched_at = NOW()`,
      [query]
    );
  } catch (error) {
    logger.error('Arama geçmişi kaydedilirken hata', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Trending aramaları getir
 */
export async function getTrendingSearches(limit: number = 10): Promise<any[]> {
  try {
    const cacheKey = 'sanliurfa:trending:searches';
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await pool.query(
      `SELECT query, search_count, last_searched_at
      FROM trending_searches
      WHERE last_searched_at >= NOW() - INTERVAL '7 days'
      ORDER BY search_count DESC
      LIMIT $1`,
      [limit]
    );

    // Cache'e kaydet (1 saat)
    await setCache(cacheKey, JSON.stringify(result.rows), 3600);

    return result.rows;
  } catch (error) {
    logger.error('Trending aramalar alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Arama önerilerini getir (autocomplete)
 */
export async function getSearchSuggestions(partial: string, limit: number = 5): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT query FROM search_history
      WHERE query ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [`${partial}%`, limit]
    );

    return result.rows.map(r => r.query);
  } catch (error) {
    logger.error('Arama önerileri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Arama cache'ini sil
 */
export async function invalidateSearchCache(): Promise<void> {
  await deleteCachePattern('sanliurfa:search:*');
  await deleteCache('sanliurfa:trending:searches');
}
