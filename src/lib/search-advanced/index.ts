/**
 * Advanced Search with Facets & Filters
 * Full-text search with faceted navigation
 */

import { query } from '../postgres';

export interface SearchFacet {
  field: string;
  label: string;
  values: Array<{
    value: string;
    count: number;
    label?: string;
  }>;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  locations?: string[];
  priceRange?: { min?: number; max?: number };
  rating?: { min?: number; max?: number };
  features?: string[];
  dateRange?: { from?: Date; to?: Date };
  sortBy?: 'relevance' | 'rating' | 'popularity' | 'newest' | 'price_asc' | 'price_desc';
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  facets: SearchFacet[];
  suggestions?: string[];
  didYouMean?: string;
}

/**
 * Build search query with filters
 */
function buildSearchQuery(
  baseTable: string,
  filters: SearchFilters,
  options: { enableFacets?: boolean; facetFields?: string[] } = {}
): { sql: string; countSql: string; params: any[] } {
  let sql = `SELECT * FROM ${baseTable} WHERE 1=1`;
  let countSql = `SELECT COUNT(*) FROM ${baseTable} WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  // Full-text search
  if (filters.query) {
    sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    countSql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.query}%`);
    paramIndex++;
  }

  // Category filter
  if (filters.categories?.length) {
    const placeholders = filters.categories.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND category_id IN (${placeholders})`;
    countSql += ` AND category_id IN (${placeholders})`;
    params.push(...filters.categories);
    paramIndex += filters.categories.length;
  }

  // Location filter
  if (filters.locations?.length) {
    const placeholders = filters.locations.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND district IN (${placeholders})`;
    countSql += ` AND district IN (${placeholders})`;
    params.push(...filters.locations);
    paramIndex += filters.locations.length;
  }

  // Price range filter
  if (filters.priceRange) {
    if (filters.priceRange.min !== undefined) {
      sql += ` AND price_level >= $${paramIndex}`;
      countSql += ` AND price_level >= $${paramIndex}`;
      params.push(filters.priceRange.min);
      paramIndex++;
    }
    if (filters.priceRange.max !== undefined) {
      sql += ` AND price_level <= $${paramIndex}`;
      countSql += ` AND price_level <= $${paramIndex}`;
      params.push(filters.priceRange.max);
      paramIndex++;
    }
  }

  // Rating filter
  if (filters.rating?.min !== undefined) {
    sql += ` AND rating >= $${paramIndex}`;
    countSql += ` AND rating >= $${paramIndex}`;
    params.push(filters.rating.min);
    paramIndex++;
  }

  // Date range filter
  if (filters.dateRange) {
    if (filters.dateRange.from) {
      sql += ` AND created_at >= $${paramIndex}`;
      countSql += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateRange.from);
      paramIndex++;
    }
    if (filters.dateRange.to) {
      sql += ` AND created_at <= $${paramIndex}`;
      countSql += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateRange.to);
      paramIndex++;
    }
  }

  // Features filter (JSON array)
  if (filters.features?.length) {
    sql += ` AND features @> $${paramIndex}::jsonb`;
    countSql += ` AND features @> $${paramIndex}::jsonb`;
    params.push(JSON.stringify(filters.features));
    paramIndex++;
  }

  return { sql, countSql, params };
}

/**
 * Search places with facets
 */
export async function searchPlaces(
  filters: SearchFilters,
  page: number = 1,
  perPage: number = 20
): Promise<SearchResult> {
  const { sql, countSql, params } = buildSearchQuery('places', filters);

  // Add sorting
  let sortSql = sql;
  switch (filters.sortBy) {
    case 'rating':
      sortSql += ' ORDER BY rating DESC';
      break;
    case 'popularity':
      sortSql += ' ORDER BY review_count DESC';
      break;
    case 'newest':
      sortSql += ' ORDER BY created_at DESC';
      break;
    case 'price_asc':
      sortSql += ' ORDER BY price_level ASC NULLS LAST';
      break;
    case 'price_desc':
      sortSql += ' ORDER BY price_level DESC NULLS LAST';
      break;
    default:
      // Relevance: prioritize exact matches
      if (filters.query) {
        sortSql += ` ORDER BY 
          CASE 
            WHEN name ILIKE $${params.length + 1} THEN 0
            WHEN name ILIKE $${params.length + 2} THEN 1
            ELSE 2
          END,
          rating DESC`;
        params.push(filters.query, `%${filters.query}%`);
      } else {
        sortSql += ' ORDER BY rating DESC';
      }
  }

  // Add pagination
  const offset = (page - 1) * perPage;
  sortSql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(perPage, offset);

  // Execute queries
  const [itemsResult, countResult] = await Promise.all([
    query(sortSql, params),
    query(countSql, params.slice(0, -2)) // Remove limit/offset params
  ]);

  // Get facets
  const facets = await getPlaceFacets(filters);

  // Get suggestions if query provided
  let suggestions: string[] | undefined;
  let didYouMean: string | undefined;
  if (filters.query) {
    suggestions = await getSearchSuggestions(filters.query);
    didYouMean = await getDidYouMean(filters.query);
  }

  return {
    items: itemsResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    perPage,
    facets,
    suggestions,
    didYouMean
  };
}

/**
 * Get facets for places
 */
async function getPlaceFacets(filters: SearchFilters): Promise<SearchFacet[]> {
  const facets: SearchFacet[] = [];

  // Build base WHERE clause for facet queries
  let whereClause = 'WHERE status = \'active\'';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.query) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.query}%`);
    paramIndex++;
  }

  // Category facet
  const categoryResult = await query(`
    SELECT c.id, c.name, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN places p ON p.category_id = c.id ${whereClause}
    GROUP BY c.id, c.name
    ORDER BY count DESC
    LIMIT 20
  `, params);

  if (categoryResult.rows.length > 0) {
    facets.push({
      field: 'category',
      label: 'Kategori',
      values: categoryResult.rows.map(r => ({
        value: r.id,
        label: r.name,
        count: parseInt(r.count)
      }))
    });
  }

  // District/Location facet
  const locationResult = await query(`
    SELECT district, COUNT(*) as count
    FROM places
    ${whereClause}
    GROUP BY district
    ORDER BY count DESC
    LIMIT 20
  `, params);

  if (locationResult.rows.length > 0) {
    facets.push({
      field: 'location',
      label: 'Bölge',
      values: locationResult.rows.map(r => ({
        value: r.district,
        count: parseInt(r.count)
      }))
    });
  }

  // Price level facet
  const priceResult = await query(`
    SELECT price_level, COUNT(*) as count
    FROM places
    ${whereClause} AND price_level IS NOT NULL
    GROUP BY price_level
    ORDER BY price_level
  `, params);

  if (priceResult.rows.length > 0) {
    facets.push({
      field: 'price',
      label: 'Fiyat Aralığı',
      values: priceResult.rows.map(r => ({
        value: String(r.price_level),
        label: getPriceLabel(r.price_level),
        count: parseInt(r.count)
      }))
    });
  }

  // Rating facet
  const ratingResult = await query(`
    SELECT 
      CASE 
        WHEN rating >= 4.5 THEN '4.5+'
        WHEN rating >= 4.0 THEN '4.0-4.5'
        WHEN rating >= 3.0 THEN '3.0-4.0'
        ELSE '3.0-'
      END as rating_range,
      COUNT(*) as count
    FROM places
    ${whereClause}
    GROUP BY 1
    ORDER BY 1 DESC
  `, params);

  if (ratingResult.rows.length > 0) {
    facets.push({
      field: 'rating',
      label: 'Puan',
      values: ratingResult.rows.map(r => ({
        value: r.rating_range,
        count: parseInt(r.count)
      }))
    });
  }

  return facets;
}

/**
 * Get price label
 */
function getPriceLabel(level: number): string {
  const labels: Record<number, string> = {
    1: '₺ Ucuz',
    2: '₺₺ Orta',
    3: '₺₺₺ Pahalı',
    4: '₺₺₺₺ Lüks'
  };
  return labels[level] || `${level}`;
}

/**
 * Get search suggestions
 */
async function getSearchSuggestions(query: string): Promise<string[]> {
  // Get similar searches from history
  const result = await query(`
    SELECT query, COUNT(*) as count
    FROM search_history
    WHERE query ILIKE $1 
    AND query != $2
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY query
    ORDER BY count DESC
    LIMIT 5
  `, [`%${query}%`, query]);

  return result.rows.map(r => r.query);
}

/**
 * Get "did you mean" suggestion
 */
async function getDidYouMean(query: string): Promise<string | undefined> {
  // Simple spelling correction using similar words
  const result = await query(`
    SELECT query, similarity(query, $1) as sim
    FROM search_history
    WHERE query % $1
    AND created_at >= NOW() - INTERVAL '30 days'
    ORDER BY sim DESC, created_at DESC
    LIMIT 1
  `, [query]);

  if (result.rows.length > 0 && result.rows[0].sim > 0.3) {
    return result.rows[0].query;
  }

  return undefined;
}

/**
 * Autocomplete search
 */
export async function autocomplete(
  query: string,
  limit: number = 10
): Promise<Array<{
  type: 'place' | 'category' | 'tag';
  value: string;
  label: string;
  data?: any;
}>> {
  const results: Array<any> = [];

  // Search places
  const places = await query(`
    SELECT id, name, category_id
    FROM places
    WHERE name ILIKE $1
    AND status = 'active'
    ORDER BY rating DESC
    LIMIT $2
  `, [`%${query}%`, Math.floor(limit / 3)]);

  results.push(...places.rows.map(p => ({
    type: 'place' as const,
    value: p.id,
    label: p.name,
    data: { category: p.category_id }
  })));

  // Search categories
  const categories = await query(`
    SELECT id, name
    FROM categories
    WHERE name ILIKE $1
    LIMIT $2
  `, [`%${query}%`, Math.floor(limit / 3)]);

  results.push(...categories.rows.map(c => ({
    type: 'category' as const,
    value: c.id,
    label: c.name
  })));

  return results.slice(0, limit);
}

/**
 * Save search query
 */
export async function saveSearchQuery(
  query: string,
  userId?: string,
  resultsCount?: number
): Promise<void> {
  await query(
    `INSERT INTO search_history (query, user_id, results_count, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [query, userId || null, resultsCount]
  );
}

/**
 * Get popular searches
 */
export async function getPopularSearches(
  limit: number = 10,
  days: number = 7
): Promise<Array<{ query: string; count: number }>> {
  const result = await query(`
    SELECT query, COUNT(*) as count
    FROM search_history
    WHERE created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY query
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(r => ({
    query: r.query,
    count: parseInt(r.count)
  }));
}

/**
 * Search events
 */
export async function searchEvents(
  filters: SearchFilters,
  page: number = 1,
  perPage: number = 20
): Promise<SearchResult> {
  let sql = `SELECT * FROM events WHERE status = 'active'`;
  let countSql = `SELECT COUNT(*) FROM events WHERE status = 'active'`;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.query) {
    sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    countSql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filters.query}%`);
    paramIndex++;
  }

  // Date filter for events
  if (filters.dateRange?.from) {
    sql += ` AND end_date >= $${paramIndex}`;
    countSql += ` AND end_date >= $${paramIndex}`;
    params.push(filters.dateRange.from);
    paramIndex++;
  }

  // Sort by start date
  sql += ' ORDER BY start_date ASC';

  // Pagination
  const offset = (page - 1) * perPage;
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(perPage, offset);

  const [itemsResult, countResult] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, -2))
  ]);

  return {
    items: itemsResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    perPage,
    facets: []
  };
}
