/**
 * Advanced Search System
 * Full-text search with filters, facets, and suggestions
 */

import { query } from '../postgres';
import { getCache, setCache } from '../cache';
import { logger } from '../logger';

export interface SearchFilters {
  category?: string[];
  rating?: { min?: number; max?: number };
  location?: { lat: number; lng: number; radius: number }; // km
  priceRange?: { min?: number; max?: number };
  amenities?: string[];
  openNow?: boolean;
  verified?: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'rating' | 'distance' | 'newest';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  category: string;
  rating: number;
  reviewCount: number;
  address: string;
  image?: string;
  distance?: number;
  highlights?: string[];
}

export interface FacetResult {
  field: string;
  values: Array<{ value: string; count: number }>;
}

const SEARCH_CACHE_TTL = 300; // 5 minutes

/**
 * Perform advanced search
 */
export async function advancedSearch(options: SearchOptions): Promise<{
  results: SearchResult[];
  total: number;
  facets: FacetResult[];
  suggestions: string[];
}> {
  try {
  const cacheKey = `search:${JSON.stringify(options)}`;

  // Check cache
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const { query: searchQuery, filters, sortBy = 'relevance', limit = 20, offset = 0 } = options;

  // Build base query
  let sql = `SELECT 
    p.id, p.name, p.slug, p.category, p.rating, p.review_count,
    p.address, COALESCE(p.thumbnail_url, p.images[1]) as image, p.description, p.latitude, p.longitude,
    p.created_at
  FROM places p
  WHERE 1=1`;
  
  const params: any[] = [];
  let paramCount = 0;

  // Full-text search
  if (searchQuery) {
    paramCount++;
    sql += ` AND (
      p.name ILIKE $${paramCount} OR
      p.description ILIKE $${paramCount} OR
      p.address ILIKE $${paramCount} OR
      p.tags @> ARRAY[$${paramCount}]::text[]
    )`;
    params.push(`%${searchQuery}%`);
  }

  // Apply filters
  if (filters) {
    // Category filter
    if (filters.category && filters.category.length > 0) {
      paramCount++;
      sql += ` AND p.category = ANY($${paramCount}::text[])`;
      params.push(filters.category);
    }

    // Rating filter
    if (filters.rating?.min !== undefined) {
      paramCount++;
      sql += ` AND p.rating >= $${paramCount}`;
      params.push(filters.rating.min);
    }
    if (filters.rating?.max !== undefined) {
      paramCount++;
      sql += ` AND p.rating <= $${paramCount}`;
      params.push(filters.rating.max);
    }

    // Location filter (within radius)
    if (filters.location) {
      paramCount += 3;
      sql += ` AND (
        6371 * acos(
          cos(radians($${paramCount - 2})) * cos(radians(p.latitude)) *
          cos(radians(p.longitude) - radians($${paramCount - 1})) +
          sin(radians($${paramCount - 2})) * sin(radians(p.latitude))
        )
      ) <= $${paramCount}`;
      params.push(filters.location.lat, filters.location.lng, filters.location.radius);
    }

    // Verified filter
    if (filters.verified) {
      sql += ` AND p.is_verified = true`;
    }
  }

  // Get total count
  const countResult = await query(`SELECT COUNT(*) as total FROM (${sql}) as count_query`, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Apply sorting
  switch (sortBy) {
    case 'rating':
      sql += ` ORDER BY p.rating DESC, p.review_count DESC`;
      break;
    case 'newest':
      sql += ` ORDER BY p.created_at DESC`;
      break;
    case 'distance':
      if (filters?.location) {
        paramCount += 2;
        sql += ` ORDER BY (
          6371 * acos(
            cos(radians($${paramCount - 1})) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians($${paramCount})) +
            sin(radians($${paramCount - 1})) * sin(radians(p.latitude))
          )
        ) ASC`;
        params.push(filters.location.lat, filters.location.lng);
      }
      break;
    default: // relevance
      if (searchQuery) {
        sql += ` ORDER BY 
          CASE 
            WHEN p.name ILIKE $${paramCount + 1} THEN 0
            WHEN p.name ILIKE $${paramCount + 2} THEN 1
            ELSE 2
          END,
          p.rating DESC`;
        params.push(searchQuery, `%${searchQuery}%`);
      } else {
        sql += ` ORDER BY p.rating DESC`;
      }
  }

  // Apply pagination
  paramCount++;
  sql += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  sql += ` OFFSET $${paramCount}`;
  params.push(offset);

  // Execute search
  const result = await query(sql, params);

  // Format results
  const results: SearchResult[] = result.rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    rating: parseFloat(row.rating) || 0,
    reviewCount: parseInt(row.review_count, 10) || 0,
    address: row.address,
    image: row.image,
    ...(filters?.location
      ? {
          distance: calculateDistance(
            filters.location.lat, filters.location.lng,
            row.latitude, row.longitude
          ),
        }
      : {}),
    ...(searchQuery ? { highlights: extractHighlights(row, searchQuery) } : {}),
  }));

  // Get facets
  const facets = await getFacets(searchQuery, filters);

  // Get suggestions
  const suggestions = await getSearchSuggestions(searchQuery);

  const response = { results, total, facets, suggestions };

  // Cache results
  await setCache(cacheKey, response, SEARCH_CACHE_TTL);

  return response;
  } catch (error) {
    logger.error('Advanced search failed', error instanceof Error ? error : new Error(String(error)));
    return { results: [], total: 0, facets: [], suggestions: [] };
  }
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Extract highlight snippets
 */
function extractHighlights(row: any, query: string): string[] {
  const highlights: string[] = [];
  const lowerQuery = query.toLowerCase();

  if (row.description?.toLowerCase().includes(lowerQuery)) {
    const idx = row.description.toLowerCase().indexOf(lowerQuery);
    const start = Math.max(0, idx - 50);
    const end = Math.min(row.description.length, idx + query.length + 50);
    highlights.push(row.description.substring(start, end));
  }

  if (row.address?.toLowerCase().includes(lowerQuery)) {
    highlights.push(row.address);
  }

  return highlights.slice(0, 2);
}

/**
 * Get search facets
 */
async function getFacets(searchQuery?: string, _filters?: SearchFilters): Promise<FacetResult[]> {
  const facets: FacetResult[] = [];

  // Category facet
  const categoryResult = await query(
    `SELECT category, COUNT(*) as count
     FROM places
     WHERE 1=1
     ${searchQuery ? `AND (name ILIKE $1 OR description ILIKE $1)` : ''}
     GROUP BY category
     ORDER BY count DESC`,
    searchQuery ? [`%${searchQuery}%`] : []
  );
  facets.push({
    field: 'category',
    values: categoryResult.rows.map(r => ({ value: r.category, count: parseInt(r.count, 10) })),
  });

  // Rating facet
  const ratingResult = await query(
    `SELECT 
      CASE 
        WHEN rating >= 4.5 THEN '4.5+'
        WHEN rating >= 4 THEN '4.0-4.5'
        WHEN rating >= 3 THEN '3.0-4.0'
        ELSE 'Below 3'
      END as rating_range,
      COUNT(*) as count
     FROM places
     WHERE 1=1
     ${searchQuery ? `AND (name ILIKE $1 OR description ILIKE $1)` : ''}
     GROUP BY rating_range
     ORDER BY rating_range DESC`,
    searchQuery ? [`%${searchQuery}%`] : []
  );
  facets.push({
    field: 'rating',
    values: ratingResult.rows.map(r => ({ value: r.rating_range, count: parseInt(r.count, 10) })),
  });

  return facets;
}

/**
 * Get search suggestions
 */
export async function getSearchSuggestions(searchTerm: string = '', limit = 5): Promise<string[]> {
  if (!searchTerm || searchTerm.length < 2) return [];
  try {
  const cacheKey = `search:suggestions:${searchTerm.toLowerCase()}`;
  const cached = await getCache<string[]>(cacheKey);
  if (cached) return cached;

  // Popular searches
  const popularResult = await query(
    `SELECT query, COUNT(*) as count
     FROM search_logs
     WHERE query ILIKE $1
       AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY query
     ORDER BY count DESC
     LIMIT $2`,
    [`${searchTerm}%`, limit]
  );

  // Place names
  const placeResult = await query(
    `SELECT name
     FROM places
     WHERE name ILIKE $1
     ORDER BY rating DESC
     LIMIT $2`,
    [`${searchTerm}%`, limit]
  );

  const suggestions = [
    ...popularResult.rows.map(r => r.query),
    ...placeResult.rows.map(r => r.name),
  ].slice(0, limit);

  await setCache(cacheKey, suggestions, 600);
  return suggestions;
  } catch (error) {
    logger.error('Failed to get search suggestions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Log search query
 */
export async function logSearch(searchTerm: string, userId?: string, resultsCount: number = 0): Promise<void> {
  try {
    await query(
      `INSERT INTO search_logs (query, user_id, results_count, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [searchTerm, userId || null, resultsCount]
    );
  } catch (error) {
    logger.error('Failed to log search', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Get trending searches
 */
export async function getTrendingSearches(limit = 10): Promise<Array<{ query: string; count: number }>> {
  try {
    const result = await query(
      `SELECT query, COUNT(*) as count
       FROM search_logs
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY query
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(r => ({
      query: r.query,
      count: parseInt(r.count, 10),
    }));
  } catch (error) {
    logger.error('Failed to get trending searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

