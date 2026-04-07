import type { APIRoute } from 'astro';
import { getVapidPublicKey } from '../../../lib/push';
import { apiResponse, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { HttpStatus } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();

  try {
    const vapidKey = getVapidPublicKey();

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/vapid-key', HttpStatus.OK, duration);

    return apiResponse({ vapidKey }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/notifications/vapid-key', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    return apiResponse({ vapidKey: null }, HttpStatus.OK, requestId);
  }
};
