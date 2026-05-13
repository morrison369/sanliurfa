/**
 * Dashboard sparkline data — son 14 gün için 4 metrik (users, places, reviews, events).
 * Her metric için günlük count array (sparkline render için).
 */
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';

export const GET: APIRoute = async ({ request, locals }) => {
 const requestId = getRequestId(request);
 if (!locals.user || locals.user.role !== 'admin') {
  return apiError(ErrorCode.UNAUTHORIZED, 'Admin yetkisi gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
 }

 try {
  const result = await query(`
   WITH days AS (
    SELECT generate_series(
     DATE_TRUNC('day', NOW() - INTERVAL '13 days'),
     DATE_TRUNC('day', NOW()),
     INTERVAL '1 day'
    )::date AS d
   )
   SELECT
    d.d::text AS day,
    COALESCE((SELECT COUNT(*) FROM users u WHERE DATE_TRUNC('day', u.created_at) = d.d), 0)::int AS users,
    COALESCE((SELECT COUNT(*) FROM places p WHERE DATE_TRUNC('day', p.created_at) = d.d), 0)::int AS places,
    COALESCE((SELECT COUNT(*) FROM reviews r WHERE DATE_TRUNC('day', r.created_at) = d.d), 0)::int AS reviews,
    COALESCE((SELECT COUNT(*) FROM events e WHERE DATE_TRUNC('day', e.created_at) = d.d), 0)::int AS events
   FROM days d
   ORDER BY d.d ASC
  `);

  const days = result.rows.map((r: any) => r.day);
  const series = {
   users: result.rows.map((r: any) => Number(r.users)),
   places: result.rows.map((r: any) => Number(r.places)),
   reviews: result.rows.map((r: any) => Number(r.reviews)),
   events: result.rows.map((r: any) => Number(r.events)),
  };

  return apiResponse({ days, series }, HttpStatus.OK, requestId);
 } catch (err) {
  return apiError(ErrorCode.INTERNAL_ERROR, 'Sparkline yüklenemedi', HttpStatus.INTERNAL_SERVER_ERROR, { detail: err instanceof Error ? err.message : String(err) }, requestId);
 }
};
