import { logger } from '../logging';
/**
 * Email Service
 * Nodemailer-based email sending with queue management
 */

// Email queue for batch processing
interface EmailQueueItem {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  retries: number;
  maxRetries: number;
}

const emailQueue: EmailQueueItem[] = [];
const queueStats = {
  pending: 0,
  sent: 0,
  failed: 0,
};

// Nodemailer transporter
let transporter: any = null;

async function getTransporter(): Promise<any> {
  if (transporter) return transporter;

  // Check if email is configured
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    logger.warn('[Email] SMTP not configured, using mock mode');
    return null;
  }

  try {
    // Dynamic import to avoid build-time dependency
    const nodemailer = await import('nodemailer');
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: parseInt(port, 10) === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
    return transporter;
  } catch (error) {
    logger.warn('[Email] Failed to load nodemailer, using mock mode');
    return null;
  }
}

// Verify transporter connection
export async function verifyEmailConnection(): Promise<boolean> {
  const t = await getTransporter();
  if (!t) return false;

  try {
    await t.verify();
    logger.info('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    logger.error('[Email] SMTP connection failed:', error);
    return false;
  }
}

// Send single email
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, text, from } = options;

  // Mock mode for development or when SMTP not configured
  if (process.env.EMAIL_MOCK === 'true') {
    logger.info('[Email] Mock send:', { to, subject });
    return { success: true, messageId: 'mock-' + Date.now() };
  }

  const t = await getTransporter();
  if (!t) {
    logger.info('[Email] No transporter available, mock send:', { to, subject });
    return { success: true, messageId: 'mock-' + Date.now() };
  }

  try {
    const mailOptions = {
      from: from || process.env.EMAIL_FROM || 'noreply@sanliurfa.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    };

    const result = await t.sendMail(mailOptions);
    queueStats.sent++;

    logger.info('[Email] Sent:', { to, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    queueStats.failed++;
    logger.error('[Email] Failed:', { to, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

// Send bulk emails
export async function sendBulkEmail(
  recipients: string[],
  options: {
    subject: string;
    html: string;
    text?: string;
    from?: string;
    batchSize?: number;
    delayMs?: number;
  }
): Promise<{ success: number; failed: number; errors: Array<{ email: string; error: string }> }> {
  const { subject, html, text, from, batchSize = 50, delayMs = 1000 } = options;

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  // Process in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (to) => {
        const result = await sendEmail({ to, subject, html, text, from });
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({ email: to, error: result.error || 'Unknown error' });
        }
      })
    );

    // Delay between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// Add email to queue
export function queueEmail(options: Omit<EmailQueueItem, 'id' | 'retries' | 'maxRetries'>): string {
  const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const queueItem: EmailQueueItem = {
    ...options,
    id,
    retries: 0,
    maxRetries: 3,
  };

  emailQueue.push(queueItem);
  queueStats.pending++;

  return id;
}

// Process email queue
export async function processQueue(): Promise<void> {
  while (emailQueue.length > 0) {
    const item = emailQueue.shift();
    if (!item) continue;

    queueStats.pending--;

    const result = await sendEmail({
      to: item.to,
      subject: item.subject,
      html: item.html,
      text: item.text,
      from: item.from,
    });

    if (!result.success && item.retries < item.maxRetries) {
      // Re-queue with incremented retry count
      item.retries++;
      emailQueue.push(item);
      queueStats.pending++;
      logger.info(`[Email] Re-queued ${item.id}, retry ${item.retries}/${item.maxRetries}`);
    }
  }
}

// Get queue statistics
export function getQueueStats(): {
  pending: number;
  sent: number;
  failed: number;
} {
  return { ...queueStats };
}

// Legacy compatibility
export async function sendEmailMessage(data: {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: data.subject,
    html: data.html ? data.body : `<pre>${data.body}</pre>`,
    text: data.body,
  });
}

// Email Templates
export const emailTemplates = {
  welcome: (name: string): { subject: string; html: string } => ({
    subject: 'Şanlıurfa.com\'a Hoş Geldiniz!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Hoş Geldiniz, ${name}!</h1>
        <p>Şanlıurfa.com'a katıldığınız için teşekkür ederiz.</p>
        <p>Şehrin en iyi mekanlarını keşfetmeye başlayın:</p>
        <ul>
          <li>Restoranlar ve kafeler</li>
          <li>Oteller ve konaklama</li>
          <li>Tarihi yerler</li>
          <li>Etkinlikler</li>
        </ul>
        <a href="https://sanliurfa.com/places" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Mekanları Keşfet</a>
      </div>
    `,
  }),

  passwordReset: (name: string, resetUrl: string): { subject: string; html: string } => ({
    subject: 'Şifre Sıfırlama - Şanlıurfa.com',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Şifre Sıfırlama</h1>
        <p>Merhaba ${name},</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Şifremi Sıfırla</a>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">
          Bu bağlantı 1 saat süreyle geçerlidir. Şifre sıfırlama talebi sizin tarafınızdan yapılmadıysa bu e-postayı görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  }),

  reviewApproved: (placeName: string, reviewUrl: string): { subject: string; html: string } => ({
    subject: 'Yorumunuz Onaylandı - Şanlıurfa.com',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Yorumunuz Onaylandı!</h1>
        <p><strong>${placeName}</strong> için yazdığınız yorum yayınlandı.</p>
        <a href="${reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Yorumu Görüntüle</a>
        <p style="margin-top: 24px; color: #666;">Değerlendirmeniz için teşekkür ederiz!</p>
      </div>
    `,
  }),

  placeVerified: (placeName: string, placeUrl: string): { subject: string; html: string } => ({
    subject: 'Mekanınız Doğrulandı - Şanlıurfa.com',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Tebrikler!</h1>
        <p><strong>${placeName}</strong> doğrulandı ve yayınlandı.</p>
        <a href="${placeUrl}" style="display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px;">Mekanı Görüntüle</a>
        <p style="margin-top: 24px; color: #666;">Artık müşterileriniz sizi Şanlıurfa.com'da bulabilir!</p>
      </div>
    `,
  }),

  newsletter: (title: string, content: string, unsubscribeUrl: string): { subject: string; html: string } => ({
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Şanlıurfa.com</h1>
        </div>
        <div style="padding: 20px;">
          ${content}
        </div>
        <div style="padding: 20px; background: #f3f4f6; text-align: center; font-size: 12px; color: #666;">
          <p>Bu e-postayı Şanlıurfa.com bültenine abone olduğunuz için alıyorsunuz.</p>
          <a href="${unsubscribeUrl}" style="color: #dc2626;">Bülten aboneliğinden çık</a>
        </div>
      </div>
    `,
  }),
};

export default {
  sendEmail,
  sendBulkEmail,
  queueEmail,
  processQueue,
  getQueueStats,
  verifyEmailConnection,
  emailTemplates,
};
