/**
 * GraphQL Resolvers
 * Resolver implementations for GraphQL schema
 */

// @ts-nocheck
import { query } from '../lib/postgres';
import { recommendationEngine } from '../lib/recommendations';
import { esClient } from '../lib/search/elasticsearch';
import { getUserFromToken } from '../lib/auth';

export const resolvers = {
  Query: {
    // User queries
    me: async (_: any, __: any, { token }: any) => {
      if (!token) return null;
      const user = await getUserFromToken(token);
      return user;
    },

    user: async (_: any, { id }: { id: string }) => {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    // Place queries
    place: async (_: any, { id, slug }: { id?: string; slug?: string }) => {
      if (slug) {
        const result = await query('SELECT * FROM places WHERE slug = $1', [slug]);
        return result.rows[0] || null;
      }
      const result = await query('SELECT * FROM places WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    places: async (
      _: any,
      {
        filter,
        sort,
        limit = 20,
        offset = 0,
      }: {
        filter?: any;
        sort?: any;
        limit: number;
        offset: number;
      }
    ) => {
      let sql = 'SELECT * FROM places WHERE status = $1';
      const params: any[] = ['active'];
      let paramIndex = 2;

      if (filter?.categoryId) {
        sql += ` AND category_id = $${paramIndex++}`;
        params.push(filter.categoryId);
      }

      if (filter?.isFeatured) {
        sql += ` AND is_featured = true`;
      }

      if (sort) {
        sql += ` ORDER BY ${sort.field} ${sort.order}`;
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    featuredPlaces: async (_: any, { limit = 10 }: { limit: number }) => {
      const result = await query(
        'SELECT * FROM places WHERE is_featured = true AND status = $1 ORDER BY rating DESC LIMIT $2',
        ['active', limit]
      );
      return result.rows;
    },

    nearbyPlaces: async (
      _: any,
      { lat, lng, radius = 5, limit = 10 }: { lat: number; lng: number; radius: number; limit: number }
    ) => {
      const result = await query(
        `SELECT *, earth_distance(ll_to_earth($1, $2), ll_to_earth(latitude, longitude)) / 1000 as distance
         FROM places
         WHERE earth_box(ll_to_earth($1, $2), $3 * 1000) @> ll_to_earth(latitude, longitude)
         AND earth_distance(ll_to_earth($1, $2), ll_to_earth(latitude, longitude)) < $3 * 1000
         AND status = 'active'
         ORDER BY distance
         LIMIT $4`,
        [lat, lng, radius, limit]
      );
      return result.rows;
    },

    // Category queries
    categories: async () => {
      const result = await query('SELECT * FROM categories ORDER BY name');
      return result.rows;
    },

    category: async (_: any, { id, slug }: { id?: string; slug?: string }) => {
      if (slug) {
        const result = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
        return result.rows[0] || null;
      }
      const result = await query('SELECT * FROM categories WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    // Review queries
    reviews: async (
      _: any,
      { placeId, userId, limit = 20, offset = 0 }: { placeId?: string; userId?: string; limit: number; offset: number }
    ) => {
      let sql = 'SELECT * FROM reviews WHERE 1=1';
      const params: any[] = [];

      if (placeId) {
        sql += ' AND place_id = $1';
        params.push(placeId);
      }

      if (userId) {
        sql += ` AND user_id = $${params.length + 1}`;
        params.push(userId);
      }

      sql += ' ORDER BY created_at DESC';
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    // Blog queries
    blogPosts: async (
      _: any,
      { categoryId, tag, limit = 20, offset = 0 }: { categoryId?: string; tag?: string; limit: number; offset: number }
    ) => {
      let sql = `SELECT bp.* FROM blog_posts bp WHERE bp.is_published = true`;
      const params: any[] = [];

      if (categoryId) {
        sql += ' AND bp.category_id = $1';
        params.push(categoryId);
      }

      if (tag) {
        sql += ` AND EXISTS (
          SELECT 1 FROM blog_post_tags bpt
          JOIN tags t ON bpt.tag_id = t.id
          WHERE bpt.post_id = bp.id AND t.name = $${params.length + 1}
        )`;
        params.push(tag);
      }

      sql += ' ORDER BY bp.published_at DESC';
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows;
    },

    blogPost: async (_: any, { id, slug }: { id?: string; slug?: string }) => {
      if (slug) {
        const result = await query('SELECT * FROM blog_posts WHERE slug = $1 AND is_published = true', [slug]);
        return result.rows[0] || null;
      }
      const result = await query('SELECT * FROM blog_posts WHERE id = $1 AND is_published = true', [id]);
      return result.rows[0] || null;
    },

    // Search
    search: async (
      _: any,
      { query: searchQuery, filters, limit = 20, offset = 0 }: { query: string; filters?: any; limit: number; offset: number }
    ) => {
      try {
        // Try Elasticsearch first
        const [placesResult, postsResult] = await Promise.all([
          esClient.search('places', {
            q: searchQuery,
            filters: filters ? { category: filters.categoryId } : undefined,
            page: Math.floor(offset / limit) + 1,
            limit,
            highlight: true,
          }),
          esClient.search('blog_posts', {
            q: searchQuery,
            page: Math.floor(offset / limit) + 1,
            limit,
            highlight: true,
          }),
        ]);

        return {
          places: placesResult.hits,
          posts: postsResult.hits,
          totalPlaces: placesResult.total,
          totalPosts: postsResult.total,
          facets: placesResult.facets || { categories: [], tags: [], priceRanges: [] },
        };
      } catch {
        // Fallback to PostgreSQL
        const placesSql = `
          SELECT * FROM places 
          WHERE (name ILIKE $1 OR description ILIKE $1) 
          AND status = 'active'
          LIMIT $2 OFFSET $3
        `;
        const postsSql = `
          SELECT * FROM blog_posts 
          WHERE (title ILIKE $1 OR content ILIKE $1) 
          AND is_published = true
          LIMIT $2 OFFSET $3
        `;

        const [places, posts] = await Promise.all([
          query(placesSql, [`%${searchQuery}%`, limit, offset]),
          query(postsSql, [`%${searchQuery}%`, limit, offset]),
        ]);

        return {
          places: places.rows,
          posts: posts.rows,
          totalPlaces: places.rows.length,
          totalPosts: posts.rows.length,
          facets: { categories: [], tags: [], priceRanges: [] },
        };
      }
    },

    autocomplete: async (_: any, { query, limit = 5 }: { query: string; limit: number }) => {
      try {
        return await esClient.suggest('places', query);
      } catch {
        // Fallback
        const result = await query(
          'SELECT name FROM places WHERE name ILIKE $1 AND status = $2 LIMIT $3',
          [`%${query}%`, 'active', limit]
        );
        return result.rows.map((r: any) => r.name);
      }
    },

    // Recommendations
    recommendations: async (_: any, { limit = 10 }: { limit: number }, { user }: any) => {
      if (!user) {
        // Return trending for anonymous users
        const result = await query(
          'SELECT * FROM places WHERE status = $1 ORDER BY view_count DESC LIMIT $2',
          ['active', limit]
        );
        return result.rows.map((place: any) => ({
          place,
          score: 1,
          reason: 'Popüler',
        }));
      }

      const recs = await recommendationEngine.getRecommendationsForUser(user.id, limit);
      const placeIds = recs.map(r => r.placeId);

      if (placeIds.length === 0) {
        return [];
      }

      const result = await query(
        'SELECT * FROM places WHERE id = ANY($1) AND status = $2',
        [placeIds, 'active']
      );

      const placesMap = new Map(result.rows.map((p: any) => [p.id, p]));

      return recs.map(rec => ({
        place: placesMap.get(rec.placeId),
        score: rec.score,
        reason: rec.reason,
      })).filter((r: any) => r.place);
    },

    similarPlaces: async (_: any, { placeId, limit = 5 }: { placeId: string; limit: number }) => {
      const recs = await recommendationEngine.getSimilarPlaces(placeId, limit);
      const placeIds = recs.map(r => r.placeId);

      if (placeIds.length === 0) {
        return [];
      }

      const result = await query(
        'SELECT * FROM places WHERE id = ANY($1) AND status = $2',
        [placeIds, 'active']
      );

      const placesMap = new Map(result.rows.map((p: any) => [p.id, p]));

      return recs.map(rec => ({
        place: placesMap.get(rec.placeId),
        score: rec.score,
        reason: rec.reason,
      })).filter((r: any) => r.place);
    },

    // Notifications
    notifications: async (_: any, { limit = 20, offset = 0 }: { limit: number; offset: number }, { user }: any) => {
      if (!user) return [];

      const result = await query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [user.id, limit, offset]
      );
      return result.rows;
    },

    unreadNotificationCount: async (_: any, __: any, { user }: any) => {
      if (!user) return 0;

      const result = await query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [user.id]
      );
      return parseInt(result.rows[0].count);
    },
  },

  Mutation: {
    // Auth mutations
    register: async (_: any, { email, password, fullName }: { email: string; password: string; fullName: string }) => {
      // Implementation would call auth service
      throw new Error('Not implemented');
    },

    login: async (_: any, { email, password }: { email: string; password: string }) => {
      // Implementation would call auth service
      throw new Error('Not implemented');
    },

    // Place mutations
    createPlace: async (_: any, { input }: { input: any }, { user }: any) => {
      if (!user) throw new Error('Unauthorized');

      const result = await query(
        `INSERT INTO places (name, description, category_id, address, latitude, longitude, phone, email, website, price_range, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
         RETURNING *`,
        [input.name, input.description, input.categoryId, input.address, input.latitude, input.longitude,
         input.phone, input.email, input.website, input.priceRange]
      );

      return result.rows[0];
    },

    // Review mutations
    createReview: async (_: any, { input }: { input: any }, { user }: any) => {
      if (!user) throw new Error('Unauthorized');

      const result = await query(
        `INSERT INTO reviews (place_id, user_id, rating, title, content, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'approved', NOW())
         RETURNING *`,
        [input.placeId, user.id, input.rating, input.title, input.content]
      );

      // Update place rating
      await query(
        `UPDATE places SET 
          rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status = 'approved'),
          review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = $1 AND status = 'approved')
         WHERE id = $1`,
        [input.placeId]
      );

      return result.rows[0];
    },

    // Favorite mutations
    addToFavorites: async (_: any, { placeId }: { placeId: string }, { user }: any) => {
      if (!user) throw new Error('Unauthorized');

      await query(
        'INSERT INTO favorites (user_id, place_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
        [user.id, placeId]
      );
      return true;
    },

    removeFromFavorites: async (_: any, { placeId }: { placeId: string }, { user }: any) => {
      if (!user) throw new Error('Unauthorized');

      await query('DELETE FROM favorites WHERE user_id = $1 AND place_id = $2', [user.id, placeId]);
      return true;
    },
  },

  // Type resolvers
  Place: {
    category: async (parent: any) => {
      const result = await query('SELECT * FROM categories WHERE id = $1', [parent.category_id]);
      return result.rows[0];
    },

    tags: async (parent: any) => {
      const result = await query(
        `SELECT t.* FROM tags t
         JOIN place_tags pt ON t.id = pt.tag_id
         WHERE pt.place_id = $1`,
        [parent.id]
      );
      return result.rows;
    },

    reviews: async (parent: any, { limit = 10, offset = 0 }: { limit: number; offset: number }) => {
      const result = await query(
        'SELECT * FROM reviews WHERE place_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
        [parent.id, 'approved', limit, offset]
      );
      return result.rows;
    },

    isOpenNow: (parent: any) => {
      // Simplified logic - would check opening_hours table
      return true;
    },

    distance: (parent: any, { lat, lng }: { lat: number; lng: number }) => {
      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = ((parent.latitude - lat) * Math.PI) / 180;
      const dLon = ((parent.longitude - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((parent.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
  },

  Review: {
    place: async (parent: any) => {
      const result = await query('SELECT * FROM places WHERE id = $1', [parent.place_id]);
      return result.rows[0];
    },

    author: async (parent: any) => {
      const result = await query('SELECT * FROM users WHERE id = $1', [parent.user_id]);
      return result.rows[0];
    },
  },

  User: {
    reviews: async (parent: any) => {
      const result = await query('SELECT * FROM reviews WHERE user_id = $1', [parent.id]);
      return result.rows;
    },

    favorites: async (parent: any) => {
      const result = await query(
        `SELECT p.* FROM places p
         JOIN favorites f ON p.id = f.place_id
         WHERE f.user_id = $1`,
        [parent.id]
      );
      return result.rows;
    },

    reviewCount: async (parent: any) => {
      const result = await query('SELECT COUNT(*) FROM reviews WHERE user_id = $1', [parent.id]);
      return parseInt(result.rows[0].count);
    },
  },
};

export default resolvers;
