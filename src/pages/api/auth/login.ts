import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { runLoginFlow } from '../../../lib/auth/auth-flows';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { email, password } = body;

    if (!email || !password) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'E-posta ve şifre gerekli',
        type: '/problems/auth-login-validation',
        instance: '/api/auth/login',
      });
    }

    const authResult = await runLoginFlow({ email, password }, context.cookies);

    return new Response(JSON.stringify({
      success: true,
      ...authResult,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Login error:', error);
    return problemJson({
      status: 400,
      title: 'Giriş Yapılamadı',
      detail: error instanceof Error ? error.message : 'Sunucu hatası',
      type: '/problems/auth-login-failed',
      instance: '/api/auth/login',
    });
  }
};
