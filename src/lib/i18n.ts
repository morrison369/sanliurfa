/**
 * i18n Module (Turkish Only)
 * Simple localization utilities - Project is locked to Turkish
 */

export const LOCALE = 'tr';

export const TEXTS = {
  nav: {
    home: 'Anasayfa',
    places: 'Mekanlar',
    events: 'Etkinlikler',
    blog: 'Blog',
    about: 'Hakkımızda',
    contact: 'İletişim',
    profile: 'Profil',
    settings: 'Ayarlar',
    logout: 'Çıkış Yap'
  },
  common: {
    loading: 'Yükleniyor...',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    create: 'Oluştur',
    search: 'Ara',
    filter: 'Filtrele',
    sort: 'Sırala',
    next: 'Sonraki',
    previous: 'Önceki',
    submit: 'Gönder',
    close: 'Kapat',
    open: 'Aç',
    yes: 'Evet',
    no: 'Hayır',
    ok: 'Tamam'
  },
  auth: {
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    forgotPassword: 'Şifremi Unuttum',
    email: 'E-posta',
    password: 'Şifre',
    confirmPassword: 'Şifreyi Onayla',
    fullName: 'Ad Soyad'
  },
  places: {
    addPlace: 'Mekan Ekle',
    editPlace: 'Mekan Düzenle',
    reviews: 'Değerlendirmeler',
    rating: 'Puan',
    address: 'Adres',
    phone: 'Telefon',
    website: 'Web Sitesi',
    hours: 'Çalışma Saatleri'
  },
  reviews: {
    writeReview: 'Değerlendirme Yaz',
    editReview: 'Değerlendirmeyi Düzenle',
    rating: 'Puan',
    comment: 'Yorum',
    helpful: 'Faydalı',
    report: 'Şikayet Et'
  },
  profile: {
    myProfile: 'Profilim',
    myPlaces: 'Mekanlarım',
    myReviews: 'Değerlendirmelerim',
    myFavorites: 'Favorilerim',
    editProfile: 'Profili Düzenle'
  },
  premium: {
    upgrade: 'Premium Yükselt',
    features: 'Özellikler',
    pricing: 'Fiyatlandırma',
    subscribe: 'Abone Ol'
  },
  notifications: {
    title: 'Bildirimler',
    markAllRead: 'Tümünü Okundu İşaretle',
    noNotifications: 'Bildirim yok'
  },
  dashboard: {
    overview: 'Genel Bakış',
    analytics: 'Analitik',
    settings: 'Ayarlar'
  },
  errors: {
    notFound: 'Sayfa bulunamadı',
    serverError: 'Sunucu hatası oluştu',
    unauthorized: 'Yetkisiz erişim',
    validationError: 'Doğrulama hatası',
    networkError: 'Ağ bağlantısı hatası'
  }
};

export function t(key: string, _params?: Record<string, string>): string {
  const keys = key.split('.');
  let value: any = TEXTS;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  let result = value;
  if (_params) {
    Object.entries(_params).forEach(([paramKey, paramValue]) => {
      result = result.replace(`{{${paramKey}}}`, paramValue);
    });
  }
  
  return result;
}

export function formatDate(date: Date | string, _locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency
  }).format(amount);
}

export function getLocale(): { code: string; name: string } {
  return { code: 'tr', name: 'Türkçe' };
}

export function detectLanguage(): string {
  return 'tr';
}

export function getPreferredLanguage(_acceptLanguage?: string): string {
  return 'tr';
}

export function getAvailableLanguages(): { code: string; name: string }[] {
  return [{ code: 'tr', name: 'Türkçe' }];
}

export function formatRelativeTime(date: Date | string, _locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return 'dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  
  return formatDate(d);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

export function getTextDirection(): 'ltr' | 'rtl' {
  return 'ltr'; // Turkish is LTR
}

export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] || match);
}
