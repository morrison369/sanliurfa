import type { APIRoute } from 'astro';

import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';
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

    const reviewSchema: ValidationSchema = {
      rating: { type: 'number' as const, required: true, min: 1, max: 5 },
      title: { type: 'string' as const, required: false, maxLength: 200, sanitize: true },
      content: { type: 'string' as const, required: true, minLength: 10, maxLength: 5000, sanitize: true },
    };
    const validation = validateWithSchema(body, reviewSchema);
    if (!validation.valid) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Yorum Verisi',
        detail: validation.errors?.[0] || 'Geçersiz veri',
        type: '/problems/validation-error',
        instance: '/api/reviews/add',
      });
    }

    if (body.images && (!Array.isArray(body.images) || body.images.length > 20)) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Resimler',
        detail: 'images dizisi geçersiz veya 20 adet sınırını aşıyor',
        type: '/problems/review-images-invalid',
        instance: '/api/reviews/add',
      });
    }

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

    return apiResponse(result, HttpStatus.OK);
  } catch (error) {
    logger.error('Review add API error:', error);
    return problemJson({
      status: 400,
      title: 'Yorum Gönderilemedi',
      detail: safeErrorDetail(error, 'Yorum gönderilemedi.'),
      type: '/problems/review-add-failed',
      instance: '/api/reviews/add',
    });
  }
};
