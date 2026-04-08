// API: Kullanıcı girişi (PostgreSQL + Logging)
import type { APIRoute } from 'astro';
import { signIn, createToken } from '../../../lib/auth';
import { logger, generateRequestId } from '../../../lib/logging';
import { getRequestId } from '../../../lib/api';
import { recordRequest, isSlowRequest, metricsCollector } from '../../../lib/metrics';
import { queryOne } from '../../../lib/postgres';
import { setCache } from '../../../lib/cache';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      logger.warn('Login attempt with missing credentials', { email: email ? 'provided' : 'missing' });
      return new Response(
        JSON.stringify({ error: 'E-posta ve şifre gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    const { data, error } = await signIn(email, password);

    if (error) {
      const duration = Date.now() - startTime;
      logger.logAuth('login', 'unknown', false, { email, duration, reason: error.message });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
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
      logger.info('Login successful, 2FA verification required', { userId: data.user.id, email });

      return new Response(
        JSON.stringify({
          success: false,
          requiresTwoFactor: true,
          tempToken: tempToken,
          message: 'Kimlik doğrulama kodu gerekli'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
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
    logger.logAuth('login', data.user.id, true, { email: data.user.email, duration });

    return new Response(
      JSON.stringify({
        success: true,
        user: data.user,
        message: 'Giriş başarılı'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
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
