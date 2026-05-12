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
  // Email enumeration koruması: user yoksa sessizce dön (success-as-not-found uyumu).
  if (!user) {
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  // Store hash only — DB breach cannot be used to reset accounts directly.
  // SHA-256 is sufficient (no salt needed: 256-bit random token has no brute-force risk).
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetTokenExpires = new Date();
  resetTokenExpires.setHours(resetTokenExpires.getHours() + 1);

  await queryOne(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [resetTokenHash, resetTokenExpires.toISOString(), user.id],
  );

  const resetUrl = `${origin}/sifre-sifirla?token=${resetToken}`;
  const mailResult = await sendEmail({
    to: user.email,
    subject: 'Şifreni Sıfırla - Sanliurfa.com',
    html: getPasswordResetEmailHTML(user.full_name || 'Kullanıcı', resetUrl),
  });

  // Email gönderilemese bile throw etmiyoruz — aksi halde "user-not-found vs email-failed"
  // ayrımı response'tan tespit edilebilir ve email enumeration vector açılır.
  // Sadece log; admin operasyonel olarak görür.
  if (!mailResult.success) {
    logger.warn('Password reset email send failed', {
      userId: user.id,
      email: user.email,
      error: mailResult.error,
    });
  }
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const cleanToken = token.trim();
  if (!cleanToken || !password) {
    throw new Error('Token ve şifre zorunludur.');
  }

  // Hash the incoming token before DB lookup — tokens are stored as SHA-256 hashes.
  const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

  const user = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > $2',
    [tokenHash, new Date().toISOString()],
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
