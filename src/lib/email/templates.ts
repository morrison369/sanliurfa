/**
 * Email Templates System
 * HTML/Text email templates with variables
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  isActive: boolean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// Template variables helper
function replaceVariables(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

// Default templates
export const defaultTemplates: Record<string, EmailTemplate> = {
  welcome: {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'transactional',
    subject: 'Hoş Geldiniz {{name}}!',
    variables: ['name', 'verificationUrl'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hoş Geldiniz</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B4513; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .button { display: inline-block; background: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Şanlıurfa'ya Hoş Geldiniz!</h1>
    </div>
    <div class="content">
      <p>Merhaba {{name}},</p>
      <p>Şanlıurfa platformuna kaydolduğunuz için teşekkür ederiz. Urfa'nın eşsiz mekanlarını keşfetmeye hazır mısınız?</p>
      <p>Hesabınızı doğrulamak için aşağıdaki butona tıklayın:</p>
      <a href="{{verificationUrl}}" class="button">Hesabı Doğrula</a>
      <p>veya şu bağlantıyı kullanabilirsiniz:</p>
      <p>{{verificationUrl}}</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Şanlıurfa. Tüm hakları saklıdır.</p>
    </div>
  </div>
</body>
</html>`,
    textBody: `Merhaba {{name}},

Şanlıurfa platformuna kaydolduğunuz için teşekkür ederiz.

Hesabınızı doğrulamak için şu bağlantıyı kullanın:
{{verificationUrl}}

Saygılarımızla,
Şanlıurfa Ekibi`
  },

  passwordReset: {
    id: 'passwordReset',
    name: 'Password Reset',
    category: 'transactional',
    subject: 'Şifre Sıfırlama Talebi',
    variables: ['name', 'resetUrl', 'expiresIn'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Şifre Sıfırlama</h2>
    <p>Merhaba {{name}},</p>
    <p>Şifrenizi sıfırlamak için bir talep aldık. Bu bağlantı {{expiresIn}} saat geçerlidir:</p>
    <a href="{{resetUrl}}" class="button">Şifreyi Sıfırla</a>
    <p>Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
  </div>
</body>
</html>`,
    textBody: `Merhaba {{name}},

Şifrenizi sıfırlamak için bir talep aldık. Bu bağlantı {{expiresIn}} saat geçerlidir:
{{resetUrl}}

Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.`
  },

  newReview: {
    id: 'newReview',
    name: 'New Review Notification',
    category: 'notification',
    subject: '{{placeName}} için yeni bir değerlendirme',
    variables: ['placeName', 'reviewerName', 'rating', 'comment', 'reviewUrl'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .stars { color: #ffc107; font-size: 20px; }
  </style>
</head>
<body>
  <h2>Yeni Değerlendirme</h2>
  <p><strong>{{placeName}}</strong> mekanınıza {{reviewerName}} bir değerlendirme bıraktı:</p>
  <div class="stars">{{rating}} ★</div>
  <p>"{{comment}}"</p>
  <a href="{{reviewUrl}}">Yorumu Görüntüle</a>
</body>
</html>`,
    textBody: `{{placeName}} mekanınıza {{reviewerName}} bir değerlendirme bıraktı:

Puan: {{rating}}/5
Yorum: {{comment}}

{{reviewUrl}}`
  },

  weeklyDigest: {
    id: 'weeklyDigest',
    name: 'Weekly Digest',
    category: 'marketing',
    subject: 'Haftanın Özeti - {{weekDate}}',
    variables: ['name', 'weekDate', 'newPlaces', 'topPlaces', 'unreadNotifications'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    .place-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .stats { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h2>Merhaba {{name}}!</h2>
  <p>İşte bu hafta {{weekDate}} için özetiniz:</p>
  
  <div class="stats">
    <h3>Haftanın İstatistikleri</h3>
    <ul>
      <li>{{newPlaces}} yeni mekan eklendi</li>
      <li>{{unreadNotifications}} okunmamış bildiriminiz var</li>
    </ul>
  </div>
  
  <h3>Popüler Mekanlar</h3>
  <div class="place-card">
    {{topPlaces}}
  </div>
  
  <a href="https://sanliurfa.com">Daha Fazla Keşfet</a>
</body>
</html>`,
    textBody: `Merhaba {{name}}!

Haftanın Özeti ({{weekDate}}):
- {{newPlaces}} yeni mekan eklendi
- {{unreadNotifications}} okunmamış bildiriminiz var

Popüler Mekanlar:
{{topPlaces}}

https://sanliurfa.com`
  },

  placeApproved: {
    id: 'placeApproved',
    name: 'Place Approved',
    category: 'notification',
    subject: '{{placeName}} onaylandı!',
    variables: ['placeName', 'placeUrl', 'adminNote'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<body>
  <h2>Tebrikler!</h2>
  <p><strong>{{placeName}}</strong> mekanınız yayına alındı.</p>
  <p>{{adminNote}}</p>
  <a href="{{placeUrl}}">Mekanı Görüntüle</a>
</body>
</html>`,
    textBody: `Tebrikler! {{placeName}} mekanınız yayına alındı.

{{adminNote}}

{{placeUrl}}`
  },

  accountSecurity: {
    id: 'accountSecurity',
    name: 'Security Alert',
    category: 'notification',
    subject: 'Güvenlik Uyarısı - Yeni Giriş Tespit Edildi',
    variables: ['name', 'device', 'location', 'time', 'ipAddress'],
    isActive: true,
    htmlBody: `
<!DOCTYPE html>
<html>
<body>
  <h2>🔒 Güvenlik Uyarısı</h2>
  <p>Merhaba {{name}},</p>
  <p>Hesabınıza yeni bir giriş tespit edildi:</p>
  <ul>
    <li><strong>Cihaz:</strong> {{device}}</li>
    <li><strong>Konum:</strong> {{location}}</li>
    <li><strong>Zaman:</strong> {{time}}</li>
    <li><strong>IP:</strong> {{ipAddress}}</li>
  </ul>
  <p>Bu siz değilseniz, lütfen hemen şifrenizi değiştirin.</p>
</body>
</html>`,
    textBody: `Güvenlik Uyarısı

Hesabınıza yeni bir giriş tespit edildi:
- Cihaz: {{device}}
- Konum: {{location}}
- Zaman: {{time}}
- IP: {{ipAddress}}

Bu siz değilseniz, lütfen hemen şifrenizi değiştirin.`
  }
};

/**
 * Render email template
 */
export function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): RenderedEmail {
  const template = defaultTemplates[templateId];
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return {
    subject: replaceVariables(template.subject, variables),
    html: replaceVariables(template.htmlBody, variables),
    text: replaceVariables(template.textBody, variables),
  };
}

/**
 * Get template list
 */
export function getTemplates(): EmailTemplate[] {
  return Object.values(defaultTemplates);
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): EmailTemplate | undefined {
  return defaultTemplates[id];
}

/**
 * Create custom template
 */
export function createTemplate(template: Omit<EmailTemplate, 'id'>): EmailTemplate {
  const id = `custom_${Date.now()}`;
  const newTemplate: EmailTemplate = { ...template, id };
  // In production, save to database
  return newTemplate;
}

/**
 * Preview template with sample data
 */
export function previewTemplate(templateId: string): RenderedEmail {
  const sampleData: Record<string, Record<string, string>> = {
    welcome: { name: 'Ahmet Yılmaz', verificationUrl: 'https://sanliurfa.com/verify/abc123' },
    passwordReset: { name: 'Ahmet Yılmaz', resetUrl: 'https://sanliurfa.com/reset/xyz789', expiresIn: '24' },
    newReview: { placeName: 'Balıklıgöl', reviewerName: 'Mehmet', rating: '5', comment: 'Harika bir yer!', reviewUrl: 'https://sanliurfa.com/review/123' },
    weeklyDigest: { name: 'Ahmet', weekDate: '1-7 Ocak', newPlaces: '15', topPlaces: 'Balıklıgöl, Gümrük Han', unreadNotifications: '3' },
    placeApproved: { placeName: 'Test Mekan', placeUrl: 'https://sanliurfa.com/mekan/test', adminNote: 'Tebrikler!' },
    accountSecurity: { name: 'Ahmet', device: 'Chrome / Windows', location: 'İstanbul, TR', time: '14:30', ipAddress: '192.168.1.1' },
  };

  return renderTemplate(templateId, sampleData[templateId] || {});
}
