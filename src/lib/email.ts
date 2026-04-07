/**
 * Email Service
 * Transactional email sending
 */

import { logger } from './logging';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sanliurfa.com';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send transactional email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping email');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo
      })
    });

    if (!response.ok) {
      logger.warn('Email send failed', { to: options.to, status: response.status });
      return false;
    }

    logger.info('Email sent', { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    logger.error('Email send error', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Welcome email template
 */
export function getWelcomeEmailHTML(name: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Şanlıurfa'ya Hoşgeldin, ${name}! 🎉</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p>Şanlıurfa.com'a kaydolduğun için teşekkür ederiz!</p>
          <p>Artık Şanlıurfa'nın en güzel yerlerini keşfedebilir, yorumlar yazabilir ve favorilerini kaydedebilirsin.</p>
          <p><a href="https://sanliurfa.com/arama" class="button">Yerleri Keşfet</a></p>
          <div class="footer">
            <p>Bu e-postayı almak istemiyorsan ayarlarından bildirimleri kapatabilirsin.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Password reset email template
 */
export function getPasswordResetEmailHTML(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
        .warning { background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Şifreni Sıfırla</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p>Şifreni sıfırlamak için aşağıdaki butona tıkla:</p>
          <p><a href="${resetLink}" class="button">Şifremi Sıfırla</a></p>
          <div class="warning">
            <p><strong>Uyarı:</strong> Bu bağlantı 24 saat geçerlidir.</p>
          </div>
          <p>Eğer bu isteği sen yapmadıysan, bu e-postayı görmezden gel.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Review notification email template
 */
export function getReviewNotificationEmailHTML(name: string, placeName: string, reviewerName: string, reviewText: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .review-box { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${placeName}'ye Yeni Yorum ⭐</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p><strong>${reviewerName}</strong> ${placeName} hakkındaki yorumuna yanıt yazdı:</p>
          <div class="review-box">
            <p>"${reviewText}"</p>
          </div>
          <p><a href="https://sanliurfa.com/yerler/${placeName}" class="button">Yorumları Gör</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Subscription confirmation email template
 */
export function getSubscriptionEmailHTML(name: string, tier: string, price: number): string {
  const tierName = tier === 'premium' ? 'Premium' : 'Pro';
  const monthlyPrice = tier === 'premium' ? '2.99' : '5.99';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8b5cf6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .features { background: white; border-left: 4px solid #8b5cf6; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tierName} Üyeliğine Hoşgeldin! 🎉</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p>${tierName} üyeliğine başarıyla katıldın! Aylık $${monthlyPrice} ücretiyle.</p>
          <div class="features">
            <h3>Özel Özellikler:</h3>
            <ul>
              <li>Sınırsız yorum yazma</li>
              <li>Premium filtreleme seçenekleri</li>
              <li>Ad-free deneyim</li>
              <li>Özel içeriğe erişim</li>
            </ul>
          </div>
          <p><a href="https://sanliurfa.com/dashboard" class="button">Dashboard'a Git</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Review response notification email template
 */
export function getReviewResponseEmailHTML(name: string, placeName: string, responseText: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .response-box { background: white; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yorumuna Yanıt Geldi 💬</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p>${placeName} hakkında yazdığın yoruma işletme sahibi tarafından yanıt verildi:</p>
          <div class="response-box">
            <p>"${responseText}"</p>
          </div>
          <p><a href="https://sanliurfa.com/profile" class="button">Yorumlarımı Gör</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Email verification template
 */
export function getEmailVerificationHTML(name: string, verifyLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>E-posta Adresini Doğrula</h1>
        </div>
        <div class="content">
          <p>Merhaba ${name},</p>
          <p>E-posta adresini doğrulamak için aşağıdaki butona tıkla:</p>
          <p><a href="${verifyLink}" class="button">E-postayı Doğrula</a></p>
          <p>Bu bağlantı 24 saat geçerlidir.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
