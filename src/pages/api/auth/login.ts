// API: Kullanıcı girişi (PostgreSQL + Logging)
import type { APIRoute } from 'astro';
import { signIn, createToken } from '../../../lib/auth';
import { logger } from '../../../lib/logging';
import { apiError, apiResponse, ErrorCode, getRequestId, HttpStatus, parseJsonBody, validators } from '../../../lib/api';
import { recordRequest, isSlowRequest, metricsCollector } from '../../../lib/metrics';
import { queryOne } from '../../../lib/postgres';
import { setCache } from '../../../lib/cache';
import { enforceRateLimitPolicy, getClientIpAddress } from '../../../lib/sensitive-endpoint-policy';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const parsed = await parseJsonBody(request);
    if (parsed.error === 'UNSUPPORTED_CONTENT_TYPE') {
      recordRequest('POST', '/api/auth/login', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Content-Type application/json olmalı',
        HttpStatus.BAD_REQUEST,
        { contentType: parsed.contentType },
        requestId
      );
    }

    if (parsed.error === 'INVALID_JSON') {
      recordRequest('POST', '/api/auth/login', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz JSON body',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const { email, password } = (parsed.body || {}) as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      recordRequest('POST', '/api/auth/login', HttpStatus.BAD_REQUEST, Date.now() - startTime);
      logger.warn('Login attempt with missing credentials', { email: email ? 'provided' : 'missing' });
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'E-posta ve şifre gereklidir',
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!validators.email(normalizedEmail)) {
      recordRequest('POST', '/api/auth/login', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Geçersiz e-posta formatı',
        HttpStatus.UNPROCESSABLE_ENTITY,
        undefined,
        requestId
      );
    }

    const clientIp = getClientIpAddress(request);
    const ipLimit = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:login:ip:${clientIp}`,
      limit: 25,
      windowSeconds: 60,
      message: 'Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.'
    });
    if (ipLimit) {
      recordRequest('POST', '/api/auth/login', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return ipLimit;
    }

    const emailLimit = await enforceRateLimitPolicy({
      request,
      requestId,
      key: `auth:login:email:${normalizedEmail}`,
      limit: 10,
      windowSeconds: 300,
      message: 'Bu hesap için çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.'
    });
    if (emailLimit) {
      recordRequest('POST', '/api/auth/login', HttpStatus.RATE_LIMITED, Date.now() - startTime);
      return emailLimit;
    }

    const { data, error } = await signIn(normalizedEmail, password);

    if (error) {
      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/login', HttpStatus.UNAUTHORIZED, duration);
      logger.logAuth('login', 'unknown', false, { email: normalizedEmail, duration, reason: error.message });
      return apiError(
        ErrorCode.AUTHENTICATION_FAILED,
        error.message,
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Check if user has 2FA enabled
    const user2FA = await queryOne(
      'SELECT two_factor_enabled FROM users WHERE id = $1',
      [data.user.id]
    );

    if (user2FA?.two_factor_enabled) {
      // 2FA is enabled - create temporary token that requires 2FA verification
      const tempToken = await createToken(data.user.id, data.user.email, data.user.role);

      // Mark this token as requiring 2FA verification
      await setCache(`2fa:pending:${tempToken}`, true, 300); // 5 minute TTL for 2FA verification

      const duration = Date.now() - startTime;
      recordRequest('POST', '/api/auth/login', HttpStatus.OK, duration);
      logger.info('Login successful, 2FA verification required', { userId: data.user.id, email });

      return apiResponse(
        {
          success: false,
          requiresTwoFactor: true,
          tempToken: tempToken,
          message: 'Kimlik doğrulama kodu gerekli'
        },
        HttpStatus.OK,
        requestId
      );
    }

    // 2FA not enabled - proceed with normal login
    // Set auth cookie (middleware auth-token bekliyor)
    if (data.token) {
      cookies.set('auth-token', data.token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 // 24 hours
      });
    }

    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/auth/login', HttpStatus.OK, duration);
    logger.logAuth('login', data.user.id, true, { email: data.user.email, duration });

    return apiResponse(
      {
        success: true,
        user: data.user,
        message: 'Giriş başarılı'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/auth/login', 500, duration, { error: err instanceof Error ? err.message : String(err) });

    if (isSlowRequest(duration)) {
      metricsCollector.recordSlowOperation(
        'request',
        'Login endpoint slow',
        duration,
        { path: '/api/auth/login' },
        err instanceof Error ? err.stack : undefined
      );
    }

    logger.error('Login error', err instanceof Error ? err : new Error(String(err)), { duration });
    return new Response(
      JSON.stringify({ error: 'Giriş işlemi sırasında bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  }
};
