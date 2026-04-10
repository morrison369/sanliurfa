/**
 * Blog Yönetim Sistemi
 * Blog yazıları, kategoriler, yorumlar ve arama
 */

import { queryRows, queryOne, query, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  orderIndex: number;
  postCount?: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId?: string;
  authorName?: string;
  categoryId?: number;
  categoryName?: string;
  featuredImage?: string;
  thumbnail?: string;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  readTimeMinutes?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  tags: string[];
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogComment {
  id: number;
  postId: number;
  userId?: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  replies?: BlogComment[];
  createdAt: Date;
}

/**
 * Blog Kategorileri
 */
export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const cacheKey = 'sanliurfa:blog:categories';
    const cached = await getCache<BlogCategory[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await queryRows(
      `SELECT id, name, slug, description, icon, order_index as "orderIndex",
              (SELECT COUNT(*) FROM blog_posts WHERE category_id = blog_categories.id AND status = 'published') as "postCount"
       FROM blog_categories ORDER BY order_index ASC`
    );

    const categories = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      orderIndex: row.orderIndex,
      postCount: parseInt(row.postCount || '0')
    }));

    await setCache(cacheKey, JSON.stringify(categories), 3600);
    return categories;
  } catch (error) {
    logger.error('Blog kategorileri alınamadı', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Blog Yazıları - Listele
 */
export async function getBlogPosts(options: {
  status?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'featured' | 'popular';
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  try {
    const { status = 'published', categoryId, limit = 20, offset = 0, sort = 'recent' } = options;

    let query = `
      SELECT bp.*, bc.name as category_name, u.full_name as author_name,
             array_agg(DISTINCT bt.name) FILTER (WHERE bt.name IS NOT NULL) as tags
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bp.category_id = bc.id
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
      LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
      WHERE bp.status = $1
    `;

    const params: any[] = [status];

    if (categoryId) {
      query += ` AND bp.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    // Sıralama
    if (sort === 'featured') {
      query += ` ORDER BY bp.is_featured DESC, bp.published_at DESC`;
    } else if (sort === 'popular') {
      query += ` ORDER BY bp.view_count DESC`;
    } else {
      query += ` ORDER BY bp.published_at DESC`;
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const posts = await queryRows(query, params);

    // Toplam sayı
    let countQuery = 'SELECT COUNT(*) as total FROM blog_posts WHERE status = $1';
    const countParams: any[] = [status];

    if (categoryId) {
      countQuery += ` AND category_id = $${countParams.length + 1}`;
      countParams.push(categoryId);
    }

    const countResult = await queryOne(countQuery, countParams);
    const total = parseInt(countResult?.total || '0');

    return {
      posts: posts.map(formatBlogPost),
      total
    };
  } catch (error) {
    logger.error('Blog yazıları alınamadı', error instanceof Error ? error : new Error(String(error)));
    return { posts: [], total: 0 };
  }
}

/**
 * Blog Yazısı - Detay
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const cacheKey = `sanliurfa:blog:post:${slug}`;
    const cached = await getCache<BlogPost>(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await queryOne(
      `SELECT bp.*, bc.name as category_name, u.full_name as author_name,
              array_agg(DISTINCT bt.name) FILTER (WHERE bt.name IS NOT NULL) as tags
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bp.category_id = bc.id
       LEFT JOIN users u ON bp.author_id = u.id
       LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
       LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
       WHERE bp.slug = $1 AND bp.status = 'published'
       GROUP BY bp.id, bc.id, u.id`,
      [slug]
    );

    if (!result) {
      return null;
    }

    const post = formatBlogPost(result);

    // Görüntüleme sayısını artır
    await update('blog_posts', String(result.id), { view_count: result.view_count + 1 });

    await setCache(cacheKey, JSON.stringify(post), 1800); // 30 dakika cache
    return post;
  } catch (error) {
    logger.error('Blog yazısı alınamadı', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Blog Yazısı Oluştur
 */
export async function createBlogPost(data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount'>): Promise<BlogPost | null> {
  try {
    const slug = generateSlug(data.title);
    const readTime = calculateReadTime(data.content);

    const result = await insert('blog_posts', {
      title: data.title,
      slug,
      content: data.content,
      excerpt: data.excerpt,
      author_id: data.authorId,
      category_id: data.categoryId,
      featured_image: data.featuredImage,
      thumbnail: data.thumbnail,
      status: data.status || 'draft',
      is_featured: data.isFeatured || false,
      read_time_minutes: readTime,
      seo_title: data.seoTitle || data.title,
      seo_description: data.seoDescription || data.excerpt,
      seo_keywords: data.seoKeywords,
      published_at: data.publishedAt
    });

    // Etiketleri ekle
    if (data.tags && data.tags.length > 0) {
      await addTagsToPost(result.id, data.tags);
    }

    // Cache temizle
    await deleteCachePattern('sanliurfa:blog:*');

    logger.info('Blog yazısı oluşturuldu', { postId: result.id, title: data.title });
    return getBlogPostBySlug(slug);
  } catch (error) {
    logger.error('Blog yazısı oluşturulamadı', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Blog Yazısını Güncelle
 */
export async function updateBlogPost(id: number, data: Partial<BlogPost>): Promise<BlogPost | null> {
  try {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (data.title) {
      updates.title = data.title;
      updates.slug = generateSlug(data.title);
    }
    if (data.content) {
      updates.content = data.content;
      updates.read_time_minutes = calculateReadTime(data.content);
    }
    if (data.excerpt) updates.excerpt = data.excerpt;
    if (data.categoryId) updates.category_id = data.categoryId;
    if (data.featuredImage) updates.featured_image = data.featuredImage;
    if (data.isFeatured !== undefined) updates.is_featured = data.isFeatured;
    if (data.status) updates.status = data.status;
    if (data.seoTitle) updates.seo_title = data.seoTitle;
    if (data.seoDescription) updates.seo_description = data.seoDescription;

    await update('blog_posts', String(id), updates);

    // Etiketleri güncelle
    if (data.tags) {
      await deleteCache(`sanliurfa:blog:post_tags:${id}`);
      await query(`DELETE FROM blog_post_tags WHERE post_id = $1`, [id]);
      await addTagsToPost(id, data.tags);
    }

    // Cache temizle
    await deleteCachePattern('sanliurfa:blog:*');

    const post = await queryOne('SELECT slug FROM blog_posts WHERE id = $1', [id]);
    return getBlogPostBySlug(post.slug);
  } catch (error) {
    logger.error('Blog yazısı güncellenemedi', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Blog Yazısını Sil
 */
export async function deleteBlogPost(id: number): Promise<boolean> {
  try {
    await query('DELETE FROM blog_posts WHERE id = $1', [id]);
    await deleteCachePattern('sanliurfa:blog:*');

    logger.info('Blog yazısı silindi', { postId: id });
    return true;
  } catch (error) {
    logger.error('Blog yazısı silinemedi', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Blog Yazılarında Ara
 */
export async function searchBlogPosts(query: string, limit: number = 20): Promise<BlogPost[]> {
  try {
    const results = await queryRows(
      `SELECT bp.*, bc.name as category_name, u.full_name as author_name,
              array_agg(DISTINCT bt.name) FILTER (WHERE bt.name IS NOT NULL) as tags
       FROM blog_posts bp
       LEFT JOIN blog_categories bc ON bp.category_id = bc.id
       LEFT JOIN users u ON bp.author_id = u.id
       LEFT JOIN blog_post_tags bpt ON bp.id = bpt.post_id
       LEFT JOIN blog_tags bt ON bpt.tag_id = bt.id
       WHERE bp.status = 'published'
       AND to_tsvector('turkish', bp.title || ' ' || COALESCE(bp.excerpt, '') || ' ' || bp.content)
           @@ plainto_tsquery('turkish', $1)
       GROUP BY bp.id, bc.id, u.id
       ORDER BY ts_rank(to_tsvector('turkish', bp.title || ' ' || COALESCE(bp.excerpt, '') || ' ' || bp.content),
                        plainto_tsquery('turkish', $1)) DESC
       LIMIT $2`,
      [query, limit]
    );

    return results.map(formatBlogPost);
  } catch (error) {
    logger.error('Blog arama başarısız', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Blog Yorumları
 */
export async function getBlogComments(postId: number, approved: boolean = true): Promise<BlogComment[]> {
  try {
    const status = approved ? 'approved' : 'pending';

    const results = await queryRows(
      `SELECT * FROM blog_comments
       WHERE post_id = $1 AND status = $2 AND parent_comment_id IS NULL
       ORDER BY created_at DESC`,
      [postId, status]
    );

    return results.map((row: any) => ({
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      authorName: row.author_name,
      authorEmail: row.author_email,
      content: row.content,
      status: row.status,
      createdAt: row.created_at
    }));
  } catch (error) {
    logger.error('Blog yorumları alınamadı', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Blog Yorumu Ekle
 */
export async function addBlogComment(postId: number, data: {
  authorName: string;
  authorEmail?: string;
  userId?: string;
  content: string;
}): Promise<BlogComment | null> {
  try {
    const result = await insert('blog_comments', {
      post_id: postId,
      user_id: data.userId,
      author_name: data.authorName,
      author_email: data.authorEmail,
      content: data.content,
      status: 'pending' // Yöneticinin onayı gerekli
    });

    logger.info('Blog yorumu eklendi', { commentId: result.id, postId });

    return {
      id: result.id,
      postId,
      authorName: data.authorName,
      authorEmail: data.authorEmail,
      content: data.content,
      status: 'pending',
      createdAt: new Date()
    };
  } catch (error) {
    logger.error('Blog yorumu eklenemedi', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Yardımcı Fonksiyonlar
 */

function formatBlogPost(row: any): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    authorId: row.author_id,
    authorName: row.author_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    featuredImage: row.featured_image,
    thumbnail: row.thumbnail,
    status: row.status,
    isFeatured: row.is_featured,
    viewCount: row.view_count || 0,
    likeCount: row.like_count || 0,
    readTimeMinutes: row.read_time_minutes,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoKeywords: row.seo_keywords,
    tags: Array.isArray(row.tags) ? row.tags.filter((t: any) => t !== null) : [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// ==================== REVISIONS / VERSION CONTROL ====================

/**
 * Get all revisions for a blog post
 */
export async function getBlogPostRevisions(postId: number): Promise<any[]> {
  try {
    return await queryRows(
      `SELECT id, post_id, title, editor_id, change_summary, created_at
       FROM blog_post_revisions
       WHERE post_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [postId]
    );
  } catch (error) {
    logger.error('Blog yazı geçmişi alınamadı', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Save current post state as revision before updating
 */
export async function savePostRevision(
  postId: number,
  editorId: string,
  changeSummary?: string
): Promise<void> {
  try {
    const post = await queryOne('SELECT title, content FROM blog_posts WHERE id = $1', [postId]);
    if (!post) return;

    await query(
      `INSERT INTO blog_post_revisions (post_id, title, content, editor_id, change_summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [postId, post.title, post.content, editorId, changeSummary || 'Manual edit']
    );

    logger.info('Blog yazı revizyon kaydedildi', { postId, editorId });
  } catch (error) {
    logger.error('Revizyon kaydedilemedi', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Restore post to a previous revision
 */
export async function restoreBlogPostRevision(postId: number, revisionId: number): Promise<boolean> {
  try {
    const revision = await queryOne(
      'SELECT title, content FROM blog_post_revisions WHERE id = $1 AND post_id = $2',
      [revisionId, postId]
    );

    if (!revision) {
      logger.warn('Revizyon bulunamadı', { postId, revisionId });
      return false;
    }

    // Update post with revision data
    await update('blog_posts', String(postId), {
      title: revision.title,
      content: revision.content,
      slug: generateSlug(revision.title),
      read_time_minutes: calculateReadTime(revision.content),
      updated_at: new Date().toISOString()
    });

    // Clear cache
    await deleteCachePattern('sanliurfa:blog:*');

    logger.info('Blog yazı revizyon geri yüklendi', { postId, revisionId });
    return true;
  } catch (error) {
    logger.error('Revizyon geri yüklenemedi', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function addTagsToPost(postId: number, tagNames: string[]): Promise<void> {
  for (const tagName of tagNames) {
    const tag = await queryOne(
      'SELECT id FROM blog_tags WHERE name = $1',
      [tagName]
    );

    let tagId: number;

    if (!tag) {
      const newTag = await insert('blog_tags', {
        name: tagName,
        slug: generateSlug(tagName)
      });
      tagId = newTag.id;
    } else {
      tagId = tag.id;
    }

    await insert('blog_post_tags', {
      post_id: postId,
      tag_id: tagId
    });
  }
}
