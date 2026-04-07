/**
 * Internationalization (i18n)
 * Multi-language support for Turkish and English
 */

export type Language = 'tr' | 'en';

export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export const TRANSLATIONS: Record<Language, TranslationKey> = {
  tr: {
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
  },

  en: {
    // Navigation
    nav: {
      home: 'Home',
      search: 'Search',
      places: 'Places',
      profile: 'Profile',
      favorites: 'Favorites',
      dashboard: 'Dashboard',
      admin: 'Admin',
      logout: 'Logout'
    },

    // Common
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      more: 'More',
      close: 'Close',
      submit: 'Submit',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort'
    },

    // Auth
    auth: {
      welcome: 'Welcome',
      login: 'Sign In',
      register: 'Sign Up',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      email: 'Email Address',
      password: 'Password',
      passwordConfirm: 'Confirm Password',
      fullName: 'Full Name',
      invalidEmail: 'Please enter a valid email address',
      passwordTooShort: 'Password must be at least 8 characters',
      termsAccept: 'I accept the Terms and Conditions',
      signUpSuccess: 'Sign up successful',
      loginSuccess: 'You have successfully logged in',
      logoutSuccess: 'You have been logged out'
    },

    // Places
    places: {
      title: 'Places',
      name: 'Place Name',
      description: 'Description',
      category: 'Category',
      address: 'Address',
      phone: 'Phone',
      website: 'Website',
      rating: 'Rating',
      reviews: 'Reviews',
      openingHours: 'Opening Hours',
      addToFavorites: 'Add to Favorites',
      removeFromFavorites: 'Remove from Favorites',
      viewDetails: 'View Details',
      noResults: 'No results found'
    },

    // Reviews
    reviews: {
      title: 'Reviews',
      writeReview: 'Write a Review',
      rating: 'Rating',
      comment: 'Comment',
      author: 'Author',
      date: 'Date',
      helpful: 'Helpful',
      notHelpful: 'Not Helpful',
      deleteConfirm: 'Are you sure you want to delete this review?',
      reviewAdded: 'Review added successfully',
      reviewDeleted: 'Review deleted successfully'
    },

    // User Profile
    profile: {
      title: 'Profile',
      myProfile: 'My Profile',
      editProfile: 'Edit Profile',
      settings: 'Settings',
      preferences: 'Preferences',
      security: 'Security',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmNewPassword: 'Confirm New Password',
      joined: 'Joined',
      followers: 'Followers',
      following: 'Following',
      reviews: 'Reviews',
      badges: 'Badges'
    },

    // Premium
    premium: {
      title: 'Premium Membership',
      premium: 'Premium',
      pro: 'Pro',
      monthlyPrice: '$/Month',
      features: 'Features',
      upgrade: 'Upgrade',
      downgrade: 'Downgrade',
      subscriptionActive: 'Active Subscription',
      nextBillingDate: 'Next Billing Date',
      cancel: 'Cancel Subscription',
      manageSubscription: 'Manage Subscription'
    },

    // Notifications
    notifications: {
      title: 'Notifications',
      newReview: 'New Review',
      reviewResponse: 'Review Response',
      newFollower: 'New Follower',
      message: 'Message',
      markAsRead: 'Mark as Read',
      markAllAsRead: 'Mark All as Read',
      delete: 'Delete',
      noNotifications: 'You have no notifications'
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
      statistics: 'Statistics',
      views: 'Views',
      reviews: 'Reviews',
      favorites: 'Favorites',
      followers: 'Followers',
      recentActivity: 'Recent Activity'
    },

    // Errors
    errors: {
      notFound: 'Page not found',
      unauthorized: 'You do not have access to this page',
      serverError: 'Server error',
      networkError: 'Network error',
      tryAgain: 'Try Again',
      goHome: 'Go to Home'
    }
  }
};

/**
 * Get translation by key
 */
export function t(key: string, language: Language = 'tr'): string {
  const keys = key.split('.');
  let value: any = TRANSLATIONS[language];

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
 * Detect language from browser
 */
export function detectLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'tr';
  }

  const lang = navigator.language?.toLowerCase() || '';

  if (lang.startsWith('en')) {
    return 'en';
  }

  if (lang.startsWith('tr')) {
    return 'tr';
  }

  return 'tr'; // Default to Turkish
}

/**
 * Format date based on language
 */
export function formatDate(date: Date | string, language: Language = 'tr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  return d.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', options);
}

/**
 * Format currency based on language
 */
export function formatCurrency(amount: number, language: Language = 'tr'): string {
  const currency = language === 'tr' ? 'TRY' : 'USD';
  const symbol = language === 'tr' ? '₺' : '$';

  const formatted = amount.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency
  });

  return formatted.replace(/TRY|USD|\s/g, symbol).trim();
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): { code: Language; name: string }[] {
  return [
    { code: 'tr', name: 'Türkçe' },
    { code: 'en', name: 'English' }
  ];
}
