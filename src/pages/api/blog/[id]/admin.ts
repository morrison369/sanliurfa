import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { authenticateUser } from '../../../../lib/auth/middleware';
import { logger } from '../../../../lib/logging';
import { apiResponse, HttpStatus, problemJson } from '../../../../lib/api';

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/blog-admin-post-unauthorized',
        instance: `/api/blog/${context.params.id}/admin`,
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    const existing = await query('SELECT id, status FROM blog_posts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Yazı bulunamadı',
        type: '/problems/blog-admin-post-not-found',
        instance: `/api/blog/${id}/admin`,
      });
    }

    if ('status' in body && body.status) {
      const VALID_STATUSES = new Set(['draft', 'published', 'scheduled', 'archived']);
      if (!VALID_STATUSES.has(String(body.status))) {
        return problemJson({
          status: 422,
          title: 'Geçersiz Durum',
          detail: 'Geçersiz yazı durumu',
          type: '/problems/blog-admin-post-invalid-status',
          instance: `/api/blog/${id}/admin`,
        });
      }
    }

    const allowedFields = [
      'title', 'slug', 'excerpt', 'content', 'featured_image',
      'status', 'seo_title', 'seo_description', 'is_featured',
      'seo_keywords', 'read_time_minutes',
    ];
    const fieldMap: Record<string, string> = {
      cover_image: 'featured_image',
      meta_title: 'seo_title',
      meta_description: 'seo_description',
      featured: 'is_featured',
    };
    
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      const col = fieldMap[key] ?? key;
      if (allowedFields.includes(col)) {
        updates.push(`${col} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (body.status === 'published' && existing.rows[0].status !== 'published') {
      updates.push(`published_at = NOW()`);
    }

    if (updates.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçerli güncelleme alanı yok',
        type: '/problems/blog-admin-post-no-fields',
        instance: `/api/blog/${id}/admin`,
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return apiResponse({
      success: true,
      post: result.rows[0]
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Update blog post error:', error);
    return problemJson({
      status: 500,
      title: 'Blog Yazısı Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/blog-admin-post-update-failed',
      instance: `/api/blog/${context.params.id}/admin`,
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/blog-admin-post-unauthorized',
        instance: `/api/blog/${context.params.id}/admin`,
      });
    }

    const { id } = context.params;

    await query('DELETE FROM blog_posts WHERE id = $1', [id]);

    return apiResponse({
      success: true,
      message: 'Post deleted'
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Delete blog post error:', error);
    return problemJson({
      status: 500,
      title: 'Blog Yazısı Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/blog-admin-post-delete-failed',
      instance: `/api/blog/${context.params.id}/admin`,
    });
  }
};
