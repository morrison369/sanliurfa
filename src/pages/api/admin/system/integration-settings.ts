import type { APIRoute } from 'astro';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';
import { recordRequest } from '../../../../lib/metrics';
import { logAdminAction } from '../../../../lib/admin-users';
import {
  getRuntimeIntegrationSettings,
  saveRuntimeIntegrationSetting
} from '../../../../lib/runtime-integration-settings';

function maskSecret(value: string): string {
  if (!value) {
    return '';
  }

  if (value.length <= 8) {
    return `${'*'.repeat(Math.max(0, value.length - 2))}${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}${'*'.repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
}

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('GET', '/api/admin/system/integration-settings', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const settings = await getRuntimeIntegrationSettings(true);
    recordRequest('GET', '/api/admin/system/integration-settings', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        data: {
          resend: {
            configured: Boolean(settings.resendApiKey),
            source: settings.source.resendApiKey,
            maskedValue: maskSecret(settings.resendApiKey)
          },
          analytics: {
            configured: Boolean(settings.analyticsId),
            source: settings.source.analyticsId,
            maskedValue: settings.analyticsId
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Integration settings GET failed', error instanceof Error ? error : new Error(String(error)));
    recordRequest(
      'GET',
      '/api/admin/system/integration-settings',
      HttpStatus.INTERNAL_SERVER_ERROR,
      Date.now() - startTime
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Integration ayarları alınamadı',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user || locals.user.role !== 'admin') {
      recordRequest('PUT', '/api/admin/system/integration-settings', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gereklidir', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      recordRequest(
        'PUT',
        '/api/admin/system/integration-settings',
        HttpStatus.BAD_REQUEST,
        Date.now() - startTime
      );
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type must be application/json',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const resendApiKey = asOptionalString(payload.resendApiKey);
    const analyticsId = asOptionalString(payload.analyticsId);
    const changedKeys: Array<'resendApiKey' | 'analyticsId'> = [];

    if (resendApiKey === undefined && analyticsId === undefined) {
      recordRequest(
        'PUT',
        '/api/admin/system/integration-settings',
        HttpStatus.BAD_REQUEST,
        Date.now() - startTime
      );
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'En az bir alan gönderilmelidir (resendApiKey veya analyticsId)',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    if (resendApiKey !== undefined) {
      await saveRuntimeIntegrationSetting({
        settingKey: 'resendApiKey',
        value: resendApiKey,
        adminId: locals.user.id
      });
      changedKeys.push('resendApiKey');
    }

    if (analyticsId !== undefined) {
      await saveRuntimeIntegrationSetting({
        settingKey: 'analyticsId',
        value: analyticsId,
        adminId: locals.user.id
      });
      changedKeys.push('analyticsId');
    }

    const settings = await getRuntimeIntegrationSettings(true);
    await logAdminAction(
      locals.user.id,
      locals.user.id,
      'update_integration_settings',
      {
        updatedKeys: changedKeys,
        resendConfigured: Boolean(settings.resendApiKey),
        analyticsConfigured: Boolean(settings.analyticsId),
        source: settings.source
      },
      {
        requestId,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') || undefined
      }
    );
    recordRequest('PUT', '/api/admin/system/integration-settings', HttpStatus.OK, Date.now() - startTime);

    return apiResponse(
      {
        success: true,
        data: {
          resend: {
            configured: Boolean(settings.resendApiKey),
            source: settings.source.resendApiKey,
            maskedValue: maskSecret(settings.resendApiKey)
          },
          analytics: {
            configured: Boolean(settings.analyticsId),
            source: settings.source.analyticsId,
            maskedValue: settings.analyticsId
          }
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    if (locals.user?.id) {
      await logAdminAction(
        locals.user.id,
        locals.user.id,
        'update_integration_settings_failed',
        {
          error: error instanceof Error ? error.message : String(error)
        },
        {
          requestId,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get('user-agent') || undefined
        }
      );
    }

    logger.error('Integration settings PUT failed', error instanceof Error ? error : new Error(String(error)));
    recordRequest(
      'PUT',
      '/api/admin/system/integration-settings',
      HttpStatus.INTERNAL_SERVER_ERROR,
      Date.now() - startTime
    );
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Integration ayarları kaydedilemedi',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
