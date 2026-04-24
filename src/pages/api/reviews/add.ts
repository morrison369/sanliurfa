import type { APIRoute } from 'astro';

import { problemJson } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { submitPlaceReview } from '../../../lib/review/review-submission';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user?.id) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/reviews/add',
      });
    }

    const body = await request.json();
    const result = await submitPlaceReview(
      { id: user.id, email: user.email || null },
      {
        placeId: body.placeId || body.place_id,
        rating: body.rating,
        title: body.title,
        content: body.content,
        images: body.images || [],
        visitType: body.visitType || body.visit_date || null,
        awardUserPoints: true,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Review add API error:', error);
    return problemJson({
      status: 400,
      title: 'Yorum Gönderilemedi',
      detail: error instanceof Error && error.message ? error.message : 'Yorum gönderilemedi.',
      type: '/problems/review-add-failed',
      instance: '/api/reviews/add',
    });
  }
};
