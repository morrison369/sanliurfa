/**
 * Email Marketing Module
 * Task 121: Email Marketing Automation
 */

// Campaign exports
export {
  createCampaign,
  updateCampaign,
  getCampaign,
  listCampaigns,
  scheduleCampaign,
  cancelCampaign,
  duplicateCampaign,
  sendCampaign,
  getCampaignAnalytics,
  trackEmailOpen,
  trackEmailClick,
  trackUnsubscribe,
  getDashboardStats,
  createSegment,
  type EmailCampaign,
  type CreateCampaignData,
  type CampaignStatus,
  type CampaignType,
  type EmailSegment,
  type SegmentCriteria,
  type CampaignAnalytics,
  type ABTestConfig,
} from './campaigns';

// Automation exports
export {
  createWorkflow,
  getWorkflow,
  listWorkflows,
  activateWorkflow,
  pauseWorkflow,
  deleteWorkflow,
  triggerWorkflow,
  processAutomationQueue,
  getWorkflowStats,
  type AutomationWorkflow,
  type AutomationTrigger,
  type AutomationStatus,
  type AutomationStep,
  type CreateWorkflowData,
  type TriggerConfig,
  type StepConfig,
  type EmailStepConfig,
  type DelayStepConfig,
  type ConditionStepConfig,
  type TagStepConfig,
  type WebhookStepConfig,
} from './automation';

// Templates
export const EMAIL_TEMPLATES = {
  welcome: {
    name: 'Hoş Geldiniz',
    subject: 'Şanlıurfa.com\'a Hoş Geldiniz! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e63946;">Hoş Geldiniz, {{name}}! 👋</h1>
        <p>Şanlıurfa.com ailesine katıldığınız için teşekkür ederiz.</p>
        <p>Şanlıurfa\'nın en iyi restoranlarını, mekanlarını ve etkinliklerini keşfetmeye başlayın.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://sanliurfa.com/mekanlar" style="background: #e63946; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Mekanları Keşfet
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Bu e-postayı aldıysanız ancak kaydolmadıysanız, lütfen dikkate almayın.
        </p>
      </div>
    `,
  },
  
  abandonedCart: {
    name: 'Sepet Hatırlatma',
    subject: 'Biletlerinizi Unuttunuz mu? 🎫',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e63946;">Merhaba {{name}},</h1>
        <p>Etkinlik biletlerinizi tamamlamayı unuttunuz gibi görünüyor.</p>
        <p>Rezervasyonunuzu şimdi tamamlayın ve bu harika etkinliği kaçırmayın!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://sanliurfa.com/etkinlikler" style="background: #e63946; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Biletlerimi Tamamla
          </a>
        </div>
      </div>
    `,
  },
  
  birthday: {
    name: 'Doğum Günü Kutlaması',
    subject: 'İyi ki Doğdunuz! 🎂',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e63946;">İyi ki Doğdunuz, {{name}}! 🎉</h1>
        <p>Doğum gününüzü en içten dileklerimizle kutlarız!</p>
        <p>Size özel %20 indirim kuponu hediye ediyoruz:</p>
        <div style="background: #f8f9fa; border: 2px dashed #e63946; padding: 20px; text-align: center; margin: 20px 0;">
          <code style="font-size: 24px; font-weight: bold; color: #e63946;">DOGUM20</code>
        </div>
        <p style="font-size: 12px; color: #666;">Kupon 30 gün geçerlidir.</p>
      </div>
    `,
  },
  
  monthlyNewsletter: {
    name: 'Aylık Bülten',
    subject: 'Şanlıurfa.com Aylık Bülten - {{month}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background: #e63946; color: white; padding: 20px; text-align: center;">
          <h1>Şanlıurfa.com Bülten</h1>
          <p>{{month}} Ayının Öne Çıkanları</p>
        </header>
        <div style="padding: 20px;">
          <h2>🍽️ Bu Ayın En İyi Restoranları</h2>
          <p>Şanlıurfa'nın en çok tercih edilen lezzet duraklarını keşfedin.</p>
          
          <h2>🎭 Yaklaşan Etkinlikler</h2>
          <p>Bu ay kaçırmamanız gereken etkinlikler...</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://sanliurfa.com" style="background: #e63946; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Daha Fazla Keşfet
            </a>
          </div>
        </div>
        <footer style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Bu e-postayı almak istemiyorsanız <a href="{{unsubscribe_url}}">buraya tıklayın</a></p>
        </footer>
      </div>
    `,
  },
  
  reviewRequest: {
    name: 'Değerlendirme İsteği',
    subject: 'Deneyiminizi Paylaşın ✍️',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e63946;">Merhaba {{name}},</h1>
        <p>Yakın zamanda ziyaret ettiğiniz mekan hakkında düşüncelerinizi öğrenmek istiyoruz.</p>
        <p>Deneyiminizi paylaşarak diğer kullanıcılara yardımcı olabilirsiniz.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://sanliurfa.com/degerlendir?place={{placeId}}" style="background: #e63946; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Değerlendirme Yaz
          </a>
        </div>
      </div>
    `,
  },
};

// Pre-built automation workflows
export const PREBUILT_AUTOMATIONS = {
  welcomeSeries: {
    name: 'Karşılama Serisi',
    description: 'Yeni kayıt olan kullanıcılara 3\'lü karşılama e-postası',
    trigger: 'user_registered' as const,
    steps: [
      {
        type: 'email' as const,
        config: {
          subject: 'Şanlıurfa.com\'a Hoş Geldiniz!',
          htmlContent: EMAIL_TEMPLATES.welcome.html,
        },
      },
      {
        type: 'delay' as const,
        config: { delayMinutes: 60 * 24, delayType: 'fixed' as const },
      },
      {
        type: 'email' as const,
        config: {
          subject: 'Şanlıurfa\'nın En İyi Lezzetleri',
          htmlContent: '<p>Şanlıurfa\'nın meşhur lezzetlerini keşfedin...</p>',
        },
      },
      {
        type: 'delay' as const,
        config: { delayMinutes: 60 * 24 * 3, delayType: 'fixed' as const },
      },
      {
        type: 'email' as const,
        config: {
          subject: 'Profilinizi Tamamlayın',
          htmlContent: '<p>Size daha iyi öneriler sunabilmemiz için profilinizi tamamlayın...</p>',
        },
      },
    ],
  },
  
  abandonedCart: {
    name: 'Sepet Hatırlatma',
    description: 'Tamamlanmamış rezervasyonlar için hatırlatma',
    trigger: 'abandoned_cart' as const,
    triggerConfig: { delayMinutes: 60 },
    steps: [
      {
        type: 'email' as const,
        config: {
          subject: 'Biletlerinizi Unuttunuz mu?',
          htmlContent: EMAIL_TEMPLATES.abandonedCart.html,
        },
      },
      {
        type: 'delay' as const,
        config: { delayMinutes: 60 * 24, delayType: 'fixed' as const },
      },
      {
        type: 'condition' as const,
        config: {
          condition: 'custom_field' as const,
          fieldName: 'cart_completed',
          fieldValue: false,
        },
      },
      {
        type: 'email' as const,
        config: {
          subject: 'Son Gün: Biletleriniz Hâlâ Bekliyor',
          htmlContent: '<p>Rezervasyonunuzu tamamlamak için son gün...</p>',
        },
      },
    ],
  },
  
  birthday: {
    name: 'Doğum Günü Kutlaması',
    description: 'Kullanıcıların doğum günlerinde otomatik kutlama',
    trigger: 'birthday' as const,
    steps: [
      {
        type: 'email' as const,
        config: {
          subject: 'İyi ki Doğdunuz!',
          htmlContent: EMAIL_TEMPLATES.birthday.html,
        },
      },
      {
        type: 'tag' as const,
        config: { action: 'add' as const, tag: 'birthday_email_sent' },
      },
    ],
  },
  
  reengagement: {
    name: 'Yeniden Etkileşim',
    description: '30 gün aktif olmayan kullanıcılara özel teklif',
    trigger: 'user_inactive' as const,
    triggerConfig: { delayMinutes: 60 * 24 * 30 },
    steps: [
      {
        type: 'email' as const,
        config: {
          subject: 'Sizi Özledik! 💝',
          htmlContent: '<p>Uzun zamandır görüşmüyoruz. Size özel %15 indirim kodu...</p>',
        },
      },
      {
        type: 'delay' as const,
        config: { delayMinutes: 60 * 24 * 7, delayType: 'fixed' as const },
      },
      {
        type: 'condition' as const,
        config: { condition: 'opened_email' as const },
      },
      {
        type: 'email' as const,
        config: {
          subject: 'Son Şans: İndirim Kodunuz Siliniyor',
          htmlContent: '<p>İndirim kodunuz 24 saat içinde geçersiz olacak...</p>',
        },
      },
    ],
  },
};

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Email list cleaning
export async function cleanEmailList(): Promise<{
  total: number;
  invalid: number;
  bounced: number;
  unsubscribed: number;
  cleaned: number;
}> {
  const stats = {
    total: 0,
    invalid: 0,
    bounced: 0,
    unsubscribed: 0,
    cleaned: 0,
  };

  // Count total
  const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE email IS NOT NULL`);
  stats.total = parseInt(totalResult.rows[0]?.count || '0');

  // Find invalid emails
  const invalidResult = await db.execute(sql`
    SELECT id, email FROM users 
    WHERE email IS NOT NULL 
    AND email NOT LIKE '%@%.%'
  `);
  stats.invalid = invalidResult.rows.length;

  // Find bounced emails
  const bouncedResult = await db.execute(sql`
    SELECT DISTINCT email FROM email_campaign_recipients 
    WHERE status = 'bounced'
  `);
  stats.bounced = bouncedResult.rows.length;

  // Find unsubscribed
  const unsubResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM users 
    WHERE email_notifications = false
  `);
  stats.unsubscribed = parseInt(unsubResult.rows[0]?.count || '0');

  stats.cleaned = stats.invalid + stats.bounced;

  return stats;
}

import { db } from '../db';
