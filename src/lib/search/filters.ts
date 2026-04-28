/**
 * Advanced Search Filters
 * Faceted search with multiple filter options
 */

import { query as dbQuery } from '../postgres';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  rating?: { min?: number; max?: number };
  price?: { min?: number; max?: number };
  location?: {
    lat: number;
    lng: number;
    radius: number; // in meters
  };
  amenities?: string[];
  openNow?: boolean;
  verified?: boolean;
  hasPhotos?: boolean;
  sortBy?: 'relevance' | 'rating' | 'distance' | 'newest' | 'popular';
  dateRange?: { start?: Date; end?: Date };
  accessibility?: string[];
  language?: string;
}

export interface FacetCounts {
  categories: Record<string, number>;
  ratings: Record<string, number>;
  priceRanges: Record<string, number>;
  amenities: Record<string, number>;
  tags: Record<string, number>;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  facets: FacetCounts;
  page: number;
  totalPages: number;
}

/**
 * Build search query with filters.
 *
 * **DEPRECATED — DO NOT USE.** SQL injection via caller-controlled identifiers:
 * - `${baseTable}` table name interpolation (no allowlist)
 * - `${selectFields.join(', ')}` column list interpolation
 * - `${joinTables.join(' ')}` raw JOIN clause concat
 *
 * Şu anda 0 caller var; runtime guard ile kilitlendi. Yeni search feature
 * gerekirse `lib/data/data-warehouse.ts:queryOLAP` allowlist pattern'ini takip et,
 * veya `lib/postgres/postgres.ts` ALLOWED_TABLES kullan.
 */
export function buildSearchQuery(
  _baseTable: string,
  _filters: SearchFilters,
  _options: { selectFields?: string[]; joinTables?: string[] } = {}
): { sql: string; params: any[]; countSql: string } {
  throw new Error(
    'buildSearchQuery is deprecated and disabled — SQL injection via caller-controlled table/column identifiers. ' +
    'Use parametrized queries with strict allowlist (see lib/data/data-warehouse.ts:queryOLAP).',
  );
}

/**
 * Apply sorting to search query
 */
export function applySorting(sql: string, sortBy: SearchFilters['sortBy'], filters: SearchFilters): string {
  switch (sortBy) {
    case 'rating':
      return `${sql} ORDER BY rating DESC, review_count DESC`;
    case 'distance':
      if (filters.location) {
        const lat = Number(filters.location.lat);
        const lng = Number(filters.location.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return sql;
        return `${sql} ORDER BY (
          6371000 * acos(
            cos(radians(${lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(latitude))
          )
        ) ASC`;
      }
      return sql;
    case 'newest':
      return `${sql} ORDER BY created_at DESC`;
    case 'popular':
      return `${sql} ORDER BY view_count DESC, review_count DESC`;
    case 'relevance':
    default:
      if (filters.query) {
        const escaped = filters.query.replace(/'/g, "''");
        return `${sql} ORDER BY
          CASE
            WHEN name ILIKE '%${escaped}%' THEN 1
            WHEN description ILIKE '%${escaped}%' THEN 2
            ELSE 3
          END,
          rating DESC`;
      }
      return `${sql} ORDER BY rating DESC, review_count DESC`;
  }
}

/**
 * Get facet counts for search results
 */
export async function getFacetCounts(
  baseTable: string,
  filters: SearchFilters,
  options: { joinTables?: string[] } = {}
): Promise<FacetCounts> {
  // Remove facet filters to get counts
  const filtersWithoutFacets = { ...filters };
  delete filtersWithoutFacets.categories;
  delete filtersWithoutFacets.rating;
  delete filtersWithoutFacets.amenities;
  delete filtersWithoutFacets.tags;

  const { sql: baseSql, params } = buildSearchQuery(baseTable, filtersWithoutFacets, options);

  // Get category counts
  const categoryResult = await dbQuery(
    `SELECT category_id, COUNT(*) as count 
    FROM (${baseSql}) filtered 
    GROUP BY category_id`,
    params
  );

  // Get rating distribution
  const ratingResult = await dbQuery(
    `SELECT FLOOR(rating) as rating_bucket, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY FLOOR(rating)`,
    params
  );

  // Get price range counts
  const priceResult = await dbQuery(
    `SELECT price_level, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY price_level`,
    params
  );

  // Get amenity counts (flatten array and count)
  const amenityResult = await dbQuery(
    `SELECT unnest(amenities) as amenity, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY unnest(amenities)`,
    params
  );

  // Get tag counts
  const tagResult = await dbQuery(
    `SELECT unnest(tags) as tag, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY unnest(tags)`,
    params
  );

  return {
    categories: Object.fromEntries(categoryResult.rows.map(r => [r.category_id, parseInt(r.count)])),
    ratings: Object.fromEntries(ratingResult.rows.map(r => [r.rating_bucket, parseInt(r.count)])),
    priceRanges: Object.fromEntries(priceResult.rows.map(r => [r.price_level, parseInt(r.count)])),
    amenities: Object.fromEntries(amenityResult.rows.map(r => [r.amenity, parseInt(r.count)])),
    tags: Object.fromEntries(tagResult.rows.map(r => [r.tag, parseInt(r.count)])),
  };
}

/**
 * Execute faceted search
 */
export async function executeFacetedSearch<T>(
  baseTable: string,
  filters: SearchFilters,
  page: number = 1,
  limit: number = 20,
  options: { selectFields?: string[]; joinTables?: string[] } = {}
): Promise<SearchResult<T>> {
  const offset = (page - 1) * limit;

  const { sql: baseSql, params, countSql } = buildSearchQuery(baseTable, filters, options);
  const sortedSql = applySorting(baseSql, filters.sortBy, filters);
  const sql = `${sortedSql} LIMIT ${limit} OFFSET ${offset}`;

  const [countResult, itemsResult, facets] = await Promise.all([
    dbQuery(countSql, params),
    dbQuery(sql, params),
    getFacetCounts(baseTable, filters, options),
  ]);

  const total = parseInt(countResult.rows[0].count);

  return {
    items: itemsResult.rows,
    total,
    facets,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Build autocomplete suggestions
 */
export async function getAutocompleteSuggestions(
  query: string,
  limit: number = 10
): Promise<Array<{ type: string; value: string; label: string }>> {
  const suggestions: Array<{ type: string; value: string; label: string }> = [];

  // Search places
  const placesResult = await dbQuery(
    `SELECT id, name, category_id FROM places
    WHERE name ILIKE $1 AND status = 'active'
    LIMIT $2`,
    [`%${query}%`, limit]
  );

  placesResult.rows.forEach((row: any) => {
    suggestions.push({
      type: 'place',
      value: row.id,
      label: `${row.name} (${row.category_id})`,
    });
  });

  // Search categories
  const categoriesResult = await dbQuery(
    `SELECT id, name FROM categories WHERE name ILIKE $1 LIMIT $2`,
    [`%${query}%`, Math.floor(limit / 2)]
  );

  categoriesResult.rows.forEach((row: any) => {
    suggestions.push({
      type: 'category',
      value: row.id,
      label: `Kategori: ${row.name}`,
    });
  });

  // Search tags
  const tagsResult = await dbQuery(
    `SELECT DISTINCT unnest(tags) as tag FROM places WHERE tags @> ARRAY[$1::text] LIMIT $2`,
    [query, Math.floor(limit / 2)]
  );

  tagsResult.rows.forEach((row: any) => {
    suggestions.push({
      type: 'tag',
      value: row.tag,
      label: `Etiket: ${row.tag}`,
    });
  });

  return suggestions.slice(0, limit);
}

/**
 * Save search query for analytics
 */
export async function saveSearchQuery(
  query: string,
  filters: SearchFilters,
  resultsCount: number,
  userId?: string
): Promise<void> {
  await dbQuery(
    `INSERT INTO search_logs (query, filters, results_count, user_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [query, JSON.stringify(filters), resultsCount, userId || null]
  );
}

