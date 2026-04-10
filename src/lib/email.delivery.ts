/**
 * Queue and provider-backed email delivery helpers.
 */

import { insert, queryRows, query, queryOne } from './postgres';
import { logger } from './logging';
import {
  TEMPLATES,
  parseQueuedEmailData,
  stripHtmlTags
} from './email.templates';
import { getRuntimeIntegrationSettings } from './runtime-integration-settings';

export type SendEmailPayload = { to: string; subject: string; html: string };
type EmailQueueSchemaMode = 'legacy' | 'delivery';

let emailQueueSchemaModePromise: Promise<EmailQueueSchemaMode> | null = null;

async function getEmailQueueSchemaMode(): Promise<EmailQueueSchemaMode> {
  if (!emailQueueSchemaModePromise) {
    const detectionPromise = (async () => {
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
    })();

    emailQueueSchemaModePromise = detectionPromise;

    return detectionPromise.catch((error) => {
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

export async function queueEmail(
  recipientEmail: string,
  templateType: string,
  data: any,
  recipientUserId?: string
): Promise<void> {
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
}

export async function getPendingEmails(limit: number = 50): Promise<any[]> {
  const schemaMode = await getEmailQueueSchemaMode();
  return schemaMode === 'delivery'
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
}

export async function markEmailSent(emailId: string): Promise<void> {
  await query(
    'UPDATE email_queue SET status = $1, sent_at = NOW(), updated_at = NOW() WHERE id = $2',
    ['sent', emailId]
  );
}

export async function markEmailFailed(emailId: string, errorMessage: string): Promise<void> {
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
    return;
  }

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

export async function sendEmailViaService(email: any): Promise<boolean> {
  try {
    const queuedEmail = email as Record<string, any>;
    if (!queuedEmail.recipient_email || typeof queuedEmail.recipient_email !== 'string') {
      await markEmailFailed(String(queuedEmail.id), 'Queued email is missing recipient_email');
      return false;
    }

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

  const { to, subject, html } = payload;
  const integrationSettings = await getRuntimeIntegrationSettings();
  const RESEND_API_KEY = integrationSettings.resendApiKey;
  const FROM_EMAIL = process.env.MAIL_FROM || process.env.FROM_EMAIL || 'noreply@sanliurfa.com';

  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured, email not sent', { to, subject });
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
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
