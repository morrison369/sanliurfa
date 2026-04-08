/**
 * Cohorts Analytics Endpoint
 * Create and manage user cohorts
 */

import type { APIRoute } from 'astro';
import { listCohorts, getCohortById, createCohort, getCohortMembers, getRetentionCurve } from '../../../lib/cohort-analytics';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const cohortId = url.searchParams.get('id');
    const includeMembers = url.searchParams.get('members') === 'true';

    if (cohortId) {
      const cohort = await getCohortById(cohortId);
      if (!cohort) {
        return apiError(ErrorCode.NOT_FOUND, 'Cohort not found', HttpStatus.NOT_FOUND, undefined, requestId);
      }

      let members = null;
      if (includeMembers) {
        members = await getCohortMembers(cohortId);
      }

      const retention = await getRetentionCurve(cohortId);

      return apiResponse({
        success: true,
        data: { cohort, members, retention }
      }, HttpStatus.OK, requestId);
    }

    const cohorts = await listCohorts();

    return apiResponse({
      success: true,
      data: cohorts
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get cohorts', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { cohort_name, cohort_key, cohort_type, criteria } = body;

    if (!cohort_name || !cohort_key) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Cohort name and key required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const cohort = await createCohort(locals.user.id, cohort_name, cohort_key, cohort_type, criteria || {});

    if (!cohort) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create cohort', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    return apiResponse({
      success: true,
      data: cohort
    }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Failed to create cohort', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
