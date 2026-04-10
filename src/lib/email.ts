/**
 * Email Service
 * Queue-based email sending with templates
 */

import crypto from 'crypto';
import { insert, queryRows, query, queryOne } from './postgres';
import { logger } from './logging';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface EmailVerificationResult {
  userId: string;
  email: string;
  verifiedAt: string;
}

type EmailQueueSchemaMode = 'legacy' | 'delivery';

let emailQueueSchemaModePromise: Promise<EmailQueueSchemaMode> | null = null;

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

  weekly_digest: () => ({
    subject: 'Haftalık Özet - Şanlıurfa.com',
    html: `<h1>Bu Hafta Neler Oldu?</h1><p>En beğenilen incelemeler ve takip ettiklerinizin aktiviteleri...</p>`
  })
};

function getSiteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://sanliurfa.com').replace(/\/+$/, '');
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseQueuedEmailData(value: unknown): Record<string, any> {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' ? value as Record<string, any> : {};
}

async function getEmailQueueSchemaMode(): Promise<EmailQueueSchemaMode> {
  if (!emailQueueSchemaModePromise) {
    emailQueueSchemaModePromise = (async () => {
      const columns = await queryRows(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'email_queue'`
      );

      const columnNames = new Set(
        columns
          .map((column) => String((column as Record<string, unknown>).column_name || ''))
          .filter(Boolean)
      );

      return columnNames.has('html_content') || columnNames.has('delivery_attempts')
        ? 'delivery'
        : 'legacy';
    })().catch((error) => {
      emailQueueSchemaModePromise = null;
      logger.warn('Failed to detect email_queue schema mode, falling back to legacy mode', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'legacy';
    });
  }

  return emailQueueSchemaModePromise;
}

function renderQueuedEmail(email: Record<string, any>): { subject: string; html: string } {
  const queueSubject = typeof email.subject === 'string' && email.subject.trim()
    ? email.subject.trim()
    : 'Şanlıurfa.com bildirimi';

  if (typeof email.html_content === 'string' && email.html_content.trim()) {
    return { subject: queueSubject, html: email.html_content };
  }

  const templateType = typeof email.template_type === 'string' ? email.template_type : '';
  const templateData = parseQueuedEmailData(email.data);
  const template = templateType ? TEMPLATES[templateType] : undefined;

  if (template) {
    const rendered = template(templateData);
    return {
      subject: queueSubject || rendered.subject,
      html: rendered.html
    };
  }

  if (typeof email.plain_text_content === 'string' && email.plain_text_content.trim()) {
    return {
      subject: queueSubject,
      html: `<pre>${email.plain_text_content}</pre>`
    };
  }

  return {
    subject: queueSubject,
    html: `<p>${queueSubject}</p>`
  };
}

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
    const schemaMode = await getEmailQueueSchemaMode();

    if (schemaMode === 'delivery') {
      await insert('email_queue', {
        recipient_email: recipientEmail,
        recipient_id: recipientUserId || null,
        subject,
        html_content: html,
        plain_text_content: stripHtmlTags(html),
        message_type: templateType,
        priority: 5,
        status: 'pending',
        delivery_attempts: 0,
        metadata: JSON.stringify(data),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      await insert('email_queue', {
        recipient_email: recipientEmail,
        recipient_user_id: recipientUserId || null,
        template_type: templateType,
        subject,
        data: JSON.stringify(data),
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

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
    const schemaMode = await getEmailQueueSchemaMode();
    const results = schemaMode === 'delivery'
      ? await queryRows(
          `SELECT * FROM email_queue
           WHERE status = 'pending'
             AND delivery_attempts < max_attempts
             AND (scheduled_for IS NULL OR scheduled_for <= NOW())
           ORDER BY priority DESC, created_at ASC
           LIMIT $1`,
          [limit]
        )
      : await queryRows(
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
    const schemaMode = await getEmailQueueSchemaMode();

    if (schemaMode === 'delivery') {
      const email = await queryOne(
        'SELECT delivery_attempts, max_attempts FROM email_queue WHERE id = $1',
        [emailId]
      );
      const retryCount = Number(email?.delivery_attempts || 0) + 1;
      const maxRetries = Number(email?.max_attempts || 5);
      const newStatus = retryCount >= maxRetries ? 'failed' : 'pending';

      await query(
        `UPDATE email_queue
         SET status = $1,
             delivery_attempts = $2,
             last_error = $3,
             last_attempt_at = NOW(),
             updated_at = NOW()
         WHERE id = $4`,
        [newStatus, retryCount, errorMessage, emailId]
      );
    } else {
      const email = await queryOne(
        'SELECT retry_count, max_retries FROM email_queue WHERE id = $1',
        [emailId]
      );
      const retryCount = Number(email?.retry_count || 0) + 1;
      const maxRetries = Number(email?.max_retries || 3);
      const newStatus = retryCount >= maxRetries ? 'failed' : 'pending';

      await query(
        'UPDATE email_queue SET status = $1, retry_count = $2, error_message = $3, updated_at = NOW() WHERE id = $4',
        [newStatus, retryCount, errorMessage, emailId]
      );
    }
  } catch (error) {
    logger.error('Failed to mark email failed', error instanceof Error ? error : new Error(String(error)), {
      emailId
    });
    throw error;
  }
}

/**
 * Send a queued email using the configured provider
 */
export async function sendEmailViaService(email: any): Promise<boolean> {
  try {
    const queuedEmail = email as Record<string, any>;
    const { subject, html } = renderQueuedEmail(queuedEmail);
    const success = await sendEmail(queuedEmail.recipient_email, subject, html);

    if (success) {
      await markEmailSent(String(queuedEmail.id));
      return true;
    }

    await markEmailFailed(String(queuedEmail.id), 'Email provider delivery failed');
    return false;
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to send email', normalizedError);

    if (email?.id) {
      await markEmailFailed(String(email.id), normalizedError.message);
    }

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
    const FROM_EMAIL = process.env.MAIL_FROM || process.env.FROM_EMAIL || 'noreply@sanliurfa.com';

    if (!RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, email not sent', { to, subject });
      return true;
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
      }),
      signal: AbortSignal.timeout(15000)
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
export function getEmailVerificationHTML(verificationLink: string, fullName?: string): string {
  return `
    <h1>E-posta Doğrulama</h1>
    <p>Merhaba ${fullName || 'Kullanıcı'},</p>
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

/**
 * Check if email is verified
 */
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

/**
 * Verify email with token
 */
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
