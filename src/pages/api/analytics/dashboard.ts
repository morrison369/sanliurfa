import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş yapmalısınız',
        type: '/problems/analytics-dashboard-unauthorized',
        instance: '/api/analytics/dashboard',
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    if (!placeId) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'placeId zorunludur',
        type: '/problems/analytics-dashboard-validation',
        instance: '/api/analytics/dashboard',
      });
    }

    // Yetki: admin > vendor (sahip olduğu mekan) > diğer (yasak)
    // Analytics rakip işletmelere leak olmamalı; rastgele user erişememeli
    if (auth.user.role === 'admin') {
      // admin her mekanın analytics'ini görebilir
    } else if (auth.user.role === 'vendor') {
      const placeCheck = await query(
        'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
        [placeId, auth.user.id]
      );
      if (placeCheck.rows.length === 0) {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Bu kaydı görüntüleme yetkiniz yok',
          type: '/problems/analytics-dashboard-forbidden',
          instance: '/api/analytics/dashboard',
        });
      }
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Sadece mekan sahibi veya admin analytics görebilir',
        type: '/problems/analytics-dashboard-forbidden',
        instance: '/api/analytics/dashboard',
      });
    }

    // Tarih araligi
    const VALID_PERIODS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = VALID_PERIODS[period] ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const startDateIso = startDate.toISOString();
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevStartDateStr = prevStartDate.toISOString().split('T')[0];

    const [metricsResult, dailyResult, deviceResult, sourceResult, hourlyResult, prevPeriodResult] = await Promise.all([
      query(`
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
      `, [placeId, startDateStr]),
      query(`
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
      `, [placeId, startDateStr]),
      query(`
        SELECT
          device_type,
          COUNT(*) as count
        FROM place_analytics_events
        WHERE place_id = $1 AND created_at >= $2
        GROUP BY device_type
      `, [placeId, startDateIso]),
      query(`
        SELECT
          source,
          COUNT(*) as count
        FROM place_analytics_events
        WHERE place_id = $1 AND created_at >= $2 AND source IS NOT NULL
        GROUP BY source
        ORDER BY count DESC
        LIMIT 5
      `, [placeId, startDateIso]),
      query(`
        SELECT
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM place_analytics_events
        WHERE place_id = $1 AND created_at >= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, [placeId, startDateIso]),
      query(`
        SELECT
          COALESCE(SUM(views), 0) as prev_views,
          COALESCE(SUM(phone_clicks), 0) as prev_phone_clicks
        FROM place_daily_analytics
        WHERE place_id = $1 AND date >= $2 AND date < $3
      `, [placeId, prevStartDateStr, startDateStr]),
    ]);

    const metrics = metricsResult.rows[0];
    const prevMetrics = prevPeriodResult.rows[0];

    // Degisim yuzdeleri
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return apiResponse({
      success: true,
      period,
      summary: {
        views: {
          total: parseInt(metrics.total_views, 10),
          change: calculateChange(parseInt(metrics.total_views, 10), parseInt(prevMetrics.prev_views, 10))
        },
        phoneClicks: {
          total: parseInt(metrics.total_phone_clicks, 10),
          change: calculateChange(parseInt(metrics.total_phone_clicks, 10), parseInt(prevMetrics.prev_phone_clicks, 10))
        },
        directionClicks: parseInt(metrics.total_direction_clicks, 10),
        websiteClicks: parseInt(metrics.total_website_clicks, 10),
        shares: parseInt(metrics.total_shares, 10),
        saves: parseInt(metrics.total_saves, 10),
        activeDays: parseInt(metrics.active_days, 10)
      },
      daily: dailyResult.rows,
      devices: deviceResult.rows,
      sources: sourceResult.rows,
      hourly: hourlyResult.rows
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Analytics error:', error);
    return problemJson({
      status: 500,
      title: 'Dashboard Analitiği Alınamadı',
      detail: safeErrorDetail(error, 'server_error'),
      type: '/problems/analytics-dashboard-failed',
      instance: '/api/analytics/dashboard',
    });
  }
};
