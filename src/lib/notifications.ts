/**
 * Notifications Sistemi - Email ve Slack entegrasyonu
 */

import { logger } from './logging';
import type { Alert } from './alerts';

export interface NotificationConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  emailFromAddress?: string;
  adminEmails?: string[];
  slackChannel?: string;
}

class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig = {}) {
    this.config = {
      emailEnabled: process.env.EMAIL_ENABLED === 'true',
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailFromAddress: process.env.EMAIL_FROM || 'noreply@sanliurfa.com',
      adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
      slackChannel: process.env.SLACK_CHANNEL || '#alerts',
      ...config
    };
  }

  /**
   * Alert'i Slack'e gonder
   */
  async sendSlackAlert(alert: Alert): Promise<boolean> {
    if (!this.config.slackEnabled || !this.config.slackWebhookUrl) {
      return false;
    }

    try {
      const color = this.getSeverityColor(alert.severity || 'info');
      const message = {
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            fields: [
              {
                title: 'Severity',
                value: alert.severity || 'unknown',
                short: true
              },
              {
                title: 'Type',
                value: alert.type || 'unknown',
                short: true
              },
              ...(alert.details
                ? [
                    {
                      title: 'Details',
                      value: JSON.stringify(alert.details, null, 2),
                      short: false
                    }
                  ]
                : [])
            ],
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        logger.warn('Slack alert gonderimi basarisiz', {
          status: response.status,
          alert: alert.title
        });
        return false;
      }

      logger.debug('Slack alert gonderildi', { alert: alert.title });
      return true;
    } catch (error) {
      logger.error('Slack alert gonderirken hata', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Alert'i Email'e gonder
   */
  async sendEmailAlert(alert: Alert, recipients: string[]): Promise<boolean> {
    if (!this.config.emailEnabled) {
      return false;
    }

    if (recipients.length === 0) {
      recipients = this.config.adminEmails || [];
    }

    if (recipients.length === 0) {
      logger.warn('Email gondermek icin alici yok');
      return false;
    }

    try {
      const emailBody = `
Alert: ${alert.title}

Ciddiyet: ${alert.severity}
Tür: ${alert.type}
Zaman: ${alert.triggeredAt?.toISOString() || new Date().toISOString()}

Mesaj:
${alert.message}

${alert.details ? `Detaylar:\n${JSON.stringify(alert.details, null, 2)}` : ''}

---
Sanliurfa.com Admin System
      `.trim();

      // TODO: Resend, SendGrid, veya başka email servisi entegrasyonu
      logger.info('Email alert gondermek istendi', {
        title: alert.title,
        recipients: recipients.length,
        severity: alert.severity
      });

      // Şimdilik mock gonderim
      logger.debug('Email body', { body: emailBody });

      return true;
    } catch (error) {
      logger.error('Email alert gonderirken hata', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Webhook event'i gonder
   */
  async sendWebhookNotification(event: string, data: Record<string, any>): Promise<boolean> {
    try {
      const webhookUrl = process.env.WEBHOOK_URL;
      if (!webhookUrl) {
        return false;
      }

      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      logger.error('Webhook notification gonderirken hata', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Ciddiyet rengini al (Slack için)
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FF0000'; // Kirmizi
      case 'warning':
        return '#FFA500'; // Turuncu
      case 'info':
        return '#0099FF'; // Mavi
      default:
        return '#999999'; // Gri
    }
  }

  /**
   * Alert'i tüm kanallara gonder
   */
  async notifyAlert(alert: Alert, options?: { emailRecipients?: string[]; skipSlack?: boolean; skipEmail?: boolean }): Promise<void> {
    try {
      // Slack'e gonder
      if (!options?.skipSlack) {
        await this.sendSlackAlert(alert);
      }

      // Email'e gonder
      if (!options?.skipEmail) {
        await this.sendEmailAlert(alert, options?.emailRecipients || []);
      }

      logger.info('Alert gonderim tamamlandi', {
        title: alert.title,
        channels: ['slack', 'email']
      });
    } catch (error) {
      logger.error('Alert gonderirken hata', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Notification config'ini guncelle
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Notification config guncellendi');
  }

  /**
   * Config'i al
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }
}

// Global instance
export const notificationService = new NotificationService();

/**
 * Notification service'i initialize et
 */
export function initializeNotifications(): void {
  const config = notificationService.getConfig();
  logger.info('Notification service initialized', {
    slackEnabled: config.slackEnabled,
    emailEnabled: config.emailEnabled
  });
}
