/**
 * Tenants API
 * Create, list, manage tenants
 */

import type { APIRoute } from 'astro';
import { createTenant, getTenantBySlug } from '../../../lib/multi-tenant';
import { queryRows } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { recordRequest } from '../../../lib/metrics';
import { logger } from '../../../lib/logging';

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,50}$/;

async function parseJsonBody(request: Request, requestId: string, startTime: number) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    recordRequest('POST', '/api/tenants', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType },
        requestId
      )
    };
  }

  try {
    return { body: await request.json() };
  } catch {
    recordRequest('POST', '/api/tenants', HttpStatus.BAD_REQUEST, Date.now() - startTime);
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      )
    };
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('GET', '/api/tenants', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Get user's tenants (as owner or member)
    const tenants = await queryRows(
      `SELECT DISTINCT t.* FROM tenants t
       LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
       WHERE t.owner_id = $1 OR tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [locals.user.id]
    );

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/tenants', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: tenants,
        count: tenants.length
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to get tenants',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to get tenants',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', '/api/tenants', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const parsed = await parseJsonBody(request, requestId, startTime);
    if (parsed.response) {
      return parsed.response;
    }

    const { name, slug, description } = parsed.body as {
      name?: unknown;
      slug?: unknown;
      description?: unknown;
    };

    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';

    // Validate input
    if (!normalizedName || !normalizedSlug) {
      recordRequest('POST', '/api/tenants', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'name and slug required',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (!TENANT_SLUG_REGEX.test(normalizedSlug)) {
      recordRequest('POST', '/api/tenants', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid slug format',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { slug: normalizedSlug },
        requestId
      );
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      recordRequest('POST', '/api/tenants', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'description must be a string',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    // Check if slug already exists
    const existing = await getTenantBySlug(normalizedSlug);
    if (existing) {
      recordRequest('POST', '/api/tenants', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.CONFLICT,
        'Slug already in use',
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    // Create tenant
    const normalizedDescription = typeof description === 'string' ? description.trim() : undefined;
    const tenant = await createTenant(normalizedName, normalizedSlug, locals.user.id, normalizedDescription);

    if (!tenant) {
      recordRequest('POST', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
      return apiError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/tenants', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'tenants', tenant.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        data: tenant
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/tenants', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error(
      'Failed to create tenant',
      error instanceof Error ? error : new Error(String(error))
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create tenant',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
