export interface EmailTemplate {
  subject: string;
  html: string;
}

export const TEMPLATES: { [key: string]: (data: any) => EmailTemplate } = {
  welcome: (data) => ({
    subject: 'Şanlıurfa.com\'a Hoş Geldiniz',
    html: `<h1>Hoş Geldiniz, ${data.fullName}!</h1><p>Hesabınız başarıyla oluşturuldu.</p>`
  }),

  new_message: (data) => ({
    subject: `${data.senderName} size mesaj gönderdi`,
    html: `<h1>Yeni Mesaj</h1><p>${data.senderName} size: "${data.preview}"</p><p><a href="${data.messageUrl}">Mesajı Oku</a></p>`
  }),

  new_follower: (data) => ({
    subject: `${data.followerName} sizi takip etmeye başladı`,
    html: `<h1>Yeni Takipçi</h1><p>${data.followerName} sizi takip etmeye başladı.</p><p><a href="${data.profileUrl}">Profili Ziyaret Et</a></p>`
  }),

  place_review: (data) => ({
    subject: `${data.placeName} için yeni inceleme`,
    html: `<h1>Mekanınız İncelendi</h1><p>${data.reviewerName}, ${data.placeName} için şu incelemeyi yaptı: "${data.reviewPreview}"</p><p><a href="${data.reviewUrl}">İncelemeyi Oku</a></p>`
  }),

  weekly_digest: () => ({
    subject: 'Haftalık Özet - Şanlıurfa.com',
    html: '<h1>Bu Hafta Neler Oldu?</h1><p>En beğenilen incelemeler ve takip ettiklerinizin aktiviteleri...</p>'
  })
};

export function getSiteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://sanliurfa.com').replace(/\/+$/, '');
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseQueuedEmailData(value: unknown): Record<string, any> {
  if (!value) return {};

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' ? value as Record<string, any> : {};
}

export function getPasswordResetEmailHTML(resetLink: string, expiryHours: number = 24): string {
  return `
    <h1>Şifre Sıfırla</h1>
    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${resetLink}">Şifreyi Sıfırla</a></p>
    <p>Bu bağlantı ${expiryHours} saat içinde geçerlidir.</p>
    <p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelin.</p>
  `;
}

export function getEmailVerificationHTML(verificationLink: string, fullName?: string): string {
  return `
    <h1>E-posta Doğrulama</h1>
    <p>Merhaba ${fullName || 'Kullanıcı'},</p>
    <p>E-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${verificationLink}">E-postayı Doğrula</a></p>
  `;
}

export function getWelcomeEmailHTML(fullName: string): string {
  return `
    <h1>Hoş Geldiniz, ${fullName}!</h1>
    <p>Şanlıurfa.com'a katılmak için teşekkürler.</p>
    <p>Profilinizi tamamlayabilir ve şehir hakkında bilgi paylaşmaya başlayabilirsiniz.</p>
  `;
}

export function getReviewResponseEmailHTML(reviewerName: string, placeName: string, responseText: string): string {
  return `
    <h1>${placeName} adlı mekanınıza bir yanıt geldi</h1>
    <p>${reviewerName} tarafından yapılan yorumunuza sahibi yanıt verdi:</p>
    <blockquote>${responseText}</blockquote>
  `;
}

export function getSubscriptionEmailHTML(placeName: string): string {
  return `
    <h1>Yeni Aktivite: ${placeName}</h1>
    <p>Takip ettiğiniz mekan hakkında yeni bilgiler var.</p>
  `;
}
