/**
 * Email Provider - SMTP Only
 * Free SMTP providers: Gmail, Outlook, Yandex, Mail.ru
 */

import type { EmailData } from './index';
import { logger } from '../logging';

export interface EmailProvider {
  name: string;
  send(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }>;
  validateConfig(): boolean;
}

// SMTP Configuration
interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// SMTP Provider (Nodemailer wrapper)
export class SMTPProvider implements EmailProvider {
  name = 'smtp';
  private config: SMTPConfig;

  constructor(config: SMTPConfig) {
    this.config = config;
  }

  validateConfig(): boolean {
    return !!(
      this.config.host &&
      this.config.port &&
      this.config.auth.user &&
      this.config.auth.pass
    );
  }

  async send(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Dynamic import nodemailer
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        tls: {
          rejectUnauthorized: false, // For free SMTP providers
        },
      });

      const result = await transporter.sendMail({
        from: data.from || this.config.auth.user,
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
      });

      return { 
        success: true, 
        messageId: result.messageId 
      };
    } catch (error) {
      logger.error('SMTP send error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SMTP error' 
      };
    }
  }
}

// Free SMTP Provider Presets
export const SMTP_PRESETS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },
  outlook: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
  },
  yandex: {
    host: 'smtp.yandex.com',
    port: 465,
    secure: true,
  },
  mailru: {
    host: 'smtp.mail.ru',
    port: 465,
    secure: true,
  },
  zoho: {
    host: 'smtp.zoho.com',
    port: 587,
    secure: false,
  },
};

// Mock Provider (for development/testing)
export class MockProvider implements EmailProvider {
  name = 'mock';

  validateConfig(): boolean {
    return true;
  }

  async send(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    logger.info('📧 [MOCK EMAIL]', {
      to: data.to,
      subject: data.subject,
      text: data.text?.slice(0, 100) + '...',
    });
    return { 
      success: true, 
      messageId: `mock-${Date.now()}` 
    };
  }
}

// Email Provider Factory
export function createEmailProvider(): EmailProvider {
  // Use SMTP if configured
  if (process.env.SMTP_HOST) {
    const preset = SMTP_PRESETS[process.env.SMTP_HOST as keyof typeof SMTP_PRESETS];
    
    const config: SMTPConfig = {
      host: preset?.host || process.env.SMTP_HOST,
      port: preset?.port || parseInt(process.env.SMTP_PORT || '587'),
      secure: preset?.secure || process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    const provider = new SMTPProvider(config);
    if (provider.validateConfig()) {
      return provider;
    }
  }

  // Fallback to mock (logs to console)
  return new MockProvider();
}
