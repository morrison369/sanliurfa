import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Yetki kontrolu
    if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Tarih araligi
    const days = parseInt(period.replace('d', '').replace('y', '365'));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Ana metrikler
    const metricsResult = await query(`
      SELECT 
        COALESCE(SUM(views), 0) as total_views,
        COALESCE(SUM(phone_clicks), 0) as total_phone_clicks,
        COALESCE(SUM(direction_clicks), 0) as total_direction_clicks,
        COALESCE(SUM(website_clicks), 0) as total_website_clicks,
        COALESCE(SUM(share_count), 0) as total_shares,
        COALESCE(SUM(save_count), 0) as total_saves,
        COUNT(DISTINCT date) as active_days
      FROM place_daily_analytics
      WHERE place_id = $1 AND date >= $2
    `, [placeId, startDate.toISOString().split('T')[0]]);

    // Günlük veriler (grafik için)
    const dailyResult = await query(`
      SELECT 
        date,
        views,
        phone_clicks,
        direction_clicks,
        website_clicks,
        share_count,
        save_count
      FROM place_daily_analytics
      WHERE place_id = $1 AND date >= $2
      ORDER BY date ASC
    `, [placeId, startDate.toISOString().split('T')[0]]);

    // Cihaz istatistikleri
    const deviceResult = await query(`
      SELECT 
        device_type,
        COUNT(*) as count
      FROM place_analytics_events
      WHERE place_id = $1 AND created_at >= $2
      GROUP BY device_type
    `, [placeId, startDate.toISOString()]);

    // Kaynak/trafik istatistikleri
    const sourceResult = await query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM place_analytics_events
      WHERE place_id = $1 AND created_at >= $2 AND source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
      LIMIT 5
    `, [placeId, startDate.toISOString()]);

    // Saatlik dagilim
    const hourlyResult = await query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM place_analytics_events
      WHERE place_id = $1 AND created_at >= $2
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, [placeId, startDate.toISOString()]);

    // Onceki donem karsilastirmasi
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const prevPeriodResult = await query(`
      SELECT 
        COALESCE(SUM(views), 0) as prev_views,
        COALESCE(SUM(phone_clicks), 0) as prev_phone_clicks
      FROM place_daily_analytics
      WHERE place_id = $1 AND date >= $2 AND date < $3
    `, [placeId, prevStartDate.toISOString().split('T')[0], startDate.toISOString().split('T')[0]]);

    const metrics = metricsResult.rows[0];
    const prevMetrics = prevPeriodResult.rows[0];

    // Degisim yuzdeleri
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return new Response(JSON.stringify({
      success: true,
      period,
      summary: {
        views: {
          total: parseInt(metrics.total_views),
          change: calculateChange(parseInt(metrics.total_views), parseInt(prevMetrics.prev_views))
        },
        phoneClicks: {
          total: parseInt(metrics.total_phone_clicks),
          change: calculateChange(parseInt(metrics.total_phone_clicks), parseInt(prevMetrics.prev_phone_clicks))
        },
        directionClicks: parseInt(metrics.total_direction_clicks),
        websiteClicks: parseInt(metrics.total_website_clicks),
        shares: parseInt(metrics.total_shares),
        saves: parseInt(metrics.total_saves),
        activeDays: parseInt(metrics.active_days)
      },
      daily: dailyResult.rows,
      devices: deviceResult.rows,
      sources: sourceResult.rows,
      hourly: hourlyResult.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
