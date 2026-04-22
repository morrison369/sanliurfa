/**
 * Turkish-only copy helpers.
 *
 * The public product is locked to Turkish for sanliurfa.com. This module keeps
 * the legacy helper API stable without exposing a language switcher surface.
 */

export type Language = "tr";

export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export const DEFAULT_LANGUAGE: Language = "tr";

export const TRANSLATIONS: Record<Language, TranslationKey> = {
  tr: {
    nav: {
      home: "Anasayfa",
      search: "Arama",
      places: "Mekanlar",
      profile: "Profil",
      favorites: "Favorilerim",
      dashboard: "Panelim",
      admin: "Yönetim",
      logout: "Çıkış",
    },
    common: {
      loading: "Yükleniyor...",
      error: "Hata oluştu",
      success: "Başarılı",
      save: "Kaydet",
      cancel: "İptal",
      delete: "Sil",
      edit: "Düzenle",
      view: "Görüntüle",
      more: "Daha Fazla",
      close: "Kapat",
      submit: "Gönder",
      search: "Ara",
      filter: "Filtrele",
      sort: "Sırala",
    },
    auth: {
      welcome: "Hoş geldiniz",
      login: "Giriş Yap",
      register: "Kaydol",
      forgotPassword: "Şifremi Unuttum",
      resetPassword: "Şifremi Sıfırla",
      email: "E-posta Adresi",
      password: "Şifre",
      passwordConfirm: "Şifreyi Onayla",
      fullName: "Adı Soyadı",
      invalidEmail: "Geçerli bir e-posta adresi giriniz",
      passwordTooShort: "Şifre en az 8 karakter olmalıdır",
      termsAccept: "Şartları ve koşulları kabul ediyorum",
      signUpSuccess: "Kaydınız başarılı oldu",
      loginSuccess: "Başarıyla giriş yaptınız",
      logoutSuccess: "Başarıyla çıkış yaptınız",
    },
    places: {
      title: "Mekanlar",
      name: "Mekan Adı",
      description: "Açıklama",
      category: "Kategori",
      address: "Adres",
      phone: "Telefon",
      website: "Web Sitesi",
      rating: "Puan",
      reviews: "Yorumlar",
      openingHours: "Açılış Saatleri",
      addToFavorites: "Favorilere Ekle",
      removeFromFavorites: "Favorilerden Çıkar",
      viewDetails: "Detayları Gör",
      noResults: "Sonuç bulunamadı",
    },
    reviews: {
      title: "Yorumlar",
      writeReview: "Yorum Yaz",
      rating: "Puan",
      comment: "Yorum",
      author: "Yazar",
      date: "Tarih",
      helpful: "Faydalı",
      notHelpful: "Faydasız",
      deleteConfirm: "Bu yorumu silmek istediğinize emin misiniz?",
      reviewAdded: "Yorumunuz başarıyla eklendi",
      reviewDeleted: "Yorum başarıyla silindi",
    },
    profile: {
      title: "Profil",
      myProfile: "Profilim",
      editProfile: "Profili Düzenle",
      settings: "Ayarlar",
      preferences: "Tercihler",
      security: "Güvenlik",
      changePassword: "Şifreni Değiştir",
      currentPassword: "Mevcut Şifre",
      newPassword: "Yeni Şifre",
      confirmNewPassword: "Yeni Şifreyi Onayla",
      joined: "Katılım Tarihi",
      followers: "Takipçiler",
      following: "Takip Ediliyor",
      reviews: "Yorumlar",
      badges: "Rozetler",
    },
    premium: {
      title: "Premium Üyelik",
      premium: "Premium",
      pro: "Pro",
      monthlyPrice: "₺/Ay",
      features: "Özellikler",
      upgrade: "Yükselt",
      downgrade: "İndir",
      subscriptionActive: "Aktif Abonelik",
      nextBillingDate: "Sonraki Fatura Tarihi",
      cancel: "Aboneliği İptal Et",
      manageSubscription: "Aboneliği Yönet",
    },
    notifications: {
      title: "Bildirimler",
      newReview: "Yeni Yorum",
      reviewResponse: "Yorum Yanıtı",
      newFollower: "Yeni Takipçi",
      message: "Mesaj",
      markAsRead: "Okundu Olarak İşaretle",
      markAllAsRead: "Hepsini Okundu Olarak İşaretle",
      delete: "Sil",
      noNotifications: "Bildiriminiz yok",
    },
    dashboard: {
      title: "Panelim",
      overview: "Genel Bakış",
      statistics: "İstatistikler",
      views: "Görüntüleme",
      reviews: "Yorumlar",
      favorites: "Favoriler",
      followers: "Takipçiler",
      recentActivity: "Son Aktivite",
    },
    errors: {
      notFound: "Sayfa bulunamadı",
      unauthorized: "Bu sayfaya erişim yetkiniz yok",
      serverError: "Sunucu hatası",
      networkError: "Ağ hatası",
      tryAgain: "Tekrar Deneyin",
      goHome: "Anasayfaya Dön",
    },
  },
};

export function normalizeLanguage(_language?: string | null): Language {
  return DEFAULT_LANGUAGE;
}

export function t(
  key: string,
  language: Language | string = DEFAULT_LANGUAGE,
): string {
  const keys = key.split(".");
  let value: string | TranslationKey | undefined =
    TRANSLATIONS[normalizeLanguage(language)];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

export function detectLanguage(): Language {
  return DEFAULT_LANGUAGE;
}

export function formatDate(
  date: Date | string,
  _language: Language | string = DEFAULT_LANGUAGE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  return d.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(
  amount: number,
  _language: Language | string = DEFAULT_LANGUAGE,
): string {
  return amount.toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
  });
}

export function getAvailableLanguages(): { code: Language; name: string }[] {
  return [{ code: DEFAULT_LANGUAGE, name: "Türkçe" }];
}
