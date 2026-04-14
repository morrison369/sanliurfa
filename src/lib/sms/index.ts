/**
 * SMS Notifications
 * Turkish SMS providers (Netgsm, Twilio alternatives)
 */

import { query } from '../postgres';

export interface SMSMessage {
  to: string;
  message: string;
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'mock'; // 'netgsm', 'iletisimmakinesi', 'mock'
const SMS_USERNAME = process.env.SMS_USERNAME || '';
const SMS_PASSWORD = process.env.SMS_PASSWORD || '';
const SMS_HEADER = process.env.SMS_HEADER || 'SANLIURFA';

/**
 * Send SMS via Netgsm
 * Turkish SMS provider
 */
async function sendNetgsm(message: SMSMessage): Promise<SMSResult> {
  try {
    const url = 'https://api.netgsm.com.tr/sms/send/get';
    const params = new URLSearchParams({
      usercode: SMS_USERNAME,
      password: SMS_PASSWORD,
      msgheader: SMS_HEADER,
      gsmno: formatPhoneNumber(message.to),
      message: message.message,
    });

    const response = await fetch(`${url}?${params}`);
    const result = await response.text();

    // Netgsm returns numeric codes
    // 00 = success, 20 = wrong params, 30 = auth failed, etc.
    if (result.startsWith('00')) {
      return { success: true, messageId: result.split(' ')[1] };
    } else {
      return { success: false, error: getNetgsmError(result) };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send SMS via İletişim Makinesi
 */
async function sendIletisimMakinesi(message: SMSMessage): Promise<SMSResult> {
  try {
    const url = 'https://api.iletisimmakinesi.com/api/sms/send';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: SMS_USERNAME,
        password: SMS_PASSWORD,
        header: SMS_HEADER,
        phone: formatPhoneNumber(message.to),
        message: message.message,
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      return { success: true, messageId: result.id };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Mock SMS sender (for testing)
 */
async function sendMock(message: SMSMessage): Promise<SMSResult> {
  console.log(`[MOCK SMS] To: ${message.to}, Message: ${message.message}`);
  
  // Save to database for testing
  await query(
    `INSERT INTO sms_logs (phone, message, status, provider, sent_at)
     VALUES ($1, $2, 'sent', 'mock', NOW())`,
    [message.to, message.message]
  );
  
  return { success: true, messageId: `mock_${Date.now()}` };
}

/**
 * Main send function
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  // Validate phone number
  const formattedPhone = formatPhoneNumber(message.to);
  if (!isValidPhoneNumber(formattedPhone)) {
    return { success: false, error: 'Invalid phone number' };
  }

  // Truncate message if too long (Turkish SMS limit: 160 chars for ASCII, 70 for Turkish chars)
  const finalMessage = message.message.length > 160 
    ? message.message.substring(0, 157) + '...' 
    : message.message;

  const sms: SMSMessage = { ...message, to: formattedPhone, message: finalMessage };

  // Route to provider
  switch (SMS_PROVIDER) {
    case 'netgsm':
      return sendNetgsm(sms);
    case 'iletisimmakinesi':
      return sendIletisimMakinesi(sms);
    case 'mock':
    default:
      return sendMock(sms);
  }
}

/**
 * Send SMS to multiple recipients
 */
export async function sendBulkSMS(
  messages: SMSMessage[],
  delayMs: number = 100
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const message of messages) {
    const result = await sendSMS(message);
    results.push(result);
    
    if (result.success) sent++;
    else failed++;

    // Rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, results };
}

/**
 * Format phone number to Turkish format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present
  if (!cleaned.startsWith('90')) {
    cleaned = '90' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate Turkish phone number
 */
function isValidPhoneNumber(phone: string): boolean {
  // Turkish mobile numbers: 905XXXXXXXXX (10 digits after 90)
  return /^90[5-9]\d{9}$/.test(phone);
}

/**
 * Netgsm error codes
 */
function getNetgsmError(code: string): string {
  const errors: Record<string, string> = {
    '20': 'Wrong parameters',
    '30': 'Authentication failed',
    '40': 'Insufficient balance',
    '50': 'Invalid header',
    '60': 'System error',
    '70': 'Invalid phone number',
  };
  return errors[code.substring(0, 2)] || `Unknown error: ${code}`;
}

// SMS Templates
export const smsTemplates = {
  verification: (code: string) => 
    `Şanlıurfa doğrulama kodunuz: ${code}. Bu kodu kimseyle paylaşmayın.`,
  
  passwordReset: (code: string) => 
    `Şifre sıfırlama kodunuz: ${code}. Bu kod 15 dakika geçerlidir.`,
  
  welcome: (name: string) => 
    `Hoş geldiniz ${name}! Şanlıurfa'yı keşfetmeye başlayın: https://sanliurfa.com`,
  
  placeApproved: (placeName: string) => 
    `${placeName} mekanınız yayına alındı!`,
  
  newMessage: (senderName: string) => 
    `${senderName} size yeni bir mesaj gönderdi.`,
  
  appointmentReminder: (placeName: string, date: string) => 
    `Hatırlatma: ${placeName} için ${date} tarihinde randevunuz var.`,
  
  promotional: (message: string) => 
    `${message} - Şanlıurfa`,
};

/**
 * Send verification code
 */
export async function sendVerificationCode(
  phone: string,
  code: string
): Promise<SMSResult> {
  return sendSMS({
    to: phone,
    message: smsTemplates.verification(code),
  });
}

/**
 * Send password reset code
 */
export async function sendPasswordResetCode(
  phone: string,
  code: string
): Promise<SMSResult> {
  return sendSMS({
    to: phone,
    message: smsTemplates.passwordReset(code),
  });
}

/**
 * Save phone number to user profile
 */
export async function saveUserPhone(
  userId: string,
  phone: string,
  verified: boolean = false
): Promise<void> {
  await query(
    `UPDATE users SET phone = $1, phone_verified = $2, updated_at = NOW() WHERE id = $3`,
    [formatPhoneNumber(phone), verified, userId]
  );
}

/**
 * Verify phone number with code
 */
export async function verifyPhoneCode(
  userId: string,
  code: string
): Promise<boolean> {
  // In production, check against stored verification code
  const result = await query(
    `SELECT * FROM phone_verifications 
    WHERE user_id = $1 AND code = $2 AND expires_at > NOW() AND used = false`,
    [userId, code]
  );

  if (result.rows.length === 0) {
    return false;
  }

  // Mark as used
  await query(
    `UPDATE phone_verifications SET used = true WHERE id = $1`,
    [result.rows[0].id]
  );

  // Mark user phone as verified
  await query(
    `UPDATE users SET phone_verified = true WHERE id = $1`,
    [userId]
  );

  return true;
}

/**
 * Get SMS usage stats
 */
export async function getSMSStats(
  startDate: Date,
  endDate: Date
): Promise<{ sent: number; failed: number; byProvider: Record<string, number> }> {
  const result = await query(
    `SELECT status, provider, COUNT(*) as count
    FROM sms_logs
    WHERE sent_at >= $1 AND sent_at <= $2
    GROUP BY status, provider`,
    [startDate, endDate]
  );

  let sent = 0;
  let failed = 0;
  const byProvider: Record<string, number> = {};

  result.rows.forEach(row => {
    if (row.status === 'sent') sent += parseInt(row.count);
    else failed += parseInt(row.count);
    
    byProvider[row.provider] = (byProvider[row.provider] || 0) + parseInt(row.count);
  });

  return { sent, failed, byProvider };
}
