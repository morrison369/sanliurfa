/**
 * Account Deletion Request API
 * GET: Get deletion request status (30-day grace period)
 * POST: Request account deletion
 * DELETE: Cancel deletion request
 */

import type { APIRoute } from 'astro';
import {
  requestDataDeletion,
  cancelDataDeletion,
  getDataDeletionStatus
} from '../../../../lib/privacy';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('GET', '/api/users/privacy/delete-account', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const deletionStatus = await getDataDeletionStatus(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy/delete-account', HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: deletionStatus,
        message: deletionStatus
          ? `Hesabınız ${new Date(deletionStatus.scheduled_for).toLocaleDateString('tr-TR')} tarihinde silinecektir. İsteği iptal etmek için bu endpoint'i DELETE ile çağırabilirsiniz.`
          : 'Aktif bir silme isteği yok'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('GET', '/api/users/privacy/delete-account', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Get deletion status failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Silme durumu alınırken bir hata oluştu',
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
    if (!locals.user) {
      recordRequest('POST', '/api/users/privacy/delete-account', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const body = await request.json();
    const { reason } = body;

    // Validate reason (optional but recommended)
    if (reason && typeof reason !== 'string') {
      recordRequest('POST', '/api/users/privacy/delete-account', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Sebep string olmalıdır',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const deletionRequest = await requestDataDeletion(locals.user.id, reason);

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/delete-account', HttpStatus.CREATED, duration);
    logger.logMutation('create', 'data_deletion_requests', deletionRequest.id, locals.user.id, { reason });

    return apiResponse(
      {
        success: true,
        data: deletionRequest,
        message: `Hesabınız ${new Date(deletionRequest.scheduled_for).toLocaleDateString('tr-TR')} tarihinde silinecektir. 30 gün içinde iptal edebilirsiniz.`
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('zaten')) {
      recordRequest('POST', '/api/users/privacy/delete-account', HttpStatus.CONFLICT, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        HttpStatus.CONFLICT,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/users/privacy/delete-account', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Request deletion failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Silme isteği oluşturulurken bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      recordRequest('DELETE', '/api/users/privacy/delete-account', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.AUTH_REQUIRED,
        'Oturum açmanız gerekiyor',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    const cancelled = await cancelDataDeletion(locals.user.id);

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/delete-account', HttpStatus.OK, duration);
    logger.logMutation('update', 'data_deletion_requests', locals.user.id, locals.user.id, {
      status: 'cancelled'
    });

    return apiResponse(
      {
        success: true,
        message: 'Silme isteği iptal edildi. Hesabınız korunmaya devam edecek.'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('bulunamadı')) {
      recordRequest('DELETE', '/api/users/privacy/delete-account', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        error.message,
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    const duration = Date.now() - startTime;
    recordRequest('DELETE', '/api/users/privacy/delete-account', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Cancel deletion failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'İptal işleminde bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
