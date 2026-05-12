export const HOMEPAGE_HERO_PRIMARY_CTA = {
  href: '/mekanlar',
  label: 'Mekanları Keşfet',
};

export const HOMEPAGE_HERO_SECONDARY_CTA = {
  href: '/gezilecek-yerler',
  label: 'Tarihi Rotalar',
};

export const HOMEPAGE_HERO_SERVICE_LINKS = [
  { href: '/saglik/nobetci-eczaneler', label: 'Nöbetçi Eczaneler' },
  { href: '/ulasim/otobus-saatleri', label: 'Otobüs Saatleri' },
  { href: '/ulasim/ucak-saatleri', label: 'Uçak Saatleri' },
  { href: '/harita', label: 'Harita' },
] as const;

export const HOMEPAGE_PUBLIC_SECTION_ORDER = [
  'live-status',
  'trending-marquee',
  'main-categories',
  'featured-places',
  'historical-sites',
  'districts',
  'map-preview',
  'daily-picks',
  'recipes',
  'blog',
  'stories-strip',
  'reviews-carousel',
] as const;

export const HOMEPAGE_CTA_CONFIG = {
  title: 'İşletmenizi Şanlıurfa Rehberine Ekleyin',
  description:
    'Yerel kullanıcılara ulaşın, görünürlüğünüzü artırın. İşletme kaydı ücretsiz ve tam erişim açık.',
  primary: {
    href: '/isletme-kayit',
    label: 'İşletme Kaydı Başlat',
    ariaLabel: 'İşletme kaydı başlat',
  },
  secondary: {
    href: '/iletisim',
    label: 'İletişim ve Destek',
    ariaLabel: 'İletişim ve destek',
  },
} as const;

export function buildHomepageServiceCards(params: {
  pharmacyCount: number;
  busRouteCount: number;
  upcomingEventsCount: number;
}) {
  const { pharmacyCount, busRouteCount, upcomingEventsCount } = params;
  return [
    {
      href: '/saglik/nobetci-eczaneler',
      icon: 'pill',
      metric: pharmacyCount > 0 ? String(pharmacyCount) : '-',
      label: 'Nöbetçi Eczane',
      description: 'Resmi liste ve veri tazeliği takibi',
    },
    {
      href: '/ulasim/otobus-saatleri',
      icon: 'bus',
      metric: busRouteCount > 0 ? String(busRouteCount) : '-',
      label: 'Otobüs Saatleri',
      description: 'Hatlar, sonraki sefer ve ulaşım akışı',
    },
    {
      href: '/etkinlikler',
      icon: 'calendar-days',
      metric: upcomingEventsCount > 0 ? String(upcomingEventsCount) : '-',
      label: 'Etkinlikler',
      description: 'Takvimde one cikan sehir programi',
    },
    {
      href: '/harita',
      icon: 'map',
      metric: 'Canli',
      label: 'Şehir Haritası',
      description: 'Mekanları ve rotaları katmanlı görünümle aç',
    },
  ] as const;
}
