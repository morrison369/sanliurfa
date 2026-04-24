import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

// List blog posts (admin)
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/blog-admin-unauthorized',
        instance: '/api/blog/admin',
      });
    }

    const url = new URL(context.request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        bp.*,
        u.name as author_name,
        COUNT(DISTINCT bl.id) as like_count,
        COUNT(DISTINCT bc.id) as comment_count
      FROM blog_posts bp
      LEFT JOIN users u ON bp.author_id = u.id
      LEFT JOIN blog_likes bl ON bl.post_id = bp.id
      LEFT JOIN blog_comments bc ON bc.post_id = bp.id AND bc.status = 'approved'
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND bp.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (bp.title ILIKE $${paramIndex} OR bp.content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY bp.id, u.name ORDER BY bp.created_at DESC`;

    // Count
    const countSql = sql.replace(/SELECT.*?FROM/s, 'SELECT COUNT(DISTINCT bp.id) FROM').replace(/GROUP BY.*?ORDER BY.*/s, '');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0]?.count || '0');

    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return new Response(JSON.stringify({
      success: true,
      posts: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Blog admin list error:', error);
    return problemJson({
      status: 500,
      title: 'Blog Yazıları Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/blog-admin-get-failed',
      instance: '/api/blog/admin',
    });
  }
};

// Create blog post
export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/blog-admin-unauthorized',
        instance: '/api/blog/admin',
      });
    }

    const body = await context.request.json();
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      status = 'draft',
      metaTitle,
      metaDescription,
      featured = false
    } = body;

    if (!title || !slug || !content) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Zorunlu alanlar eksik',
        type: '/problems/blog-admin-validation',
        instance: '/api/blog/admin',
      });
    }

    // Check slug uniqueness
    const slugCheck = await query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return problemJson({
        status: 409,
        title: 'Çakışma',
        detail: 'Slug zaten mevcut',
        type: '/problems/blog-admin-slug-conflict',
        instance: '/api/blog/admin',
      });
    }

    const result = await query(
      `INSERT INTO blog_posts (
        title, slug, excerpt, content, featured_image,
        status, author_id, seo_title, seo_description, is_featured,
        published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        CASE WHEN $6 = 'published' THEN NOW() ELSE NULL END
      ) RETURNING *`,
      [
        title, slug, excerpt || null, content, coverImage || null,
        status, auth.user.id,
        metaTitle || null, metaDescription || null, featured
      ]
    );

    return new Response(JSON.stringify({
      success: true,
      post: result.rows[0]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Create blog post error:', error);
    return problemJson({
      status: 500,
      title: 'Blog Yazısı Oluşturulamadı',
      detail: 'Sunucu hatası',
      type: '/problems/blog-admin-create-failed',
      instance: '/api/blog/admin',
    });
  }
};
