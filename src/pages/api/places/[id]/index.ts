/**
 * Place Detail API
 * GET /api/places/[id] - Get place by id
 * PUT /api/places/[id] - Update place by owner/admin
 */

import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../../lib/postgres';
import { resolveContentImage } from '../../../../lib/content-images';
import {
  apiError,
  apiResponse,
  ErrorCode,
  getRequestId,
  HttpStatus,
  problemJson,
  safeErrorDetail,
  safeIntParam,
  safeJsonParse,
} from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { deleteCachePattern } from '../../../../lib/cache';
import { authenticateUser } from '../../../../lib/auth/middleware';

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  short_description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  rating: number | string | null;
  review_count: number | string | null;
  avg_rating: number | string | null;
  status: string | null;
  is_featured: boolean | null;
  thumbnail_url: string | null;
  price_range: string | null;
  price_min: number | string | null;
  price_max: number | string | null;
  opening_hours: unknown;
  features: unknown;
  owner_id: string | null;
  view_count: number | string | null;
  created_at: string;
  updated_at: string;
};

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    const parsed = safeJsonParse<unknown>(input, null);
    if (Array.isArray(parsed)) {
      return normalizeFeatures(parsed);
    }

    return input
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map(value => value.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  return [];
}

function normalizeOpeningHours(input: unknown): Record<string, string> {
  const parsed = safeJsonParse<Record<string, unknown>>(input, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
      .map(([key, value]) => [key, (value as string).trim()])
  );
}

function normalizePlace(place: PlaceRow) {
  return {
    ...place,
    description: place.description ?? place.short_description ?? '',
    review_count: Number(place.review_count ?? 0),
    rating: Number(place.rating ?? place.avg_rating ?? 0),
    avg_rating: Number(place.avg_rating ?? place.rating ?? 0),
    price_min: place.price_min === null ? null : Number(place.price_min),
    price_max: place.price_max === null ? null : Number(place.price_max),
    view_count: Number(place.view_count ?? 0),
    opening_hours: normalizeOpeningHours(place.opening_hours),
    features: normalizeFeatures(place.features),
    image_url: resolveContentImage({
      category: 'places',
      slug: place.slug,
      explicit: place.thumbnail_url,
      placeholder: '/images/placeholder-place.jpg',
    }),
    thumbnail_url: resolveContentImage({
      category: 'places',
      slug: place.slug,
      explicit: place.thumbnail_url,
      placeholder: '/images/placeholder-place.jpg',
      thumb: true,
    }),
  };
}

function parseOptionalInt(value: unknown, fieldName: string): number | null {
  if (value === undefined) {
    return null;
  }

  if (value === null || value === '') {
    return null;
  }

  const raw = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(raw) || raw < 0) {
    throw new Error(`${fieldName} geçersiz`);
  }

  return safeIntParam(raw, 0, 0, 1_000_000);
}

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = params;

    if (!id) {
      recordRequest('GET', '/api/places/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Mekan ID gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const place = await queryOne<PlaceRow>(
      `SELECT
         p.id,
         p.slug,
         p.name,
         p.category,
         p.description,
         p.short_description,
         p.address,
         p.phone,
         p.email,
         p.website,
         p.latitude,
         p.longitude,
         p.rating,
         p.review_count,
         p.avg_rating,
         p.status,
         p.is_featured,
         p.thumbnail_url,
         p.price_range,
         p.price_min,
         p.price_max,
         p.opening_hours,
         p.features,
         p.owner_id,
         p.view_count,
         p.created_at,
         p.updated_at
       FROM places p
       WHERE p.id = $1
       LIMIT 1`,
      [id]
    );

    if (!place) {
      recordRequest('GET', '/api/places/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const canViewNonPublic =
      locals.user?.role === 'admin' || (locals.user?.id && place.owner_id === locals.user.id);

    if (place.status !== 'active' && !canViewNonPublic) {
      recordRequest('GET', '/api/places/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Mekan bulunamadı',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const normalizedPlace = normalizePlace(place);

    recordRequest('GET', '/api/places/[id]', HttpStatus.OK, Date.now() - startTime);
    return apiResponse({ success: true, data: normalizedPlace }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/places/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get place detail failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Mekan detayı alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async context => {
  const requestId = getRequestId(context.request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { id } = context.params;
    if (!id) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Mekan ID gereklidir',
        type: '/problems/places-update-validation',
        instance: '/api/places/[id]',
      });
    }

    const auth = await authenticateUser(context);
    if (!auth) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/places-update-unauthorized',
        instance: `/api/places/${id}`,
      });
    }

    const place = await queryOne<{ id: string; owner_id: string | null }>(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [id]
    );

    if (!place) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Mekan bulunamadı',
        type: '/problems/places-update-not-found',
        instance: `/api/places/${id}`,
      });
    }

    const isAdmin = auth.user.role === 'admin';
    const isOwner = place.owner_id === auth.user.id;
    if (!isAdmin && !isOwner) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Bu mekanı güncelleme yetkiniz yok',
        type: '/problems/places-update-forbidden',
        instance: `/api/places/${id}`,
      });
    }

    const body = await context.request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'JSON body gereklidir',
        type: '/problems/places-update-validation',
        instance: `/api/places/${id}`,
      });
    }

    const payload = body as Record<string, unknown>;
    const updates: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    const assign = (column: string, value: unknown) => {
      updates.push(`${column} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    };

    if (payload.name !== undefined) {
      const name = String(payload.name ?? '').trim();
      if (name.length < 2 || name.length > 200) {
        throw new Error('Mekan adı 2-200 karakter arasında olmalıdır');
      }
      assign('name', name);
    }

    if (payload.address !== undefined) {
      const address = String(payload.address ?? '').trim();
      if (address.length < 5 || address.length > 500) {
        throw new Error('Adres 5-500 karakter arasında olmalıdır');
      }
      assign('address', address);
    }

    if (payload.phone !== undefined) {
      const phone = String(payload.phone ?? '').trim();
      if (phone.length > 30) {
        throw new Error('Telefon 30 karakterden uzun olamaz');
      }
      assign('phone', phone || null);
    }

    if (payload.description !== undefined) {
      const description = String(payload.description ?? '').trim();
      if (description.length < 10 || description.length > 5000) {
        throw new Error('Açıklama 10-5000 karakter arasında olmalıdır');
      }
      assign('description', description);
      assign('short_description', description.slice(0, 200));
    }

    const priceMin = payload.price_min !== undefined ? parseOptionalInt(payload.price_min, 'Minimum fiyat') : undefined;
    const priceMax = payload.price_max !== undefined ? parseOptionalInt(payload.price_max, 'Maksimum fiyat') : undefined;

    if (priceMin !== undefined) {
      assign('price_min', priceMin);
    }

    if (priceMax !== undefined) {
      assign('price_max', priceMax);
    }

    if (
      priceMin !== undefined &&
      priceMax !== undefined &&
      priceMin !== null &&
      priceMax !== null &&
      priceMax < priceMin
    ) {
      throw new Error('Maksimum fiyat minimum fiyattan küçük olamaz');
    }

    if (payload.opening_hours !== undefined) {
      if (
        payload.opening_hours === null ||
        typeof payload.opening_hours !== 'object' ||
        Array.isArray(payload.opening_hours)
      ) {
        throw new Error('Çalışma saatleri geçersiz');
      }

      const openingHours = Object.fromEntries(
        Object.entries(payload.opening_hours).map(([key, value]) => [key, String(value ?? '').trim()])
      );
      assign('opening_hours', JSON.stringify(openingHours));
    }

    if (payload.features !== undefined) {
      if (!Array.isArray(payload.features)) {
        throw new Error('Özellikler dizi olmalıdır');
      }

      const features = payload.features
        .map(feature => String(feature ?? '').trim())
        .filter(Boolean);

      if (features.length > 50) {
        throw new Error('En fazla 50 özellik girilebilir');
      }

      assign('features', features);
    }

    if (updates.length === 0) {
      recordRequest('PUT', '/api/places/[id]', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Güncellenecek alan bulunamadı',
        type: '/problems/places-update-empty',
        instance: `/api/places/${id}`,
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query<PlaceRow>(
      `UPDATE places
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING
         id,
         slug,
         name,
         category,
         description,
         short_description,
         address,
         phone,
         email,
         website,
         latitude,
         longitude,
         rating,
         review_count,
         avg_rating,
         status,
         is_featured,
         thumbnail_url,
         price_range,
         price_min,
         price_max,
         opening_hours,
         features,
         owner_id,
         view_count,
         created_at,
         updated_at`,
      params
    );

    await Promise.all([
      deleteCachePattern('places:*').catch(() => null),
      deleteCachePattern(`place:${id}:*`).catch(() => null),
    ]);

    recordRequest('PUT', '/api/places/[id]', HttpStatus.OK, Date.now() - startTime);
    return apiResponse(
      { success: true, data: normalizePlace(result.rows[0]) },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('PUT', '/api/places/[id]', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Update place failed', error instanceof Error ? error : new Error(String(error)));

    const message = safeErrorDetail(error, 'Mekan güncellenemedi');
    const isValidationError =
      error instanceof Error &&
      (message.includes('karakter') ||
        message.includes('geçersiz') ||
        message.includes('olamaz') ||
        message.includes('giril'));

    return problemJson({
      status: isValidationError ? 400 : 500,
      title: isValidationError ? 'Geçersiz İstek' : 'Mekan Güncellenemedi',
      detail: message,
      type: isValidationError ? '/problems/places-update-validation' : '/problems/places-update-failed',
      instance: `/api/places/${context.params.id}`,
    });
  }
};
