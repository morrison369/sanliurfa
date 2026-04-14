/**
 * Turkish Localization (tr-TR)
 * SADECE Türkçe destek - Çok dilli destek YASAKTIR
 * 
 * @see AGENTS.md - Yasaklar bölümü
 */

// Sabit Türkçe locale - değiştirilemez
export const LOCALE = 'tr' as const;
export type Locale = typeof LOCALE;

// Türkçe metin sabitleri
export const TEXTS = {
  // Navigation
  nav: {
    home: 'Anasayfa',
    search: 'Arama',
    places: 'Yerler',
    profile: 'Profil',
    favorites: 'Favorilerim',
    dashboard: 'Panelim',
    admin: 'Yönetim',
    logout: 'Çıkış'
  },

  // Common
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata oluştu',
    success: 'Başarılı',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    view: 'Görüntüle',
    more: 'Daha Fazla',
    close: 'Kapat',
    submit: 'Gönder',
    search: 'Ara',
    filter: 'Filtrele',
    sort: 'Sırala'
  },

  // Auth
  auth: {
    welcome: 'Hoşgeldiniz',
    login: 'Giriş Yap',
    register: 'Kaydol',
    forgotPassword: 'Şifremi Unuttum',
    resetPassword: 'Şifremi Sıfırla',
    email: 'E-posta Adresi',
    password: 'Şifre',
    passwordConfirm: 'Şifreyi Onayla',
    fullName: 'Adı Soyadı',
    invalidEmail: 'Geçerli bir e-posta adresi giriniz',
    passwordTooShort: 'Şifre en az 8 karakter olmalıdır',
    termsAccept: 'Şartları ve Koşulları kabul ediyorum',
    signUpSuccess: 'Kaydınız başarılı oldu',
    loginSuccess: 'Başarıyla giriş yaptınız',
    logoutSuccess: 'Başarıyla çıkış yaptınız'
  },

  // Places
  places: {
    title: 'Yerler',
    name: 'Yer Adı',
    description: 'Açıklama',
    category: 'Kategori',
    address: 'Adres',
    phone: 'Telefon',
    website: 'Web Sitesi',
    rating: 'Puan',
    reviews: 'Yorumlar',
    openingHours: 'Açılış Saatleri',
    addToFavorites: 'Favorilere Ekle',
    removeFromFavorites: 'Favorilerden Çıkar',
    viewDetails: 'Detayları Gör',
    noResults: 'Sonuç bulunamadı'
  },

  // Reviews
  reviews: {
    title: 'Yorumlar',
    writeReview: 'Yorum Yaz',
    rating: 'Puan',
    comment: 'Yorum',
    author: 'Yazar',
    date: 'Tarih',
    helpful: 'Faydalı',
    notHelpful: 'Faydasız',
    deleteConfirm: 'Bu yorumu silmek istediğinize emin misiniz?',
    reviewAdded: 'Yorumunuz başarıyla eklendi',
    reviewDeleted: 'Yorum başarıyla silindi'
  },

  // User Profile
  profile: {
    title: 'Profil',
    myProfile: 'Profilim',
    editProfile: 'Profili Düzenle',
    settings: 'Ayarlar',
    preferences: 'Tercihler',
    security: 'Güvenlik',
    changePassword: 'Şifreni Değiştir',
    currentPassword: 'Mevcut Şifre',
    newPassword: 'Yeni Şifre',
    confirmNewPassword: 'Yeni Şifreyi Onayla',
    joined: 'Katılım Tarihi',
    followers: 'Takipçiler',
    following: 'Takip Ediliyor',
    reviews: 'Yorumlar',
    badges: 'Rozetler'
  },

  // Premium
  premium: {
    title: 'Premium Üyelik',
    premium: 'Premium',
    pro: 'Pro',
    monthlyPrice: '₺/Ay',
    features: 'Özellikler',
    upgrade: 'Yükselt',
    downgrade: 'İndir',
    subscriptionActive: 'Aktif Abonelik',
    nextBillingDate: 'Sonraki Fatura Tarihi',
    cancel: 'Aboneliği İptal Et',
    manageSubscription: 'Aboneliği Yönet'
  },

  // Notifications
  notifications: {
    title: 'Bildirimler',
    newReview: 'Yeni Yorum',
    reviewResponse: 'Yorum Yanıtı',
    newFollower: 'Yeni Takipçi',
    message: 'Mesaj',
    markAsRead: 'Okundu Olarak İşaretle',
    markAllAsRead: 'Hepsini Okundu Olarak İşaretle',
    delete: 'Sil',
    noNotifications: 'Bildiriminiz yok'
  },

  // Dashboard
  dashboard: {
    title: 'Panelim',
    overview: 'Genel Bakış',
    statistics: 'İstatistikler',
    views: 'Görüntüleme',
    reviews: 'Yorumlar',
    favorites: 'Favoriler',
    followers: 'Takipçiler',
    recentActivity: 'Son Aktivite'
  },

  // Errors
  errors: {
    notFound: 'Sayfa bulunamadı',
    unauthorized: 'Bu sayfaya erişim yetkiniz yok',
    serverError: 'Sunucu hatası',
    networkError: 'Ağ hatası',
    tryAgain: 'Tekrar Deneyin',
    goHome: 'Anasayfaya Dön'
  }
} as const;

// Metin tipi
type TextsType = typeof TEXTS;

/**
 * Get Turkish text by dot-notation key
 * @example t('nav.home') // 'Anasayfa'
 */
export function t(key: string): string {
  const keys = key.split('.');
  let value: any = TEXTS;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if not found
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * Format date in Turkish locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format currency in Turkish Lira
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  });
}

/**
 * Get locale information
 * @deprecated Sadece Türkçe desteklenir, kullanımı önerilmez
 */
export function getLocale(): { code: Locale; name: string } {
  return { code: 'tr', name: 'Türkçe' };
}

/**
 * @deprecated Çok dilli destek KALDIRILMIŞTIR. Sadece 'tr' döndürür.
 */
export function detectLanguage(): 'tr' {
  return 'tr';
}

/**
 * @deprecated Çok dilli destek KALDIRILMIŞTIR. Sadece Türkçe değer döndürür.
 */
export function getAvailableLanguages(): { code: 'tr'; name: string }[] {
  return [{ code: 'tr', name: 'Türkçe' }];
}
