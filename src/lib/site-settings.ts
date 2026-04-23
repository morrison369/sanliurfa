import { query, queryOne } from './postgres';
import { logger } from './logging';

export interface HeroFeature {
  label: string;
  description: string;
}

export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroSettings {
  badgeText: string;
  titleLines: string[];
  subtitle: string;
  searchPlaceholder: string;
  backgroundImage: string;
  backgroundAlt: string;
  popularSearches: string[];
  features: HeroFeature[];
  ctaPrimary: HeroCta;
  ctaSecondary: HeroCta;
}

export interface HeaderSubMenuItem {
  label: string;
  href: string;
  description?: string;
}

export interface HeaderMenuItem {
  label: string;
  href: string;
  dropdown?: HeaderSubMenuItem[];
}

export interface SiteLinkItem {
  label: string;
  href: string;
}

export interface CityServiceItem {
  slug: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  detailTitle?: string;
  detailDescription?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  statusText?: string;
  lastUpdatedAt?: string;
}

export interface FooterColumn {
  title: string;
  links: SiteLinkItem[];
}

export interface FooterSettings {
  newsletterTitle: string;
  newsletterDescription: string;
  brandName: string;
  brandDescription: string;
  email: string;
  phoneLabel: string;
  phoneHref: string;
  address: string;
  socialNote: string;
  columns: FooterColumn[];
}

export interface SeoDefaults {
  defaultDescription: string;
  defaultImage: string;
  titleSuffix: string;
  keywords: string[];
}

export interface PublicSiteSettings {
  hero: HeroSettings;
  homepageSections: string[];
  headerMenu: HeaderMenuItem[];
  cityServices: CityServiceItem[];
  footer: FooterSettings;
  seo: SeoDefaults;
}

export const PUBLIC_SITE_SETTINGS_KEY = 'public_site_settings';
const SETTINGS_CACHE_TTL_MS = 60 * 1000;
let settingsCache: PublicSiteSettings | null = null;
let settingsCacheExpiresAt = 0;

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  hero: {
    badgeText: 'Şanlıurfa odaklı güncel şehir rehberi',
    titleLines: ['Şanlıurfa’yı', 'Keşfetmenin', 'En Güçlü Yolu'],
    subtitle:
      "Şanlıurfa'nın tarihi, gastronomisi, mekanları ve sosyal yaşamı tek platformda. Güvenilir içerik, güncel veriler ve güçlü topluluk deneyimi.",
    searchPlaceholder: 'Mekan, tarihi yer, yemek veya kategori ara...',
    backgroundImage: '/images/hero-gobeklitepe.jpg',
    backgroundAlt: 'Göbeklitepe panoraması',
    popularSearches: ['Göbeklitepe', 'Balıklıgöl', 'Urfa Kebabı', 'Halfeti', 'Harran Evleri', 'Sıra Gecesi'],
    features: [
      { label: '82+ Kategori', description: 'Şanlıurfa odaklı içerik' },
      { label: 'Güncel Rehber', description: 'Doğrulanmış şehir verisi' },
      { label: 'Topluluk Gücü', description: 'Yorum, puan, etkileşim' }
    ],
    ctaPrimary: {
      label: 'Şanlıurfa Mekanlarını Keşfet',
      href: '/places'
    },
    ctaSecondary: {
      label: 'Tarihi Yerler',
      href: '/tarihi-yerler'
    }
  },
  homepageSections: [
    'city-utilities',
    'weather',
    'stats',
    'featured-places',
    'historical-sites',
    'food-guide',
    'upcoming-events',
    'latest-blog',
    'cta'
  ],
  headerMenu: [
    {
      label: 'Keşfet',
      href: '/kesfet',
      dropdown: [
        { label: 'Tarihi Yerler', href: '/tarihi-yerler', description: 'Göbeklitepe, Balıklıgöl, Harran' },
        { label: 'Mekanlar', href: '/places', description: 'Restoran, kafe, otel, gezi noktaları' },
        { label: 'Gastronomi', href: '/gastronomi', description: 'Şanlıurfa lezzet rehberi' },
        { label: 'Etkinlikler', href: '/etkinlikler', description: 'Festivaller, konserler, şehir etkinlikleri' }
      ]
    },
    { label: 'Şehir Servisleri', href: '/sehir-servisleri' },
    { label: 'Blog', href: '/blog' },
    { label: 'İletişim', href: '/iletisim' }
  ],
  cityServices: [
    {
      slug: 'nobetci-eczaneler',
      title: 'Nöbetçi Eczaneler',
      description: 'İlçe bazlı güncel nöbetçi eczane listeleri',
      href: '/sehir-servisleri/nobetci-eczaneler',
      badge: 'Canlı',
      detailTitle: 'Şanlıurfa Nöbetçi Eczaneler',
      detailDescription:
        'Şanlıurfa nöbetçi eczane verisi ilçe bazında yayınlanır. Resmi veri entegrasyonu tamamlandığında eczane adı, adres, telefon ve konum bilgisi bu sayfada listelenir.',
      sourceLabel: 'Resmi nöbetçi eczane kaynakları',
      sourceUrl: 'https://www.sanliurfaeo.org.tr/',
      statusText: 'Canlı veri entegrasyonu için hazır',
      lastUpdatedAt: ''
    },
    {
      slug: 'otobus-saatleri',
      title: 'Otobüs Saatleri',
      description: 'Şanlıurfa toplu ulaşım saatleri ve hat bilgileri',
      href: '/sehir-servisleri/otobus-saatleri',
      detailTitle: 'Şanlıurfa Otobüs Saatleri',
      detailDescription:
        'Şanlıurfa şehir içi hatlar, duraklar ve kalkış saatleri bu bölümde yayınlanır. Hat arama ve ilçe filtreleme için veri modeli hazırdır.',
      sourceLabel: 'Şehir içi ulaşım veri kaynakları',
      sourceUrl: 'https://www.sanliurfa.bel.tr/',
      statusText: 'Hat verisi bağlantısı bekleniyor',
      lastUpdatedAt: ''
    },
    {
      slug: 'ucak-saatleri',
      title: 'Uçak Saatleri',
      description: 'Şanlıurfa GAP Havalimanı kalkış-varış saatleri',
      href: '/sehir-servisleri/ucak-saatleri',
      detailTitle: 'Şanlıurfa Uçak Saatleri',
      detailDescription:
        'Şanlıurfa GAP Havalimanı kalkış ve varış bilgileri bu bölümde yayınlanır. Canlı uçuş kaynağı bağlandığında havayolu, uçuş kodu, saat ve durum bilgileri gösterilir.',
      sourceLabel: 'Havalimanı ve uçuş veri kaynakları',
      sourceUrl: 'https://www.dhmi.gov.tr/',
      statusText: 'Uçuş verisi bağlantısı bekleniyor',
      lastUpdatedAt: ''
    }
  ],
  footer: {
    newsletterTitle: "Şanlıurfa'yı Keşfet",
    newsletterDescription: 'En yeni mekanlar, etkinlikler ve lezzetler için bültenimize abone ol.',
    brandName: 'sanliurfa.com',
    brandDescription:
      "Şanlıurfa'nın en kapsamlı şehir rehberi. Tarihi yerler, mekanlar, gastronomi ve etkinlikler tek bir platformda.",
    email: 'info@sanliurfa.com',
    phoneLabel: '',
    phoneHref: '',
    address: 'Haliliye, Şanlıurfa, Türkiye',
    socialNote: 'Resmi sosyal medya hesapları aktif edildiğinde bu alana eklenecektir.',
    columns: [
      {
        title: 'Keşfet',
        links: [
          { label: 'Tarihi Yerler', href: '/tarihi-yerler' },
          { label: 'Mekanlar', href: '/places' },
          { label: 'Şehir Servisleri', href: '/sehir-servisleri' },
          { label: 'Etkinlikler', href: '/etkinlikler' }
        ]
      },
      {
        title: 'Gastronomi',
        links: [
          { label: 'Urfa Kebabı', href: '/gastronomi/urfa-kebabi' },
          { label: 'Çiğ Köfte', href: '/gastronomi/cig-kofte' },
          { label: 'İsot', href: '/gastronomi/isot' },
          { label: 'Tüm Lezzetler', href: '/gastronomi' }
        ]
      },
      {
        title: 'Bilgi',
        links: [
          { label: 'Hakkımızda', href: '/hakkinda' },
          { label: 'Blog', href: '/blog' },
          { label: 'SSS', href: '/sss' },
          { label: 'İletişim', href: '/iletisim' }
        ]
      },
      {
        title: 'Yasal',
        links: [
          { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
          { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
          { label: 'Çerez Politikası', href: '/cerez-politikasi' },
          { label: 'KVKK Aydınlatma Metni', href: '/kvkk' }
        ]
      }
    ]
  },
  seo: {
    defaultDescription:
      'Şanlıurfa şehir rehberi, mekanlar, etkinlikler, gastronomi, tarihi yerler ve yerel topluluk platformu.',
    defaultImage: '/images/og-default.jpg',
    titleSuffix: 'sanliurfa.com',
    keywords: ['Şanlıurfa', 'Göbeklitepe', 'Balıklıgöl', 'Harran', 'Urfa', 'gezi rehberi', 'tarihi yerler']
  }
};

function toTrimmedString(input: unknown, fallback: string): string {
  if (typeof input !== 'string') {
    return fallback;
  }
  const value = input.trim();
  return value.length > 0 ? value : fallback;
}

function toHref(input: unknown, fallback: string): string {
  const value = toTrimmedString(input, fallback);
  if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return fallback;
}

function toStringArray(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) {
    return fallback;
  }
  const values = input
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  return values.length > 0 ? values : fallback;
}

function toHeroFeatureArray(input: unknown, fallback: HeroFeature[]): HeroFeature[] {
  if (!Array.isArray(input)) {
    return fallback;
  }
  const values = input
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const feature = entry as Partial<HeroFeature>;
      return {
        label: toTrimmedString(feature.label, fallback[index % fallback.length]?.label || 'Özellik'),
        description: toTrimmedString(feature.description, fallback[index % fallback.length]?.description || '')
      };
    })
    .filter((entry): entry is HeroFeature => entry !== null);

  return values.length > 0 ? values : fallback;
}

function sanitizeHeroSettings(input: Partial<HeroSettings> | undefined, fallback: HeroSettings): HeroSettings {
  const value = input || {};
  return {
    badgeText: toTrimmedString(value.badgeText, fallback.badgeText),
    titleLines: toStringArray(value.titleLines, fallback.titleLines).slice(0, 3),
    subtitle: toTrimmedString(value.subtitle, fallback.subtitle),
    searchPlaceholder: toTrimmedString(value.searchPlaceholder, fallback.searchPlaceholder),
    backgroundImage: toHref(value.backgroundImage, fallback.backgroundImage),
    backgroundAlt: toTrimmedString(value.backgroundAlt, fallback.backgroundAlt),
    popularSearches: toStringArray(value.popularSearches, fallback.popularSearches).slice(0, 10),
    features: toHeroFeatureArray(value.features, fallback.features).slice(0, 6),
    ctaPrimary: {
      label: toTrimmedString(value.ctaPrimary?.label, fallback.ctaPrimary.label),
      href: toHref(value.ctaPrimary?.href, fallback.ctaPrimary.href)
    },
    ctaSecondary: {
      label: toTrimmedString(value.ctaSecondary?.label, fallback.ctaSecondary.label),
      href: toHref(value.ctaSecondary?.href, fallback.ctaSecondary.href)
    }
  };
}

function sanitizeHeaderMenu(input: unknown, fallback: HeaderMenuItem[]): HeaderMenuItem[] {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const values: HeaderMenuItem[] = [];

  input.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const fallbackItem = fallback[index % fallback.length] || fallback[0];
    const item = entry as Partial<HeaderMenuItem>;
    const normalizedItem: HeaderMenuItem = {
      label: toTrimmedString(item.label, fallbackItem.label),
      href: toHref(item.href, fallbackItem.href)
    };

    if (Array.isArray(item.dropdown)) {
      const dropdown: HeaderSubMenuItem[] = [];
      item.dropdown.forEach((subEntry, subIndex) => {
        if (!subEntry || typeof subEntry !== 'object') {
          return;
        }
        const sub = subEntry as Partial<HeaderSubMenuItem>;
        const fallbackSub = fallbackItem.dropdown?.[subIndex % (fallbackItem.dropdown?.length || 1)];
        dropdown.push({
          label: toTrimmedString(sub.label, fallbackSub?.label || 'Menü'),
          href: toHref(sub.href, fallbackSub?.href || fallbackItem.href),
          description: toTrimmedString(sub.description, fallbackSub?.description || '')
        });
      });

      if (dropdown.length > 0) {
        normalizedItem.dropdown = dropdown;
      }
    }

    values.push(normalizedItem);
  });

  return values.length > 0 ? values : fallback;
}

function sanitizeCityServices(input: unknown, fallback: CityServiceItem[]): CityServiceItem[] {
  if (!Array.isArray(input)) {
    return fallback;
  }
  const values: CityServiceItem[] = [];

  input.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const service = entry as Partial<CityServiceItem>;
    const fallbackItem = fallback[index % fallback.length] || fallback[0];
    const badge = toTrimmedString(service.badge, fallbackItem.badge || '');
    values.push({
      slug: toTrimmedString(service.slug, fallbackItem.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title: toTrimmedString(service.title, fallbackItem.title),
      description: toTrimmedString(service.description, fallbackItem.description),
      href: toHref(service.href, fallbackItem.href),
      detailTitle: toTrimmedString(service.detailTitle, fallbackItem.detailTitle || fallbackItem.title),
      detailDescription: toTrimmedString(
        service.detailDescription,
        fallbackItem.detailDescription || fallbackItem.description
      ),
      sourceLabel: toTrimmedString(service.sourceLabel, fallbackItem.sourceLabel || 'Veri kaynağı'),
      sourceUrl: toHref(service.sourceUrl, fallbackItem.sourceUrl || ''),
      statusText: toTrimmedString(service.statusText, fallbackItem.statusText || 'Veri entegrasyonu hazır'),
      lastUpdatedAt: toTrimmedString(service.lastUpdatedAt, fallbackItem.lastUpdatedAt || ''),
      ...(badge ? { badge } : {})
    });
  });

  return values.length > 0 ? values : fallback;
}

function sanitizeLinkItems(input: unknown, fallback: SiteLinkItem[]): SiteLinkItem[] {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const values: SiteLinkItem[] = [];
  input.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const link = entry as Partial<SiteLinkItem>;
    const fallbackLink = fallback[index % fallback.length] || fallback[0];
    values.push({
      label: toTrimmedString(link.label, fallbackLink.label),
      href: toHref(link.href, fallbackLink.href)
    });
  });

  return values.length > 0 ? values : fallback;
}

function sanitizeFooterSettings(input: unknown, fallback: FooterSettings): FooterSettings {
  const value = input && typeof input === 'object' ? (input as Partial<FooterSettings>) : {};
  const fallbackColumns = fallback.columns;
  const columns: FooterColumn[] = [];

  if (Array.isArray(value.columns)) {
    value.columns.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const column = entry as Partial<FooterColumn>;
      const fallbackColumn = fallbackColumns[index % fallbackColumns.length] || fallbackColumns[0];
      columns.push({
        title: toTrimmedString(column.title, fallbackColumn.title),
        links: sanitizeLinkItems(column.links, fallbackColumn.links)
      });
    });
  }

  return {
    newsletterTitle: toTrimmedString(value.newsletterTitle, fallback.newsletterTitle),
    newsletterDescription: toTrimmedString(value.newsletterDescription, fallback.newsletterDescription),
    brandName: toTrimmedString(value.brandName, fallback.brandName),
    brandDescription: toTrimmedString(value.brandDescription, fallback.brandDescription),
    email: toTrimmedString(value.email, fallback.email),
    phoneLabel: toTrimmedString(value.phoneLabel, fallback.phoneLabel),
    phoneHref: toTrimmedString(value.phoneHref, fallback.phoneHref),
    address: toTrimmedString(value.address, fallback.address),
    socialNote: toTrimmedString(value.socialNote, fallback.socialNote),
    columns: columns.length > 0 ? columns : fallback.columns
  };
}

function sanitizeSeoDefaults(input: unknown, fallback: SeoDefaults): SeoDefaults {
  const value = input && typeof input === 'object' ? (input as Partial<SeoDefaults>) : {};

  return {
    defaultDescription: toTrimmedString(value.defaultDescription, fallback.defaultDescription),
    defaultImage: toHref(value.defaultImage, fallback.defaultImage),
    titleSuffix: toTrimmedString(value.titleSuffix, fallback.titleSuffix),
    keywords: toStringArray(value.keywords, fallback.keywords).slice(0, 20)
  };
}

function parseSettingValue(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function sanitizePublicSiteSettings(input: unknown): PublicSiteSettings {
  const candidate = input && typeof input === 'object' ? (input as Partial<PublicSiteSettings>) : {};

  return {
    hero: sanitizeHeroSettings(candidate.hero, DEFAULT_PUBLIC_SITE_SETTINGS.hero),
    homepageSections: sanitizeHomepageSections(
      candidate.homepageSections,
      DEFAULT_PUBLIC_SITE_SETTINGS.homepageSections
    ),
    headerMenu: sanitizeHeaderMenu(candidate.headerMenu, DEFAULT_PUBLIC_SITE_SETTINGS.headerMenu),
    cityServices: sanitizeCityServices(candidate.cityServices, DEFAULT_PUBLIC_SITE_SETTINGS.cityServices),
    footer: sanitizeFooterSettings(candidate.footer, DEFAULT_PUBLIC_SITE_SETTINGS.footer),
    seo: sanitizeSeoDefaults(candidate.seo, DEFAULT_PUBLIC_SITE_SETTINGS.seo)
  };
}

function sanitizeHomepageSections(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const allowed = new Set([
    'city-utilities',
    'weather',
    'stats',
    'featured-places',
    'historical-sites',
    'food-guide',
    'upcoming-events',
    'latest-blog',
    'cta'
  ]);

  const normalized = input
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
    .filter((entry) => entry.length > 0 && allowed.has(entry));

  const deduped: string[] = [];
  for (const item of normalized) {
    if (!deduped.includes(item)) {
      deduped.push(item);
    }
  }

  return deduped.length > 0 ? deduped : fallback;
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const now = Date.now();
  if (settingsCache && now < settingsCacheExpiresAt) {
    return settingsCache;
  }

  try {
    const row = await queryOne<{ setting_value: unknown }>(
      `SELECT setting_value
       FROM admin_dashboard_settings
       WHERE setting_key = $1 AND is_global = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [PUBLIC_SITE_SETTINGS_KEY]
    );

    if (!row?.setting_value) {
      settingsCache = DEFAULT_PUBLIC_SITE_SETTINGS;
      settingsCacheExpiresAt = now + SETTINGS_CACHE_TTL_MS;
      return settingsCache;
    }

    settingsCache = sanitizePublicSiteSettings(parseSettingValue(row.setting_value));
    settingsCacheExpiresAt = now + SETTINGS_CACHE_TTL_MS;
    return settingsCache;
  } catch (error) {
    logger.error('Public site settings could not be loaded', error instanceof Error ? error : new Error(String(error)));
    return DEFAULT_PUBLIC_SITE_SETTINGS;
  }
}

export async function getCityServiceSetting(slug: string): Promise<CityServiceItem | null> {
  const settings = await getPublicSiteSettings();
  return settings.cityServices.find((service) => service.slug === slug) || null;
}

export async function savePublicSiteSettings(settings: unknown, adminId: string): Promise<PublicSiteSettings> {
  const normalizedSettings = sanitizePublicSiteSettings(settings);

  try {
    const existing = await queryOne<{ id: string }>(
      `SELECT id
       FROM admin_dashboard_settings
       WHERE setting_key = $1 AND is_global = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [PUBLIC_SITE_SETTINGS_KEY]
    );

    if (existing?.id) {
      await query(
        `UPDATE admin_dashboard_settings
         SET setting_value = $2::jsonb,
             admin_id = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [existing.id, JSON.stringify(normalizedSettings), adminId]
      );
    } else {
      await query(
        `INSERT INTO admin_dashboard_settings (admin_id, setting_key, setting_value, is_global)
         VALUES ($1, $2, $3::jsonb, true)`,
        [adminId, PUBLIC_SITE_SETTINGS_KEY, JSON.stringify(normalizedSettings)]
      );
    }
  } catch (error) {
    logger.error('Public site settings could not be saved', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  settingsCache = normalizedSettings;
  settingsCacheExpiresAt = Date.now() + SETTINGS_CACHE_TTL_MS;

  return normalizedSettings;
}
