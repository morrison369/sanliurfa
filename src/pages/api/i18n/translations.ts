/**
 * Get Translations for Language
 */

import type { APIRoute } from 'astro';
import { TRANSLATIONS, t, getAvailableLanguages } from '../../../lib/i18n';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, url }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const lang = (url.searchParams.get('lang') || 'tr') as 'tr' | 'en';
    const namespace = url.searchParams.get('namespace');

    if (!['tr', 'en'].includes(lang)) {
      recordRequest('GET', '/api/i18n/translations', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.INVALID_INPUT,
        'Invalid language',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

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
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
