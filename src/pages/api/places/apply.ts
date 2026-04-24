import type { APIRoute } from 'astro';

import { problemJson } from '../../../lib/api';
import { logger } from '../../../lib/logging';
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

export const POST: APIRoute = async context => {
  try {
    const body = await readBody(context.request);
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

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Place application error:', error);
    return problemJson({
      status: 400,
      title: 'Başvuru Oluşturulamadı',
      detail: error instanceof Error && error.message ? error.message : 'Başvuru gönderilemedi.',
      type: '/problems/places-apply-failed',
      instance: '/api/places/apply',
    });
  }
};
