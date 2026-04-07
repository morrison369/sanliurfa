import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { convertToCSV, convertToJSON, getContentType, getFileExtension, getFormattedDate } from '../../../lib/export';
import { apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Kimlik dogrulama gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const url = new URL(request.url);
    const format = (url.searchParams.get('format') || 'json') as 'csv' | 'json';

    // Get user data
    const userResult = await pool.query(`SELECT id, email, full_name, role, created_at FROM users WHERE id = $1`, [locals.user.id]);
    const user = userResult.rows[0];

    // Get user's reviews
    const reviewsResult = await pool.query(
      `SELECT id, place_id, rating, text, created_at FROM reviews WHERE user_id = $1 ORDER BY created_at DESC`,
      [locals.user.id]
    );

    // Get user's favorites
    const favoritesResult = await pool.query(
      `SELECT place_id, added_at FROM favorites WHERE user_id = $1 ORDER BY added_at DESC`,
      [locals.user.id]
    );

    // Get user's activity logs
    const activityResult = await pool.query(
      `SELECT user_id, action, resource_type, resource_id, created_at FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC`,
      [locals.user.id]
    );

    const export_data = {
      exportDate: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.full_name,
        role: user?.role,
        createdAt: user?.created_at
      },
      reviews: reviewsResult.rows.map((r: any) => ({
        id: r.id,
        placeId: r.place_id,
        rating: r.rating,
        text: r.text,
        createdAt: r.created_at
      })),
      favorites: favoritesResult.rows.map((f: any) => ({
        placeId: f.place_id,
        addedAt: f.added_at
      })),
      activity: activityResult.rows.map((a: any) => ({
        action: a.action,
        resourceType: a.resource_type,
        resourceId: a.resource_id,
        createdAt: a.created_at
      }))
    };

    const data = format === 'csv' ? convertToJSON(export_data) : convertToJSON(export_data);
    const extension = getFileExtension(format);
    const filename = `personal-data-${getFormattedDate()}.${extension}`;

    logger.info('User data exported (GDPR)', { userId: locals.user.id, format });

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
