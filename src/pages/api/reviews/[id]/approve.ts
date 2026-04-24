// API: Review approve (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../../lib/logging';
import { problemJson } from '../../../../lib/api';
import { moderateReview } from '../../../../lib/review/admin-review-moderation';

export const POST: APIRoute = async ({ params, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/review-approve-unauthorized',
        instance: '/api/reviews/{id}/approve',
      });
    }

    await moderateReview({
      id: String(id || ''),
      decision: 'approve',
      moderatorId: locals.user?.id || null,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Review approve error:', err);
    return problemJson({
      status: 500,
      title: 'Yorum Onaylanamadı',
      detail: err instanceof Error ? err.message : 'server_error',
      type: '/problems/review-approve-failed',
      instance: '/api/reviews/{id}/approve',
    });
  }
};
