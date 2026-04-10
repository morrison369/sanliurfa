import crypto from 'crypto';
import { insert, queryOne, query } from './postgres';
import { logger } from './logging';
import { getEmailVerificationHTML, getSiteUrl } from './email.templates';
import { sendEmail } from './email.delivery';

export interface EmailVerificationResult {
  userId: string;
  email: string;
  verifiedAt: string;
}

export async function requestEmailVerification(userId: string, email: string, fullName?: string): Promise<boolean> {
  try {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationLink = `${getSiteUrl()}/verify-email?token=${verificationToken}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const currentUser = await queryOne(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [userId]
    );

    await query(
      `UPDATE users
       SET email_verification_token = $1,
           email_verification_token_expires = $2
       WHERE id = $3`,
      [verificationToken, expiresAt, userId]
    );

    await insert('email_verification_history', {
      user_id: userId,
      old_email: currentUser?.email || email,
      new_email: email,
      verification_status: 'pending',
      created_at: new Date().toISOString()
    });

    const html = getEmailVerificationHTML(verificationLink, fullName || currentUser?.full_name);
    return await sendEmail(email, 'E-posta Doğrulama', html);
  } catch (error) {
    logger.error('Failed to request email verification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT email_verified FROM users WHERE id = $1',
      [userId]
    );
    return result?.email_verified || false;
  } catch (error) {
    logger.error('Failed to check email verification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function verifyEmailWithToken(token: string): Promise<EmailVerificationResult | null> {
  try {
    const user = await queryOne(
      `SELECT id, email
       FROM users
       WHERE email_verification_token = $1
         AND email_verification_token_expires > NOW()`,
      [token]
    );

    if (!user) {
      return null;
    }

    const verifiedAt = new Date().toISOString();

    await query(
      `UPDATE users
       SET email_verified = true,
           email_verified_at = $1,
           email_verification_token = NULL,
           email_verification_token_expires = NULL
       WHERE id = $2`,
      [verifiedAt, user.id]
    );

    await insert('email_verification_history', {
      user_id: user.id,
      old_email: user.email,
      new_email: user.email,
      verification_status: 'verified',
      verified_at: verifiedAt,
      created_at: verifiedAt
    });

    logger.info('Email verified with token', { userId: user.id, email: user.email });

    return {
      userId: String(user.id),
      email: String(user.email),
      verifiedAt
    };
  } catch (error) {
    logger.error('Failed to verify email', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
