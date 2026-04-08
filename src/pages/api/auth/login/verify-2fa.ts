/**
 * Verify 2FA code during login
 * POST /api/auth/login/verify-2fa
 * Body: { tempToken: string, code: string }
 * Returns full auth token if 2FA code is valid
 */

import type { APIRoute } from 'astro';
import { verifyToken, createToken } from '../../../../lib/auth';
import { verifyTOTPCode } from '../../../../lib/two-factor';
import { queryOne } from '../../../../lib/postgres';
import { getCache, deleteCache, setCache } from '../../../../lib/cache';
import { logger } from '../../../../lib/logging';
import { getRequestId } from '../../../../lib/api';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tempToken, code } = await request.json();

    // Validate inputs
    if (!tempToken || !code) {
      return new Response(
        JSON.stringify({ error: 'Geçici token ve doğrulama kodu gerekli' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Kod 6 haneli bir sayı olmalıdır' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    // Verify temp token is actually pending 2FA
    const is2FAPending = await getCache(`2fa:pending:${tempToken}`);

    if (!is2FAPending) {
      logger.warn('Invalid or expired 2FA temp token', { tempToken: tempToken.substring(0, 8) });
      return new Response(
        JSON.stringify({ error: 'Geçici token geçersiz veya süresi dolmuş' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    // Get session data from temp token
    const sessionData = await verifyToken(tempToken);

    if (!sessionData) {
      logger.warn('Failed to verify temp token session', { tempToken: tempToken.substring(0, 8) });
      return new Response(
        JSON.stringify({ error: 'Oturum verileri alınamadı' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    const userId = sessionData.userId;

    // Get user's 2FA secret
    const user = await queryOne(
      'SELECT two_factor_secret, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (!user || !user.two_factor_secret) {
      logger.warn('User does not have 2FA enabled', { userId });
      return new Response(
        JSON.stringify({ error: '2FA yapılandırılmadı' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    // Verify TOTP code
    const isCodeValid = verifyTOTPCode(user.two_factor_secret, code);

    if (!isCodeValid) {
      logger.warn('Invalid 2FA code provided', { userId });
      return new Response(
        JSON.stringify({ error: 'Doğrulama kodu hatalı' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
      );
    }

    // Code is valid - create full auth token
    const authToken = await createToken(userId, sessionData.email, sessionData.role);

    // Set auth cookie
    cookies.set('auth-token', authToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    // Clean up temp token and 2FA pending flag
    await deleteCache(`2fa:pending:${tempToken}`);

    const duration = Date.now() - startTime;
    logger.logAuth('login_2fa', userId, true, { email: sessionData.email, duration });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Giriş başarılı'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('2FA verification error', error instanceof Error ? error : new Error(String(error)), {
      duration
    });

    return new Response(
      JSON.stringify({ error: '2FA doğrulama işlemi sırasında bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  }
};
