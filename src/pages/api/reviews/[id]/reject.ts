// API: Review reject (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../../lib/logging';
import { problemJson } from '../../../../lib/api';
import { moderateReview } from '../../../../lib/review/admin-review-moderation';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (!locals.isAdmin) {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/review-reject-unauthorized',
        instance: '/api/reviews/{id}/reject',
      });
    }

    const formData = await request.formData();
    const rejectionReason = formData.get('rejection_reason')?.toString() || 'Uygun görülmedi';

    await moderateReview({
      id: String(id || ''),
      decision: 'reject',
      moderatorId: locals.user?.id || null,
      rejectionReason,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Review reject error:', err);
    return problemJson({
      status: 500,
      title: 'Yorum Reddedilemedi',
      detail: err instanceof Error ? err.message : 'server_error',
      type: '/problems/review-reject-failed',
      instance: '/api/reviews/{id}/reject',
    });
  }
};
