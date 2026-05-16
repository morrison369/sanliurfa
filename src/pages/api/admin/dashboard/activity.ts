/**
 * Dashboard activity feed — son 24 saat: yeni places, blog posts, events, users, reviews.
 * Tek call, UNION ALL ile birleştirilmiş timeline.
 */
import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../../lib/api';

export const GET: APIRoute = async ({ request, locals }) => {
 const requestId = getRequestId(request);
 if (!locals.user || locals.user.role !== 'admin') {
  return apiError(ErrorCode.UNAUTHORIZED, 'Admin yetkisi gerekli', HttpStatus.UNAUTHORIZED, undefined, requestId);
 }

 try {
 const result = await query(`
   WITH recent AS (
    SELECT 'user' AS type, id::text AS entity_id, full_name AS title, NULL::text AS subtitle, created_at, NULL::text AS slug
     FROM users WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'place' AS type, id::text AS entity_id, name AS title, status AS subtitle, created_at, slug
     FROM places WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'review' AS type, id::text AS entity_id,
           LEFT(COALESCE(content, ''), 80) AS title, rating::text AS subtitle, created_at, NULL::text AS slug
     FROM reviews WHERE created_at > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'blog' AS type, id::text AS entity_id, title, status AS subtitle,
           COALESCE(published_at, created_at) AS created_at, slug
     FROM blog_posts WHERE COALESCE(published_at, created_at) > NOW() - INTERVAL '7 days'
    UNION ALL
    SELECT 'event' AS type, id::text AS entity_id, title, status AS subtitle, created_at, slug
     FROM events WHERE created_at > NOW() - INTERVAL '7 days'
   )
   SELECT * FROM recent ORDER BY created_at DESC LIMIT 20
  `);

  return apiResponse({ items: result.rows }, HttpStatus.OK, requestId);
 } catch (err) {
  return apiError(
   ErrorCode.INTERNAL_ERROR,
   'Activity yüklenemedi',
   HttpStatus.INTERNAL_SERVER_ERROR,
   { detail: safeErrorDetail(err, 'activity_fetch_failed') },
   requestId,
  );
 }
};
