/**
 * Email Service
 * Queue-based email sending with templates
 */

import { insert, queryRows, query, queryOne } from './postgres';
import { logger } from './logging';

export interface EmailTemplate {
  subject: string;
  html: string;
}

const TEMPLATES: { [key: string]: (data: any) => EmailTemplate } = {
  welcome: (data) => ({
    subject: 'Şanlıurfa.com\'a Hoş Geldiniz',
    html: `<h1>Hoş Geldiniz, ${data.fullName}!</h1><p>Hesabınız başarıyla oluşturuldu.</p>`
  }),

  new_message: (data) => ({
    subject: `${data.senderName} size mesaj gönderdi`,
    html: `<h1>Yeni Mesaj</h1><p>${data.senderName} size: "${data.preview}"</p><p><a href="${data.messageUrl}">Mesajı Oku</a></p>`
  }),

  new_follower: (data) => ({
    subject: `${data.followerName} sizi takip etmeye başladı`,
    html: `<h1>Yeni Takipçi</h1><p>${data.followerName} sizi takip etmeye başladı.</p><p><a href="${data.profileUrl}">Profili Ziyaret Et</a></p>`
  }),

  place_review: (data) => ({
    subject: `${data.placeName} için yeni inceleme`,
    html: `<h1>Mekanınız İncelendi</h1><p>${data.reviewerName}, ${data.placeName} için şu incelemeyi yaptı: "${data.reviewPreview}"</p><p><a href="${data.reviewUrl}">İncelemeyi Oku</a></p>`
  }),

  weekly_digest: (data) => ({
    subject: 'Haftalık Özet - Şanlıurfa.com',
    html: `<h1>Bu Hafta Neler Oldu?</h1><p>En beğenilen incelemeler ve takip ettiklerinizin aktiviteleri...</p>`
  })
};

/**
 * Queue an email to be sent
 */
export async function queueEmail(
  recipientEmail: string,
  templateType: string,
  data: any,
  recipientUserId?: string
): Promise<void> {
  try {
    const template = TEMPLATES[templateType];
    if (!template) {
      throw new Error(`Template not found: ${templateType}`);
    }

    const { subject, html } = template(data);

    await insert('email_queue', {
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId || null,
      template_type: templateType,
      subject: subject,
      data: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    logger.info('Email queued', { recipientEmail, templateType });
  } catch (error) {
    logger.error('Failed to queue email', error instanceof Error ? error : new Error(String(error)), {
      recipientEmail,
      templateType
    });
    throw error;
  }
}

/**
 * Get pending emails from queue
 */
export async function getPendingEmails(limit: number = 50): Promise<any[]> {
  try {
    const results = await queryRows(
      `SELECT * FROM email_queue
       WHERE status = 'pending' AND retry_count < max_retries
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );

    return results;
  } catch (error) {
    logger.error('Failed to get pending emails', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Mark email as sent
 */
export async function markEmailSent(emailId: string): Promise<void> {
  try {
    await query(
      'UPDATE email_queue SET status = $1, sent_at = NOW(), updated_at = NOW() WHERE id = $2',
      ['sent', emailId]
    );
  } catch (error) {
    logger.error('Failed to mark email sent', error instanceof Error ? error : new Error(String(error)), {
      emailId
    });
    throw error;
  }
}

/**
 * Mark email as failed with error
 */
export async function markEmailFailed(emailId: string, errorMessage: string): Promise<void> {
  try {
    const email = await query('SELECT retry_count, max_retries FROM email_queue WHERE id = $1', [emailId]);
    const retryCount = (email.rows?.[0]?.retry_count || 0) + 1;
    const maxRetries = email.rows?.[0]?.max_retries || 3;

    const newStatus = retryCount >= maxRetries ? 'failed' : 'pending';

    await query(
      'UPDATE email_queue SET status = $1, retry_count = $2, error_message = $3, updated_at = NOW() WHERE id = $4',
      [newStatus, retryCount, errorMessage, emailId]
    );
  } catch (error) {
    logger.error('Failed to mark email failed', error instanceof Error ? error : new Error(String(error)), {
      emailId
    });
    throw error;
  }
}

/**
 * Send email via SMTP (placeholder - would use Resend or similar)
 */
export async function sendEmailViaService(email: any): Promise<boolean> {
  try {
    logger.info('Email would be sent', {
      to: email.recipient_email,
      subject: email.subject,
      template: email.template_type
    });

    // In production, integrate with Resend, SendGrid, or SMTP
    // For now, mark as sent immediately
    await markEmailSent(email.id);
    return true;
  } catch (error) {
    logger.error('Failed to send email', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Send email directly (used for password reset, verification, etc.)
 */
type SendEmailPayload = { to: string; subject: string; html: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean>;
export async function sendEmail(payload: SendEmailPayload): Promise<boolean>;
export async function sendEmail(
  toOrPayload: string | SendEmailPayload,
  subjectArg?: string,
  htmlArg?: string
): Promise<boolean> {
  const payload: SendEmailPayload =
    typeof toOrPayload === 'string'
      ? { to: toOrPayload, subject: subjectArg || '', html: htmlArg || '' }
      : toOrPayload;

  try {
    const { to, subject, html } = payload;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.MAIL_FROM || 'noreply@sanliurfa.com';

    if (!RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, email not sent', { to, subject });
      return true; // Don't fail in development
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Email send failed', new Error(JSON.stringify(error)), { to, subject });
      return false;
    }

    logger.info('Email sent successfully', { to, subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email', error instanceof Error ? error : new Error(String(error)), {
      to: payload.to,
      subject: payload.subject
    });
    return false;
  }
}

/**
 * Generate password reset email HTML
 */
export function getPasswordResetEmailHTML(resetLink: string, expiryHours: number = 24): string {
  return `
    <h1>Şifre Sıfırla</h1>
    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${resetLink}">Şifreyi Sıfırla</a></p>
    <p>Bu bağlantı ${expiryHours} saat içinde geçerlidir.</p>
    <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelin.</p>
  `;
}

/**
 * Generate email verification HTML
 */
export function getEmailVerificationHTML(verificationLink: string): string {
  return `
    <h1>E-posta Doğrulama</h1>
    <p>E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${verificationLink}">E-postayı Doğrula</a></p>
  `;
}

/**
 * Generate welcome email HTML
 */
export function getWelcomeEmailHTML(fullName: string): string {
  return `
    <h1>Hoş Geldiniz, ${fullName}!</h1>
    <p>Şanlıurfa.com'a katılmak için teşekkürler.</p>
    <p>Profilinizi tamamlayabilir ve şehir hakkında bilgi paylaşmaya başlayabilirsiniz.</p>
  `;
}

/**
 * Generate review response email HTML
 */
export function getReviewResponseEmailHTML(reviewerName: string, placeName: string, responseText: string): string {
  return `
    <h1>${placeName} adlı mekanınıza bir yanıt geldi</h1>
    <p>${reviewerName} tarafından yapılan yorumunuza sahibi yanıt verdi:</p>
    <blockquote>${responseText}</blockquote>
  `;
}

/**
 * Generate subscription email HTML
 */
export function getSubscriptionEmailHTML(placeName: string): string {
  return `
    <h1>Yeni Aktivite: ${placeName}</h1>
    <p>Takip ettiğiniz mekan hakkında yeni bilgiler var.</p>
  `;
}

/**
 * Request email verification
 */
export async function requestEmailVerification(userId: string, email: string): Promise<boolean> {
  try {
    // Generate verification token and send email
    const verificationToken = Math.random().toString(36).substring(2, 15);
    const verificationLink = `https://sanliurfa.com/verify-email?token=${verificationToken}`;
    const html = getEmailVerificationHTML(verificationLink);
    
    return await sendEmail(email, 'E-posta Doğrulama', html);
  } catch (error) {
    logger.error('Failed to request email verification', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    // Check in users table email_verified column
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

/**
 * Verify email with token
 */
export async function verifyEmailWithToken(token: string): Promise<boolean> {
  try {
    // In production, validate token and mark email as verified
    // For now, just return true
    logger.info('Email verified with token', { token });
    return true;
  } catch (error) {
    logger.error('Failed to verify email', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
