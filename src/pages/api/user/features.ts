/**
 * User Features Access Check
 * GET /api/user/features - Check which features user has access to
 * POST /api/user/features/check - Check specific feature access
 */

import type { APIRoute } from 'astro';
import { checkFeaturesAccess, hasFeatureAccess, getUserTierInfo, PREMIUM_FEATURES } from '../../../lib/feature-gating';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';

// GET - Get all available features and user's access status
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/user/features', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get user tier info
    const tierInfo = await getUserTierInfo(locals.user.id);

    // Get all features
    const features = Object.entries(PREMIUM_FEATURES).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
      minTier: value.minTier,
    }));

    // Check access for each feature
    const allFeatures = Object.keys(PREMIUM_FEATURES) as Array<keyof typeof PREMIUM_FEATURES>;
    const accessMap = await checkFeaturesAccess(locals.user.id, allFeatures);

    recordRequest('GET', '/api/user/features', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      tier: tierInfo,
      features: features.map((f) => ({
        ...f,
        hasAccess: accessMap[f.key as keyof typeof PREMIUM_FEATURES],
      })),
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/user/features', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to get user features', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get features',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

// POST - Check access to specific features
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('POST', '/api/user/features', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json() as { features?: string[] };
    const featuresToCheck = body.features || [];

    if (!Array.isArray(featuresToCheck) || featuresToCheck.length === 0) {
      recordRequest('POST', '/api/user/features', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Features array required',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Filter valid features
    const validFeatures = featuresToCheck.filter(
      (f): f is keyof typeof PREMIUM_FEATURES => f in PREMIUM_FEATURES
    );

    const accessMap = await checkFeaturesAccess(locals.user.id, validFeatures);

    recordRequest('POST', '/api/user/features', HttpStatus.OK, Date.now() - startTime);

    return apiResponse({
      success: true,
      features: validFeatures.map((feature) => ({
        feature,
        hasAccess: accessMap[feature],
        info: PREMIUM_FEATURES[feature],
      })),
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/user/features', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to check features', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to check features',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
