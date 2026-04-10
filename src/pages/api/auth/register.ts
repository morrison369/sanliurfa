// API: Kullanıcı kaydı (PostgreSQL + Validation + Logging)
import type { APIRoute } from 'astro';
import { signUp, signIn } from '../../../lib/auth';
import { validateWithSchema, commonSchemas } from '../../../lib/validation';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, parseJsonBody } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest, isSlowRequest, metricsCollector } from '../../../lib/metrics';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../lib/sensitive-endpoint-policy';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const parsed = await parseJsonBody(request);
    if (parsed.error === 'UNSUPPORTED_CONTENT_TYPE') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/register', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType: parsed.contentType },
        requestId
      );
    }

    if (parsed.error === 'INVALID_JSON') {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/register', HttpStatus.BAD_REQUEST, duration);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const body = parsed.body;

    const clientIp = getClientIpAddress(request);
    const ipLimit = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:register:ip:${clientIp}`,
      limit: 8,
      windowSeconds: 300,
      message: 'Çok fazla kayıt denemesi. Lütfen biraz sonra tekrar deneyin.'
    });
    if (ipLimit) {
      recordRequest('POST', '/api/auth/register', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return ipLimit;
    }

    // Validate request body
    const validation = validateWithSchema(body, commonSchemas.register);

    if (!validation.valid) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/register', HttpStatus.UNPROCESSABLE_ENTITY, duration);
      logger.warn('Register validation failed', { errors: validation.errors });

      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { email, password, full_name: fullName } = validation.data;

    const emailLimit = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:register:email:${email}`,
      limit: 3,
      windowSeconds: 3600,
      message: 'Bu e-posta için çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.'
    });
    if (emailLimit) {
      recordRequest('POST', '/api/auth/register', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return emailLimit;
    }

    // Attempt registration
    const { data, error } = await signUp(email, password, fullName);

    if (error) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/register', HttpStatus.CONFLICT, duration, { error: error.message });
      logger.logAuth('register', 'unknown', false, { email, reason: error.message, duration });

      return apiError(ErrorCode.CONFLICT, error.message, HttpStatus.CONFLICT, undefined, requestId);
    }

    // Auto login after registration
    const loginResult = await signIn(email, password);
    if (loginResult.data?.token) {
      cookies.set('auth-token', loginResult.data.token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24
      });
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/auth/register', HttpStatus.CREATED, duration);
    logger.logAuth('register', data.user.id, true, { email: data.user.email, duration });

    return apiResponse(
      {
        success: true,
        user: data.user,
        message: 'Kayıt başarılı! Hoş geldiniz.'
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/auth/register', HttpStatus.INTERNAL_SERVER_ERROR, duration, {
      error: err instanceof Error ? err.message : String(err)
    });

    if (isSlowRequest(duration)) {
      metricsCollector.recordSlowOperation(
        'request',
        'Register endpoint slow',
        duration,
        { path: '/api/auth/register' },
        err instanceof Error ? err.stack : undefined
      );
    }

    logger.error('Register error', err instanceof Error ? err : new Error(String(err)), { duration });

    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Kayıt işlemi sırasında bir hata oluştu',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
