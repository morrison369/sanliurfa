/**
 * Blog System
 * Content management for blog posts
 */

import { getCollection } from 'astro:content';
import { query } from './postgres';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  authorAvatar?: string;
  publishedAt: Date;
  updatedAt?: Date;
  readingTime: number;
  image?: string;
  featured?: boolean;
  views?: number;
}

export interface BlogCategory {
  slug: string;
  name: string;
  count: number;
  description?: string;
}

/**
 * Get all blog posts
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog');
  
  return posts
    .map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.data.title,
      excerpt: post.data.excerpt,
      content: post.body,
      category: post.data.category,
      tags: post.data.tags || [],
      author: post.data.author,
      authorAvatar: post.data.authorAvatar,
      publishedAt: new Date(post.data.publishedAt),
      updatedAt: post.data.updatedAt ? new Date(post.data.updatedAt) : undefined,
      readingTime: post.data.readingTime || 5,
      image: post.data.image,
      featured: post.data.featured || false,
      views: post.data.views || 0,
    }))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(limit = 3): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(p => p.featured).slice(0, limit);
}

/**
 * Get post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await getAllPosts();
  return posts.find(p => p.slug === slug) || null;
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(p => 
    p.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(p => 
    p.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get related posts
 */
export async function getRelatedPosts(
  currentPost: BlogPost,
  limit = 3
): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  
  return posts
    .filter(p => p.id !== currentPost.id)
    .filter(p => 
      p.category === currentPost.category ||
      p.tags.some(t => currentPost.tags.includes(t))
    )
    .slice(0, limit);
}

/**
 * Search posts
 */
export async function searchPosts(query: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  const lowerQuery = query.toLowerCase();
  
  return posts.filter(p =>
    p.title.toLowerCase().includes(lowerQuery) ||
    p.excerpt.toLowerCase().includes(lowerQuery) ||
    p.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all categories with counts
 */
export async function getCategories(): Promise<BlogCategory[]> {
  const posts = await getAllPosts();
  const categoryMap = new Map<string, number>();
  
  posts.forEach(post => {
    const count = categoryMap.get(post.category) || 0;
    categoryMap.set(post.category, count + 1);
  });
  
  return Array.from(categoryMap.entries()).map(([slug, count]) => ({
    slug: slugify(slug),
    name: slug,
    count,
  }));
}

/**
 * Get all tags with counts
 */
export async function getTags(): Promise<{ name: string; count: number }[]> {
  const posts = await getAllPosts();
  const tagMap = new Map<string, number>();
  
  posts.forEach(post => {
    post.tags.forEach(tag => {
      const count = tagMap.get(tag) || 0;
      tagMap.set(tag, count + 1);
    });
  });
  
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Generate RSS feed
 */
export async function generateRSS(): Promise<string> {
  const posts = await getAllPosts();
  const latest = posts[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Şanlıurfa Rehberi Blog</title>
    <link>https://sanliurfa.com/blog</link>
    <description>Şanlıurfa hakkında en güncel bilgiler, rehberler ve öneriler</description>
    <language>tr</language>
    <lastBuildDate>${latest?.publishedAt.toUTCString() || new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://sanliurfa.com/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.slice(0, 20).map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://sanliurfa.com/blog/${post.slug}</link>
      <guid isPermaLink="true">https://sanliurfa.com/blog/${post.slug}</guid>
      <pubDate>${post.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('')}
    </item>
    `).join('')}
  </channel>
</rss>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get blog categories (alias for getCategories)
 */
export async function getBlogCategories(): Promise<BlogCategory[]> {
  return getCategories();
}

// Blog categories
export const BLOG_CATEGORIES = [
  { slug: 'tarih', name: 'Tarih', description: 'Şanlıurfa\'nın zengin tarihi ve kültürel mirası' },
  { slug: 'yemek', name: 'Yemek', description: 'Urfa mutfağından eşsiz lezzetler' },
  { slug: 'gezi', name: 'Gezi', description: 'Şanlıurfa gezi rehberleri ve rotaları' },
  { slug: 'kultur', name: 'Kültür', description: 'Yerel kültür ve gelenekler' },
  { slug: 'otel', name: 'Otel', description: 'Konaklama önerileri ve değerlendirmeler' },
  { slug: 'restoran', name: 'Restoran', description: 'Restoran incelemeleri ve öneriler' },
] as const;


// Blog Comments Interface
export interface BlogComment {
  id: string;
  post_id: string;
  user_id?: string;
  author_name: string;
  author_email: string;
  content: string;
  parent_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  updated_at?: Date;
}

/**
 * Get blog comments for a post
 */
export async function getBlogComments(
  postId: string,
  options: { approved?: boolean; limit?: number; offset?: number } = {}
): Promise<BlogComment[]> {
  const { approved = true, limit = 50, offset = 0 } = options;
  
  const result = await query(
    `SELECT * FROM blog_comments 
     WHERE post_id = $1 ${approved ? "AND status = 'approved'" : ''}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [postId, limit, offset]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    author_name: row.author_name,
    author_email: row.author_email,
    content: row.content,
    parent_id: row.parent_id,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}

/**
 * Add a blog comment
 */
export async function addBlogComment(data: {
  post_id: string;
  user_id?: string;
  author_name: string;
  author_email: string;
  content: string;
  parent_id?: string;
}): Promise<BlogComment> {
  const result = await query(
    `INSERT INTO blog_comments (post_id, user_id, author_name, author_email, content, parent_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
     RETURNING *`,
    [data.post_id, data.user_id || null, data.author_name, data.author_email, data.content, data.parent_id || null]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    author_name: row.author_name,
    author_email: row.author_email,
    content: row.content,
    parent_id: row.parent_id,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  };
}

/**
 * Approve a comment
 */
export async function approveComment(commentId: string): Promise<void> {
  await query(
    `UPDATE blog_comments SET status = 'approved', updated_at = NOW() WHERE id = $1`,
    [commentId]
  );
}

/**
 * Reject a comment
 */
export async function rejectComment(commentId: string): Promise<void> {
  await query(
    `UPDATE blog_comments SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
    [commentId]
  );
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  await query(
    `DELETE FROM blog_comments WHERE id = $1`,
    [commentId]
  );
}

/**
 * Get pending comments (for admin)
 */
export async function getPendingComments(limit = 20): Promise<BlogComment[]> {
  const result = await query(
    `SELECT * FROM blog_comments 
     WHERE status = 'pending'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    author_name: row.author_name,
    author_email: row.author_email,
    content: row.content,
    parent_id: row.parent_id,
    status: row.status,
    created_at: new Date(row.created_at),
    updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
  }));
}


// Blog Revision Interface
export interface BlogPostRevision {
  id: string;
  post_id: string;
  title: string;
  content: string;
  excerpt?: string;
  editor_id: string;
  editor_name: string;
  change_summary?: string;
  created_at: Date;
}

/**
 * Get blog post revisions
 */
export async function getBlogPostRevisions(postId: string): Promise<BlogPostRevision[]> {
  const result = await query(
    `SELECT r.*, u.full_name as editor_name
     FROM blog_post_revisions r
     LEFT JOIN users u ON r.editor_id = u.id
     WHERE r.post_id = $1
     ORDER BY r.created_at DESC`,
    [postId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    post_id: row.post_id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    editor_id: row.editor_id,
    editor_name: row.editor_name,
    change_summary: row.change_summary,
    created_at: new Date(row.created_at),
  }));
}

/**
 * Create a new revision
 */
export async function createBlogPostRevision(data: {
  post_id: string;
  title: string;
  content: string;
  excerpt?: string;
  editor_id: string;
  change_summary?: string;
}): Promise<BlogPostRevision> {
  const result = await query(
    `INSERT INTO blog_post_revisions (post_id, title, content, excerpt, editor_id, change_summary, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [data.post_id, data.title, data.content, data.excerpt || null, data.editor_id, data.change_summary || null]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    post_id: row.post_id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    editor_id: row.editor_id,
    editor_name: '', // Will be populated by caller if needed
    change_summary: row.change_summary,
    created_at: new Date(row.created_at),
  };
}

/**
 * Restore a revision
 */
export async function restoreBlogPostRevision(revisionId: string, postId: string): Promise<void> {
  // Get the revision
  const revisionResult = await query(
    `SELECT * FROM blog_post_revisions WHERE id = $1`,
    [revisionId]
  );
  
  if (revisionResult.rows.length === 0) {
    throw new Error('Revision not found');
  }
  
  const revision = revisionResult.rows[0];
  
  // Update the post with revision content
  await query(
    `UPDATE blog_posts 
     SET title = $1, content = $2, excerpt = $3, updated_at = NOW()
     WHERE id = $4`,
    [revision.title, revision.content, revision.excerpt, postId]
  );
}

/**
 * Delete old revisions (cleanup)
 */
export async function deleteOldRevisions(postId: string, keepCount = 10): Promise<void> {
  await query(
    `DELETE FROM blog_post_revisions 
     WHERE id NOT IN (
       SELECT id FROM blog_post_revisions 
       WHERE post_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2
     )
     AND post_id = $1`,
    [postId, keepCount]
  );
}


// Database Blog Post Interface
export interface DBBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author_id: string;
  status: 'draft' | 'published' | 'archived';
  cover_image?: string;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get blog post by slug (from database)
 */
export async function getBlogPostBySlug(slug: string): Promise<DBBlogPost | null> {
  const result = await query(
    `SELECT * FROM blog_posts WHERE slug = $1`,
    [slug]
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Create a new blog post
 */
export async function createBlogPost(data: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  author_id: string;
  status?: 'draft' | 'published';
  cover_image?: string;
}): Promise<DBBlogPost> {
  const result = await query(
    `INSERT INTO blog_posts (slug, title, excerpt, content, category, tags, author_id, status, cover_image, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $8 = 'published' THEN NOW() ELSE NULL END, NOW(), NOW())
     RETURNING *`,
    [data.slug, data.title, data.excerpt, data.content, data.category, data.tags || [], data.author_id, data.status || 'draft', data.cover_image || null]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Update a blog post
 */
export async function updateBlogPost(
  slug: string,
  data: Partial<{
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
    cover_image: string;
  }>
): Promise<DBBlogPost | null> {
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;
  
  if (data.title !== undefined) {
    updates.push(`title = $${paramCount++}`);
    values.push(data.title);
  }
  if (data.excerpt !== undefined) {
    updates.push(`excerpt = $${paramCount++}`);
    values.push(data.excerpt);
  }
  if (data.content !== undefined) {
    updates.push(`content = $${paramCount++}`);
    values.push(data.content);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    values.push(data.category);
  }
  if (data.tags !== undefined) {
    updates.push(`tags = $${paramCount++}`);
    values.push(data.tags);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(data.status);
    if (data.status === 'published') {
      updates.push(`published_at = COALESCE(published_at, NOW())`);
    }
  }
  if (data.cover_image !== undefined) {
    updates.push(`cover_image = $${paramCount++}`);
    values.push(data.cover_image);
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(slug); // For WHERE clause
  
  const result = await query(
    `UPDATE blog_posts SET ${updates.join(', ')} WHERE slug = $${paramCount} RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(slug: string): Promise<void> {
  await query(
    `DELETE FROM blog_posts WHERE slug = $1`,
    [slug]
  );
}

/**
 * Get all blog posts (database)
 */
export async function getAllDBPosts(options: {
  status?: 'published' | 'draft' | 'all';
  limit?: number;
  offset?: number;
  category?: string;
} = {}): Promise<DBBlogPost[]> {
  const { status = 'published', limit = 20, offset = 0, category } = options;
  
  let sql = `SELECT * FROM blog_posts WHERE 1=1`;
  const params: any[] = [];
  let paramCount = 1;
  
  if (status !== 'all') {
    sql += ` AND status = $${paramCount++}`;
    params.push(status);
  }
  
  if (category) {
    sql += ` AND category = $${paramCount++}`;
    params.push(category);
  }
  
  sql += ` ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);
  
  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }));
}

/**
 * Get blog posts with pagination
 * Alias for getAllDBPosts with better API
 */
export async function getBlogPosts(options: {
  status?: 'published' | 'draft' | 'all';
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  author?: string;
  search?: string;
} = {}): Promise<{ posts: DBBlogPost[]; total: number }> {
  const { 
    status = 'published', 
    page = 1, 
    limit = 10, 
    category, 
    tag, 
    author,
    search 
  } = options;
  
  const offset = (page - 1) * limit;
  
  let sql = `SELECT * FROM blog_posts WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total FROM blog_posts WHERE 1=1`;
  const params: any[] = [];
  const countParams: any[] = [];
  let paramCount = 1;
  
  if (status !== 'all') {
    sql += ` AND status = $${paramCount}`;
    countSql += ` AND status = $${paramCount}`;
    params.push(status);
    countParams.push(status);
    paramCount++;
  }
  
  if (category) {
    sql += ` AND category = $${paramCount}`;
    countSql += ` AND category = $${paramCount}`;
    params.push(category);
    countParams.push(category);
    paramCount++;
  }
  
  if (author) {
    sql += ` AND author_id = $${paramCount}`;
    countSql += ` AND author_id = $${paramCount}`;
    params.push(author);
    countParams.push(author);
    paramCount++;
  }
  
  if (search) {
    sql += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount} OR excerpt ILIKE $${paramCount})`;
    countSql += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount} OR excerpt ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
    paramCount++;
  }
  
  // Get total count
  const countResult = await query(countSql, countParams);
  const total = parseInt(countResult.rows[0].total);
  
  // Add ordering and pagination
  sql += ` ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);
  
  const result = await query(sql, params);
  
  let posts = result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }));
  
  // Filter by tag in memory if needed (since tags is an array)
  if (tag) {
    posts = posts.filter(post => post.tags.includes(tag));
  }
  
  return { posts, total };
}

/**
 * Get related posts by category and tags
 */
export async function getRelatedDBPosts(postId: string, limit = 3): Promise<DBBlogPost[]> {
  // First get the current post to find category and tags
  const currentResult = await query(
    `SELECT category, tags FROM blog_posts WHERE id = $1`,
    [postId]
  );
  
  if (currentResult.rows.length === 0) return [];
  
  const { category, tags } = currentResult.rows[0];
  
  const result = await query(
    `SELECT * FROM blog_posts 
     WHERE id != $1 
     AND status = 'published'
     AND (category = $2 OR tags && $3)
     ORDER BY published_at DESC
     LIMIT $4`,
    [postId, category, tags || [], limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }));
}

/**
 * Increment post views
 */
export async function incrementPostViews(postId: string): Promise<void> {
  await query(
    `UPDATE blog_posts SET views = COALESCE(views, 0) + 1 WHERE id = $1`,
    [postId]
  );
}

/**
 * Search blog posts
 */
export async function searchBlogPosts(query: string, options: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ posts: DBBlogPost[]; total: number }> {
  const { limit = 20, offset = 0 } = options;
  
  const searchTerm = `%${query}%`;
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM blog_posts 
     WHERE status = 'published'
     AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1 OR category ILIKE $1 OR tags::text ILIKE $1)`,
    [searchTerm]
  );
  
  const total = parseInt(countResult.rows[0].total);
  
  // Get posts
  const result = await query(
    `SELECT * FROM blog_posts 
     WHERE status = 'published'
     AND (title ILIKE $1 OR content ILIKE $1 OR excerpt ILIKE $1 OR category ILIKE $1 OR tags::text ILIKE $1)
     ORDER BY 
       CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END,
       published_at DESC
     LIMIT $2 OFFSET $3`,
    [searchTerm, limit, offset]
  );
  
  const posts = result.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    author_id: row.author_id,
    status: row.status,
    cover_image: row.cover_image,
    published_at: row.published_at ? new Date(row.published_at) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }));
  
  return { posts, total };
}


/**
 * Get posts (alias for getBlogPosts for backward compatibility)
 */
export async function getPosts(options: {
  page?: number;
  limit?: number;
  category?: string;
} = {}): Promise<{ posts: DBBlogPost[]; total: number }> {
  return getBlogPosts({ ...options, status: 'published' });
}
