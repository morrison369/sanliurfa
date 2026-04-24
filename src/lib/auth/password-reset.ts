import crypto from 'node:crypto';

import { hashPassword } from '../auth';
import { sendEmail, getPasswordResetEmailHTML } from '../email';
import { logger } from '../logging';
import { queryOne } from '../postgres';

interface PasswordResetUser {
  id: string;
  email: string;
  full_name?: string | null;
}

export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('E-posta adresi gereklidir.');
  }

  const user = await queryOne<PasswordResetUser>(
    'SELECT id, email, full_name FROM users WHERE email = $1',
    [normalizedEmail],
  );

  // Hesap var mı bilgisini dışarı sızdırmıyoruz.
  if (!user) {
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date();
  resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

  await queryOne(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [resetToken, resetTokenExpires.toISOString(), user.id],
  );

  const resetUrl = `${origin}/sifre-sifirla?token=${resetToken}`;
  const mailResult = await sendEmail({
    to: user.email,
    subject: 'Şifreni Sıfırla - Sanliurfa.com',
    html: getPasswordResetEmailHTML(user.full_name || 'Kullanıcı', resetUrl),
  });

  if (!mailResult.success) {
    throw new Error(mailResult.error || 'Şifre sıfırlama e-postası gönderilemedi.');
  }
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const cleanToken = token.trim();
  if (!cleanToken || !password) {
    throw new Error('Token ve şifre zorunludur.');
  }

  const user = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > $2',
    [cleanToken, new Date().toISOString()],
  );

  if (!user) {
    throw new Error('Geçersiz veya süresi dolmuş bağlantı.');
  }

  const passwordHash = await hashPassword(password);
  await queryOne(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [passwordHash, user.id],
  );
}

export function logPasswordResetError(message: string, error: unknown): void {
  logger.error(message, error instanceof Error ? error : new Error(String(error)));
}
