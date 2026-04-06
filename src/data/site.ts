// Site yapılandırması ve sabitleri

export const SITE = {
  name: 'Şanlıurfa.com',
  tagline: 'Tarihin Sıfır Noktası',
  description: 'Şanlıurfa şehir rehberi - Tarihi yerler, mekanlar, etkinlikler ve daha fazlası',
  url: 'https://sanliurfa.com',
  ogImage: '/images/og-image.jpg',
  locale: 'tr-TR',
  language: 'tr',
  twitter: '@sanliurfa',
  facebook: 'sanliurfa',
  instagram: 'sanliurfa',
  author: 'Şanlıurfa.com Ekibi',
  email: 'info@sanliurfa.com',
  phone: '+90 414 000 00 00',
  address: 'Şanlıurfa, Türkiye',
  coordinates: {
    lat: 37.1591,
    lng: 38.7969,
  },
} as const;

export const NAVIGATION = {
  main: [
    { name: 'Ana Sayfa', href: '/', icon: 'home' },
    { name: 'Mekanlar', href: '/places', icon: 'map-pin' },
    { name: 'Tarihi Yerler', href: '/tarihi-yerler', icon: 'landmark' },
    { name: 'Etkinlikler', href: '/etkinlikler', icon: 'calendar' },
    { name: 'Gastronomi', href: '/gastronomi', icon: 'utensils' },
    { name: 'Blog', href: '/blog', icon: 'file-text' },
  ],
  footer: [
    { name: 'Hakkımızda', href: '/hakkinda' },
    { name: 'İletişim', href: '/iletisim' },
    { name: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
    { name: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
    { name: 'KVKK', href: '/kvkk' },
  ],
  admin: [
    { name: 'Dashboard', href: '/admin', icon: 'layout-dashboard' },
    { name: 'Mekanlar', href: '/admin/places', icon: 'map-pin' },
    { name: 'Blog', href: '/admin/blog', icon: 'file-text' },
    { name: 'Etkinlikler', href: '/admin/events', icon: 'calendar' },
    { name: 'Tarihi Yerler', href: '/admin/historical-sites', icon: 'landmark' },
    { name: 'Kullanıcılar', href: '/admin/users', icon: 'users' },
    { name: 'Yorumlar', href: '/admin/reviews', icon: 'message-square' },
    { name: 'Mesajlar', href: '/admin/messages', icon: 'mail' },
  ],
} as const;

export const SEO = {
  titleTemplate: '%s | Şanlıurfa.com',
  defaultTitle: 'Şanlıurfa.com - Tarihin Sıfır Noktası',
  defaultDescription: 'Şanlıurfa şehir rehberi. Tarihi yerler, mekanlar, etkinlikler, gastronomi ve daha fazlası. Göbeklitepe, Balıklıgöl ve Şanlıurfa''nın tüm güzellikleri.',
  keywords: [
    'Şanlıurfa',
    'Göbeklitepe',
    'Balıklıgöl',
    'Harran',
    'Halfeti',
    'Şanlıurfa mekanlar',
    'Şanlıurfa tarihi yerler',
    'Şanlıurfa etkinlikler',
    'Şanlıurfa gastronomi',
    'Şanlıurfa gezi rehberi',
    'Tarihin Sıfır Noktası',
  ],
} as const;

export const PAGINATION = {
  itemsPerPage: 12,
  maxVisiblePages: 5,
} as const;

export const UPLOAD = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedDocumentTypes: ['application/pdf'],
  imageSizes: {
    thumbnail: { width: 300, height: 200 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 800 },
  },
} as const;

export const CACHE = {
  ttl: 60 * 5, // 5 dakika
  keys: {
    places: 'places:all',
    place: 'place:',
    blog: 'blog:all',
    events: 'events:all',
    reviews: 'reviews:',
  },
} as const;

export const RATINGS = {
  min: 1,
  max: 5,
  labels: {
    1: 'Çok Kötü',
    2: 'Kötü',
    3: 'Orta',
    4: 'İyi',
    5: 'Mükemmel',
  },
} as const;

export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

export const PLACE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const NOTIFICATION_TYPES = {
  REVIEW: 'review',
  FAVORITE: 'favorite',
  EVENT: 'event',
  SYSTEM: 'system',
} as const;
