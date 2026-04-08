/**
 * Subscription Email Notifications
 * Abonelik olayları için email bildirimleri
 * email_templates ve email_queue tablolarını kullanır
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { createNotification } from './notifications-queue';
import { getCache, setCache, deleteCache } from './cache';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'noreply@sanliurfa.com';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables?: Record<string, any>;
  category?: string;
  is_active: boolean;
}

export interface EmailQueueItem {
  id: string;
  user_id: string;
  to_email: string;
  template_name: string;
  template_variables: Record<string, any>;
  priority: number;
  status: 'pending' | 'sent' | 'failed';
  scheduled_at?: Date;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: Date;
}

/**
 * Email template'ini veritabanından yükle ve cache'le
 */
export async function getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
  try {
    // Cache'ten kontrol et
    const cacheKey = `sanliurfa:email:template:${templateName}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Veritabanından yükle
    const template = await queryOne(
      'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
      [templateName]
    );

    if (!template) {
      logger.warn(`Email template bulunamadı: ${templateName}`);
      return null;
    }

    // Cache'e kaydet (1 saat TTL)
    await setCache(cacheKey, JSON.stringify(template), 3600);

    return template as EmailTemplate;
  } catch (error) {
    logger.error('Email template yükleme hatası', error instanceof Error ? error : new Error(String(error)), {
      templateName
    });
    return null;
  }
}

/**
 * Email template'indeki değişkenleri replace et
 */
function interpolateTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value));
  });
  return result;
}

/**
 * Email kuyruğuna ekle (asynchronous sending için)
 */
export async function queueEmail(
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

/**
 * Email gönder (Resend API'ye)
 */
export async function sendEmail(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY tanımlanmamış, email gönderilemedi', { toEmail });
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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
    logger.error('Email gönderimi başarısız', error instanceof Error ? error : new Error(errorMsg), {
      toEmail
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Template kullanarak email gönder
 */
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

    // Template'i interpolate et
    const subject = interpolateTemplate(template.subject, variables);
    const htmlBody = interpolateTemplate(template.html_body, variables);
    const textBody = template.text_body ? interpolateTemplate(template.text_body, variables) : undefined;

    // Gönder
    const result = await sendEmail(toEmail, subject, htmlBody, textBody);

    if (result.success) {
      // Gönderilen log'a kaydet
      await insert('email_sent_logs', {
        user_id: userId,
        to_email: toEmail,
        template_name: templateName,
        subject,
        status: 'sent',
        metadata: variables
      });

      return true;
    } else {
      // Hata log'a kaydet
      await insert('email_sent_logs', {
        user_id: userId,
        to_email: toEmail,
        template_name: templateName,
        subject,
        status: 'failed',
        error_message: result.error,
        metadata: variables
      });

      return false;
    }
  } catch (error) {
    logger.error('Template email gönderimi başarısız', error instanceof Error ? error : new Error(String(error)), {
      userId,
      templateName
    });
    return false;
  }
}

/**
 * Subscription created email'i gönder
 */
export async function sendSubscriptionCreatedEmail(
  userId: string,
  userEmail: string,
  userName: string,
  tierName: string,
  tierDisplayName: string,
  price: number,
  billingPeriod: string
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'subscription_created', {
    userName,
    tierName: tierDisplayName,
    price,
    billingPeriod,
    renewalDate: new Date(Date.now() + (billingPeriod === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('tr-TR')
  });
}

/**
 * Payment successful email'i gönder
 */
export async function sendPaymentSuccessEmail(
  userId: string,
  userEmail: string,
  userName: string,
  amount: number,
  tierName: string,
  nextBillingDate: Date
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'payment_successful', {
    userName,
    amount,
    tierName,
    nextBillingDate: nextBillingDate.toLocaleDateString('tr-TR'),
    transactionDate: new Date().toLocaleDateString('tr-TR')
  });
}

/**
 * Payment failed email'i gönder
 */
export async function sendPaymentFailedEmail(
  userId: string,
  userEmail: string,
  userName: string,
  amount: number,
  tierName: string,
  retryDate: Date
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'payment_failed', {
    userName,
    amount,
    tierName,
    retryDate: retryDate.toLocaleDateString('tr-TR'),
    supportUrl: 'https://sanliurfa.com/support'
  });
}

/**
 * Subscription renewal email'i gönder
 */
export async function sendSubscriptionRenewalEmail(
  userId: string,
  userEmail: string,
  userName: string,
  tierName: string,
  amount: number,
  renewalDate: Date
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'subscription_renewed', {
    userName,
    tierName,
    amount,
    renewalDate: renewalDate.toLocaleDateString('tr-TR'),
    currentDate: new Date().toLocaleDateString('tr-TR')
  });
}

/**
 * Plan upgrade email'i gönder
 */
export async function sendPlanUpgradeEmail(
  userId: string,
  userEmail: string,
  userName: string,
  oldTierName: string,
  newTierName: string,
  additionalCost: number
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'plan_upgrade', {
    userName,
    oldTierName,
    newTierName,
    additionalCost,
    upgradeDate: new Date().toLocaleDateString('tr-TR')
  });
}

/**
 * Plan downgrade email'i gönder
 */
export async function sendPlanDowngradeEmail(
  userId: string,
  userEmail: string,
  userName: string,
  oldTierName: string,
  newTierName: string,
  creditAmount: number
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'plan_downgrade', {
    userName,
    oldTierName,
    newTierName,
    creditAmount,
    downgradeDate: new Date().toLocaleDateString('tr-TR')
  });
}

/**
 * Subscription cancelled email'i gönder
 */
export async function sendSubscriptionCancelledEmail(
  userId: string,
  userEmail: string,
  userName: string,
  tierName: string,
  cancelDate: Date,
  accessUntilDate: Date
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'subscription_cancelled', {
    userName,
    tierName,
    cancelDate: cancelDate.toLocaleDateString('tr-TR'),
    accessUntilDate: accessUntilDate.toLocaleDateString('tr-TR'),
    reactivateUrl: 'https://sanliurfa.com/abonelik'
  });
}

/**
 * Refund processed email'i gönder
 */
export async function sendRefundProcessedEmail(
  userId: string,
  userEmail: string,
  userName: string,
  refundAmount: number,
  reason: string,
  refundDate: Date
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'refund_processed', {
    userName,
    refundAmount,
    reason,
    refundDate: refundDate.toLocaleDateString('tr-TR'),
    estimatedArrivalDays: 3
  });
}

/**
 * Quota warning email'i gönder
 */
export async function sendQuotaWarningEmail(
  userId: string,
  userEmail: string,
  userName: string,
  featureName: string,
  usagePercent: number,
  limit: number,
  current: number
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'quota_warning', {
    userName,
    featureName,
    usagePercent,
    limit,
    current,
    upgradeUrl: 'https://sanliurfa.com/fiyatlandirma'
  });
}

/**
 * Billing issue email'i gönder
 */
export async function sendBillingIssueEmail(
  userId: string,
  userEmail: string,
  userName: string,
  issueType: string,
  description: string
): Promise<boolean> {
  return sendEmailWithTemplate(userId, userEmail, 'billing_issue', {
    userName,
    issueType,
    description,
    supportUrl: 'https://sanliurfa.com/support',
    contactEmail: 'support@sanliurfa.com'
  });
}

/**
 * Email preferences'i getir
 */
export async function getEmailPreferences(userId: string) {
  try {
    const preferences = await queryOne(
      'SELECT * FROM email_preferences WHERE user_id = $1',
      [userId]
    );
    return preferences || null;
  } catch (error) {
    logger.error('Email preferences yükleme hatası', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return null;
  }
}

/**
 * Email preferences'i güncelle
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: {
    marketing_emails?: boolean;
    billing_emails?: boolean;
    subscription_emails?: boolean;
    notification_emails?: boolean;
    digest_frequency?: string;
  }
): Promise<boolean> {
  try {
    await update('email_preferences', { user_id: userId }, preferences);
    logger.info('Email preferences güncellendi', { userId });
    return true;
  } catch (error) {
    logger.error('Email preferences güncelleme hatası', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return false;
  }
}

/**
 * Kullanıcıyı unsubscribe et
 */
export async function unsubscribeUser(userId: string): Promise<boolean> {
  try {
    await update('email_preferences', { user_id: userId }, {
      marketing_emails: false,
      unsubscribed_at: new Date()
    });
    logger.info('Kullanıcı unsubscribe edildi', { userId });
    return true;
  } catch (error) {
    logger.error('Unsubscribe hatası', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return false;
  }
}

/**
 * Email gönderimi loglarını getir
 */
export async function getEmailLogs(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    const logs = await queryMany(
      'SELECT * FROM email_sent_logs WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return logs;
  } catch (error) {
    logger.error('Email logs yükleme hatası', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    return [];
  }
}

/**
 * Default email template'lerini oluştur
 */
export async function initializeDefaultEmailTemplates(): Promise<void> {
  try {
    const templates = [
      {
        name: 'subscription_created',
        subject: '✨ {{userName}}, {{tierName}} planınıza hoş geldiniz',
        html_body: `
          <h2>Hoş geldiniz, {{userName}}!</h2>
          <p>{{tierName}} paketine başarıyla abone oldum.</p>
          <p><strong>Ödeme Dönemi:</strong> {{billingPeriod}}</p>
          <p><strong>Fiyat:</strong> ₺{{price}}</p>
          <p><strong>Yenileme Tarihi:</strong> {{renewalDate}}</p>
          <p>Tüm premium özelliklere erişim sağlayabilirsiniz.</p>
          <p><a href="https://sanliurfa.com/abonelik" style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Abonelikmi Yönet</a></p>
        `,
        category: 'subscription'
      },
      {
        name: 'payment_successful',
        subject: '💳 Ödemeniz başarılı oldu - {{tierName}}',
        html_body: `
          <h2>Merhaba {{userName}}</h2>
          <p>Abonelik ödemeniz başarıyla işlendi.</p>
          <p><strong>Tutar:</strong> ₺{{amount}}</p>
          <p><strong>Plan:</strong> {{tierName}}</p>
          <p><strong>Işlem Tarihi:</strong> {{transactionDate}}</p>
          <p><strong>Sonraki Ödeme:</strong> {{nextBillingDate}}</p>
          <p>Hizmetlerimizi kullanmaya devam edebilirsiniz.</p>
        `,
        category: 'billing'
      },
      {
        name: 'payment_failed',
        subject: '⚠️ Ödeme başarısız - {{tierName}}',
        html_body: `
          <h2>Merhaba {{userName}}</h2>
          <p>Abonelik ödemeniz işlenemedi.</p>
          <p><strong>Tutar:</strong> ₺{{amount}}</p>
          <p><strong>Plan:</strong> {{tierName}}</p>
          <p>Lütfen ödeme yönteminizi güncelleyin veya destek ile iletişime geçin.</p>
          <p><strong>Yeniden Deneme Tarihi:</strong> {{retryDate}}</p>
          <p><a href="{{supportUrl}}" style="background-color: #ef4444; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Destek Al</a></p>
        `,
        category: 'billing'
      },
      {
        name: 'subscription_renewed',
        subject: '🔄 {{tierName}} aboneliğiniz yenilendi',
        html_body: `
          <h2>Merhaba {{userName}}</h2>
          <p>Aboneliğiniz başarıyla yenilendi.</p>
          <p><strong>Tutar:</strong> ₺{{amount}}</p>
          <p><strong>Plan:</strong> {{tierName}}</p>
          <p><strong>Yenileme Tarihi:</strong> {{renewalDate}}</p>
          <p>Hizmetlerimizi kullanmaya devam edebilirsiniz.</p>
        `,
        category: 'subscription'
      },
      {
        name: 'plan_upgrade',
        subject: '📈 {{userName}}, {{newTierName}} paketine yükseltildiniz!',
        html_body: `
          <h2>Planınız Yükseltildi!</h2>
          <p>Merhaba {{userName}},</p>
          <p>{{oldTierName}} paketinden {{newTierName}} paketine başarıyla geçiş yaptınız.</p>
          <p><strong>Ek Ücret:</strong> ₺{{additionalCost}}</p>
          <p><strong>Yükseltme Tarihi:</strong> {{upgradeDate}}</p>
          <p>Yeni özelliklere hemen erişebilirsiniz.</p>
        `,
        category: 'subscription'
      },
      {
        name: 'plan_downgrade',
        subject: '📉 {{userName}}, {{newTierName}} paketine indirgendi',
        html_body: `
          <h2>Plan İndirgeme</h2>
          <p>Merhaba {{userName}},</p>
          <p>{{oldTierName}} paketinden {{newTierName}} paketine indirgeme yapılmıştır.</p>
          <p><strong>Kredi Tutarı:</strong> ₺{{creditAmount}}</p>
          <p><strong>İndirge Tarihi:</strong> {{downgradeDate}}</p>
          <p>Kalan özelliklere erişim sağlayabilirsiniz.</p>
        `,
        category: 'subscription'
      },
      {
        name: 'subscription_cancelled',
        subject: '❌ {{tierName}} aboneliğiniz iptal edildi',
        html_body: `
          <h2>Abonelik İptal</h2>
          <p>Merhaba {{userName}},</p>
          <p>{{tierName}} aboneliğiniz başarıyla iptal edilmiştir.</p>
          <p><strong>İptal Tarihi:</strong> {{cancelDate}}</p>
          <p><strong>Erişim Sonu:</strong> {{accessUntilDate}}</p>
          <p>{{accessUntilDate}} tarihine kadar hizmetleri kullanabilecesiniz.</p>
          <p><a href="{{reactivateUrl}}" style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Aboneliği Yeniden Etkinleştir</a></p>
        `,
        category: 'subscription'
      },
      {
        name: 'refund_processed',
        subject: '💰 {{userName}}, para iadesi işlendi',
        html_body: `
          <h2>Para İadesi Onayı</h2>
          <p>Merhaba {{userName}},</p>
          <p>İade talebiniz işlenmiştir.</p>
          <p><strong>İade Tutarı:</strong> ₺{{refundAmount}}</p>
          <p><strong>Neden:</strong> {{reason}}</p>
          <p><strong>İşlem Tarihi:</strong> {{refundDate}}</p>
          <p>Para {{estimatedArrivalDays}} gün içinde hesabınıza yatacaktır.</p>
        `,
        category: 'billing'
      },
      {
        name: 'quota_warning',
        subject: '📊 {{userName}}, {{featureName}} kotanız %{{usagePercent}} dolu',
        html_body: `
          <h2>Kota Uyarısı</h2>
          <p>Merhaba {{userName}},</p>
          <p>{{featureName}} özelliğinin aylık kotanız dolmak üzere.</p>
          <p><strong>Kullanım:</strong> {{current}} / {{limit}}</p>
          <p><strong>Kullanım Yüzdesi:</strong> %{{usagePercent}}</p>
          <p>Daha fazla kota için planınızı yükseltin.</p>
          <p><a href="{{upgradeUrl}}" style="background-color: #f59e0b; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Planı Yükselt</a></p>
        `,
        category: 'notification'
      },
      {
        name: 'billing_issue',
        subject: '⚠️ {{userName}}, faturalama sorunu',
        html_body: `
          <h2>Faturalama Sorunu</h2>
          <p>Merhaba {{userName}},</p>
          <p>Hesabınızda bir faturalama sorunu tespit edilmiştir.</p>
          <p><strong>Sorun Türü:</strong> {{issueType}}</p>
          <p><strong>Açıklama:</strong> {{description}}</p>
          <p>Lütfen destek ekibimizle iletişime geçin.</p>
          <p>
            <a href="{{supportUrl}}" style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none;">Destek Sayfası</a>
            <br/>
            <strong>Email:</strong> <a href="mailto:{{contactEmail}}">{{contactEmail}}</a>
          </p>
        `,
        category: 'billing'
      }
    ];

    for (const template of templates) {
      try {
        // Check if template already exists
        const existing = await queryOne(
          'SELECT id FROM email_templates WHERE name = $1',
          [template.name]
        );

        if (!existing) {
          await insert('email_templates', template);
          logger.info(`Email template created: ${template.name}`);
        }
      } catch (err) {
        logger.warn(`Failed to create template ${template.name}`, err instanceof Error ? err : new Error(String(err)));
      }
    }

    logger.info('Email templates initialized');
  } catch (error) {
    logger.error('Failed to initialize email templates', error instanceof Error ? error : new Error(String(error)));
  }
}
