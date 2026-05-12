/**
 * Admin User Details API
 * GET: Get detailed user information
 * POST: Perform admin actions on user
 */

import type { APIRoute } from 'astro';
import {
  changeUserRole,
  flagUserAccount,
  getUserDetails,
  logAdminAction,
  updateAdminUserStatus,
} from '../../../../lib/admin/admin-users';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request);
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
  const requestId = getRequestId(request);
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

    if (action === 'suspend') {
      await updateAdminUserStatus(params.id as string, user.id, 'suspend');
    } else if (action === 'activate') {
      await updateAdminUserStatus(params.id as string, user.id, 'activate');
    } else if (action === 'flag') {
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
      const VALID_FLAG_TYPES = new Set(['spam', 'harassment', 'fraud', 'fake_account', 'inappropriate_content', 'abuse', 'other']);
      const VALID_SEVERITIES  = new Set(['low', 'medium', 'high', 'critical']);
      if (typeof flagType !== 'string' || !VALID_FLAG_TYPES.has(flagType)) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz flagType', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      if (severity !== undefined && severity !== null && (typeof severity !== 'string' || !VALID_SEVERITIES.has(severity))) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz severity', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      if (typeof reason !== 'string' || reason.length > 1000) return apiError(ErrorCode.VALIDATION_ERROR, 'reason 1000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      await flagUserAccount(params.id as string, user.id, flagType, reason, severity || 'medium', expiresAt ? new Date(expiresAt) : undefined);
    } else if (action === 'changeRole') {
      const VALID_ROLES = new Set(['user', 'admin', 'moderator', 'vendor']);
      if (!newRole || typeof newRole !== 'string' || !VALID_ROLES.has(newRole)) {
        recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Geçerli bir rol gereklidir: user, admin, moderator, vendor',
          HttpStatus.UNPROCESSABLE_ENTITY,
          undefined,
          requestId
        );
      }
      await changeUserRole(params.id as string, user.id, newRole);
    } else if (action === 'log') {
      const { actionType, changes } = body;
      if (!actionType || typeof actionType !== 'string' || actionType.length > 100) {
        return apiError(ErrorCode.VALIDATION_ERROR, 'actionType geçersiz veya 100 karakteri aşıyor', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
      }
      if (changes !== undefined && changes !== null) {
        if (typeof changes !== 'object' || Array.isArray(changes) || JSON.stringify(changes).length > 10000) {
          return apiError(ErrorCode.VALIDATION_ERROR, 'changes geçersiz nesne veya 10000 karakteri aşıyor', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
        }
      }
      await logAdminAction(user.id, params.id as string, actionType, changes);
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/admin/users/${params.id}`, HttpStatus.OK, duration);

    logger.info('Admin user action completed', {
      ...(params.id ? { userId: params.id } : {}),
      action,
      adminId: user.id,
    });

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
