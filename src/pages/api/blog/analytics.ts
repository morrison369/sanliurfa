/**
 * Blog API - Analitikal Veriler
 * GET /api/blog/analytics - Blog istatistiklerini getir (admin)
 */

import type { APIRoute } from 'astro';
import { queryOne, queryMany } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Yetki kontrolü
    if (locals.user?.role !== 'admin') {
      const duration = Date.now() - startTime;
      recordRequest('GET', '/api/blog/analytics', HttpStatus.FORBIDDEN, duration);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Bu işlem için yönetici yetkisi gereklidir',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    const [totalStats, commentStats, topPosts, recentPosts, categoryStats, subscriberStats, engagementStats] = await Promise.all([
      queryOne(`
        SELECT
          COUNT(*) as total_posts,
          COUNT(*) FILTER (WHERE status = 'published') as published_posts,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_posts,
          COUNT(*) FILTER (WHERE status = 'archived') as archived_posts,
          SUM(view_count) as total_views,
          SUM(like_count) as total_likes,
          AVG(view_count) as avg_views
        FROM blog_posts
      `),
      queryOne(`
        SELECT
          COUNT(*) as total_comments,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_comments,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_comments,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_comments
        FROM blog_comments
      `),
      queryMany(`
        SELECT id, title, slug, view_count, like_count, published_at
        FROM blog_posts
        WHERE status = 'published'
        ORDER BY view_count DESC
        LIMIT 10
      `),
      queryMany(`
        SELECT id, title, slug, status, published_at
        FROM blog_posts
        ORDER BY created_at DESC
        LIMIT 5
      `),
      queryMany(`
        SELECT
          bc.id,
          bc.name,
          bc.slug,
          COUNT(bp.id) as post_count,
          SUM(bp.view_count) as total_views
        FROM blog_categories bc
        LEFT JOIN blog_posts bp ON bc.id = bp.category_id
        GROUP BY bc.id, bc.name, bc.slug
        ORDER BY total_views DESC
      `),
      queryOne(`
        SELECT
          COUNT(*) as total_subscribers,
          COUNT(*) FILTER (WHERE status = 'subscribed') as active_subscribers,
          COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed
        FROM blog_subscriptions
      `),
      queryOne(`
        SELECT
          COUNT(DISTINCT user_id) as unique_readers,
          AVG(time_spent_seconds) as avg_read_time,
          AVG(scroll_percentage) as avg_scroll
        FROM blog_reading_history
      `),
    ]);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/analytics', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          posts: {
            total: parseInt(totalStats?.total_posts || '0', 10),
            published: parseInt(totalStats?.published_posts || '0', 10),
            draft: parseInt(totalStats?.draft_posts || '0', 10),
            archived: parseInt(totalStats?.archived_posts || '0', 10),
            totalViews: parseInt(totalStats?.total_views || '0', 10),
            totalLikes: parseInt(totalStats?.total_likes || '0', 10),
            avgViews: Math.round(parseFloat(totalStats?.avg_views || '0'))
          },
          comments: {
            total: parseInt(commentStats?.total_comments || '0', 10),
            pending: parseInt(commentStats?.pending_comments || '0', 10),
            approved: parseInt(commentStats?.approved_comments || '0', 10),
            rejected: parseInt(commentStats?.rejected_comments || '0', 10)
          },
          subscribers: {
            total: parseInt(subscriberStats?.total_subscribers || '0', 10),
            active: parseInt(subscriberStats?.active_subscribers || '0', 10),
            unsubscribed: parseInt(subscriberStats?.unsubscribed || '0', 10)
          },
          engagement: {
            uniqueReaders: parseInt(engagementStats?.unique_readers || '0', 10),
            avgReadTimeSeconds: parseInt(engagementStats?.avg_read_time || '0', 10),
            avgScrollPercentage: Math.round(parseFloat(engagementStats?.avg_scroll || '0'))
          },
          topPosts: topPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            views: p.view_count,
            likes: p.like_count,
            publishedAt: p.published_at
          })),
          recentPosts: recentPosts.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            publishedAt: p.published_at
          })),
          categories: categoryStats.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            postCount: c.post_count,
            totalViews: c.total_views || 0
          }))
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/blog/analytics', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: safeErrorDetail(err, 'Blog analitik hatası')
    });
    logger.error('Blog analitikleri alınamadı', err instanceof Error ? err : new Error(String(err)));

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Analitikal veriler alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
