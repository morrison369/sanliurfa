import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
        SELECT p.id, p.name, p.slug, p.image_url,
               COALESCE(SUM(a.views), 0) as total_views
        FROM places p
        LEFT JOIN place_daily_analytics a ON p.id = a.place_id 
          AND a.date >= $1
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.slug, p.image_url
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
      topPlaces: topPlacesResult.rows,
      dailyStats: dailyStatsResult.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
