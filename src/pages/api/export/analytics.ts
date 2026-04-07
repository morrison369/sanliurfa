import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { convertToCSV, convertToJSON, getContentType, getFileExtension, getFormattedDate } from '../../../lib/export';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.isAdmin) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Admin islemi', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json') as 'csv' | 'json';
    const days = parseInt(url.searchParams.get('days') || '30');

    // Popular places
    const placesResult = await pool.query(
      `SELECT place_id, view_count FROM page_views
       WHERE DATE(created_at) > CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY place_id
       ORDER BY view_count DESC LIMIT 100`,
      []
    );

    // Daily stats
    const statsResult = await pool.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users
       FROM user_actions
       WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );

    const analytics = {
      exportDate: new Date().toISOString(),
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      popularPlaces: placesResult.rows.map((p: any) => ({
        placeId: p.place_id,
        viewCount: p.view_count
      })),
      dailyStats: statsResult.rows.map((s: any) => ({
        date: s.date,
        totalEvents: s.total_events,
        uniqueUsers: s.unique_users
      }))
    };

    const data = format === 'csv' ? convertToJSON(analytics) : convertToJSON(analytics);
    const extension = getFileExtension(format);
    const filename = `analytics-${getFormattedDate()}.${extension}`;

    logger.info('Analytics exported', { userId: locals.user.id, format, days });

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
