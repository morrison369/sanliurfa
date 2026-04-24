import type { APIRoute } from 'astro';
import { API_VERSIONS } from '../../lib/api/api-versioning';
import { apiResponse, HttpStatus, getRequestId } from '../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId(request);

  return apiResponse({
    versions: API_VERSIONS,
    default: 'v1',
    docs: {
      v1: '/api/docs',
      openapi: '/api/openapi.json'
    }
  }, HttpStatus.OK, requestId);
};
