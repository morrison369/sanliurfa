/**
 * Start Vendor Onboarding
 */

import type { APIRoute } from 'astro';
import { createVendorProfile } from '../../../../lib/vendor-onboarding';
import { validateWithSchema } from '../../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

const schema = {
  businessName: { type: 'string' as const, required: true, minLength: 3 },
  businessPhone: { type: 'string' as const, required: true, pattern: '^[0-9\\+\\-\\s\\(\\)]{10,}$' },
  businessCategory: { type: 'string' as const, required: true, minLength: 2 },
  businessType: { type: 'string' as const, required: true, minLength: 2 }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/vendor/onboarding/start', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const validation = validateWithSchema(body, schema as any);

    if (!validation.valid) {
      recordRequest('POST', '/api/vendor/onboarding/start', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid business information',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { businessName, businessPhone, businessCategory, businessType } = validation.data as any;

    const profile = await createVendorProfile(locals.user.id, {
      businessName,
      businessPhone,
      businessCategory,
      businessType,
      city: 'Şanlıurfa',
      district: '',
      address: '',
      latitude: 37.1592,
      longitude: 38.7969
    });

    if (!profile) {
      recordRequest('POST', '/api/vendor/onboarding/start', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to start onboarding',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/start', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'vendor_profiles', profile.vendorId, locals.user.id, { businessName });

    return apiResponse({ success: true, data: profile }, HttpStatus.CREATED, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/vendor/onboarding/start', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Onboarding start failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
