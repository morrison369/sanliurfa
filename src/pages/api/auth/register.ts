import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { runRegisterFlow } from '../../../lib/auth/auth-flows';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Tüm alanlar gerekli',
        type: '/problems/auth-register-validation',
        instance: '/api/auth/register',
      });
    }

    const authResult = await runRegisterFlow({ fullName, email, password }, context.cookies);

    return new Response(JSON.stringify({
      success: true,
      ...authResult,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Register error:', error);
    const rawMessage = error instanceof Error ? error.message : 'Sunucu hatası';
    // Don't reveal whether an email already exists — prevents account enumeration
    const safeMessage = rawMessage.includes('zaten kayıtlı')
      ? 'Kayıt işlemi tamamlanamadı. Lütfen bilgilerinizi kontrol edin.'
      : rawMessage;
    return problemJson({
      status: 400,
      title: 'Kayıt Tamamlanamadı',
      detail: safeMessage,
      type: '/problems/auth-register-failed',
      instance: '/api/auth/register',
    });
  }
};
