/**
 * Email Service
 * Transactional email handling with templates via SMTP (nodemailer)
 */

import nodemailer from 'nodemailer';
import { getCache, setCache } from '../cache';
import { query } from '../postgres';
import { logger } from '../logging';

export interface EmailData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'noreply@sanliurfa.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Sanliurfa.com';

function createTransport() {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  // Dev fallback: log to console, no actual send
  return null;
}

/**
 * Send email via SMTP
 */
export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Rate limiting: max 10 emails/day per recipient
    const rateKey = `email:${data.to}`;
    const sentToday = await getCache<number>(rateKey) || 0;
    if (sentToday >= 10) {
      return { success: false, error: 'Email rate limit exceeded' };
    }

    const transport = createTransport();
    if (transport) {
      await transport.sendMail({
        from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        attachments: data.attachments,
      });
    } else {
      logger.info(`📧 [DEV] Email to: ${data.to} | Subject: ${data.subject}`);
    }

    await setCache(rateKey, sentToday + 1, 86400);
    return { success: true };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const html = welcomeTemplate(name);
  const text = `Hoşgeldiniz ${name}! Sanliurfa.com'a üye olduğunuz için teşekkür ederiz.`;
  
  await sendEmail({
    to,
    subject: 'Hoşgeldiniz! Sanliurfa.com',
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.PUBLIC_APP_URL}/sifre-sifirla?token=${resetToken}`;
  const html = passwordResetTemplate(name, resetUrl);
  
  await sendEmail({
    to,
    subject: 'Şifre Sıfırlama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, şifrenizi sıfırlamak için bu linke tıklayın: ${resetUrl}`,
  });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyToken: string
): Promise<void> {
  const verifyUrl = `${process.env.PUBLIC_APP_URL}/email-dogrula?token=${verifyToken}`;
  const html = verificationTemplate(name, verifyUrl);
  
  await sendEmail({
    to,
    subject: 'E-posta Doğrulama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, e-posta adresinizi doğrulamak için bu linke tıklayın: ${verifyUrl}`,
  });
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<void> {
  const html = notificationTemplate(title, message, actionUrl, actionText);
  
  await sendEmail({
    to,
    subject: title,
    html,
    text: message,
  });
}

// Templates
function welcomeTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sanliurfa.com'a Hoşgeldiniz!</h1>
    </div>
    <div class="content">
      <p>Merhaba <strong>${escapeHtml(name)}</strong>,</p>
      <p>Sanliurfa.com'a üye olduğunuz için teşekkür ederiz. Şimdi şehrimizin tarihi yerlerini, lezzetli yemeklerini ve daha fazlasını keşfedebilirsiniz.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.PUBLIC_APP_URL}/kesfet" class="button">Keşfetmeye Başla</a>
      </p>
      <p>Yardıma ihtiyacınız olursa bizimle iletişime geçmekten çekinmeyin.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sanliurfa.com - Tüm hakları saklıdır.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function passwordResetTemplate(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Şifre Sıfırlama</h1>
    </div>
    <div class="content">
      <p>Merhaba <strong>${escapeHtml(name)}</strong>,</p>
      <p>Şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi oluşturabilirsiniz:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
      </p>
      <div class="warning">
        <strong>⚠️ Güvenlik Uyarısı:</strong>
        <p>Bu talebi siz yapmadıysanız, bu e-postayı dikkate almayın. Hesabınız güvendedir.</p>
      </div>
      <p>Bu link 24 saat geçerlidir.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function verificationTemplate(name: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>E-posta Doğrulama</h1>
    </div>
    <div class="content">
      <p>Merhaba <strong>${escapeHtml(name)}</strong>,</p>
      <p>Hesabınızı aktifleştirmek için e-posta adresinizi doğrulamanız gerekiyor:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" class="button">E-postamı Doğrula</a>
      </p>
      <p>Veya bu linki tarayıcınızda açın: ${verifyUrl}</p>
    </div>
  </div>
</body>
</html>
  `;
}

function notificationTemplate(
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4b5563; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      <p>${escapeHtml(message)}</p>
      ${actionUrl ? `<p style="text-align: center; margin: 30px 0;"><a href="${actionUrl}" class="button">${escapeHtml(actionText || 'Görüntüle')}</a></p>` : ''}
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(text: string): string {
  const div = { toString: () => text };
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * Get password reset email HTML
 */
export function getPasswordResetEmailHTML(name: string, resetUrl: string): string {
  return passwordResetTemplate(name, resetUrl);
}

/**
 * Get welcome email HTML
 */
export function getWelcomeEmailHTML(name: string): string {
  return welcomeTemplate(name);
}

/**
 * Get verification email HTML
 */
export function getVerificationEmailHTML(name: string, verifyUrl: string): string {
  return verificationTemplate(name, verifyUrl);
}


/**
 * Get review response email HTML
 */
export function getReviewResponseEmailHTML(userName: string, placeName: string, responseText: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .response-box { background: white; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Yorumunuza Yanıt</h1>
    </div>
    <div class="content">
      <p>Merhaba <strong>${escapeHtml(userName)}</strong>,</p>
      <p><strong>${escapeHtml(placeName)}</strong> hakkında yaptığınız yoruma bir yanıt geldi:</p>
      <div class="response-box">
        ${escapeHtml(responseText)}
      </div>
      <p>Bizi tercih ettiğiniz için teşekkür ederiz.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send review response email
 */
export async function sendReviewResponseEmail(
  to: string,
  userName: string,
  placeName: string,
  responseText: string
): Promise<void> {
  const html = getReviewResponseEmailHTML(userName, placeName, responseText);
  
  await sendEmail({
    to,
    subject: `${placeName} - Yorumunuza Yanıt`,
    html,
    text: `Merhaba ${userName}, ${placeName} hakkında yaptığınız yoruma yanıt geldi: ${responseText}`,
  });
}


/**
 * Get subscription confirmation email HTML
 */
export function getSubscriptionEmailHTML(newsletterName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0d9488; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Aboneliğiniz Başladı!</h1>
    </div>
    <div class="content">
      <p>Merhaba,</p>
      <p><strong>${escapeHtml(newsletterName)}</strong> bültenine abone oldunuz.</p>
      <p>En güncel Şanlıurfa haberleri ve fırsatları için göz atmayı unutmayın.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${process.env.PUBLIC_APP_URL}/blog" class="button">Blog'a Git</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionEmail(to: string, newsletterName: string): Promise<void> {
  const html = getSubscriptionEmailHTML(newsletterName);
  
  await sendEmail({
    to,
    subject: `${newsletterName} - Aboneliğiniz Başladı`,
    html,
    text: `${newsletterName} bültenine abone oldunuz.`,
  });
}


/**
 * Get email verification HTML
 * Alias for verificationTemplate
 */
export function getEmailVerificationHTML(name: string, verifyUrl: string): string {
  return verificationTemplate(name, verifyUrl);
}


// Email queue interfaces
export interface PendingEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: Date;
}

/**
 * Get pending emails from queue
 */
export async function getPendingEmails(limit = 10): Promise<PendingEmail[]> {
  const result = await query(
    `SELECT * FROM email_queue 
     WHERE status = 'pending'
     AND (retry_count < 3 OR retry_count IS NULL)
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    html: row.html_content,
    text: row.text_content,
    status: row.status,
    retryCount: row.retry_count || 0,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Add email to queue
 */
export async function queueEmail(data: EmailData): Promise<string> {
  const result = await query(
    `INSERT INTO email_queue (to_email, subject, html_content, text_content, status, retry_count, created_at)
     VALUES ($1, $2, $3, $4, 'pending', 0, NOW())
     RETURNING id`,
    [data.to, data.subject, data.html, data.text || null]
  );
  
  return result.rows[0].id;
}

/**
 * Mark email as sent
 */
export async function markEmailSent(emailId: string): Promise<void> {
  await query(
    `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
    [emailId]
  );
}

/**
 * Mark email as failed
 */
export async function markEmailFailed(emailId: string, error: string): Promise<void> {
  await query(
    `UPDATE email_queue 
     SET status = 'failed', 
         error_message = $2,
         retry_count = COALESCE(retry_count, 0) + 1
     WHERE id = $1`,
    [emailId, error]
  );
}

/**
 * Alias for sendEmail — kept for backward compatibility
 */
export async function sendEmailViaService(data: EmailData): Promise<{ success: boolean; error?: string }> {
  return sendEmail(data);
}


/**
 * Request email verification
 * Creates a verification token and queues the email
 */
export async function requestEmailVerification(userId: string, email: string, name: string): Promise<void> {
  // Generate verification token
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store token in database
  await query(
    `INSERT INTO email_verifications (user_id, token, expires_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours', NOW())`,
    [userId, token]
  );
  
  // Create verification URL
  const verifyUrl = `${process.env.PUBLIC_APP_URL}/email-dogrula?token=${token}`;
  
  // Queue verification email
  const html = getVerificationEmailHTML(name, verifyUrl);
  await queueEmail({
    to: email,
    subject: 'E-posta Doğrulama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, e-posta adresinizi doğrulamak için bu linke tıklayın: ${verifyUrl}`,
  });
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const result = await query(
    `SELECT email_verified FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) return false;
  return result.rows[0].email_verified === true;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const result = await query(
    `SELECT user_id FROM email_verifications 
     WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [token]
  );
  
  if (result.rows.length === 0) return false;
  
  const userId = result.rows[0].user_id;
  
  // Mark user as verified
  await query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [userId]
  );
  
  // Mark token as used
  await query(
    `UPDATE email_verifications SET used = true WHERE token = $1`,
    [token]
  );
  
  return true;
}


/**
 * Verify email with token (alias)
 */
export async function verifyEmailWithToken(token: string): Promise<boolean> {
  return verifyEmail(token);
}

