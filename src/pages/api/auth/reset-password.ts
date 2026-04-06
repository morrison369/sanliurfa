// API: Şifre sıfırlama (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const token = formData.get('token')?.toString();
    const password = formData.get('password')?.toString();

    if (!token || !password) {
      return redirect('/sifre-sifirla?error=missing_fields');
    }

    if (password.length < 6) {
      return redirect('/sifre-sifirla?error=weak_password');
    }

    // Find user by token
    const user = await queryOne(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > $2',
      [token, new Date().toISOString()]
    );

    if (!user) {
      return redirect('/sifre-sifirla?error=invalid_token');
    }

    // Update password
    const passwordHash = hashPassword(password);
    await queryOne(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    return redirect('/sifre-sifirla?success=true');
  } catch (err) {
    console.error('Reset password error:', err);
    return redirect('/sifre-sifirla?error=server_error');
  }
};
