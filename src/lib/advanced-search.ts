/**
 * Advanced Search Library
 * Premium search features with filters and saved searches
 */

import { query, queryOne, queryMany, insert, update as updateDb } from './postgres';
import { logger } from './logging';

export interface SearchFilters {
  keyword?: string;
  proximityLatitude?: number;
  proximityLongitude?: number;
  proximityRadiusKm?: number;
  categories?: string[];
  ratingMin?: number;
  ratingMax?: number;
  sortBy?: 'rating' | 'distance' | 'newest' | 'popular';
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  searchFilters: SearchFilters;
  searchCount: number;
  lastSearchedAt?: string;
  createdAt: string;
}

/**
 * Advanced search with filters
 * Uses proximity search, category filtering, rating filtering
 */
export async function advancedSearch(filters: SearchFilters, limit: number = 20): Promise<any[]> {
  try {
    let sql = 'SELECT * FROM places WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Keyword search
    if (filters.keyword) {
      sql += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filters.keyword}%`);
      paramCount++;
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      const placeholders = filters.categories.map(() => `$${paramCount++}`).join(',');
      sql += ` AND category IN (${placeholders})`;
      params.push(...filters.categories);
    }

    // Rating filter
    if (filters.ratingMin !== undefined) {
      sql += ` AND rating >= $${paramCount}`;
      params.push(filters.ratingMin);
      paramCount++;
    }

    if (filters.ratingMax !== undefined) {
      sql += ` AND rating <= $${paramCount}`;
      params.push(filters.ratingMax);
      paramCount++;
    }

    // Proximity search (distance calculation using PostGIS if available)
    if (
      filters.proximityLatitude !== undefined &&
      filters.proximityLongitude !== undefined &&
      filters.proximityRadiusKm !== undefined
    ) {
      // Using haversine formula for distance calculation
      sql += ` AND (
        3959 * acos(
          cos(radians($${paramCount})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($${paramCount + 1})) +
          sin(radians($${paramCount})) * sin(radians(latitude))
        )
      ) <= $${paramCount + 2}`;

      params.push(
        filters.proximityLatitude,
        filters.proximityLongitude,
        filters.proximityRadiusKm
      );
      paramCount += 3;
    }

    // Sorting
    const sortBy = filters.sortBy || 'rating';
    switch (sortBy) {
      case 'distance':
        if (filters.proximityLatitude && filters.proximityLongitude) {
          sql += ` ORDER BY (
            3959 * acos(
              cos(radians($${paramCount})) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($${paramCount + 1})) +
              sin(radians($${paramCount})) * sin(radians(latitude))
            )
          ) ASC`;
          params.push(filters.proximityLatitude, filters.proximityLongitude);
          paramCount += 2;
        } else {
          sql += ' ORDER BY rating DESC';
        }
        break;
      case 'newest':
        sql += ' ORDER BY created_at DESC';
        break;
      case 'popular':
        sql += ' ORDER BY view_count DESC';
        break;
      case 'rating':
      default:
        sql += ' ORDER BY rating DESC';
    }

    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    const results = await queryMany(sql, params);
    return results;
  } catch (error) {
    logger.error('Advanced search failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save a search query for later use
 */
export async function saveSearch(
  userId: string,
  name: string,
  filters: SearchFilters,
  description?: string
): Promise<SavedSearch | null> {
  try {
    const savedSearch = await insert('saved_searches', {
      user_id: userId,
      name,
      description: description || null,
      search_filters: JSON.stringify(filters),
      search_keyword: filters.keyword || null,
      proximity_latitude: filters.proximityLatitude || null,
      proximity_longitude: filters.proximityLongitude || null,
      proximity_radius_km: filters.proximityRadiusKm || null,
      categories: filters.categories || [],
      rating_min: filters.ratingMin || null,
      rating_max: filters.ratingMax || null,
      sort_by: filters.sortBy || 'rating',
      created_at: new Date().toISOString(),
    });

    return {
      id: savedSearch.id,
      userId: savedSearch.user_id,
      name: savedSearch.name,
      description: savedSearch.description,
      searchFilters: JSON.parse(savedSearch.search_filters),
      searchCount: savedSearch.search_count,
      lastSearchedAt: savedSearch.last_searched_at,
      createdAt: savedSearch.created_at,
    };
  } catch (error) {
    logger.error('Failed to save search', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's saved searches
 */
export async function getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
  try {
    const results = await queryMany(
      `SELECT id, user_id, name, description, search_filters, search_count, last_searched_at, created_at
       FROM saved_searches
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      description: r.description,
      searchFilters: JSON.parse(r.search_filters),
      searchCount: r.search_count,
      lastSearchedAt: r.last_searched_at,
      createdAt: r.created_at,
    }));
  } catch (error) {
    logger.error('Failed to get saved searches', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Delete saved search
 */
export async function deleteSavedSearch(userId: string, searchId: string): Promise<boolean> {
  try {
    // Verify ownership
    const search = await queryOne(
      'SELECT user_id FROM saved_searches WHERE id = $1',
      [searchId]
    );

    if (!search || search.user_id !== userId) {
      return false;
    }

    await query('DELETE FROM saved_searches WHERE id = $1', [searchId]);
    return true;
  } catch (error) {
    logger.error('Failed to delete saved search', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Execute a saved search
 */
export async function executeSavedSearch(userId: string, searchId: string, limit?: number): Promise<any[]> {
  try {
    const search = await queryOne(
      'SELECT search_filters FROM saved_searches WHERE id = $1 AND user_id = $2',
      [searchId, userId]
    );

    if (!search) {
      return [];
    }

    // Update last searched and search count
    await updateDb('saved_searches', searchId, {
      search_count: query('search_count + 1'),
      last_searched_at: new Date().toISOString(),
    });

    const filters = JSON.parse(search.search_filters);
    return advancedSearch(filters, limit);
  } catch (error) {
    logger.error('Failed to execute saved search', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get suggested search filters based on user's search history
 */
export async function getSuggestedFilters(userId: string): Promise<{
  popularCategories: string[];
  commonLocations: { latitude: number; longitude: number; count: number }[];
  preferredRatingRange: { min: number; max: number };
}> {
  try {
    // Get user's saved searches to analyze patterns
    const searches = await queryMany(
      `SELECT search_filters FROM saved_searches WHERE user_id = $1`,
      [userId]
    );

    const categories: Map<string, number> = new Map();
    const locations: Map<string, number> = new Map();
    let ratingMin = 1;
    let ratingMax = 5;
    let ratingCount = 0;

    searches.forEach((s: any) => {
      const filters = JSON.parse(s.search_filters);

      // Count categories
      if (filters.categories) {
        filters.categories.forEach((cat: string) => {
          categories.set(cat, (categories.get(cat) || 0) + 1);
        });
      }

      // Count locations
      if (filters.proximityLatitude && filters.proximityLongitude) {
        const key = `${filters.proximityLatitude},${filters.proximityLongitude}`;
        locations.set(key, (locations.get(key) || 0) + 1);
      }

      // Track rating preferences
      if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
        ratingMin = Math.max(ratingMin, filters.ratingMin || 1);
        ratingMax = Math.min(ratingMax, filters.ratingMax || 5);
        ratingCount++;
      }
    });

    const popularCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const commonLocations = Array.from(locations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([loc, count]) => {
        const [lat, lng] = loc.split(',').map(Number);
        return { latitude: lat, longitude: lng, count };
      });

    const preferredRatingRange = ratingCount > 0 ? { min: ratingMin, max: ratingMax } : { min: 1, max: 5 };

    return {
      popularCategories,
      commonLocations,
      preferredRatingRange,
    };
  } catch (error) {
    logger.error('Failed to get suggested filters', error instanceof Error ? error : new Error(String(error)));
    return {
      popularCategories: [],
      commonLocations: [],
      preferredRatingRange: { min: 1, max: 5 },
    };
  }
}
