import type { APIRoute } from 'astro';
import { ErrorCode, HttpStatus, apiError, apiResponse, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { getPublicSiteSettings, savePublicSiteSettings } from '../../../lib/site-settings';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.isAdmin || !locals.user?.id) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const data = await getPublicSiteSettings();
    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Admin site settings GET failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Site ayarları alınırken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.isAdmin || !locals.user?.id) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin yetkisi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const data = await savePublicSiteSettings(body, locals.user.id);
    return apiResponse({ success: true, data }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Admin site settings PUT failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Site ayarları kaydedilirken hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
