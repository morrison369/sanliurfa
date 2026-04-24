import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { resolveContentImage } from '../../../lib/content-images';
import { problemJson } from '../../../lib/api';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-dashboard-unauthorized',
        instance: '/api/admin/dashboard',
      });
    }

    // Tarih araligi
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Paralel sorgular
    const [
      usersResult,
      placesResult,
      reviewsResult,
      ticketsResult,
      recentUsersResult,
      recentPlacesResult,
      topPlacesResult,
      dailyStatsResult
    ] = await Promise.all([
      // Toplam kullanicilar
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
          COUNT(*) FILTER (WHERE DATE(created_at) = $1) as new_today
        FROM users
        WHERE status != 'deleted'
      `, [today]),

      // Toplam isletmeler
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
        FROM places
      `),

      // Toplam yorumlar
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM reviews
      `),

      // Acik ticketlar
      query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_today
        FROM support_tickets
      `),

      // Son kayit olan kullanicilar
      query(`
        SELECT id, name, email, role, created_at
        FROM users
        WHERE status != 'deleted'
        ORDER BY created_at DESC
        LIMIT 5
      `),

      // Son eklenen isletmeler
      query(`
        SELECT p.id, p.name, p.status, p.created_at, u.name as owner_name
        FROM places p
        LEFT JOIN users u ON p.owner_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 5
      `),

      // En cok goruntulenen isletmeler
      query(`
        SELECT p.id, p.name, p.slug, COALESCE(p.thumbnail_url, p.images[1]) as image_url,
               COALESCE(SUM(a.views), 0) as total_views
        FROM places p
        LEFT JOIN place_daily_analytics a ON p.id = a.place_id
          AND a.date >= $1
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.slug, p.thumbnail_url, p.images
        ORDER BY total_views DESC
        LIMIT 5
      `, [thirtyDaysAgo.toISOString().split('T')[0]]),

      // Gunluk istatistikler (son 14 gun)
      query(`
        SELECT 
          date,
          SUM(views) as views,
          SUM(phone_clicks) as phone_clicks,
          SUM(direction_clicks) as direction_clicks
        FROM place_daily_analytics
        WHERE date >= NOW() - INTERVAL '14 days'
        GROUP BY date
        ORDER BY date ASC
      `)
    ]);

    const topPlaces = topPlacesResult.rows.map((row) => ({
      ...row,
      image_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.image_url,
        placeholder: '/images/placeholder-place.jpg',
      }),
      thumbnail_url: resolveContentImage({
        category: 'places',
        slug: row.slug,
        explicit: row.image_url,
        placeholder: '/images/placeholder-place.jpg',
        thumb: true,
      }),
    }));

    return new Response(JSON.stringify({
      success: true,
      stats: {
        users: usersResult.rows[0],
        places: placesResult.rows[0],
        reviews: reviewsResult.rows[0],
        tickets: ticketsResult.rows[0]
      },
      recent: {
        users: recentUsersResult.rows,
        places: recentPlacesResult.rows
      },
      topPlaces,
      dailyStats: dailyStatsResult.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Admin dashboard error:', error);
    return problemJson({
      status: 500,
      title: 'Admin Dashboard Alınamadı',
      detail: error instanceof Error ? error.message : 'server_error',
      type: '/problems/admin-dashboard-failed',
      instance: '/api/admin/dashboard',
    });
  }
};
