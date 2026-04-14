/**
 * Advanced Search Filters
 * Faceted search with multiple filter options
 */

import { query } from '../postgres';

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
 * Build search query with filters
 */
export function buildSearchQuery(
  baseTable: string,
  filters: SearchFilters,
  options: { selectFields?: string[]; joinTables?: string[] } = {}
): { sql: string; params: any[]; countSql: string } {
  const { selectFields = ['*'], joinTables = [] } = options;

  let sql = `SELECT ${selectFields.join(', ')} FROM ${baseTable}`;
  let countSql = `SELECT COUNT(*) FROM ${baseTable}`;

  if (joinTables.length > 0) {
    sql += ' ' + joinTables.join(' ');
    countSql += ' ' + joinTables.join(' ');
  }

  const conditions: string[] = [];
  const params: any[] = [];

  // Text search
  if (filters.query) {
    params.push(`%${filters.query}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  // Categories
  if (filters.categories && filters.categories.length > 0) {
    params.push(filters.categories);
    conditions.push(`category_id = ANY($${params.length})`);
  }

  // Tags
  if (filters.tags && filters.tags.length > 0) {
    params.push(filters.tags);
    conditions.push(`tags && $${params.length}`);
  }

  // Rating range
  if (filters.rating) {
    if (filters.rating.min !== undefined) {
      params.push(filters.rating.min);
      conditions.push(`rating >= $${params.length}`);
    }
    if (filters.rating.max !== undefined) {
      params.push(filters.rating.max);
      conditions.push(`rating <= $${params.length}`);
    }
  }

  // Price range
  if (filters.price) {
    if (filters.price.min !== undefined) {
      params.push(filters.price.min);
      conditions.push(`price_level >= $${params.length}`);
    }
    if (filters.price.max !== undefined) {
      params.push(filters.price.max);
      conditions.push(`price_level <= $${params.length}`);
    }
  }

  // Location filter
  if (filters.location) {
    const { lat, lng, radius } = filters.location;
    params.push(lat, lng, radius);
    conditions.push(`(
      6371000 * acos(
        cos(radians($${params.length - 2})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians($${params.length - 1})) +
        sin(radians($${params.length - 2})) * sin(radians(latitude))
      )
    ) <= $${params.length}`);
  }

  // Amenities
  if (filters.amenities && filters.amenities.length > 0) {
    params.push(filters.amenities);
    conditions.push(`amenities @> $${params.length}`);
  }

  // Open now
  if (filters.openNow) {
    const dayOfWeek = new Date().getDay();
    const currentTime = new Date().toTimeString().slice(0, 5);
    params.push(dayOfWeek, currentTime);
    conditions.push(`EXISTS (
      SELECT 1 FROM place_hours 
      WHERE place_id = ${baseTable}.id 
      AND day_of_week = $${params.length - 1}
      AND open_time <= $${params.length}
      AND close_time >= $${params.length}
    )`);
  }

  // Verified
  if (filters.verified) {
    conditions.push(`is_verified = true`);
  }

  // Has photos
  if (filters.hasPhotos) {
    conditions.push(`EXISTS (SELECT 1 FROM place_images WHERE place_id = ${baseTable}.id)`);
  }

  // Date range
  if (filters.dateRange) {
    if (filters.dateRange.start) {
      params.push(filters.dateRange.start);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (filters.dateRange.end) {
      params.push(filters.dateRange.end);
      conditions.push(`created_at <= $${params.length}`);
    }
  }

  // Accessibility
  if (filters.accessibility && filters.accessibility.length > 0) {
    params.push(filters.accessibility);
    conditions.push(`accessibility_features @> $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  sql += ` ${whereClause}`;
  countSql += ` ${whereClause}`;

  return { sql, params, countSql };
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
        return `${sql} ORDER BY (
          6371000 * acos(
            cos(radians(${filters.location.lat})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${filters.location.lng})) +
            sin(radians(${filters.location.lat})) * sin(radians(latitude))
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
      // Default relevance sorting (if search query present)
      if (filters.query) {
        return `${sql} ORDER BY 
          CASE 
            WHEN name ILIKE '%${filters.query}%' THEN 1
            WHEN description ILIKE '%${filters.query}%' THEN 2
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
  const categoryResult = await query(
    `SELECT category_id, COUNT(*) as count 
    FROM (${baseSql}) filtered 
    GROUP BY category_id`,
    params
  );

  // Get rating distribution
  const ratingResult = await query(
    `SELECT FLOOR(rating) as rating_bucket, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY FLOOR(rating)`,
    params
  );

  // Get price range counts
  const priceResult = await query(
    `SELECT price_level, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY price_level`,
    params
  );

  // Get amenity counts (flatten array and count)
  const amenityResult = await query(
    `SELECT unnest(amenities) as amenity, COUNT(*) as count
    FROM (${baseSql}) filtered
    GROUP BY unnest(amenities)`,
    params
  );

  // Get tag counts
  const tagResult = await query(
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
    query(countSql, params),
    query(sql, params),
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
  const placesResult = await query(
    `SELECT id, name, category_id FROM places 
    WHERE name ILIKE $1 AND status = 'active'
    LIMIT $2`,
    [`%${query}%`, limit]
  );

  placesResult.rows.forEach(row => {
    suggestions.push({
      type: 'place',
      value: row.id,
      label: `${row.name} (${row.category_id})`,
    });
  });

  // Search categories
  const categoriesResult = await query(
    `SELECT id, name FROM categories WHERE name ILIKE $1 LIMIT $2`,
    [`%${query}%`, Math.floor(limit / 2)]
  );

  categoriesResult.rows.forEach(row => {
    suggestions.push({
      type: 'category',
      value: row.id,
      label: `Kategori: ${row.name}`,
    });
  });

  // Search tags
  const tagsResult = await query(
    `SELECT DISTINCT unnest(tags) as tag FROM places WHERE tags @> ARRAY[$1::text] LIMIT $2`,
    [query, Math.floor(limit / 2)]
  );

  tagsResult.rows.forEach(row => {
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
  await query(
    `INSERT INTO search_logs (query, filters, results_count, user_id, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [query, JSON.stringify(filters), resultsCount, userId || null]
  );
}
