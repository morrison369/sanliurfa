/**
 * Turkish Language Constants
 * All UI text in Turkish only
 */

export const UI_TEXT = {
  // App
  appName: 'Şanlıurfa.com',
  appTagline: 'Tarihin Sıfır Noktası',
  
  // Navigation
  nav: {
    home: 'Ana Sayfa',
    places: 'Mekanlar',
    blog: 'Blog',
    about: 'Hakkında',
    contact: 'İletişim',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    profile: 'Profilim',
    logout: 'Çıkış Yap',
    favorites: 'Favorilerim',
    settings: 'Ayarlar',
  },
  
  // Search
  search: {
    placeholder: 'Mekan, blog yazısı veya etkinlik ara...',
    button: 'Ara',
    results: 'sonuç bulundu',
    noResults: 'Sonuç bulunamadı',
    popularSearches: 'Popüler Aramalar',
  },
  
  // Places
  place: {
    rating: 'Puan',
    reviews: 'değerlendirme',
    openNow: 'Şimdi Açık',
    closed: 'Kapalı',
    directions: 'Yol Tarifi',
    call: 'Ara',
    website: 'Web Sitesi',
    hours: 'Çalışma Saatleri',
    priceRange: 'Fiyat Aralığı',
    addToFavorites: 'Favorilere Ekle',
    share: 'Paylaş',
    claim: 'Bu mekanı sahiplen',
    similarPlaces: 'Benzer Mekanlar',
  },
  
  // Reviews
  review: {
    title: 'Değerlendirmeler',
    write: 'Değerlendirme Yaz',
    placeholder: 'Deneyiminizi paylaşın...',
    submit: 'Gönder',
    helpful: 'Yardımcı oldu',
    report: 'Şikayet Et',
    verified: 'Doğrulanmış Değerlendirme',
    sortBy: 'Sırala',
    newest: 'En Yeni',
    highest: 'En Yüksek Puan',
    lowest: 'En Düşük Puan',
  },
  
  // Auth
  auth: {
    email: 'E-posta Adresi',
    password: 'Şifre',
    passwordConfirm: 'Şifre Tekrar',
    forgotPassword: 'Şifremi Unuttum',
    rememberMe: 'Beni Hatırla',
    orContinueWith: 'Veya şununla devam et',
    noAccount: 'Hesabınız yok mu?',
    hasAccount: 'Zaten hesabınız var mı?',
  },
  
  // Errors
  error: {
    required: 'Bu alan zorunludur',
    email: 'Geçerli bir e-posta adresi girin',
    passwordLength: 'Şifre en az 8 karakter olmalıdır',
    passwordMatch: 'Şifreler eşleşmiyor',
    generic: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    notFound: 'Sayfa bulunamadı',
    serverError: 'Sunucu hatası',
  },
  
  // Success
  success: {
    saved: 'Başarıyla kaydedildi',
    updated: 'Başarıyla güncellendi',
    deleted: 'Başarıyla silindi',
    loggedIn: 'Giriş başarılı',
    registered: 'Kayıt başarılı',
  },
  
  // Time
  time: {
    minute: 'dakika',
    hour: 'saat',
    day: 'gün',
    week: 'hafta',
    month: 'ay',
    year: 'yıl',
    ago: 'önce',
    justNow: 'az önce',
  },
  
  // CTA
  cta: {
    explore: 'Keşfet',
    learnMore: 'Daha Fazla',
    bookNow: 'Rezervasyon Yap',
    subscribe: 'Abone Ol',
    loadMore: 'Daha Fazla Yükle',
    showAll: 'Tümünü Göster',
  },
  
  // Footer
  footer: {
    copyright: '© 2024 Şanlıurfa.com. Tüm hakları saklıdır.',
    terms: 'Kullanım Koşulları',
    privacy: 'Gizlilik Politikası',
    cookies: 'Çerezler',
    contact: 'Bize Ulaşın',
  },
  
  // Categories
  categories: {
    restaurants: 'Restoranlar',
    hotels: 'Oteller',
    attractions: 'Tarihi Yerler',
    museums: 'Müzeler',
    parks: 'Parklar',
    shopping: 'Alışveriş',
    nightlife: 'Gece Hayatı',
    activities: 'Aktiviteler',
  },
} as const;

// Export type for type safety
export type UIText = typeof UI_TEXT;

export default UI_TEXT;
