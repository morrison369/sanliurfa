/**
 * Admin Blog Stats API
 * Dashboard statistics
 */

import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { getBlogStats } from '../../../../lib/blog/db';
import { query } from '../../../../lib/postgres';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-blog-stats-unauthorized',
        instance: '/api/admin/blog/stats',
      });
    }

    // Get basic stats
    const stats = await getBlogStats();

    // Get popular posts
    const popularResult = await query(
      `SELECT id, title, slug, view_count, like_count, published_at
       FROM blog_posts
       WHERE status = 'published'
       ORDER BY view_count DESC
       LIMIT 5`
    );

    // Get recent posts
    const recentResult = await query(
      `SELECT id, title, slug, status, created_at, published_at
       FROM blog_posts
       ORDER BY created_at DESC
       LIMIT 5`
    );

    // Get posts by status
    const statusResult = await query(
      `SELECT status, COUNT(*)::int as count
       FROM blog_posts
       GROUP BY status`
    );

    // Get posts by category
    const categoryResult = await query(
      `SELECT c.name, COUNT(*)::int as count
       FROM blog_posts p
       JOIN blog_categories c ON c.id = p.category_id
       WHERE p.status = 'published'
       GROUP BY c.name
       ORDER BY count DESC`
    );

    // Get monthly views (last 6 months)
    const monthlyResult = await query(
      `SELECT 
        DATE_TRUNC('month', published_at) as month,
        COUNT(*)::int as posts,
        SUM(view_count)::int as views
       FROM blog_posts
       WHERE published_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', published_at)
       ORDER BY month DESC`
    );

    return apiResponse({
      stats,
      popular: popularResult.rows,
      recent: recentResult.rows,
      byStatus: statusResult.rows,
      byCategory: categoryResult.rows,
      monthly: monthlyResult.rows,
    }, HttpStatus.OK);
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Blog İstatistikleri Alınamadı',
      detail: safeErrorDetail(error, 'İstatistikler alınamadı'),
      type: '/problems/admin-blog-stats-failed',
      instance: '/api/admin/blog/stats',
    });
  }
};
