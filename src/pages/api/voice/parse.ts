import type { APIRoute } from 'astro';
import { parseNaturalLanguageQuery } from '../../../lib/voice-search';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Missing query',
        type: '/problems/voice-parse-validation',
        instance: '/api/voice/parse',
      });
    }

    const result = parseNaturalLanguageQuery(query);

    return apiResponse({ 
      success: true, 
      data: result,
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Voice parse error:', error);
    return problemJson({
      status: 500,
      title: 'Sesli Sorgu Ayrıştırılamadı',
      detail: 'Internal server error',
      type: '/problems/voice-parse-failed',
      instance: '/api/voice/parse',
    });
  }
};
