import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { problemJson, safeErrorDetail, safeIntParam } from '../../../../lib/api';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/reviews/antispam-events',
    });
  }

  const limit = safeIntParam(url.searchParams.get('limit'), 100, 1, 200);
  try {
    const result = await query(
      `SELECT id, setting_key, action, actor_user_id, actor_email, ip_address, metadata, created_at
       FROM site_change_audit
       WHERE action = 'social_abuse'
         AND setting_key = 'reviews.antiSpam'
         AND metadata->>'reason' IN ('review_hard_blocked', 'review_auto_moderated')
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return new Response(
      JSON.stringify({
        success: true,
        items: result.rows,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Anti-Spam Eventleri Alınamadı',
      detail: safeErrorDetail(error, 'antispam_events_failed'),
      type: '/problems/admin-reviews-antispam-events-failed',
      instance: '/api/admin/reviews/antispam-events',
    });
  }
};

