import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';

// List blog posts (admin)
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
    console.error('Blog admin list error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Create blog post
export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check slug uniqueness
    const slugCheck = await query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'Slug already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(
      `INSERT INTO blog_posts (
        title, slug, excerpt, content, cover_image, category, tags,
        status, author_id, meta_title, meta_description, featured,
        published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
        CASE WHEN $8 = 'published' THEN NOW() ELSE NULL END
      ) RETURNING *`,
      [
        title, slug, excerpt || null, content, coverImage || null,
        category || null, tags || [], status, auth.user.id,
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
    console.error('Create blog post error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
