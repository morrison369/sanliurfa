import { queryOne, insert } from './postgres';
import { logger } from './logging';
import { getCache, setCache } from './cache';
import type { EmailTemplate } from './subscription-email-notifications.types';
import { getRuntimeIntegrationSettings } from './runtime-integration-settings';

const FROM_EMAIL = 'noreply@sanliurfa.com';

export async function getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
  try {
    const cacheKey = `sanliurfa:email:template:${templateName}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        logger.warn('Email template cache parse failed, falling back to database', {
          templateName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const template = await queryOne(
      'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
      [templateName]
    );

    if (!template) {
      logger.warn(`Email template bulunamadı: ${templateName}`);
      return null;
    }

    await setCache(cacheKey, JSON.stringify(template), 3600);
    return template as EmailTemplate;
  } catch (error) {
    logger.error('Email template yükleme hatası', error instanceof Error ? error : new Error(String(error)), { templateName });
    return null;
  }
}

export async function queueSubscriptionEmail(
  userId: string,
  toEmail: string,
  templateName: string,
  variables: Record<string, any>,
  priority: number = 5,
  scheduledAt?: Date
): Promise<boolean> {
  try {
    const result = await insert('email_queue', {
      user_id: userId,
      to_email: toEmail,
      template_name: templateName,
      template_variables: variables,
      priority,
      scheduled_at: scheduledAt,
      status: 'pending'
    });

    logger.info('Email kuyruğa eklendi', {
      userId,
      toEmail,
      templateName,
      queueId: result.id
    });

    return true;
  } catch (error) {
    logger.error('Email kuyruk hatası', error instanceof Error ? error : new Error(String(error)), {
      userId,
      templateName
    });
    return false;
  }
}

function interpolateTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  });
  return result;
}

export async function sendSubscriptionEmail(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const integrationSettings = await getRuntimeIntegrationSettings();
  const resendApiKey = integrationSettings.resendApiKey;

  if (!resendApiKey) {
    logger.warn('RESEND_API_KEY tanımlanmamış, email gönderilemedi', { toEmail });
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent
      })
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('Email gönderilemedi', new Error(JSON.stringify(error)), { toEmail });
      return { success: false, error: JSON.stringify(error) };
    }

    const data = await response.json();
    logger.info('Email başarıyla gönderildi', { toEmail, messageId: data.id });
    return { success: true, messageId: data.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Email gönderimi başarısız', error instanceof Error ? error : new Error(errorMsg), { toEmail });
    return { success: false, error: errorMsg };
  }
}

export async function sendEmailWithTemplate(
  userId: string,
  toEmail: string,
  templateName: string,
  variables: Record<string, any>
): Promise<boolean> {
  try {
    const template = await getEmailTemplate(templateName);
    if (!template) {
      return false;
    }

    const subject = interpolateTemplate(template.subject, variables);
    const htmlBody = interpolateTemplate(template.html_body, variables);
    const textBody = template.text_body ? interpolateTemplate(template.text_body, variables) : undefined;
    const result = await sendSubscriptionEmail(toEmail, subject, htmlBody, textBody);

    await insert('email_sent_logs', {
      user_id: userId,
      to_email: toEmail,
      template_name: templateName,
      subject,
      status: result.success ? 'sent' : 'failed',
      error_message: result.success ? undefined : result.error,
      metadata: variables
    });

    return result.success;
  } catch (error) {
    logger.error('Template email gönderimi başarısız', error instanceof Error ? error : new Error(String(error)), {
      userId,
      templateName
    });
    return false;
  }
}
