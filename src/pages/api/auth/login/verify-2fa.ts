/**
 * Verify 2FA code during login
 * POST /api/auth/login/verify-2fa
 * Body: { tempToken: string, code: string }
 * Returns full auth token if 2FA code is valid
 */

import type { APIRoute } from 'astro';
import { logger } from '../../../../lib/logging';
import { getRequestId, problemJson, safeErrorDetail } from '../../../../lib/api';
import { runLoginTwoFactorFlow, TwoFactorCodeError, TwoFactorRateLimitError } from '../../../../lib/auth/auth-flows';

export const POST: APIRoute = async ({ request, cookies }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const { tempToken, code } = await request.json();

    // Validate inputs
    if (!tempToken || !code) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçici token ve doğrulama kodu gerekli',
        type: '/problems/auth-2fa-validation',
        instance: '/api/auth/login/verify-2fa',
        extensions: { requestId },
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Kod',
        detail: 'Kod 6 haneli bir sayı olmalıdır',
        type: '/problems/auth-2fa-code-format',
        instance: '/api/auth/login/verify-2fa',
        extensions: { requestId },
      });
    }

    await runLoginTwoFactorFlow({ tempToken, code }, cookies);

    const duration = Date.now() - startTime;
    logger.logAuth('login_2fa', 'verified', true, { duration });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Giriş başarılı'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof TwoFactorRateLimitError) {
      logger.warn('2FA rate limit exceeded', { duration });
      return problemJson({
        status: 429,
        title: 'Çok Fazla Deneme',
        detail: safeErrorDetail(error, 'Çok fazla başarısız deneme. Lütfen tekrar giriş yapın.'),
        type: '/problems/auth-2fa-rate-limited',
        instance: '/api/auth/login/verify-2fa',
        extensions: { requestId },
      });
    }

    if (error instanceof TwoFactorCodeError) {
      logger.logAuth('login_2fa', 'failed', false, { duration });
      return problemJson({
        status: 401,
        title: 'Geçersiz Kod',
        detail: safeErrorDetail(error, '2FA kodu geçersiz veya süresi dolmuş.'),
        type: '/problems/auth-2fa-invalid-code',
        instance: '/api/auth/login/verify-2fa',
        extensions: { requestId },
      });
    }

    logger.error('2FA verification error', error instanceof Error ? error : new Error(String(error)), { duration });
    return problemJson({
      status: 500,
      title: '2FA Doğrulanamadı',
      detail: '2FA doğrulama işlemi sırasında bir hata oluştu',
      type: '/problems/auth-2fa-verification-failed',
      instance: '/api/auth/login/verify-2fa',
      extensions: { requestId },
    });
  }
};
