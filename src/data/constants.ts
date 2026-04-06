// Uygulama sabitleri

export const APP_NAME = 'Şanlıurfa.com';
export const APP_VERSION = '1.0.0';

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  PLACES: {
    LIST: '/api/places',
    DETAIL: (id: string) => `/api/places/${id}`,
    CREATE: '/api/places/create',
    UPDATE: (id: string) => `/api/places/${id}/update`,
    DELETE: (id: string) => `/api/places/${id}/delete`,
    SUBMIT: '/api/places/submit',
  },
  BLOG: {
    LIST: '/api/blog',
    CREATE: '/api/blog/create',
    UPDATE: (id: string) => `/api/blog/${id}/update`,
    DELETE: (id: string) => `/api/blog/${id}/delete`,
  },
  EVENTS: {
    LIST: '/api/events',
    CREATE: '/api/events/create',
    UPDATE: (id: string) => `/api/events/${id}/update`,
    DELETE: (id: string) => `/api/events/${id}/delete`,
  },
  REVIEWS: {
    LIST: '/api/reviews',
    ADD: '/api/reviews/add',
    APPROVE: (id: string) => `/api/reviews/${id}/approve`,
    REJECT: (id: string) => `/api/reviews/${id}/reject`,
    DELETE: (id: string) => `/api/reviews/${id}/delete`,
  },
  FAVORITES: {
    LIST: '/api/favorites',
    TOGGLE: '/api/favorites/toggle',
  },
  USERS: {
    LIST: '/api/users',
    UPDATE_ROLE: (id: string) => `/api/users/${id}/update-role`,
    BAN: (id: string) => `/api/users/${id}/ban`,
    DELETE: (id: string) => `/api/users/${id}/delete`,
  },
  PROFILE: {
    UPDATE: '/api/profile/update',
    CHANGE_PASSWORD: '/api/profile/change-password',
    DELETE: '/api/profile/delete',
  },
} as const;

// Cookie names
export const COOKIES = {
  AUTH_TOKEN: 'auth-token',
  REFRESH_TOKEN: 'refresh-token',
  THEME: 'theme',
  LOCALE: 'locale',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'sanliurfa-theme',
  USER: 'sanliurfa-user',
  FAVORITES: 'sanliurfa-favorites',
  RECENT_SEARCHES: 'sanliurfa-recent-searches',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Geçersiz e-posta veya şifre',
    EMAIL_EXISTS: 'Bu e-posta adresi zaten kullanılıyor',
    USERNAME_EXISTS: 'Bu kullanıcı adı zaten kullanılıyor',
    WEAK_PASSWORD: 'Şifre en az 6 karakter olmalıdır',
    UNAUTHORIZED: 'Bu işlem için giriş yapmanız gerekiyor',
    FORBIDDEN: 'Bu işlem için yetkiniz yok',
  },
  VALIDATION: {
    REQUIRED: 'Bu alan zorunludur',
    INVALID_EMAIL: 'Geçerli bir e-posta adresi giriniz',
    INVALID_URL: 'Geçerli bir URL giriniz',
    MIN_LENGTH: (min: number) => `En az ${min} karakter olmalıdır`,
    MAX_LENGTH: (max: number) => `En fazla ${max} karakter olabilir`,
  },
  SERVER: {
    INTERNAL_ERROR: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz',
    SERVICE_UNAVAILABLE: 'Servis geçici olarak kullanılamıyor',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Giriş başarılı',
    REGISTER_SUCCESS: 'Kayıt başarılı. Giriş yapabilirsiniz',
    LOGOUT_SUCCESS: 'Çıkış yapıldı',
    PASSWORD_RESET_SENT: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi',
    PASSWORD_CHANGED: 'Şifreniz başarıyla değiştirildi',
  },
  PLACE: {
    CREATED: 'Mekan başarıyla eklendi',
    UPDATED: 'Mekan başarıyla güncellendi',
    DELETED: 'Mekan başarıyla silindi',
    SUBMITTED: 'Mekan öneriniz alındı. Onaylandıktan sonra yayınlanacaktır',
  },
  REVIEW: {
    CREATED: 'Yorumunuz başarıyla eklendi',
    APPROVED: 'Yorum onaylandı',
    REJECTED: 'Yorum reddedildi',
  },
  FAVORITE: {
    ADDED: 'Favorilere eklendi',
    REMOVED: 'Favorilerden kaldırıldı',
  },
} as const;

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd MMMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMMM yyyy HH:mm',
  ISO: 'yyyy-MM-dd',
  ISO_WITH_TIME: 'yyyy-MM-dd\'T\'HH:mm:ss',
} as const;

// Image placeholders
export const PLACEHOLDERS = {
  PLACE: '/images/placeholder-place.jpg',
  BLOG: '/images/placeholder-blog.jpg',
  EVENT: '/images/placeholder-event.jpg',
  USER: '/images/placeholder-user.jpg',
  HISTORICAL: '/images/placeholder-historical.jpg',
} as const;

// Social share URLs
export const SOCIAL_SHARE = {
  FACEBOOK: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  TWITTER: (url: string, text: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  WHATSAPP: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  TELEGRAM: (url: string, text: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
} as const;
