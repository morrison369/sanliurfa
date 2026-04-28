import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { runLoginFlow } from '../../../lib/auth/auth-flows';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'E-posta ve şifre gerekli',
        type: '/problems/auth-login-validation',
        instance: '/api/auth/login',
      });
    }

    const authResult = await runLoginFlow({ email, password }, context.cookies);

    return apiResponse({
      success: true,
      ...authResult,
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Login error:', error);
    return problemJson({
      status: 400,
      title: 'Giriş Yapılamadı',
      detail: safeErrorDetail(error, 'Giriş işlemi başarısız'),
      type: '/problems/auth-login-failed',
      instance: '/api/auth/login',
    });
  }
};
