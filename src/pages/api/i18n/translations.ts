/**
 * Get Turkish translations.
 *
 * The public product is Turkish-only. `lang` is accepted for legacy callers,
 * but every response is locked to `tr`.
 */

import type { APIRoute } from 'astro';
import { TRANSLATIONS, getAvailableLanguages } from '../../../lib/i18n';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const lang = 'tr';
    const namespace = url.searchParams.get('namespace');

    let data;

    if (namespace) {
      // Return specific namespace translations
      data = (TRANSLATIONS[lang] as any)[namespace] || {};
    } else {
      // Return all translations
      data = TRANSLATIONS[lang];
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/i18n/translations', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: {
          language: lang,
          availableLanguages: getAvailableLanguages(),
          translations: data,
          namespace: namespace || 'all'
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/i18n/translations', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get translations failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Sunucu hatası', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
