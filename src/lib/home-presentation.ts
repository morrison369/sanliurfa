import type {
  HomeActionCard,
  HomeAudiencePlan,
  HomeCategoryDensityCard,
  HomeCategoryLink,
  HomeCommunityPanel,
  HomeFaqItem,
  HomeGuideLink,
  HomeHeroQuickLink,
  HomeDistrictServiceLink,
  HomeHistoricalSite,
  HomeLiveStatusCard,
  HomeMvpCard,
  HomeReviewHighlight,
  HomeServiceQuickLink,
  HomeTrustSignal,
} from '../types/home-sections';
import { buildFreshnessLabel, isFreshnessStale } from './city-service-freshness';

type RecordLike = Record<string, unknown>;
type HomeServiceQuickLinkWithTone = HomeServiceQuickLink & {
  categoryLabelClass: string;
};

function withOptional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  if (value === null || value === undefined) {
    return {} as { [P in K]?: V };
  }
  return { [key]: value } as { [P in K]?: V };
}

function readRecord(value: unknown): RecordLike | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordLike)
    : null;
}

function defaultFreshnessKeyByCardKey(key: string): string {
  if (key === 'pharmacy') return 'pharmacy.lastUpdated';
  if (key === 'bus') return 'transport.lastUpdated';
  return 'weather.lastUpdated';
}

export function buildLiveStatusCards(params: {
  items: RecordLike[];
  pharmacyCount: number;
  busRouteCount: number;
  serviceFreshness: Record<string, string>;
}): HomeLiveStatusCard[] {
  const { items, pharmacyCount, busRouteCount, serviceFreshness } = params;
  return items.map((card) => {
    const payload = readRecord(card.payload);
    const key = String(card.key || '');
    const customMetric = String(card.metric || payload?.metric || '').trim();
    const freshnessKey = String(card.freshnessKey || payload?.freshnessKey || '').trim();
    const resolvedFreshnessKey = freshnessKey || defaultFreshnessKeyByCardKey(key);
    const stale = isFreshnessStale(resolvedFreshnessKey, serviceFreshness);
    const metric =
      customMetric ||
      (key === 'pharmacy' ? `${pharmacyCount}+` : key === 'bus' ? `${busRouteCount}+` : key === 'flight' ? 'GAP' : '--');

    return {
      icon: String(card.icon || 'lucide:activity'),
      title: String(card.title || 'Şehir Servisi'),
      metric,
      metricLabel: String(card.metricLabel || payload?.metricLabel || 'canlı servis'),
      freshness: buildFreshnessLabel(resolvedFreshnessKey, serviceFreshness),
      href: String(card.href || '#'),
      cta: String(card.cta || payload?.cta || 'Detay'),
      stale,
      statusText: stale ? 'SLA disi veri' : String(card.statusText || payload?.statusText || 'Servis aktif'),
      badgeClass: stale
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
        : String(card.badgeClass || 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'),
    };
  });
}

export function resolveLiveStatusCardItems(params: {
  items: RecordLike[];
  platformCityServices: RecordLike[];
  pharmacyCount: number;
  busRouteCount: number;
}): RecordLike[] {
  const { items, platformCityServices, pharmacyCount, busRouteCount } = params;

  if (items.length > 0) {
    return items;
  }

  if (platformCityServices.length > 0) {
    return platformCityServices.slice(0, 3).map((entry) => {
      const payload = readRecord(entry.payload);
      return {
        key: entry.service_key,
        icon: String(payload?.icon || 'lucide:activity'),
        title: String(entry.title || 'Şehir Servisi'),
        metricLabel: String(payload?.metricLabel || 'canlı servis'),
        statusText: String(payload?.statusText || entry.summary || 'Servis aktif'),
        href: String(entry.href || '#'),
        cta: String(payload?.cta || `${entry.title} aç`),
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      };
    });
  }

  return [
    {
      key: 'pharmacy',
      icon: 'lucide:cross',
      title: 'Nöbetçi Eczane Durumu',
      metricLabel: 'kayıtlı nöbetçi eczane',
      statusText: pharmacyCount > 0 ? 'Aktif veri akışı' : 'Veri güncellemesi bekleniyor',
      href: '/saglik/nobetci-eczaneler',
      cta: 'Nöbetçi Eczaneleri Aç',
      badgeClass:
        pharmacyCount > 0
          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    },
    {
      key: 'bus',
      icon: 'lucide:bus',
      title: 'Otobüs Saatleri Durumu',
      metricLabel: 'aktif otobüs hattı',
      statusText: busRouteCount > 0 ? 'Hat verisi hazır' : 'Hat verisi hazırlanıyor',
      href: '/ulasim/otobus-saatleri',
      cta: 'Otobüs Saatlerini Aç',
      badgeClass:
        busRouteCount > 0
          ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    },
    {
      key: 'flight',
      icon: 'lucide:plane',
      title: 'Uçak Saatleri Durumu',
      metricLabel: 'havalimanı odaklı takip',
      statusText: 'Planlama rehberi aktif',
      href: '/ulasim/ucak-saatleri',
      cta: 'Uçak Saatlerini Aç',
      badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
    },
  ];
}

export function buildServiceQuickLinks(
  items: RecordLike[],
  platformCityServices: RecordLike[],
): HomeServiceQuickLink[] {
  if (items.length > 0) {
    return items as unknown as HomeServiceQuickLink[];
  }

  if (platformCityServices.length > 0) {
    return platformCityServices.slice(0, 3).map((entry, index) => {
      const payload = readRecord(entry.payload);
      return {
        key: String(entry.service_key || ''),
        icon: String(payload?.icon || (index === 0 ? 'lucide:cross' : index === 1 ? 'lucide:bus' : 'lucide:plane')),
        categoryLabel: String(payload?.categoryLabel || entry.service_group || 'Şehir Servisi'),
        title: String(entry.title || 'Şehir Servisi'),
        description: String(entry.summary || payload?.description || 'Şehir servisine hızlı erişim.'),
        href: String(entry.href || '#'),
        hoverBorderClass:
          index === 0
            ? 'hover:border-emerald-400/60'
            : index === 1
              ? 'hover:border-sky-400/60'
              : 'hover:border-violet-400/60',
      };
    });
  }

  return [
    {
      key: 'pharmacy',
      icon: 'lucide:cross',
      categoryLabel: 'Sağlık',
      title: 'Yakındaki Nöbetçi Eczane Akışı',
      description: 'İlçe seçimiyle anında nöbetçi eczane sonuçlarını açın.',
      href: '/saglik/nobetci-eczaneler',
      hoverBorderClass: 'hover:border-emerald-400/60',
    },
    {
      key: 'bus',
      icon: 'lucide:bus',
      categoryLabel: 'Ulaşım',
      title: 'İlçe Bazlı Otobüs Saatleri',
      description: 'Günlük rota planı için hat ve saat ekranına hızlı geçiş yapın.',
      href: '/ulasim/otobus-saatleri',
      hoverBorderClass: 'hover:border-sky-400/60',
    },
    {
      key: 'flight',
      icon: 'lucide:plane',
      categoryLabel: 'Havalimanı',
      title: 'GAP Uçak Saatleri ve Planlama',
      description: 'Varış-kalkış odaklı uçuş planlamasını tek ekranda yönetin.',
      href: '/ulasim/ucak-saatleri',
      hoverBorderClass: 'hover:border-violet-400/60',
    },
  ];
}

export const HOME_HISTORICAL_FALLBACKS = [
  '/images/tarihi-yerler/harran-kumbet-evleri.jpg',
  '/images/blog/gobeklitepe.jpg',
  '/images/blog/balikligol.jpg',
  '/images/blog/halfeti.jpg',
  '/images/blog/urfa-kalesi.jpg',
];

export const HOME_MVP_QUICK_START_FALLBACK: HomeMvpCard[] = [
  {
    badge: 'Günlük İhtiyaç',
    title: 'Nöbetçi eczane, otobüs ve uçak saatleri',
    description: "Şanlıurfa'da bugün ihtiyacın olan servisleri tek ekrandan aç.",
    href: '/kesfet',
    links: [
      { href: '/saglik/nobetci-eczaneler', label: 'Nöbetçi Eczane' },
      { href: '/ulasim/otobus-saatleri', label: 'Otobüs Saatleri' },
      { href: '/ulasim/ucak-saatleri', label: 'Uçak Saatleri' },
    ],
  },
  {
    badge: 'Keşif',
    title: 'Mekan, gezi rotası ve yemek tarifleri',
    description: 'Kebapçılar, tarihi yerler, ilçeler ve Şanlıurfa tariflerini hızlı başlat.',
    href: '/mekanlar',
    links: [
      { href: '/mekanlar/yeme-icme-kebapcilar', label: 'Kebapçılar' },
      { href: '/gezilecek-yerler', label: 'Gezilecek Yerler' },
      { href: '/yemek-tarifleri', label: 'Yemek Tarifleri' },
    ],
  },
  {
    badge: 'Topluluk',
    title: 'Ücretsiz sosyal özellikler ve işletme başvurusu',
    description: 'Mesajlaşma, eşleşme, takip ve işletme ekleme ilk aşamada açık.',
    href: '/topluluk',
    links: [
      { href: '/topluluk', label: 'Topluluk' },
      { href: '/eslesme', label: 'Eşleşme' },
      { href: '/isletme-kayit', label: 'İşletme Ekle' },
    ],
  },
];

export const HOME_AUDIENCE_PLAN_FALLBACK: HomeAudiencePlan[] = [
  {
    badge: 'Turist Rotası',
    title: '1 günde Şanlıurfa',
    description: 'Göbeklitepe, Balıklıgöl ve çarşı hattını hızlı bir şehir turunda birleştirin.',
    bullets: ['Sabah tarihi duraklar', 'Öğlen yöresel yemek molası', 'Akşam merkezi yürüyüş rotası'],
    href: '/gezilecek-yerler',
    cta: 'Rotayı Aç',
  },
  {
    badge: 'Aile Planı',
    title: 'Ailece güvenli ve rahat mekanlar',
    description: 'Çocuk dostu, oturma alanı güçlü ve erişimi kolay mekanları öne çıkarın.',
    bullets: ['Kahvaltı ve aile masaları', 'Merkez ilçelere hızlı erişim', 'Etkinlik ve park yakınlığı'],
    href: '/yeme-icme/aile-mekanlari',
    cta: 'Aile Mekanlarını Aç',
  },
  {
    badge: 'Öğrenci Rehberi',
    title: 'Bütçe dostu günlük plan',
    description: 'Uygun fiyatlı yemek, kafe ve ulaşım odaklı hızlı şehir kullanım rehberi.',
    bullets: ['Ekonomik yeme içme', 'Otobüs saatleri ile planlama', 'Topluluk ve buluşma odaklı akış'],
    href: '/yeme-icme/uygun-fiyatli-mekanlar',
    cta: 'Öğrenci Planını Aç',
  },
];

export const HOME_PRIMARY_ACTIONS_FALLBACK = (params: {
  pharmacyCount: number;
  busRouteCount: number;
  upcomingEventsCount: number;
  featuredRecipeCount?: number;
  districtCount?: number;
  totalPlaceCount?: number;
}): HomeActionCard[] => [
  {
    icon: 'lucide:cross',
    title: 'Nöbetçi Eczaneler',
    description: 'İlçe bazlı güncel nöbetçi eczane listesi.',
    href: '/saglik/nobetci-eczaneler',
    stat: `${params.pharmacyCount}+ eczane`,
  },
  {
    icon: 'lucide:bus',
    title: 'Otobüs Saatleri',
    description: 'Şehir içi otobüs saat ve hat bilgileri.',
    href: '/ulasim/otobus-saatleri',
    stat: `${params.busRouteCount}+ hat`,
  },
  {
    icon: 'lucide:plane',
    title: 'Uçak Saatleri',
    description: 'GAP Havalimanı odaklı uçuş planlama rehberi.',
    href: '/ulasim/ucak-saatleri',
    stat: 'Güncel uçuş rehberi',
  },
  {
    icon: 'lucide:calendar-days',
    title: 'Etkinlik Takvimi',
    description: 'Konser, festival ve yerel etkinlik akışı.',
    href: '/etkinlikler',
    stat: `${params.upcomingEventsCount}+ etkinlik`,
  },
  {
    icon: 'lucide:utensils-crossed',
    title: 'Yemek Tarifleri',
    description: 'Şanlıurfa özel tarifler ve mutfak rehberi.',
    href: '/yemek-tarifleri',
    stat: `${Number(params.featuredRecipeCount || 0)}+ öne çıkan`,
  },
  {
    icon: 'lucide:map',
    title: 'İlçeler Rehberi',
    description: 'İlçe bazlı mekan ve yaşam içerikleri.',
    href: '/ilceler',
    stat: `${Number(params.districtCount || 0)} merkez ilçe`,
  },
  {
    icon: 'lucide:store',
    title: 'Mekanlar Rehberi',
    description: 'Kebapçılar, ciğerciler, kahvaltı ve daha fazlası.',
    href: '/mekanlar',
    stat: `${Number(params.totalPlaceCount || 0)}+ aktif mekan`,
  },
];

export const HOME_QUICK_CATEGORIES_FALLBACK: HomeCategoryLink[] = [
  { slug: 'kebapcilar', name: 'Kebapçılar' },
  { slug: 'cigerciler', name: 'Ciğerciler' },
  { slug: 'lahmacuncular', name: 'Lahmacuncular' },
  { slug: 'pideciler', name: 'Pideciler' },
  { slug: 'cig-kofteciler', name: 'Çiğ Köfteciler' },
  { slug: 'yoresel-yemekler', name: 'Yöresel Yemekler' },
  { slug: 'kahvalti-mekanlari', name: 'Kahvaltı Mekanları' },
  { slug: 'tatlicilar', name: 'Tatlıcılar' },
  { slug: 'kafeler', name: 'Kafeler' },
  { slug: 'cay-bahceleri', name: 'Çay Bahçeleri' },
  { slug: 'firinlar', name: 'Fırınlar' },
  { slug: 'balik-restoranlari', name: 'Balık Restoranları' },
];

export const HOME_FEATURED_GUIDES_FALLBACK: HomeGuideLink[] = [
  { title: 'Şanlıurfa Kebapçılar Rehberi', href: '/mekanlar/yeme-icme-kebapcilar', icon: 'lucide:beef' },
  { title: 'Şanlıurfa Ciğerciler Rehberi', href: '/mekanlar/yeme-icme-cigerciler', icon: 'lucide:flame' },
  { title: 'Şanlıurfa Kahvaltı Mekanları', href: '/mekanlar/yeme-icme-kahvalti-mekanlari', icon: 'lucide:sun' },
  { title: 'Şanlıurfa Gezilecek Yerler', href: '/gezilecek-yerler', icon: 'lucide:landmark' },
  { title: 'Şanlıurfa Otobüs Saatleri', href: '/ulasim/otobus-saatleri', icon: 'lucide:bus' },
  { title: 'Şanlıurfa Uçak Saatleri', href: '/ulasim/ucak-saatleri', icon: 'lucide:plane' },
  { title: 'Şanlıurfa Nöbetçi Eczaneler', href: '/saglik/nobetci-eczaneler', icon: 'lucide:cross' },
  { title: 'Şanlıurfa Topluluk Özellikleri', href: '/topluluk', icon: 'lucide:users' },
];

export const HOME_HERO_QUICK_LINKS_FALLBACK: HomeHeroQuickLink[] = [
  { label: 'Nöbetçi Eczaneler', href: '/saglik/nobetci-eczaneler' },
  { label: 'Otobüs Saatleri', href: '/ulasim/otobus-saatleri' },
  { label: 'Uçak Saatleri', href: '/ulasim/ucak-saatleri' },
  { label: 'Etkinlikler', href: '/etkinlikler' },
  { label: 'Yemek Tarifleri', href: '/yemek-tarifleri' },
];

export const HOME_COMMUNITY_PANEL_FALLBACK: HomeCommunityPanel = {
  title: 'Topluluk ve Eşleşme',
  description:
    'Sosyal özellikler (takip, aktivite, mesajlaşma) ve eşleşme modülüyle topluluk deneyimini genişletebilirsiniz.',
  items: [
    { label: 'Topluluk Özellikleri', href: '/topluluk' },
    { label: 'Eşleşme', href: '/eslesme' },
    { label: 'Üyelik ve Planlar', href: '/fiyatlandirma' },
  ],
};

export const HOME_TRENDING_FALLBACK = [
  { query: 'Şanlıurfa nöbetçi eczane', search_count: 0 },
  { query: 'Şanlıurfa otobüs saatleri', search_count: 0 },
  { query: 'Şanlıurfa uçak saatleri', search_count: 0 },
  { query: 'Şanlıurfa kebapçılar', search_count: 0 },
  { query: 'Şanlıurfa gezilecek yerler', search_count: 0 },
];

export const HOME_FAQ_FALLBACK: HomeFaqItem[] = [
  {
    S: 'Şanlıurfa nöbetçi eczane listesi nereden öğrenilir?',
    C: 'Güncel nöbetçi eczaneler için doğrudan /saglik/nobetci-eczaneler sayfasını kullanabilirsiniz.',
  },
  {
    S: 'Şanlıurfa otobüs saatleri bu sitede var mı?',
    C: 'Evet. /ulasim/otobus-saatleri sayfasında hat ve saat bilgilerine hızlıca erişebilirsiniz.',
  },
  {
    S: 'Şanlıurfa uçak saatleri nereden takip edilir?',
    C: 'GAP Havalimanı uçuş planlama rehberi için /ulasim/ucak-saatleri sayfasını kullanabilirsiniz.',
  },
  {
    S: "Şanlıurfa'da en iyi mekanlar nasıl bulunur?",
    C: 'Mekanlar bölümünde kategori, ilçe ve puana göre filtreleyerek size uygun işletmeleri sıralayabilirsiniz.',
  },
  {
    S: 'Şanlıurfa yemek tarifleri içerikleri mevcut mu?',
    C: 'Evet. /yemek-tarifleri sayfasında Şanlıurfa mutfağına özel tarifler yayınlanmaktadır.',
  },
];

export const HOME_QUICK_CATEGORY_ICON_MAP: Record<string, string> = {
  kebapcilar: 'lucide:beef',
  cigerciler: 'lucide:flame',
  lahmacuncular: 'lucide:pizza',
  pideciler: 'lucide:sandwich',
  'cig-kofteciler': 'lucide:utensils-crossed',
  'yoresel-yemekler': 'lucide:chef-hat',
  'kahvalti-mekanlari': 'lucide:sun',
  tatlicilar: 'lucide:ice-cream-bowl',
  kafeler: 'lucide:coffee',
  'cay-bahceleri': 'lucide:cup-soda',
  firinlar: 'lucide:croissant',
  'balik-restoranlari': 'lucide:fish',
};

export function getQuickCategoryIcon(slug: string): string {
  return HOME_QUICK_CATEGORY_ICON_MAP[slug] || 'lucide:grid-2x2';
}

export function buildHistoricalCardImage(site: HomeHistoricalSite | RecordLike): string {
  const siteRecord = readRecord(site) ?? site;
  const images = Array.isArray(siteRecord.images) ? siteRecord.images : [];
  return String(siteRecord.cover_image || images[0] || '/images/hero/hero-home.webp');
}

export function buildDistrictServiceLinks(districts: RecordLike[]): HomeDistrictServiceLink[] {
  return districts.slice(0, 8).map((district) => ({
    name: String(district.name || ''),
    href: `/ilceler/${String(district.slug || '').trim()}`,
    placeCount: Number(district.place_count || 0),
  }));
}

export function buildRecentTrustSignals(
  recentPlaces: RecordLike[],
  formatShortDate: (value?: string | Date) => string,
): HomeTrustSignal[] {
  return recentPlaces.slice(0, 6).map((place) => ({
    slug: String(place.slug || ''),
    name: String(place.name || ''),
    district: String(place.district_name || place.address_district || 'Şanlıurfa'),
    updatedAt: formatShortDate(
      typeof place.updated_at === 'string' || place.updated_at instanceof Date
        ? place.updated_at
        : typeof place.created_at === 'string' || place.created_at instanceof Date
          ? place.created_at
          : undefined,
    ),
    rating: place.rating ? Number(place.rating).toFixed(1) : '-',
  }));
}

export function buildMvpQuickStartCards(items: RecordLike[]): HomeMvpCard[] {
  if (items.length === 0) {
    return HOME_MVP_QUICK_START_FALLBACK;
  }

  const cards = items
    .map((card) => {
      const cardRecord = readRecord(card) ?? {};
      const links = Array.isArray(cardRecord.links)
        ? cardRecord.links
            .map((link) => {
              const linkRecord = readRecord(link) ?? {};
              return {
                href: String(linkRecord.href || '').trim(),
                label: String(linkRecord.label || '').trim(),
              };
            })
            .filter((link) => link.href.startsWith('/') && link.label)
        : [];

      return {
        badge: String(cardRecord.badge || '').trim(),
        title: String(cardRecord.title || '').trim(),
        description: String(cardRecord.description || '').trim(),
        href: String(cardRecord.href || '/').trim(),
        links,
      };
    })
    .filter((card) => card.badge && card.title && card.description && card.href.startsWith('/'));

  return cards.length > 0 ? cards : HOME_MVP_QUICK_START_FALLBACK;
}

export function buildReviewHighlights(
  recentReviewHighlights: RecordLike[],
  formatShortDate: (value?: string | Date) => string,
): HomeReviewHighlight[] {
  return recentReviewHighlights.map((item) => {
    const excerptSource = String(item.content || '').replace(/\s+/g, ' ').trim();
    return {
      place_slug: String(item.place_slug || ''),
      place_name: String(item.place_name || ''),
      rating: typeof item.rating === 'number' ? item.rating : item.rating ? Number(item.rating) : null,
      excerpt: excerptSource.slice(0, 180) || 'Bu mekan için yeni bir değerlendirme eklendi.',
      author_name: String(item.author_name || ''),
      createdLabel: formatShortDate(
        typeof item.created_at === 'string' || item.created_at instanceof Date
          ? item.created_at
          : undefined,
      ),
    };
  });
}

export function buildCategoryDensityCards(
  categoryHeatmap: RecordLike[],
): HomeCategoryDensityCard[] {
  const maxCategoryDensity = Math.max(...categoryHeatmap.map((c) => Number(c.place_count || 0)), 1);
  return categoryHeatmap.map((item) => {
    const count = Number(item.place_count || 0);
    const ratio = Math.max(8, Math.round((count / maxCategoryDensity) * 100));
    return {
      slug: String(item.slug || ''),
      name: String(item.name || ''),
      count,
      ratio,
    };
  });
}

export function buildPrimaryActions(params: {
  settingItems: RecordLike[];
  platformPrimaryActions: HomeActionCard[];
  pharmacyCount: number;
  busRouteCount: number;
  upcomingEventsCount: number;
  featuredRecipeCount?: number;
  districtCount?: number;
  totalPlaceCount?: number;
}): HomeActionCard[] {
  const fallback = HOME_PRIMARY_ACTIONS_FALLBACK(params);
  if (params.settingItems.length > 0) {
    return params.settingItems as unknown as HomeActionCard[];
  }
  if (params.platformPrimaryActions.length > 0) {
    return [...params.platformPrimaryActions, ...fallback].slice(0, 8);
  }
  return fallback;
}

export function buildQuickCategories(items: RecordLike[]): HomeCategoryLink[] {
  if (items.length === 0) {
    return HOME_QUICK_CATEGORIES_FALLBACK;
  }
  const categories = items
    .map((item) => ({
      slug: String(item.slug || '').trim(),
      name: String(item.name || '').trim(),
    }))
    .filter((item) => item.slug && item.name);
  return categories.length > 0 ? categories : HOME_QUICK_CATEGORIES_FALLBACK;
}

export function buildFeaturedGuides(items: RecordLike[]): HomeGuideLink[] {
  return items.length > 0 ? (items as unknown as HomeGuideLink[]) : HOME_FEATURED_GUIDES_FALLBACK;
}

export function buildHeroQuickLinks(
  items: RecordLike[],
  platformCityServices: RecordLike[],
): HomeHeroQuickLink[] {
  if (items.length > 0) {
    return items as unknown as HomeHeroQuickLink[];
  }
  const platformHeroQuickLinks = platformCityServices
    .map((entry) => ({
      label: String(entry.title || ''),
      href: String(entry.href || '#'),
    }))
    .filter((item) => item.label && item.href.startsWith('/'));
  return platformHeroQuickLinks.length > 0
    ? platformHeroQuickLinks.slice(0, 5)
    : HOME_HERO_QUICK_LINKS_FALLBACK;
}

export function buildTrendingFallbackQueries(items: RecordLike[]): Array<{ query: string; search_count: number }> {
  if (items.length === 0) {
    return HOME_TRENDING_FALLBACK;
  }
  const queries = items
    .map((item) => ({
      query: String(item.query || '').trim(),
      search_count: 0,
    }))
    .filter((item) => item.query);
  return queries.length > 0 ? queries : HOME_TRENDING_FALLBACK;
}

export function buildCommunityPanel(setting: unknown): HomeCommunityPanel {
  const settingRecord = readRecord(setting);
  if (settingRecord?.title && settingRecord?.description) {
    const items = Array.isArray(settingRecord.items)
      ? settingRecord.items
          .map((item) => {
            const itemRecord = readRecord(item) ?? {};
            return {
              label: String(itemRecord.label || '').trim(),
              href: String(itemRecord.href || '').trim(),
            };
          })
          .filter((item) => item.label && item.href.startsWith('/'))
      : HOME_COMMUNITY_PANEL_FALLBACK.items;
    return {
      title: String(settingRecord.title),
      description: String(settingRecord.description),
      items: items.length > 0 ? items : HOME_COMMUNITY_PANEL_FALLBACK.items,
    };
  }
  return HOME_COMMUNITY_PANEL_FALLBACK;
}

export function buildFaqItems(items: RecordLike[]): HomeFaqItem[] {
  return items.length > 0 ? (items as unknown as HomeFaqItem[]) : HOME_FAQ_FALLBACK;
}

export function buildHomepageSupportContent(params: {
  primaryActionsItems: RecordLike[];
  platformPrimaryActions: HomeActionCard[];
  pharmacyCount: number;
  busRouteCount: number;
  upcomingEventsCount: number;
  featuredRecipeCount?: number;
  districtCount?: number;
  totalPlaceCount?: number;
  quickCategoriesItems: RecordLike[];
  featuredGuidesItems: RecordLike[];
  faqItems: RecordLike[];
  heroQuickLinksItems: RecordLike[];
  platformCityServices: RecordLike[];
  trendingFallbackItems: RecordLike[];
  communityPanelSetting: unknown;
  categoryHeatmap: RecordLike[];
}): {
  primaryActions: HomeActionCard[];
  quickCategories: HomeCategoryLink[];
  featuredGuides: HomeGuideLink[];
  faqItems: HomeFaqItem[];
  heroQuickLinks: HomeHeroQuickLink[];
  trendingFallbackQueries: Array<{ query: string; search_count: number }>;
  communityPanel: HomeCommunityPanel;
  categoryDensityCards: HomeCategoryDensityCard[];
} {
  return {
    primaryActions: buildPrimaryActions({
      settingItems: params.primaryActionsItems,
      platformPrimaryActions: params.platformPrimaryActions,
      pharmacyCount: params.pharmacyCount,
      busRouteCount: params.busRouteCount,
      upcomingEventsCount: params.upcomingEventsCount,
      ...withOptional('featuredRecipeCount', params.featuredRecipeCount),
      ...withOptional('districtCount', params.districtCount),
      ...withOptional('totalPlaceCount', params.totalPlaceCount),
    }),
    quickCategories: buildQuickCategories(params.quickCategoriesItems),
    featuredGuides: buildFeaturedGuides(params.featuredGuidesItems),
    faqItems: buildFaqItems(params.faqItems),
    heroQuickLinks: buildHeroQuickLinks(params.heroQuickLinksItems, params.platformCityServices),
    trendingFallbackQueries: buildTrendingFallbackQueries(params.trendingFallbackItems),
    communityPanel: buildCommunityPanel(params.communityPanelSetting),
    categoryDensityCards: buildCategoryDensityCards(params.categoryHeatmap),
  };
}

export function buildHomepageRuntimeMeta(serviceFreshness: Record<string, string>): {
  generatedAtIso: string;
  maxFreshnessIso: string;
  lastUpdatedLabel: string;
} {
  const generatedAtIso = new Date().toISOString();
  const parseIsoOrEmpty = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  };

  const maxFreshnessIso =
    [
      parseIsoOrEmpty(serviceFreshness['transport.lastUpdated']),
      parseIsoOrEmpty(serviceFreshness['weather.lastUpdated']),
      parseIsoOrEmpty(serviceFreshness['pharmacy.lastUpdated'] || serviceFreshness['jobs.contentQuality.lastRun']),
    ]
      .filter(Boolean)
      .sort()
      .pop() || generatedAtIso;

  const lastUpdatedLabel = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(maxFreshnessIso));

  return {
    generatedAtIso,
    maxFreshnessIso,
    lastUpdatedLabel,
  };
}

export function buildHomepageDynamicSectionData(params: {
  serviceQuickLinksItems: RecordLike[];
  platformCityServices: RecordLike[];
  districts: RecordLike[];
  recentPlaces: RecordLike[];
  formatShortDate: (value?: string | Date) => string;
  mvpQuickStartItems: RecordLike[];
  recentReviewHighlights: RecordLike[];
}): {
  serviceQuickLinks: HomeServiceQuickLinkWithTone[];
  districtServiceLinks: HomeDistrictServiceLink[];
  recentTrustSignals: HomeTrustSignal[];
  mvpQuickStartCards: HomeMvpCard[];
  audiencePlans: HomeAudiencePlan[];
  reviewHighlights: HomeReviewHighlight[];
} {
  const serviceQuickLinks = buildServiceQuickLinks(
    params.serviceQuickLinksItems,
    params.platformCityServices,
  ).map((item) => ({
    ...item,
    categoryLabelClass:
      item.key === 'pharmacy'
        ? 'text-emerald-300'
        : item.key === 'bus'
          ? 'text-sky-300'
          : 'text-violet-300',
  }));

  return {
    serviceQuickLinks,
    districtServiceLinks: buildDistrictServiceLinks(params.districts),
    recentTrustSignals: buildRecentTrustSignals(params.recentPlaces, params.formatShortDate),
    mvpQuickStartCards: buildMvpQuickStartCards(params.mvpQuickStartItems),
    audiencePlans: HOME_AUDIENCE_PLAN_FALLBACK,
    reviewHighlights: buildReviewHighlights(
      params.recentReviewHighlights,
      params.formatShortDate,
    ),
  };
}

export function mergeHomepageSeo<T extends Record<string, unknown>>(params: {
  seo: T;
  platformHomepageSeoPayload: Record<string, unknown> | null;
  platformHomepageCanonical: string;
}): T {
  const { seo, platformHomepageSeoPayload, platformHomepageCanonical } = params;
  if (!platformHomepageSeoPayload) {
    return seo;
  }

  return {
    ...seo,
    ...platformHomepageSeoPayload,
    canonical:
      platformHomepageCanonical ||
      String(platformHomepageSeoPayload.canonical || '').trim() ||
      seo.canonical,
  } as T;
}
