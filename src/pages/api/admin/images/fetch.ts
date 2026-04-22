import type { APIRoute } from 'astro';
import { ErrorCode, HttpStatus, apiError, apiResponse, getRequestId } from '../../../../lib/api';
import {
  fetchAndStoreProviderImage,
  hasImageProviderCredentials,
} from '../../../../lib/image-providers';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request as any);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    if (!hasImageProviderCredentials()) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Pexels veya Unsplash environment değişkenleri tanımlı değil',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : undefined;
    const folder = typeof body.folder === 'string' ? body.folder.trim() : undefined;

    if (!query || !slug) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Görsel arama metni ve slug gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const image = await fetchAndStoreProviderImage({ query, slug, category, folder });

    if (!image) {
      return apiError(ErrorCode.NOT_FOUND, 'Uygun görsel bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    return apiResponse(
      {
        success: true,
        data: image,
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Provider image fetch failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Görsel sağlayıcı işlemi başarısız oldu', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
