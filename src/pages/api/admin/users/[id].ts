/**
 * Admin User Details API
 * GET: Get detailed user information
 * POST: Perform admin actions on user
 */

import type { APIRoute } from 'astro';
import { getUserDetails, flagUserAccount, changeUserRole, logAdminAction } from '../../../../lib/admin-users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('GET', `/api/admin/users/${params.id}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const details = await getUserDetails(params.id as string);
    if (!details) {
      recordRequest('GET', `/api/admin/users/${params.id}`, HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(ErrorCode.NOT_FOUND, 'Kullanıcı bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/admin/users/${params.id}`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: details
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', `/api/admin/users/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get user details failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı detayları alınırken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const user = locals.user;

    if (!user || user.role !== 'admin') {
      recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { action, flagType, reason, severity, newRole, expiresAt } = body;

    if (!action) {
      recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'action gereklidir',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    if (action === 'flag') {
      if (!flagType || !reason) {
        recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'flagType ve reason gereklidir',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }
      await flagUserAccount(params.id as string, user.id, flagType, reason, severity || 'medium', expiresAt ? new Date(expiresAt) : undefined);
    } else if (action === 'changeRole') {
      if (!newRole) {
        recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'newRole gereklidir',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }
      await changeUserRole(params.id as string, user.id, newRole);
    } else if (action === 'log') {
      const { actionType, changes } = body;
      await logAdminAction(user.id, params.id as string, actionType, changes);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.OK, duration);

    logger.info('Admin user action completed', { userId: params.id, action, adminId: user.id });

    return apiResponse(
      {
        success: true,
        message: `Kullanıcı işlemi tamamlandı: ${action}`
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Admin user action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kullanıcı işlemi başarısız oldu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
