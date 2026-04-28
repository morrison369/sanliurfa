import { logger } from './logging';

interface SMSOptions {
  to: string;
  message: string;
}

interface SMSResult {
  success: boolean;
  error?: string;
}

export async function sendSMS({ to, message }: SMSOptions): Promise<SMSResult> {
  try {
    // SMS gönderimi — entegrasyon kurulmadığında log'a düşür
    logger.info('SMS (stub):', { to: to.slice(0, 6) + '***', length: message.length });
    return { success: true };
  } catch (error) {
    logger.error('SMS send failed', error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: String(error) };
  }
}
