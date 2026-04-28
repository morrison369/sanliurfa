import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, safeErrorDetail, HttpStatus } from '../../../lib/api';
import { validateEmail } from '../../../lib/validation';
import { validatePasswordStrength } from '../../../lib/auth';
import { runRegisterFlow } from '../../../lib/auth/auth-flows';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { fullName, email, password } = body;

    if (typeof fullName !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !fullName || !email || !password) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Tüm alanlar gerekli',
        type: '/problems/auth-register-validation',
        instance: '/api/auth/register',
      });
    }

    if (fullName.length > 200) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Ad soyad 200 karakterden uzun olamaz',
        type: '/problems/auth-register-fullname-too-long',
        instance: '/api/auth/register',
      });
    }

    if (!validateEmail(email)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz E-posta',
        detail: 'Geçerli bir e-posta adresi giriniz.',
        type: '/problems/auth-register-email-invalid',
        instance: '/api/auth/register',
      });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return problemJson({
        status: 400,
        title: 'Zayıf Şifre',
        detail: strength.error || 'Şifre gereksinimleri karşılanmadı.',
        type: '/problems/auth-register-weak-password',
        instance: '/api/auth/register',
      });
    }

    const authResult = await runRegisterFlow({ fullName, email, password }, context.cookies);

    return apiResponse({
      success: true,
      ...authResult,
    }, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Register error:', error);
    const rawMessage = error instanceof Error ? error.message : '';
    // Email existence must not be revealed — prevents account enumeration.
    // Other runRegisterFlow errors (DB failures) get safeErrorDetail (fallback in production).
    const detail = rawMessage.includes('zaten kayıtlı')
      ? 'Kayıt işlemi tamamlanamadı. Lütfen bilgilerinizi kontrol edin.'
      : safeErrorDetail(error, 'Kayıt işlemi tamamlanamadı.');
    return problemJson({
      status: 400,
      title: 'Kayıt Tamamlanamadı',
      detail,
      type: '/problems/auth-register-failed',
      instance: '/api/auth/register',
    });
  }
};
