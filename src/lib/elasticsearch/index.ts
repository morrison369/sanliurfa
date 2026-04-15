/**
 * Elasticsearch Integration Module
 * Advanced search with full-text, fuzzy matching, and aggregations
 */

import { query } from '../postgres';

export interface SearchDocument {
  id: string;
  type: 'place' | 'blog' | 'event' | 'user';
  title: string;
  description?: string;
  content?: string;
  tags?: string[];
  category?: string;
  location?: {
    lat: number;
    lon: number;
  };
  rating?: number;
  created_at: Date;
  [key: string]: any;
}

export interface SearchQuery {
  query?: string;
  filters?: {
    type?: string[];
    category?: string[];
    tags?: string[];
    rating?: { min?: number; max?: number };
    dateRange?: { from?: Date; to?: Date };
    location?: {
      lat: number;
      lon: number;
      distance: string; // e.g., "5km"
    };
  };
  sort?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
  aggregations?: string[];
  page?: number;
  perPage?: number;
}

// In-memory index simulation (would use actual Elasticsearch in production)
const searchIndex = new Map<string, SearchDocument>();

/**
 * Index a document
 */
export async function indexDocument(doc: SearchDocument): Promise<void> {
  const key = `${doc.type}:${doc.id}`;
  searchIndex.set(key, {
    ...doc,
    _indexed_at: new Date()
  });

  // Also store in database for persistence
  await query(
    `INSERT INTO search_index (id, type, title, description, content, tags, data, indexed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (id, type) DO UPDATE SET
     title = $3, description = $4, content = $5, tags = $6, data = $7, indexed_at = NOW()`,
    [doc.id, doc.type, doc.title, doc.description, doc.content, doc.tags, JSON.stringify(doc)]
  );
}

/**
 * Bulk index documents
 */
export async function bulkIndex(docs: SearchDocument[]): Promise<{ indexed: number; errors: number }> {
  let indexed = 0;
  let errors = 0;

  for (const doc of docs) {
    try {
      await indexDocument(doc);
      indexed++;
    } catch (e) {
      errors++;
    }
  }

  return { indexed, errors };
}

/**
 * Search with full-text and filters
 */
export async function search(options: SearchQuery): Promise<{
  hits: SearchDocument[];
  total: number;
  aggregations?: Record<string, any>;
  page: number;
  perPage: number;
}> {
  const { 
    query: searchQuery, 
    filters = {}, 
    sort = [], 
    page = 1, 
    perPage = 20 
  } = options;

  let sql = `SELECT * FROM search_index WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  // Full-text search
  if (searchQuery) {
    sql += ` AND (
      title ILIKE $${paramIndex} 
      OR description ILIKE $${paramIndex} 
      OR content ILIKE $${paramIndex}
      OR $${paramIndex + 1} = ANY(tags)
    )`;
    const pattern = `%${searchQuery}%`;
    params.push(pattern, searchQuery);
    paramIndex += 2;
  }

  // Type filter
  if (filters.type?.length) {
    sql += ` AND type = ANY($${paramIndex})`;
    params.push(filters.type);
    paramIndex++;
  }

  // Category filter
  if (filters.category?.length) {
    sql += ` AND data->>'category' = ANY($${paramIndex})`;
    params.push(filters.category);
    paramIndex++;
  }

  // Rating filter
  if (filters.rating?.min !== undefined) {
    sql += ` AND (data->>'rating')::float >= $${paramIndex}`;
    params.push(filters.rating.min);
    paramIndex++;
  }

  // Date range filter
  if (filters.dateRange?.from) {
    sql += ` AND indexed_at >= $${paramIndex}`;
    params.push(filters.dateRange.from);
    paramIndex++;
  }

  // Location filter (simple distance calculation)
  if (filters.location) {
    const { lat, lon, distance } = filters.location;
    const km = parseInt(distance);
    sql += ` AND (
      6371 * acos(
        cos(radians($${paramIndex})) * cos(radians((data->>'lat')::float)) * 
        cos(radians((data->>'lon')::float) - radians($${paramIndex + 1})) + 
        sin(radians($${paramIndex})) * sin(radians((data->>'lat')::float))
      )
    ) <= $${paramIndex + 2}`;
    params.push(lat, lon, km);
    paramIndex += 3;
  }

  // Get total count
  const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS count_query`, params);
  const total = parseInt(countResult.rows[0].count);

  // Add sorting
  if (sort.length > 0) {
    const sortClause = sort.map(s => {
      if (s.field === 'relevance' && searchQuery) {
        return `ts_rank(to_tsvector('turkish', title || ' ' || COALESCE(description, '')), plainto_tsquery('turkish', $1)) ${s.order}`;
      }
      return `data->>'${s.field}' ${s.order}`;
    }).join(', ');
    sql += ` ORDER BY ${sortClause}`;
  } else {
    sql += ` ORDER BY indexed_at DESC`;
  }

  // Pagination
  const offset = (page - 1) * perPage;
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(perPage, offset);

  const result = await query(sql, params);

  // Calculate aggregations
  let aggregations: Record<string, any> = {};
  if (options.aggregations?.includes('type')) {
    const aggResult = await query(`
      SELECT type, COUNT(*) as count 
      FROM search_index 
      GROUP BY type
    `);
    aggregations.types = aggResult.rows;
  }

  return {
    hits: result.rows.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      ...r.data
    })),
    total,
    aggregations,
    page,
    perPage
  };
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSuggestions(
  prefix: string, 
  options: { type?: string; limit?: number } = {}
): Promise<Array<{ text: string; type: string }>> {
  const sql = `
    SELECT DISTINCT title as text, type
    FROM search_index
    WHERE title ILIKE $1
    ${options.type ? 'AND type = $2' : ''}
    ORDER BY 
      CASE WHEN title ILIKE $3 THEN 0 ELSE 1 END,
      title
    LIMIT $4
  `;

  const params = [
    `${prefix}%`,
    ...(options.type ? [options.type] : []),
    `${prefix}`,
    options.limit || 10
  ];

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Delete document from index
 */
export async function deleteDocument(id: string, type: string): Promise<void> {
  searchIndex.delete(`${type}:${id}`);
  
  await query(
    `DELETE FROM search_index WHERE id = $1 AND type = $2`,
    [id, type]
  );
}

/**
 * Reindex all documents
 */
export async function reindexAll(): Promise<{ indexed: number }> {
  let indexed = 0;

  // Index places
  const places = await query(`SELECT * FROM places WHERE status = 'active'`);
  for (const place of places.rows) {
    await indexDocument({
      id: place.id,
      type: 'place',
      title: place.name,
      description: place.description,
      category: place.category_id,
      location: place.latitude && place.longitude ? {
        lat: parseFloat(place.latitude),
        lon: parseFloat(place.longitude)
      } : undefined,
      rating: parseFloat(place.rating) || 0,
      created_at: place.created_at
    });
    indexed++;
  }

  // Index blog posts
  const blogs = await query(`SELECT * FROM blog_posts WHERE status = 'published'`);
  for (const blog of blogs.rows) {
    await indexDocument({
      id: blog.id,
      type: 'blog',
      title: blog.title,
      description: blog.excerpt,
      content: blog.content,
      tags: blog.tags,
      created_at: blog.created_at
    });
    indexed++;
  }

  return { indexed };
}

/**
 * Get popular searches
 */
export async function getPopularSearches(days: number = 7, limit: number = 10): Promise<string[]> {
  const result = await query(`
    SELECT query, COUNT(*) as count
    FROM search_logs
    WHERE created_at >= NOW() - ($2 * INTERVAL '1 day')
    GROUP BY query
    ORDER BY count DESC
    LIMIT $1
  `, [limit, days]);

  return result.rows.map(r => r.query);
}

/**
 * Log search query
 */
export async function logSearch(query: string, userId?: string, resultsCount?: number): Promise<void> {
  await query(
    `INSERT INTO search_logs (query, user_id, results_count, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [query, userId, resultsCount]
  );
}
