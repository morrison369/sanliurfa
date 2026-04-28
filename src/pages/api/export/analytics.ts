import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { convertToCSV, convertToJSON, getContentType, getFileExtension, getFormattedDate } from '../../../lib/export/export';
import { apiError, HttpStatus, ErrorCode, getRequestId, safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  logger.setRequestId(requestId);

  try {
    // Check admin role instead of isAdmin property
    if (locals.user?.role !== 'admin') {
      return apiError(ErrorCode.FORBIDDEN, 'Admin islemi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json') as 'csv' | 'json';
    const days = safeIntParam(url.searchParams.get('days'), 30, 1, 365);

    // Popular places
    const placesResult = await pool.query(
      `SELECT place_id, view_count FROM page_views
       WHERE created_at > CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY place_id
       ORDER BY view_count DESC LIMIT 100`,
      [days]
    );

    // Daily stats
    const statsResult = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users
       FROM user_actions
       WHERE created_at > NOW() - ($1 * INTERVAL '1 day')
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    const analytics = {
      exportDate: new Date().toISOString(),
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      popularPlaces: placesResult.rows?.map((p) => ({
        placeId: p.place_id,
        viewCount: p.view_count
      })) || [],
      dailyStats: statsResult.rows?.map((s) => ({
        date: s.date,
        totalEvents: s.total_events,
        uniqueUsers: s.unique_users
      })) || []
    };

    // convertToCSV expects an array, convertToJSON can take any
    const data = format === 'csv' 
      ? convertToCSV(analytics.dailyStats || []) 
      : convertToJSON([analytics]);
    const extension = getFileExtension(format);
    const filename = `analytics-${getFormattedDate()}.${extension}`;

    logger.info('Analytics exported', { userId: locals.user?.id, format, days });

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error('Export failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Ichsel sunucu hatasi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
