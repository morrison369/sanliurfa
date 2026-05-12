/**
 * Blog System - PostgreSQL Database Layer
 * All blog operations use database
 */

import { query, queryOne, transaction } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';

// Types
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  content_html?: string;
  category_id?: string;
  category_name?: string;
  author_id?: string;
  author_name: string;
  author_avatar?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at?: string;
  updated_at: string;
  created_at: string;
  reading_time: number;
  view_count: number;
  like_count: number;
  meta_title?: string;
  meta_description?: string;
  is_featured: boolean;
  is_pinned: boolean;
  tags?: BlogTag[];
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  post_count: number;
}

export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  post_count: number;
}

export interface BlogRevision {
  id: string;
  post_id: string;
  title: string;
  content: string;
  editor_id?: string;
  editor_name?: string;
  change_summary?: string;
  created_at: string;
}

// Cache keys
const CACHE_KEYS = {
  posts: 'blog:posts',
  post: (slug: string) => `blog:post:${slug}`,
  categories: 'blog:categories',
  tags: 'blog:tags',
  featured: 'blog:featured',
  stats: 'blog:stats',
};

/**
 * Get all posts with filters
 */
export async function getPosts(filters: {
  status?: string;
  category?: string;
  tag?: string;
  author?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  const cacheKey = `${CACHE_KEYS.posts}:${JSON.stringify(filters)}`;
  const cached = await getCache<{ posts: BlogPost[]; total: number }>(cacheKey);
  if (cached) return cached;

  const {
    status = 'published',
    category,
    tag,
    author,
    featured,
    search,
    limit = 10,
    offset = 0,
  } = filters;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    params.push(status);
    whereClause += ` AND p.status = $${params.length}`;
  }

  if (category) {
    params.push(category);
    whereClause += ` AND c.slug = $${params.length}`;
  }

  if (tag) {
    params.push(tag);
    whereClause += ` AND EXISTS (
      SELECT 1 FROM blog_post_tags pt 
      JOIN blog_tags t ON t.id = pt.tag_id 
      WHERE pt.post_id = p.id AND t.slug = $${params.length}
    )`;
  }

  if (author) {
    params.push(author);
    whereClause += ` AND p.author_id = $${params.length}`;
  }

  if (featured !== undefined) {
    params.push(featured);
    whereClause += ` AND p.is_featured = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    whereClause += ` AND (p.title ILIKE $${params.length - 1} OR p.content ILIKE $${params.length})`;
  }

  const countParams = [...params];
  const listParams = [...params, limit, offset];

  const [countResult, result] = await Promise.all([
    queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM blog_posts p
       LEFT JOIN blog_categories c ON c.id = p.category_id
       ${whereClause}`,
      countParams
    ),
    query<BlogPost>(
      `SELECT
        p.*,
        c.name as category_name,
        COALESCE(json_agg(
          json_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'color', t.color)
        ) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM blog_posts p
      LEFT JOIN blog_categories c ON c.id = p.category_id
      LEFT JOIN blog_post_tags pt ON pt.post_id = p.id
      LEFT JOIN blog_tags t ON t.id = pt.tag_id
      ${whereClause}
      GROUP BY p.id, c.name
      ORDER BY p.is_pinned DESC, p.published_at DESC NULLS LAST
      LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    ),
  ]);

  const response = { posts: result.rows, total: countResult?.count || 0 };
  await setCache(cacheKey, response, 300);
  return response;
}

/**
 * Get single post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const cacheKey = CACHE_KEYS.post(slug);
  const cached = await getCache<BlogPost>(cacheKey);
  if (cached) {
    // Increment view count async
    incrementViewCount(cached.id).catch(() => {});
    return cached;
  }

  const result = await queryOne<BlogPost>(
    `SELECT 
      p.*,
      c.name as category_name,
      COALESCE(json_agg(
        json_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'color', t.color)
      ) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    LEFT JOIN blog_post_tags pt ON pt.post_id = p.id
    LEFT JOIN blog_tags t ON t.id = pt.tag_id
    WHERE p.slug = $1
    GROUP BY p.id, c.name`,
    [slug]
  );

  if (result) {
    await setCache(cacheKey, result, 600);
    // Increment view count async
    incrementViewCount(result.id).catch(() => {});
  }

  return result;
}

/**
 * Create new post
 */
export async function createPost(data: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_html?: string;
  category_id?: string;
  author_id: string;
  author_name: string;
  featured_image?: string;
  status?: string;
  published_at?: Date;
  meta_title?: string;
  meta_description?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  tag_ids?: string[];
}): Promise<BlogPost> {
  return await transaction(async (client) => {
    // Insert post
    const postResult = await client.query<BlogPost>(
      `INSERT INTO blog_posts (
        title, slug, excerpt, content, content_html, category_id,
        author_id, author_name, featured_image, status, published_at,
        meta_title, meta_description, is_featured, is_pinned, reading_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.title,
        data.slug,
        data.excerpt,
        data.content,
        data.content_html,
        data.category_id,
        data.author_id,
        data.author_name,
        data.featured_image,
        data.status || 'draft',
        data.published_at,
        data.meta_title,
        data.meta_description,
        data.is_featured || false,
        data.is_pinned || false,
        calculateReadingTime(data.content),
      ]
    );

    const post = postResult.rows[0];

    // Add tags
    if (data.tag_ids?.length) {
      for (const tagId of data.tag_ids) {
        await client.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [post.id, tagId]
        );
      }
    }

    // Update category post count
    if (data.category_id) {
      await client.query(
        'UPDATE blog_categories SET post_count = (SELECT COUNT(*) FROM blog_posts WHERE category_id = $1) WHERE id = $1',
        [data.category_id]
      );
    }

    // Clear cache
    await clearBlogCache();

    return post;
  });
}

/**
 * Update post
 */
export async function updatePost(
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    content_html: string;
    category_id: string;
    featured_image: string;
    status: string;
    published_at: Date;
    meta_title: string;
    meta_description: string;
    is_featured: boolean;
    is_pinned: boolean;
    tag_ids: string[];
  }>,
  editorId?: string,
  editorName?: string
): Promise<BlogPost> {
  return await transaction(async (client) => {
    // Get old data for revision
    const oldPost = await client.query<BlogPost>('SELECT * FROM blog_posts WHERE id = $1', [id]);
    if (oldPost.rows.length === 0) {
      throw new Error('Post not found');
    }

    const old = oldPost.rows[0];

    // Create revision
    await client.query(
      `INSERT INTO blog_revisions (post_id, title, content, editor_id, editor_name, change_summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, old.title, old.content, editorId, editorName, 'Content updated']
    );

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }
    if (data.excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`);
      values.push(data.excerpt);
    }
    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(data.content);
      updates.push(`reading_time = $${paramIndex++}`);
      values.push(calculateReadingTime(data.content));
    }
    if (data.content_html !== undefined) {
      updates.push(`content_html = $${paramIndex++}`);
      values.push(data.content_html);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = $${paramIndex++}`);
      values.push(data.category_id);
    }
    if (data.featured_image !== undefined) {
      updates.push(`featured_image = $${paramIndex++}`);
      values.push(data.featured_image);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.published_at !== undefined) {
      updates.push(`published_at = $${paramIndex++}`);
      values.push(data.published_at);
    }
    if (data.meta_title !== undefined) {
      updates.push(`meta_title = $${paramIndex++}`);
      values.push(data.meta_title);
    }
    if (data.meta_description !== undefined) {
      updates.push(`meta_description = $${paramIndex++}`);
      values.push(data.meta_description);
    }
    if (data.is_featured !== undefined) {
      updates.push(`is_featured = $${paramIndex++}`);
      values.push(data.is_featured);
    }
    if (data.is_pinned !== undefined) {
      updates.push(`is_pinned = $${paramIndex++}`);
      values.push(data.is_pinned);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await client.query<BlogPost>(
      `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Update tags
    if (data.tag_ids !== undefined) {
      await client.query('DELETE FROM blog_post_tags WHERE post_id = $1', [id]);
      for (const tagId of data.tag_ids) {
        await client.query(
          'INSERT INTO blog_post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId]
        );
      }
    }

    // Update category counts
    if (data.category_id || old.category_id) {
      const catId = data.category_id || old.category_id;
      if (catId) {
        await client.query(
          'UPDATE blog_categories SET post_count = (SELECT COUNT(*) FROM blog_posts WHERE category_id = $1) WHERE id = $1',
          [catId]
        );
      }
    }

    await clearBlogCache();
    return result.rows[0];
  });
}

/**
 * Delete post
 */
export async function deletePost(id: string): Promise<boolean> {
  const result = await query('DELETE FROM blog_posts WHERE id = $1', [id]);
  if (result.rowCount && result.rowCount > 0) {
    await clearBlogCache();
    return true;
  }
  return false;
}

/**
 * Get categories
 */
export async function getCategories(): Promise<BlogCategory[]> {
  const cacheKey = CACHE_KEYS.categories;
  const cached = await getCache<BlogCategory[]>(cacheKey);
  if (cached) return cached;

  const result = await query<BlogCategory>(
    'SELECT * FROM blog_categories WHERE is_active = true ORDER BY sort_order, name'
  );

  await setCache(cacheKey, result.rows, 600);
  return result.rows;
}

/**
 * Get tags
 */
export async function getTags(): Promise<BlogTag[]> {
  const cacheKey = CACHE_KEYS.tags;
  const cached = await getCache<BlogTag[]>(cacheKey);
  if (cached) return cached;

  const result = await query<BlogTag>(
    'SELECT * FROM blog_tags ORDER BY post_count DESC, name'
  );

  await setCache(cacheKey, result.rows, 600);
  return result.rows;
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(limit = 5): Promise<BlogPost[]> {
  const cacheKey = `${CACHE_KEYS.featured}:${limit}`;
  const cached = await getCache<BlogPost[]>(cacheKey);
  if (cached) return cached;

  const result = await query<BlogPost>(
    `SELECT 
      p.*,
      c.name as category_name,
      COALESCE(json_agg(
        json_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'color', t.color)
      ) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    LEFT JOIN blog_post_tags pt ON pt.post_id = p.id
    LEFT JOIN blog_tags t ON t.id = pt.tag_id
    WHERE p.status = 'published' AND p.is_featured = true
    GROUP BY p.id, c.name
    ORDER BY p.is_pinned DESC, p.published_at DESC
    LIMIT $1`,
    [limit]
  );

  await setCache(cacheKey, result.rows, 300);
  return result.rows;
}

/**
 * Get related posts
 */
export async function getRelatedPosts(postId: string, categoryId?: string, limit = 3): Promise<BlogPost[]> {
  const result = await query<BlogPost>(
    `SELECT 
      p.*,
      c.name as category_name
    FROM blog_posts p
    LEFT JOIN blog_categories c ON c.id = p.category_id
    WHERE p.status = 'published' AND p.id != $1
      AND (p.category_id = $2 OR EXISTS (
        SELECT 1 FROM blog_post_tags pt1
        JOIN blog_post_tags pt2 ON pt1.tag_id = pt2.tag_id
        WHERE pt1.post_id = p.id AND pt2.post_id = $1
      ))
    ORDER BY p.published_at DESC
    LIMIT $3`,
    [postId, categoryId, limit]
  );

  return result.rows;
}

/**
 * Get post revisions
 */
export async function getPostRevisions(postId: string): Promise<BlogRevision[]> {
  const result = await query<BlogRevision>(
    `SELECT * FROM blog_revisions 
     WHERE post_id = $1 
     ORDER BY created_at DESC`,
    [postId]
  );
  return result.rows;
}

/**
 * Get blog stats
 */
export async function getBlogStats(): Promise<{
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalLikes: number;
}> {
  const cacheKey = CACHE_KEYS.stats;
  const cached = await getCache<any>(cacheKey);
  if (cached) return cached;

  const result = await queryOne<{
    total_posts: number;
    published_posts: number;
    draft_posts: number;
    total_views: number;
    total_likes: number;
  }>(
    `SELECT 
      COUNT(*)::int as total_posts,
      COUNT(*) FILTER (WHERE status = 'published')::int as published_posts,
      COUNT(*) FILTER (WHERE status = 'draft')::int as draft_posts,
      COALESCE(SUM(view_count), 0)::int as total_views,
      COALESCE(SUM(like_count), 0)::int as total_likes
    FROM blog_posts`
  );

  const stats = {
    totalPosts: result?.total_posts || 0,
    publishedPosts: result?.published_posts || 0,
    draftPosts: result?.draft_posts || 0,
    totalViews: result?.total_views || 0,
    totalLikes: result?.total_likes || 0,
  };

  await setCache(cacheKey, stats, 300);
  return stats;
}

/**
 * Increment view count
 */
async function incrementViewCount(postId: string): Promise<void> {
  await query(
    'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = $1',
    [postId]
  );
}

/**
 * Clear blog cache
 */
async function clearBlogCache(): Promise<void> {
  // Clear all blog-related caches
  const keys = [CACHE_KEYS.posts, CACHE_KEYS.categories, CACHE_KEYS.tags, CACHE_KEYS.featured, CACHE_KEYS.stats];
  for (const key of keys) {
    await deleteCache(key);
  }
}

/**
 * Calculate reading time
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Admin functions
export async function createCategory(data: Omit<BlogCategory, 'id' | 'post_count'>): Promise<BlogCategory> {
  const result = await queryOne<BlogCategory>(
    `INSERT INTO blog_categories (slug, name, description, color, icon, parent_id, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [data.slug, data.name, data.description, data.color, data.icon, data.parent_id, data.sort_order]
  );
  await deleteCache(CACHE_KEYS.categories);
  return result!;
}

export async function createTag(data: Omit<BlogTag, 'id' | 'post_count'>): Promise<BlogTag> {
  const result = await queryOne<BlogTag>(
    `INSERT INTO blog_tags (slug, name, description, color)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.slug, data.name, data.description, data.color]
  );
  await deleteCache(CACHE_KEYS.tags);
  return result!;
}
