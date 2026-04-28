import type { APIRoute } from 'astro';

import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';
import { submitPlaceApplication } from '../../../lib/places/place-application';

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await request.json();
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    return Object.fromEntries((await request.formData()).entries());
  }

  throw new Error('application/json veya form gönderimi kullanın.');
}

const applySchema: ValidationSchema = {
  name: { type: 'string' as const, required: true, minLength: 2, maxLength: 200, sanitize: true },
  address: { type: 'string' as const, required: false, maxLength: 300, sanitize: true },
  phone: { type: 'string' as const, required: false, maxLength: 30, sanitize: true },
  website: { type: 'string' as const, required: false, maxLength: 200, sanitize: true },
  description: { type: 'string' as const, required: false, maxLength: 1000, sanitize: true },
  short_description: { type: 'string' as const, required: false, maxLength: 1000, sanitize: true },
};

export const POST: APIRoute = async context => {
  try {
    const body = await readBody(context.request);

    const validation = validateWithSchema(body, applySchema);
    if (!validation.valid) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Başvuru Verisi',
        detail: validation.errors?.[0] || 'Geçersiz veri',
        type: '/problems/validation-error',
        instance: '/api/places/apply',
      });
    }

    const result = await submitPlaceApplication({
      name: String(body.name || ''),
      categoryId: body.category_id ? String(body.category_id) : null,
      category: body.category ? String(body.category) : null,
      districtId: body.district_id ? String(body.district_id) : null,
      shortDescription: body.short_description
        ? String(body.short_description)
        : body.description
          ? String(body.description)
          : null,
      address: String(body.address || ''),
      phone: String(body.phone || ''),
      website: body.website ? String(body.website) : null,
      ownerName: String(body.owner_name || body.ownerName || body.submitter_name || ''),
      ownerEmail: String(body.owner_email || body.ownerEmail || body.submitter_email || ''),
      priceRange: body.priceRange ? String(body.priceRange) : null,
      acceptsReservations: body.acceptsReservations
        ? String(body.acceptsReservations)
        : body.accepts_reservations
          ? String(body.accepts_reservations)
          : null,
    });

    return apiResponse(result, HttpStatus.CREATED);
  } catch (error) {
    logger.error('Place application error:', error);
    return problemJson({
      status: 400,
      title: 'Başvuru Oluşturulamadı',
      detail: safeErrorDetail(error, 'Başvuru gönderilemedi.'),
      type: '/problems/places-apply-failed',
      instance: '/api/places/apply',
    });
  }
};
