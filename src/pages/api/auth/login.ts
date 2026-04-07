// API: Kullanıcı girişi (PostgreSQL + Logging)
import type { APIRoute } from 'astro';
import { signIn, createToken } from '../../../lib/auth';
import { logger, generateRequestId } from '../../../lib/logging';
import { getRequestId } from '../../../lib/api';
import { recordRequest, isSlowRequest, metricsCollector } from '../../../lib/metrics';

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
