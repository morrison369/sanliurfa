// API: Şifre sıfırlama (PostgreSQL)
import type { APIRoute } from 'astro';
import {
  logPasswordResetError,
  resetPasswordWithToken,
} from '../../../lib/auth/password-reset';
import { validatePasswordStrength } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const token = formData.get('token')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    if (!token || !password) {
      return redirect('/sifre-sifirla?error=missing_fields');
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return redirect('/sifre-sifirla?error=weak_password');
    }

    await resetPasswordWithToken(token, password);

    return redirect('/sifre-sifirla?success=true');
  } catch (err) {
    logPasswordResetError('Reset password error', err);
    return redirect('/sifre-sifirla?error=server_error');
  }
};
