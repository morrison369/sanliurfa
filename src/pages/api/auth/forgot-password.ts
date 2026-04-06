// API: Şifre sıfırlama talebi (PostgreSQL)
// NOT: E-posta gönderimi için Resend API key gerekli
import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();

    if (!email) {
      return redirect('/sifremi-unuttum?error=missing_email');
    }

    // Check if user exists
    const user = await queryOne('SELECT id, email FROM users WHERE email = $1', [email]);

    if (!user) {
      // Don't reveal if email exists or not for security
      return redirect('/sifremi-unuttum?success=email_sent');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour

    // Save token to database
    await queryOne(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires.toISOString(), user.id]
    );

    // TODO: Send password reset email with Resend API
    // const resetUrl = `${new URL(request.url).origin}/sifre-sifirla?token=${resetToken}`;
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return redirect('/sifremi-unuttum?success=email_sent');
  } catch (err) {
    console.error('Forgot password error:', err);
    return redirect('/sifremi-unuttum?error=server_error');
  }
};
