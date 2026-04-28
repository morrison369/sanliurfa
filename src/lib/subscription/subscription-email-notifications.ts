/**
 * Subscription Email Notifications
 *
 * Thin wrapper around `lib/email`'s sendEmail({ to, subject, html }) signature.
 * Each function emits one transactional email for a subscription lifecycle event
 * and returns a plain `boolean` (true = sent) so callers can branch easily.
 *
 * Function signatures match what `subscription-email-integration.ts` calls — do
 * not change positional args without updating both sides.
 */

import { sendEmail } from '../email';
import { logger } from '../logger';

function template(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:24px auto;color:#1f2937">
  <h1 style="color:#dc2626">${title}</h1>
  <div>${body}</div>
  <hr style="margin:32px 0;border:0;border-top:1px solid #e5e7eb"/>
  <p style="color:#6b7280;font-size:13px">— Şanlıurfa.com</p>
</body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const result = await sendEmail({ to, subject, html });
  return result.success;
}

export async function sendSubscriptionCreatedEmail(
  userId: string,
  email: string,
  fullName: string,
  tierName: string,
  tierDisplayName: string,
  price: number,
  billingCycle: string,
): Promise<boolean> {
  logger.info('Subscription email: created', { userId, tierName });
  return send(
    email,
    `${tierDisplayName} aboneliğiniz aktif`,
    template(
      'Aboneliğiniz aktif',
      `<p>Merhaba ${fullName}, <strong>${tierDisplayName}</strong> planına başarıyla abone oldunuz (${price} TL / ${billingCycle}).</p>`,
    ),
  );
}

export async function sendPlanUpgradeEmail(
  userId: string,
  email: string,
  fullName: string,
  oldTierDisplayName: string,
  newTierDisplayName: string,
  additionalCost: number,
): Promise<boolean> {
  logger.info('Subscription email: upgrade', { userId, from: oldTierDisplayName, to: newTierDisplayName });
  return send(
    email,
    'Planınız yükseltildi',
    template(
      'Plan Yükseltildi',
      `<p>Merhaba ${fullName}, planınız <strong>${oldTierDisplayName}</strong> → <strong>${newTierDisplayName}</strong> olarak yükseltildi. Ek tutar: ${additionalCost} TL.</p>`,
    ),
  );
}

export async function sendPlanDowngradeEmail(
  userId: string,
  email: string,
  fullName: string,
  oldTierDisplayName: string,
  newTierDisplayName: string,
  creditAmount: number,
): Promise<boolean> {
  logger.info('Subscription email: downgrade', { userId, from: oldTierDisplayName, to: newTierDisplayName });
  return send(
    email,
    'Planınız değiştirildi',
    template(
      'Plan Değişti',
      `<p>Merhaba ${fullName}, planınız <strong>${oldTierDisplayName}</strong> → <strong>${newTierDisplayName}</strong> olarak değiştirildi. Hesabınıza ${creditAmount} TL kredi tanımlandı.</p>`,
    ),
  );
}

export async function sendSubscriptionCancelledEmail(
  userId: string,
  email: string,
  fullName: string,
  tierDisplayName: string,
  cancelledAt: Date,
  accessUntilDate: Date,
): Promise<boolean> {
  logger.info('Subscription email: cancelled', { userId, tier: tierDisplayName });
  return send(
    email,
    'Aboneliğiniz iptal edildi',
    template(
      'Abonelik İptal',
      `<p>Merhaba ${fullName}, <strong>${tierDisplayName}</strong> aboneliğiniz ${cancelledAt.toLocaleDateString('tr-TR')} tarihinde iptal edildi. ${accessUntilDate.toLocaleDateString('tr-TR')} tarihine kadar erişiminiz devam edecek.</p>`,
    ),
  );
}

export async function sendPaymentSuccessEmail(
  userId: string,
  email: string,
  fullName: string,
  amount: number,
  tierDisplayName: string,
  nextBillingDate: Date,
): Promise<boolean> {
  logger.info('Subscription email: payment-success', { userId, amount });
  return send(
    email,
    'Ödeme alındı',
    template(
      'Ödeme Başarılı',
      `<p>Merhaba ${fullName}, <strong>${tierDisplayName}</strong> aboneliğiniz için ${amount} TL ödemeniz alındı. Bir sonraki ödeme: ${nextBillingDate.toLocaleDateString('tr-TR')}.</p>`,
    ),
  );
}

export async function sendPaymentFailedEmail(
  userId: string,
  email: string,
  fullName: string,
  amount: number,
  tierDisplayName: string,
  retryDate: Date,
): Promise<boolean> {
  logger.info('Subscription email: payment-failed', { userId, amount });
  return send(
    email,
    'Ödeme alınamadı',
    template(
      'Ödeme Alınamadı',
      `<p>Merhaba ${fullName}, <strong>${tierDisplayName}</strong> aboneliğiniz için ${amount} TL tutarındaki ödemeniz alınamadı. Tekrar deneme tarihi: ${retryDate.toLocaleDateString('tr-TR')}. Lütfen ödeme yönteminizi kontrol edin.</p>`,
    ),
  );
}

export async function sendSubscriptionRenewalEmail(
  userId: string,
  email: string,
  fullName: string,
  tierDisplayName: string,
  amount: number,
  renewalDate: Date,
): Promise<boolean> {
  logger.info('Subscription email: renewal', { userId, amount });
  return send(
    email,
    'Aboneliğiniz yenilendi',
    template(
      'Yenileme Başarılı',
      `<p>Merhaba ${fullName}, <strong>${tierDisplayName}</strong> aboneliğiniz ${renewalDate.toLocaleDateString('tr-TR')} tarihinde ${amount} TL ile yenilendi. Teşekkür ederiz.</p>`,
    ),
  );
}
