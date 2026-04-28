import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';

type HeroConfig = {
  badge: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  backgroundImage: string;
};

type HeroMetaConfig = {
  heroSectionClass: string;
  heroOverlayClass: string;
  heroContainerClass: string;
  heroGridClass: string;
  heroStatsPanelClass: string;
  heroStatsPanelTitleClass: string;
  heroStatsPanelSubtitleClass: string;
  heroStatsUpdatedClass: string;
  heroImageAlt: string;
  searchButtonLabel: string;
  businessCardBadge: string;
  businessCardTitle: string;
  businessCardDescription: string;
  communityCardBadge: string;
  communityCardTitle: string;
  communityCardDescription: string;
  statsPanelTitle: string;
  statsPanelSubtitle: string;
  statsActivePlacesLabel: string;
  statsPharmacyLabel: string;
  statsBusRouteLabel: string;
  statsEventsLabel: string;
  statsUpdatedPrefix: string;
  statsCardClass: string;
  statsLabelClass: string;
  statsValueClass: string;
  heroQuickLinkClass: string;
  heroQuickLinkHoverClass: string;
  searchFormClass: string;
  searchRowClass: string;
  searchInputClass: string;
  searchButtonClass: string;
  businessCardClass: string;
  communityCardClass: string;
  heroBadgeClass: string;
  heroTitleClass: string;
  heroDescriptionClass: string;
};

type HomepageSeoConfig = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  keywords: string[];
};

type HomepageSchemaConfig = {
  siteName: string;
  alternateName: string;
  baseUrl: string;
  searchPathTemplate: string;
  organizationId: string;
  webpageId: string;
  cityName: string;
  trendingListName: string;
  servicesListName: string;
  webpageName: string;
};

type HeaderBrandConfig = {
  topStripText: string;
  logoTitle: string;
  logoHighlight: string;
};

type HeaderLabelsConfig = {
  viewAllLabel: string;
  loginLabel: string;
  registerLabel: string;
  mobileBusinessCtaLabel: string;
};

type SocialProfileKey = 'instagram' | 'tiktok' | 'youtube' | 'x';

type SocialProfilesConfig = Record<
  SocialProfileKey,
  {
    enabled: boolean;
    handle?: string;
    url?: string;
  }
>;

type FooterBrandConfig = {
  title: string;
  highlight: string;
  description: string;
  infoNote: string;
};

type FooterBottomConfig = {
  copyrightLabel: string;
  legalLinks: Array<{ label: string; href: string }>;
};

type MainCtaConfig = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

type HomepageSectionsConfig = {
  order: string[];
  visibility: Record<string, boolean>;
};

const DEFAULT_HOMEPAGE_SECTION_ORDER = [
  'hero',
  'mvp-quick-start',
  'quick-actions',
  'live-status',
  'district-service',
  'popular-categories',
  'trend-density',
  'districts',
  'historical-sites',
  'featured-places',
  'recent-places',
  'trust-signals',
  'guides-community',
  'audience-plans',
  'district-spotlights',
  'recent-reviews',
  'main-categories',
  'recipes',
  'blog',
  'faq',
  'main-cta',
];

const HOMEPAGE_SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  'mvp-quick-start': 'MVP Hızlı Başlangıç',
  'quick-actions': 'Hızlı Erişim',
  'live-status': 'Güncel Durum',
  'district-service': 'İlçe Servisleri',
  'popular-categories': 'Popüler Kategoriler',
  'trend-density': 'Trend ve Yoğunluk',
  districts: 'İlçeler',
  'historical-sites': 'Gezilecek Yerler',
  'featured-places': 'Öne Çıkan Mekanlar',
  'recent-places': 'Yeni Mekanlar',
  'trust-signals': 'Güven Sinyalleri',
  'guides-community': 'Rehber ve Topluluk',
  'audience-plans': 'Niyete Göre Planlar',
  'district-spotlights': 'İlçe Vitrini',
  'recent-reviews': 'Son Yorumlar',
  'main-categories': 'Ana Kategoriler',
  recipes: 'Yemek Tarifleri',
  blog: 'Blog',
  faq: 'SSS',
  'main-cta': 'Ana CTA',
};

const MVP_QUICK_START_STYLE_KEYS = [
  'mvpQuickStartSectionClass',
  'mvpQuickStartContainerClass',
  'mvpQuickStartPanelClass',
  'mvpQuickStartHeaderClass',
  'mvpQuickStartBadgeClass',
  'mvpQuickStartTitleClass',
  'mvpQuickStartDescriptionClass',
  'mvpQuickStartCtaClass',
  'mvpQuickStartGridClass',
  'mvpQuickStartCardClass',
  'mvpQuickStartCardLinkClass',
  'mvpQuickStartCardBadgeClass',
  'mvpQuickStartCardTitleClass',
  'mvpQuickStartCardDescriptionClass',
  'mvpQuickStartLinksWrapClass',
  'mvpQuickStartLinkClass',
];

const MVP_QUICK_START_COPY_KEYS = [
  'mvpQuickStartBadge',
  'mvpQuickStartTitle',
  'mvpQuickStartDescription',
  'mvpQuickStartCtaLabel',
  'mvpQuickStartCtaHref',
];

const DEFAULT_HERO: HeroConfig = {
  badge: 'ŞANLIURFA ODAKLI DİJİTAL REHBER',
  title: 'Şanlıurfa için hızlı, modern ve güvenilir şehir rehberi',
  description:
    'Mekan keşfi, nöbetçi eczane, otobüs saatleri, ilçe bazlı içerik ve yemek tariflerini tek bir profesyonel platformda toplayan Şanlıurfa odaklı rehber.',
  searchPlaceholder: "Şanlıurfa’da mekan, kategori veya ilçe ara...",
  backgroundImage: '/images/hero/hero-home.webp',
};

const DEFAULT_HOMEPAGE_SEO: HomepageSeoConfig = {
  title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
  description:
    'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
  canonical: '/',
  ogImage: '/images/hero/hero-home.webp',
  keywords: [
    'Şanlıurfa',
    'Şanlıurfa şehir rehberi',
    'Şanlıurfa mekanlar',
    'Şanlıurfa nöbetçi eczane',
    'Şanlıurfa otobüs saatleri',
    'Şanlıurfa gezilecek yerler',
    'Sanliurfa.com',
  ],
};

const DEFAULT_HOMEPAGE_SCHEMA: HomepageSchemaConfig = {
  siteName: 'Sanliurfa.com',
  alternateName: 'Şanlıurfa Şehir Rehberi',
  baseUrl: 'https://sanliurfa.com',
  searchPathTemplate: '/arama?q={search_term_string}',
  organizationId: '/#organization',
  webpageId: '/#webpage',
  cityName: 'Şanlıurfa',
  trendingListName: 'Şanlıurfa Bugün En Çok Arananlar',
  servicesListName: 'Şanlıurfa Hızlı Servisler',
  webpageName: 'Şanlıurfa Şehir Rehberi | Sanliurfa.com',
};

const DEFAULT_HEADER_BRAND: HeaderBrandConfig = {
  topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
  logoTitle: 'Sanliurfa',
  logoHighlight: '.com',
};

const DEFAULT_HEADER_LABELS: HeaderLabelsConfig = {
  viewAllLabel: 'Tümünü Gör',
  loginLabel: 'Giriş',
  registerLabel: 'Kayıt Ol',
  mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
};

const SOCIAL_PROFILE_KEYS: SocialProfileKey[] = ['instagram', 'tiktok', 'youtube', 'x'];

const SOCIAL_PROFILE_LABELS: Record<SocialProfileKey, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
};

const DEFAULT_SOCIAL_PROFILES: SocialProfilesConfig = {
  instagram: { enabled: false, handle: '', url: '' },
  tiktok: { enabled: false, handle: '', url: '' },
  youtube: { enabled: false, handle: '', url: '' },
  x: { enabled: false, handle: '', url: '' },
};

const DEFAULT_FOOTER_BRAND: FooterBrandConfig = {
  title: 'Sanliurfa.com',
  highlight: '.com',
  description:
    "Şanlıurfa’nın en kapsamlı şehir rehberi. Mekanlar, gezilecek yerler, etkinlikler ve daha fazlası.",
  infoNote: 'Resmi sosyal medya hesabımız bulunmamaktadır.',
};

const DEFAULT_FOOTER_BOTTOM: FooterBottomConfig = {
  copyrightLabel: '© 2026 Sanliurfa.com — Tarihin Sıfır Noktası',
  legalLinks: [
    { label: 'Gizlilik', href: '/gizlilik-politikasi' },
    { label: 'Koşullar', href: '/kullanim-kosullari' },
    { label: 'İletişim', href: '/iletisim' },
  ],
};

const DEFAULT_HERO_META: HeroMetaConfig = {
  heroSectionClass: 'relative overflow-hidden border-b border-slate-800',
  heroOverlayClass:
    'absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,113,113,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.16),transparent_45%),linear-gradient(180deg,#020617,#0f172a)]',
  heroContainerClass: 'relative container mx-auto px-4 pt-28 pb-20',
  heroGridClass: 'grid lg:grid-cols-2 gap-10 items-center',
  heroStatsPanelClass: 'rounded-3xl border border-slate-700 bg-slate-900/70 p-6 backdrop-blur',
  heroStatsPanelTitleClass: 'text-lg font-bold text-white',
  heroStatsPanelSubtitleClass: 'mt-1 text-sm text-slate-400',
  heroStatsUpdatedClass: 'mt-4 text-xs text-slate-500',
  heroImageAlt: 'Şanlıurfa Hero',
  searchButtonLabel: 'Ara',
  businessCardBadge: 'Ücretsiz Açık',
  businessCardTitle: 'İşletmeni Sanliurfa.com’a Ekle',
  businessCardDescription: 'İlk aşamada tüm işletme kayıt özellikleri ücretsiz ve tam erişim açık.',
  communityCardBadge: 'Topluluk Modu',
  communityCardTitle: 'Mesajlaşma ve Eşleşmeye Katıl',
  communityCardDescription: 'Kullanıcılar arası takip, mesaj ve eşleşme deneyimini hemen kullan.',
  statsPanelTitle: 'Şanlıurfa Bugün',
  statsPanelSubtitle: 'Anlık şehir verileri ve içerik yoğunluğu',
  statsActivePlacesLabel: 'Aktif Mekan',
  statsPharmacyLabel: 'Nöbetçi Eczane',
  statsBusRouteLabel: 'Otobüs Hattı',
  statsEventsLabel: 'Etkinlik',
  statsUpdatedPrefix: 'Güncelleme:',
  statsCardClass: 'rounded-xl border border-slate-700 bg-slate-950/80 p-4',
  statsLabelClass: 'text-xs text-slate-400',
  statsValueClass: 'mt-1 text-2xl font-bold text-white',
  heroQuickLinkClass:
    'rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm font-semibold',
  heroQuickLinkHoverClass: 'hover:border-red-400 hover:text-red-200',
  searchFormClass: 'mt-7 max-w-2xl rounded-2xl bg-white p-2 shadow-2xl shadow-black/40',
  searchRowClass: 'flex gap-2',
  searchInputClass: 'flex-1 rounded-xl px-5 py-4 text-slate-800 focus:outline-none',
  searchButtonClass:
    'rounded-xl bg-red-600 px-6 py-4 font-semibold text-white transition hover:bg-red-700',
  businessCardClass:
    'rounded-2xl border border-red-400/50 bg-red-500/15 p-4 transition hover:border-red-300 hover:bg-red-500/25',
  communityCardClass:
    'rounded-2xl border border-sky-400/50 bg-sky-500/15 p-4 transition hover:border-sky-300 hover:bg-sky-500/25',
  heroBadgeClass:
    'inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold tracking-wide text-slate-300',
  heroTitleClass: 'mt-5 text-4xl md:text-6xl font-extrabold leading-tight text-white',
  heroDescriptionClass: 'mt-5 text-lg text-slate-300 max-w-2xl',
};

const DEFAULT_MAIN_CTA: MainCtaConfig = {
  title: 'İşletmenizi Şanlıurfa rehberine ekleyin',
  description:
    'Sanliurfa.com üzerinde görünürlük kazanmak, yerel kullanıcıya ulaşmak ve işletme profilinizi yönetmek için hemen başvurun.',
  primaryLabel: 'İşletme Kaydı Başlat',
  primaryHref: '/isletme-kayit',
  secondaryLabel: 'İletişim ve Destek',
  secondaryHref: '/iletisim',
};

const EDITOR_JSON_TEMPLATES: Record<string, string> = {
  'homepage.schema': JSON.stringify(
    {
      siteName: 'Sanliurfa.com',
      alternateName: 'Şanlıurfa Şehir Rehberi',
      baseUrl: 'https://sanliurfa.com',
      searchPathTemplate: '/arama?q={search_term_string}',
      organizationId: '/#organization',
      webpageId: '/#webpage',
      cityName: 'Şanlıurfa',
      trendingListName: 'Şanlıurfa Bugün En Çok Arananlar',
      servicesListName: 'Şanlıurfa Hızlı Servisler',
      webpageName: 'Şanlıurfa Şehir Rehberi | Sanliurfa.com',
    },
    null,
    2,
  ),
  'homepage.seo': JSON.stringify(
    {
      title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
      description:
        'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
      canonical: '/',
      ogImage: '/images/hero/hero-home.webp',
      keywords: [
        'Şanlıurfa',
        'Şanlıurfa şehir rehberi',
        'Şanlıurfa mekanlar',
        'Şanlıurfa nöbetçi eczane',
        'Şanlıurfa otobüs saatleri',
        'Şanlıurfa gezilecek yerler',
        'Sanliurfa.com',
      ],
    },
    null,
    2,
  ),
  'homepage.sections': JSON.stringify(
    {
      order: [
        'hero',
        'mvp-quick-start',
        'quick-actions',
        'live-status',
        'district-service',
        'popular-categories',
        'trend-density',
        'districts',
        'audience-plans',
        'district-spotlights',
        'historical-sites',
        'featured-places',
        'recent-places',
        'recent-reviews',
        'trust-signals',
        'guides-community',
        'main-categories',
        'recipes',
        'blog',
        'faq',
        'main-cta',
      ],
      visibility: {},
    },
    null,
    2,
  ),
  'homepage.sectionCopy': JSON.stringify(
    {
      mvpQuickStartBadge: 'MVP Hızlı Başlangıç',
      mvpQuickStartTitle: 'Şanlıurfa’da en çok kullanılan akışlar tek yerde',
      mvpQuickStartDescription:
        'Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.',
      mvpQuickStartCtaLabel: 'Tüm Şanlıurfa modülleri',
      mvpQuickStartCtaHref: '/kesfet',
      quickActionsTitle: 'Hızlı Erişim Modülleri',
      quickActionsDescription: 'Şanlıurfa’da günlük ihtiyaçlar için tek tıkla erişim',
      quickActionsCtaLabel: 'Tüm modüller →',
      liveStatusTitle: 'Güncel Durum Merkezi',
      liveStatusDescription: 'Nöbetçi eczane, otobüs ve uçak servislerinin operasyonel görünümü',
      liveStatusUpdatedPrefix: 'Son güncelleme',
      districtServiceTitle: 'Konum ve İlçeye Göre Hızlı Başlangıç',
      districtServiceDescription:
        'Yaşadığın veya gideceğin ilçeyi seç, servisleri ilçe odaklı başlat.',
      districtServiceCtaLabel: 'Tüm ilçe rehberi →',
      popularCategoriesTitle: 'Popüler Mekan Kategorileri',
      popularCategoriesCtaLabel: 'Mekan Rehberi →',
      trendingTitle: 'Bugün En Çok Arananlar',
      trendingCtaLabel: 'Aramaya Git →',
      densityTitle: 'Kategori Yoğunluk Haritası',
      densityCtaLabel: 'Kategoriler →',
      districtsTitle: 'İlçe Bazlı Şanlıurfa Rehberi',
      districtsCtaLabel: 'Tüm İlçeler →',
      audiencePlansTitle: 'Şanlıurfa’yı amacına göre planla',
      audiencePlansDescription:
        'Turist, aile, öğrenci ve yerel kullanıcı senaryoları için hazır keşif akışları.',
      districtSpotlightsTitle: 'İlçeye göre öne çıkan mekan kümeleri',
      districtSpotlightsDescription:
        'Merkezden Halfeti’ye kadar öne çıkan yoğunlukları ve mekan kümelerini tek bakışta gör.',
      districtSpotlightsCtaLabel: 'İlçe sayfalarını aç →',
      historicalSitesTitle: 'Şanlıurfa Gezilecek Yerler',
      historicalSitesCtaLabel: 'Gezi Rehberi →',
      featuredPlacesTitle: 'Öne Çıkan Mekanlar',
      featuredPlacesCtaLabel: 'Tümü →',
      recentPlacesTitle: 'Yeni Eklenen Mekanlar',
      recentReviewsTitle: 'Son yorumlanan mekanlar',
      recentReviewsDescription:
        'Topluluğun son değerlendirdiği mekanları puan, kategori ve yorum özetiyle izle.',
      trustSignalsTitle: 'Son Güncellenen Mekanlar',
      trustSignalsSubtitle: 'Güven sinyali: canlı içerik güncelleme akışı',
      guidesTitle: 'Öne Çıkan Rehber Sayfaları',
      mainCategoriesTitle: 'Şanlıurfa Ana Kategoriler',
      recipesTitle: 'Şanlıurfa Özel Yemek Tarifleri',
      recipesCtaLabel: 'Tüm Tarifler →',
      blogTitle: 'Blogdan Son Yazılar',
      blogCtaLabel: 'Blog →',
      faqTitle: 'AEO ve GEO için hızlı cevap bölümü',
      faqDescription:
        'Bu bölüm, kullanıcıların en sık sorduğu Şanlıurfa odaklı sorulara kısa ve net yanıtlar sunar.',
    },
    null,
    2,
  ),
  'homepage.sectionStyles': JSON.stringify(
    {
      sectionHeadingClass: 'text-2xl md:text-3xl font-bold',
      sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
      sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
      sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
      sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
      mvpQuickStartSectionClass: 'relative z-10 -mt-8 px-4',
      mvpQuickStartContainerClass: 'container mx-auto',
      mvpQuickStartPanelClass:
        'rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 md:p-6',
      mvpQuickStartHeaderClass:
        'flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between',
      mvpQuickStartBadgeClass: 'text-xs font-bold uppercase tracking-[0.26em] text-red-600',
      mvpQuickStartTitleClass: 'mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl',
      mvpQuickStartDescriptionClass: 'mt-2 max-w-3xl text-sm text-slate-600 md:text-base',
      mvpQuickStartCtaClass:
        'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700',
      mvpQuickStartGridClass: 'mt-5 grid gap-4 lg:grid-cols-3',
      mvpQuickStartCardClass:
        'rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-xl',
      mvpQuickStartCardLinkClass: 'block',
      mvpQuickStartCardBadgeClass:
        'inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
      mvpQuickStartCardTitleClass: 'mt-4 text-xl font-extrabold text-slate-950',
      mvpQuickStartCardDescriptionClass: 'mt-2 text-sm leading-6 text-slate-600',
      mvpQuickStartLinksWrapClass: 'mt-5 flex flex-wrap gap-2',
      mvpQuickStartLinkClass:
        'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700',
      quickActionsSectionClass: 'bg-white text-slate-900 py-12',
      quickActionsContainerClass: 'container mx-auto px-4',
      quickActionsHeaderWrapClass: 'flex items-end justify-between mb-6',
      quickActionsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
      quickActionsCardClass:
        'group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
      liveStatusSectionClass: 'bg-slate-950 text-white py-12 border-y border-slate-800',
      liveStatusContainerClass: 'container mx-auto px-4',
      liveStatusHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6',
      liveStatusGridClass: 'grid lg:grid-cols-3 gap-4',
      liveStatusCardClass: 'rounded-2xl border border-slate-700 bg-slate-900/80 p-5',
      districtServiceSectionClass: 'bg-slate-900 text-white py-12 border-t border-slate-800',
      districtServiceContainerClass: 'container mx-auto px-4',
      districtServiceHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
      districtServiceGridClass: 'grid lg:grid-cols-3 gap-4',
      districtServiceCardClass:
        'rounded-2xl border border-slate-700 bg-slate-950/80 p-5 transition',
      districtServiceChipsWrapClass: 'mt-6 flex flex-wrap gap-2',
      districtServiceChipClass:
        'rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200',
      popularCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
      popularCategoriesContainerClass: 'container mx-auto px-4',
      popularCategoriesHeaderWrapClass: 'flex items-center justify-between mb-6',
      popularCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3',
      popularCategoriesCardClass:
        'rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
      trendDensitySectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
      trendDensityContainerClass: 'container mx-auto px-4',
      trendDensityGridClass: 'grid lg:grid-cols-2 gap-6',
      trendDensityCardClass: 'rounded-2xl border border-slate-200 bg-slate-50 p-6',
      trendDensityHeaderWrapClass: 'flex items-center justify-between mb-4',
      trendDensityTrendGridClass: 'grid sm:grid-cols-2 gap-2',
      trendDensityTrendItemClass:
        'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
      trendDensityDensityWrapClass: 'space-y-3',
      trendDensityDensityItemClass:
        'block rounded-xl border border-slate-200 bg-white p-3 hover:border-red-300 transition',
      districtsSectionClass: 'bg-white text-slate-900 py-12',
      districtsContainerClass: 'container mx-auto px-4',
      districtsHeaderWrapClass: 'flex items-center justify-between mb-6',
      districtsGridClass: 'grid md:grid-cols-3 gap-4',
      districtsCardClass:
        'rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-red-300 hover:shadow-lg',
      audiencePlansSectionClass: 'bg-slate-950 text-white py-14 border-t border-slate-800',
      audiencePlansContainerClass: 'container mx-auto px-4',
      audiencePlansHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
      audiencePlansGridClass: 'grid lg:grid-cols-3 gap-5',
      audiencePlansCardClass:
        'rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-xl shadow-black/20',
      audiencePlansBadgeClass:
        'inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-200',
      audiencePlansListClass: 'mt-5 space-y-3 text-sm text-slate-300',
      audiencePlansActionClass:
        'mt-6 inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200',
      districtSpotlightsSectionClass: 'bg-white text-slate-900 py-14 border-t border-slate-200',
      districtSpotlightsContainerClass: 'container mx-auto px-4',
      districtSpotlightsHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
      districtSpotlightsGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-5',
      districtSpotlightsCardClass:
        'rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fff,#f8fafc)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
      historicalSitesSectionClass: 'bg-amber-50 text-slate-900 py-12',
      historicalSitesContainerClass: 'container mx-auto px-4',
      historicalSitesHeaderWrapClass: 'flex items-center justify-between mb-6',
      historicalSitesGridClass: 'grid md:grid-cols-3 gap-5',
      historicalSitesCardClass:
        'group overflow-hidden rounded-2xl border border-amber-200 bg-white transition hover:shadow-xl',
      historicalSitesImageWrapClass: 'h-44 overflow-hidden bg-slate-200',
      historicalSitesImageClass:
        'h-full w-full object-cover transition duration-300 group-hover:scale-105',
      featuredPlacesSectionClass: 'bg-white text-slate-900 py-14',
      featuredPlacesContainerClass: 'container mx-auto px-4',
      featuredPlacesHeaderWrapClass: 'flex items-center justify-between mb-8',
      featuredPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
      recentPlacesSectionClass: 'bg-slate-100 text-slate-900 py-14',
      recentPlacesContainerClass: 'container mx-auto px-4',
      recentPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
      recentReviewsSectionClass: 'bg-slate-100 text-slate-900 py-14 border-t border-slate-200',
      recentReviewsContainerClass: 'container mx-auto px-4',
      recentReviewsHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
      recentReviewsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
      recentReviewsCardClass:
        'rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:shadow-lg',
      trustSignalsSectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
      trustSignalsContainerClass: 'container mx-auto px-4',
      trustSignalsHeaderWrapClass: 'flex items-center justify-between mb-6',
      trustSignalsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
      trustSignalsCardClass:
        'rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300 hover:bg-white hover:shadow-md',
      guidesCommunitySectionClass: 'bg-white text-slate-900 py-12',
      guidesCommunityContainerClass: 'container mx-auto px-4',
      guidesCommunityPanelClass: 'mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5',
      guidesCommunityLinksWrapClass: 'mt-3 flex flex-wrap gap-2',
      guidesCommunityLinkClass:
        'rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100',
      guidesCommunityGridClass: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4',
      guidesCommunityGuideCardClass:
        'rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
      mainCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
      mainCategoriesContainerClass: 'container mx-auto px-4',
      mainCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-4 gap-3',
      mainCategoriesCardClass:
        'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700',
      recipesSectionClass: 'bg-amber-50 text-slate-900 py-12',
      recipesContainerClass: 'container mx-auto px-4',
      recipesHeaderWrapClass: 'flex items-center justify-between mb-6',
      recipesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
      recipesCardClass:
        'group overflow-hidden rounded-xl border border-amber-200 bg-white transition hover:shadow-lg',
      recipesImageWrapClass: 'h-44 overflow-hidden bg-amber-100',
      recipesImageClass: 'h-full w-full object-cover transition duration-300 group-hover:scale-105',
      blogSectionClass: 'bg-white text-slate-900 py-14',
      blogContainerClass: 'container mx-auto px-4',
      blogHeaderWrapClass: 'flex items-center justify-between mb-8',
      blogGridClass: 'grid md:grid-cols-3 gap-6',
      blogCardClass:
        'group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:shadow-lg',
      blogImageClass: 'h-48 w-full object-cover transition group-hover:scale-105',
      blogImageFallbackClass: 'h-48 w-full bg-slate-200',
      faqSectionClass: 'bg-slate-900 text-white py-14 border-t border-slate-800',
      faqContainerClass: 'container mx-auto px-4',
      faqIntroWrapClass: 'max-w-4xl',
      faqGridClass: 'mt-6 grid md:grid-cols-2 gap-4',
      faqCardClass: 'rounded-xl border border-slate-700 bg-slate-950 p-5',
      mainCtaSectionClass: 'bg-slate-950 text-white py-16 border-t border-slate-800',
      mainCtaContainerClass: 'container mx-auto px-4 text-center',
      mainCtaDescriptionClass: 'mt-3 text-slate-300 max-w-2xl mx-auto',
      mainCtaActionsWrapClass: 'mt-7 flex flex-col sm:flex-row gap-3 justify-center',
      mainCtaPrimaryButtonClass:
        'rounded-xl bg-red-600 px-7 py-3 font-bold text-white transition hover:bg-red-700',
      mainCtaSecondaryButtonClass:
        'rounded-xl border border-slate-600 bg-slate-900 px-7 py-3 font-bold text-white transition hover:border-slate-400',
    },
    null,
    2,
  ),
  'header.megaMenu': JSON.stringify(
    {
      items: [
        {
          label: 'Mekanlar',
          href: '/mekanlar',
          groups: [
            {
              title: 'Yeme İçme',
              links: [
                { href: '/mekanlar/kebapcilar', label: 'Kebapçılar' },
                { href: '/mekanlar/cigerciler', label: 'Ciğerciler' },
              ],
            },
            {
              title: 'Tatlı ve Kafe',
              links: [
                { href: '/mekanlar/tatlicilar', label: 'Tatlıcılar' },
                { href: '/mekanlar/kafeler', label: 'Kafeler' },
              ],
            },
          ],
        },
      ],
    },
    null,
    2,
  ),
  'header.mobileQuickLinks': JSON.stringify(
    {
      items: [
        { href: '/mekanlar', label: 'Mekanlar' },
        { href: '/gezilecek-yerler', label: 'Gezilecek Yerler' },
        { href: '/ulasim/otobus-saatleri', label: 'Otobüs Saatleri' },
        { href: '/saglik/nobetci-eczaneler', label: 'Nöbetçi Eczaneler' },
      ],
    },
    null,
    2,
  ),
  'header.mobileAllLinks': JSON.stringify(
    {
      items: [
        { href: '/ulasim/ucak-saatleri', label: 'Uçak Saatleri' },
        { href: '/yemek-tarifleri', label: 'Yemek Tarifleri' },
        { href: '/topluluk', label: 'Topluluk' },
        { href: '/eslesme', label: 'Eşleşme' },
      ],
    },
    null,
    2,
  ),
  'header.brand': JSON.stringify(
    {
      topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
      logoTitle: 'Sanliurfa',
      logoHighlight: '.com',
    },
    null,
    2,
  ),
  'header.labels': JSON.stringify(
    {
      viewAllLabel: 'Tümünü Gör',
      loginLabel: 'Giriş',
      registerLabel: 'Kayıt Ol',
      mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
    },
    null,
    2,
  ),
  'social.profiles': JSON.stringify(
    {
      instagram: { enabled: false, handle: '', url: '' },
      tiktok: { enabled: false, handle: '', url: '' },
      youtube: { enabled: false, handle: '', url: '' },
      x: { enabled: false, handle: '', url: '' },
    },
    null,
    2,
  ),
};

type SaveMode = 'draft' | 'publish';
type MediaAssetRow = {
  asset_key: string;
  url: string;
  alt?: string | null;
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
};
type MediaDraftRow = {
  url: string;
  alt: string;
  bucket: string;
  provider: string;
  mimeType: string;
  width: string;
  height: string;
};
type SettingHistoryItem = {
  version_no: number;
  note?: string | null;
  changed_by?: string | null;
  created_at?: string;
};
type SettingDiffResult = {
  summary: { added: number; removed: number; changed: number };
  diff: {
    added: Array<{ path: string; next: string }>;
    removed: Array<{ path: string; prev: string }>;
    changed: Array<{ path: string; prev: string; next: string }>;
  };
};
type AuditItem = {
  id: string;
  setting_key: string;
  action: string;
  actor_email?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
};
type SitePresetSummary = {
  id: string;
  label: string;
  description: string;
  tags: string[];
  keys: string[];
};
type SitePresetPreview = {
  presetId: string;
  presetLabel: string;
  keyDiffs: Array<{
    key: string;
    summary: { added: number; removed: number; changed: number };
    samples: { changed: string[]; added: string[]; removed: string[] };
  }>;
};
type SiteSchemaField = {
  key: string;
  type: 'string' | 'array' | 'object';
  required: boolean;
  note?: string;
};
type RollbackPreview = {
  summary?: { changed: number };
  changed?: Array<{ path: string; current: string | null; rollbackTo: string | null }>;
};
type ReviewAntiSpamConfig = {
  enabled: boolean;
  autoModerateThreshold: number;
  hardBlockThreshold: number;
  minLength: number;
  repeatedCharLimit: number;
  suspiciousKeywords: string[];
  allowlist?: string[];
};
type AntiSpamEventItem = {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
};

export default function SiteContentManager() {
  const [hero, setHero] = useState<HeroConfig>(DEFAULT_HERO);
  const [homepageSchemaText, setHomepageSchemaText] = useState('');
  const [homepageSeoText, setHomepageSeoText] = useState('');
  const [heroMetaText, setHeroMetaText] = useState('');
  const [mainCta, setMainCta] = useState<MainCtaConfig>(DEFAULT_MAIN_CTA);
  const [headerLinksText, setHeaderLinksText] = useState('');
  const [headerBrandText, setHeaderBrandText] = useState('');
  const [headerLabelsText, setHeaderLabelsText] = useState('');
  const [socialProfilesText, setSocialProfilesText] = useState('');
  const [footerLinksText, setFooterLinksText] = useState('');
  const [footerBrandText, setFooterBrandText] = useState('');
  const [footerBottomText, setFooterBottomText] = useState('');
  const [primaryActionsText, setPrimaryActionsText] = useState('');
  const [mvpQuickStartText, setMvpQuickStartText] = useState('');
  const [quickCategoriesText, setQuickCategoriesText] = useState('');
  const [featuredGuidesText, setFeaturedGuidesText] = useState('');
  const [faqText, setFaqText] = useState('');
  const [heroQuickLinksText, setHeroQuickLinksText] = useState('');
  const [liveStatusCardsText, setLiveStatusCardsText] = useState('');
  const [serviceQuickLinksText, setServiceQuickLinksText] = useState('');
  const [communityPanelText, setCommunityPanelText] = useState('');
  const [trendingFallbackQueriesText, setTrendingFallbackQueriesText] = useState('');
  const [homepageSectionsText, setHomepageSectionsText] = useState('');
  const [homepageSectionCopyText, setHomepageSectionCopyText] = useState('');
  const [homepageSectionStylesText, setHomepageSectionStylesText] = useState('');
  const [headerMegaMenuText, setHeaderMegaMenuText] = useState('');
  const [headerMobileQuickLinksText, setHeaderMobileQuickLinksText] = useState('');
  const [headerMobileAllLinksText, setHeaderMobileAllLinksText] = useState('');
  const [placeSlaTargetsText, setPlaceSlaTargetsText] = useState('');
  const [socialRiskThresholdsText, setSocialRiskThresholdsText] = useState('');
  const [socialRiskWebhookText, setSocialRiskWebhookText] = useState('');
  const [socialRiskAutoActionsText, setSocialRiskAutoActionsText] = useState('');
  const [imageQuery, setImageQuery] = useState('');
  const [assetKey, setAssetKey] = useState('homepage.hero.background');
  const [imageResults, setImageResults] = useState<{ provider: string; id: string; url: string; thumb?: string; author?: string }[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaAssetRow[]>([]);
  const [mediaDrafts, setMediaDrafts] = useState<Record<string, MediaDraftRow>>({});
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaBucketFilter, setMediaBucketFilter] = useState('');
  const [historyKey, setHistoryKey] = useState('homepage.hero');
  const [historyItems, setHistoryItems] = useState<SettingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [diffKey, setDiffKey] = useState('homepage.hero');
  const [diffFromVersion, setDiffFromVersion] = useState('1');
  const [diffToVersion, setDiffToVersion] = useState('2');
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<SettingDiffResult | null>(null);
  const [auditKeyFilter, setAuditKeyFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [rollbackKey, setRollbackKey] = useState('homepage.hero');
  const [rollbackVersion, setRollbackVersion] = useState('1');
  const [presets, setPresets] = useState<SitePresetSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetMode, setPresetMode] = useState<SaveMode>('draft');
  const [presetPreview, setPresetPreview] = useState<SitePresetPreview | null>(null);
  const [presetPreviewLoading, setPresetPreviewLoading] = useState(false);
  const [schemaMap, setSchemaMap] = useState<Record<string, SiteSchemaField[]>>({});
  const [schemaKey, setSchemaKey] = useState('homepage.hero');
  const [rollbackPreview, setRollbackPreview] = useState<RollbackPreview | null>(null);
  const [rollbackPreviewLoading, setRollbackPreviewLoading] = useState(false);
  const [reviewAntiSpam, setReviewAntiSpam] = useState<ReviewAntiSpamConfig>({
    enabled: true,
    autoModerateThreshold: 55,
    hardBlockThreshold: 85,
    minLength: 20,
    repeatedCharLimit: 6,
    suspiciousKeywords: ['telegram', 'whatsapp', 'bedava'],
    allowlist: [],
  });
  const [allowlistInput, setAllowlistInput] = useState('');
  const [antiSpamEvents, setAntiSpamEvents] = useState<AntiSpamEventItem[]>([]);
  const [antiSpamEventsLoading, setAntiSpamEventsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [jsonEditorsExpanded, setJsonEditorsExpanded] = useState(false);
  const [adminQuickFilter, setAdminQuickFilter] = useState('');
  const [adminQuickGroupFilter, setAdminQuickGroupFilter] = useState('Tümü');

  useEffect(() => {
    try {
      const storedFilter = window.localStorage.getItem('siteContent.quickFilter');
      const storedGroup = window.localStorage.getItem('siteContent.quickGroup');
      const storedJsonExpanded = window.localStorage.getItem('siteContent.jsonExpanded');
      if (storedFilter) setAdminQuickFilter(storedFilter);
      if (storedGroup) setAdminQuickGroupFilter(storedGroup);
      if (storedJsonExpanded === 'true') setJsonEditorsExpanded(true);
    } catch {
      // LocalStorage is optional; admin screen should work without it.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('siteContent.quickFilter', adminQuickFilter);
      window.localStorage.setItem('siteContent.quickGroup', adminQuickGroupFilter);
      window.localStorage.setItem('siteContent.jsonExpanded', String(jsonEditorsExpanded));
    } catch {
      // Ignore storage errors in restricted browser contexts.
    }
  }, [adminQuickFilter, adminQuickGroupFilter, jsonEditorsExpanded]);

  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>('[data-json-editor-card]').forEach((element) => {
      element.open = jsonEditorsExpanded;
    });
  }, [jsonEditorsExpanded]);

  useEffect(() => {
    const run = async () => {
      try {
        const keys = [
          'homepage.schema',
          'homepage.seo',
          'homepage.hero',
          'homepage.heroMeta',
          'homepage.mainCta',
          'header.utilityLinks',
          'header.brand',
          'header.labels',
          'social.profiles',
          'footer.links',
          'footer.brand',
          'footer.bottom',
          'homepage.primaryActions',
          'homepage.mvpQuickStart',
          'homepage.quickCategories',
          'homepage.featuredGuides',
          'homepage.faq',
          'homepage.heroQuickLinks',
          'homepage.liveStatusCards',
          'homepage.serviceQuickLinks',
          'homepage.communityPanel',
          'homepage.trendingFallbackQueries',
          'homepage.sections',
          'homepage.sectionCopy',
          'homepage.sectionStyles',
          'header.megaMenu',
          'header.mobileQuickLinks',
          'header.mobileAllLinks',
          'reviews.antiSpam',
          'places.lifecycle.sla.targets',
          'social.risk.thresholds',
          'social.risk.webhook',
          'social.risk.autoActions',
        ];

        const responses = await Promise.all(
          keys.map((key) => fetch(`/api/admin/site/settings?key=${encodeURIComponent(key)}`)),
        );
        const payloads = await Promise.all(responses.map((r) => r.json()));

        const map = Object.fromEntries(payloads.map((p) => [p?.key, p?.value || {}])) as Record<
          string,
          any
        >;

        setHomepageSchemaText(
          JSON.stringify(
            map['homepage.schema'] || {
              siteName: 'Sanliurfa.com',
              alternateName: 'Şanlıurfa Şehir Rehberi',
              baseUrl: 'https://sanliurfa.com',
              searchPathTemplate: '/arama?q={search_term_string}',
              organizationId: '/#organization',
              webpageId: '/#webpage',
              cityName: 'Şanlıurfa',
              trendingListName: 'Şanlıurfa Bugün En Çok Arananlar',
              servicesListName: 'Şanlıurfa Hızlı Servisler',
              webpageName: 'Şanlıurfa Şehir Rehberi | Sanliurfa.com',
            },
            null,
            2,
          ),
        );
        setHomepageSeoText(
          JSON.stringify(
            map['homepage.seo'] || {
              title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
              description:
                'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
              canonical: '/',
              ogImage: '/images/hero/hero-home.webp',
              keywords: [
                'Şanlıurfa',
                'Şanlıurfa şehir rehberi',
                'Şanlıurfa mekanlar',
                'Şanlıurfa nöbetçi eczane',
                'Şanlıurfa otobüs saatleri',
                'Şanlıurfa gezilecek yerler',
                'Sanliurfa.com',
              ],
            },
            null,
            2,
          ),
        );
        setHero((prev) => ({ ...prev, ...(map['homepage.hero'] || {}) }));
        setHeroMetaText(JSON.stringify(map['homepage.heroMeta'] || DEFAULT_HERO_META, null, 2));
        setMainCta((prev) => ({ ...prev, ...(map['homepage.mainCta'] || {}) }));
        setHeaderLinksText(JSON.stringify(map['header.utilityLinks'] || { items: [] }, null, 2));
        setHeaderBrandText(
          JSON.stringify(
            map['header.brand'] || {
              topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
              logoTitle: 'Sanliurfa',
              logoHighlight: '.com',
            },
            null,
            2,
          ),
        );
        setHeaderLabelsText(
          JSON.stringify(
            map['header.labels'] || {
              viewAllLabel: 'Tümünü Gör',
              loginLabel: 'Giriş',
              registerLabel: 'Kayıt Ol',
              mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
            },
            null,
            2,
          ),
        );
        setSocialProfilesText(
          JSON.stringify(
            map['social.profiles'] || {
              instagram: { enabled: false, handle: '', url: '' },
              tiktok: { enabled: false, handle: '', url: '' },
              youtube: { enabled: false, handle: '', url: '' },
              x: { enabled: false, handle: '', url: '' },
            },
            null,
            2,
          ),
        );
        setFooterLinksText(JSON.stringify(map['footer.links'] || {}, null, 2));
        setFooterBrandText(
          JSON.stringify(
            map['footer.brand'] || {
              title: 'Sanliurfa',
              highlight: '.com',
              description:
                "Şanlıurfa’nın en kapsamlı şehir rehberi. Mekanlar, gezilecek yerler, etkinlikler ve daha fazlası.",
              infoNote: 'Resmi sosyal medya hesabımız bulunmamaktadır.',
            },
            null,
            2,
          ),
        );
        setFooterBottomText(
          JSON.stringify(
            map['footer.bottom'] || {
              copyrightLabel: '© 2026 Sanliurfa.com — Tarihin Sıfır Noktası',
              legalLinks: [
                { label: 'Gizlilik', href: '/gizlilik-politikasi' },
                { label: 'Koşullar', href: '/kullanim-kosullari' },
                { label: 'İletişim', href: '/iletisim' },
              ],
            },
            null,
            2,
          ),
        );
        setPrimaryActionsText(
          JSON.stringify(map['homepage.primaryActions'] || { items: [] }, null, 2),
        );
        setMvpQuickStartText(
          JSON.stringify(map['homepage.mvpQuickStart'] || { items: [] }, null, 2),
        );
        setQuickCategoriesText(
          JSON.stringify(map['homepage.quickCategories'] || { items: [] }, null, 2),
        );
        setFeaturedGuidesText(
          JSON.stringify(map['homepage.featuredGuides'] || { items: [] }, null, 2),
        );
        setFaqText(JSON.stringify(map['homepage.faq'] || { items: [] }, null, 2));
        setHeroQuickLinksText(
          JSON.stringify(map['homepage.heroQuickLinks'] || { items: [] }, null, 2),
        );
        setLiveStatusCardsText(
          JSON.stringify(map['homepage.liveStatusCards'] || { items: [] }, null, 2),
        );
        setServiceQuickLinksText(
          JSON.stringify(map['homepage.serviceQuickLinks'] || { items: [] }, null, 2),
        );
        setCommunityPanelText(
          JSON.stringify(
            map['homepage.communityPanel'] || { title: '', description: '', items: [] },
            null,
            2,
          ),
        );
        setTrendingFallbackQueriesText(
          JSON.stringify(map['homepage.trendingFallbackQueries'] || { items: [] }, null, 2),
        );
        setHomepageSectionsText(
          JSON.stringify(
            map['homepage.sections'] || {
              order: [
                'hero',
                'mvp-quick-start',
                'quick-actions',
                'live-status',
                'district-service',
                'popular-categories',
                'trend-density',
                'districts',
                'audience-plans',
                'district-spotlights',
                'historical-sites',
                'featured-places',
                'recent-places',
                'recent-reviews',
                'trust-signals',
                'guides-community',
                'main-categories',
                'recipes',
                'blog',
                'faq',
                'main-cta',
              ],
              visibility: {},
            },
            null,
            2,
          ),
        );
        setHomepageSectionCopyText(
          JSON.stringify(
            map['homepage.sectionCopy'] || {
              mvpQuickStartBadge: 'MVP Hızlı Başlangıç',
              mvpQuickStartTitle: 'Şanlıurfa’da en çok kullanılan akışlar tek yerde',
              mvpQuickStartDescription:
                'Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.',
              mvpQuickStartCtaLabel: 'Tüm Şanlıurfa modülleri',
              mvpQuickStartCtaHref: '/kesfet',
              quickActionsTitle: 'Hızlı Erişim Modülleri',
              quickActionsDescription: 'Şanlıurfa’da günlük ihtiyaçlar için tek tıkla erişim',
              quickActionsCtaLabel: 'Tüm modüller →',
              liveStatusTitle: 'Güncel Durum Merkezi',
              liveStatusDescription:
                'Nöbetçi eczane, otobüs ve uçak servislerinin operasyonel görünümü',
              liveStatusUpdatedPrefix: 'Son güncelleme',
              districtServiceTitle: 'Konum ve İlçeye Göre Hızlı Başlangıç',
              districtServiceDescription:
                'Yaşadığın veya gideceğin ilçeyi seç, servisleri ilçe odaklı başlat.',
              districtServiceCtaLabel: 'Tüm ilçe rehberi →',
              popularCategoriesTitle: 'Popüler Mekan Kategorileri',
              popularCategoriesCtaLabel: 'Mekan Rehberi →',
              trendingTitle: 'Bugün En Çok Arananlar',
              trendingCtaLabel: 'Aramaya Git →',
              densityTitle: 'Kategori Yoğunluk Haritası',
              densityCtaLabel: 'Kategoriler →',
              districtsTitle: 'İlçe Bazlı Şanlıurfa Rehberi',
              districtsCtaLabel: 'Tüm İlçeler →',
              historicalSitesTitle: 'Şanlıurfa Gezilecek Yerler',
              historicalSitesCtaLabel: 'Gezi Rehberi →',
              featuredPlacesTitle: 'Öne Çıkan Mekanlar',
              featuredPlacesCtaLabel: 'Tümü →',
              recentPlacesTitle: 'Yeni Eklenen Mekanlar',
              audiencePlansTitle: 'Şanlıurfa’yı amacına göre planla',
              audiencePlansDescription:
                'Turist, aile, öğrenci ve yerel kullanıcı senaryoları için hazır keşif akışları.',
              districtSpotlightsTitle: 'İlçeye göre öne çıkan mekan kümeleri',
              districtSpotlightsDescription:
                'Merkezden Halfeti’ye kadar öne çıkan yoğunlukları ve mekan kümelerini tek bakışta gör.',
              districtSpotlightsCtaLabel: 'İlçe sayfalarını aç →',
              recentReviewsTitle: 'Son yorumlanan mekanlar',
              recentReviewsDescription:
                'Topluluğun son değerlendirdiği mekanları puan, kategori ve yorum özetiyle izle.',
              trustSignalsTitle: 'Son Güncellenen Mekanlar',
              trustSignalsSubtitle: 'Güven sinyali: canlı içerik güncelleme akışı',
              guidesTitle: 'Öne Çıkan Rehber Sayfaları',
              mainCategoriesTitle: 'Şanlıurfa Ana Kategoriler',
              recipesTitle: 'Şanlıurfa Özel Yemek Tarifleri',
              recipesCtaLabel: 'Tüm Tarifler →',
              blogTitle: 'Blogdan Son Yazılar',
              blogCtaLabel: 'Blog →',
              faqTitle: 'AEO ve GEO için hızlı cevap bölümü',
              faqDescription:
                'Bu bölüm, kullanıcıların en sık sorduğu Şanlıurfa odaklı sorulara kısa ve net yanıtlar sunar.',
            },
            null,
            2,
          ),
        );
        setHomepageSectionStylesText(
          JSON.stringify(
            map['homepage.sectionStyles'] || {
              sectionHeadingClass: 'text-2xl md:text-3xl font-bold',
              sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
              sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
              sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
              sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
              mvpQuickStartSectionClass: 'relative z-10 -mt-8 px-4',
              mvpQuickStartContainerClass: 'container mx-auto',
              mvpQuickStartPanelClass:
                'rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 md:p-6',
              mvpQuickStartHeaderClass:
                'flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between',
              mvpQuickStartBadgeClass: 'text-xs font-bold uppercase tracking-[0.26em] text-red-600',
              mvpQuickStartTitleClass: 'mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl',
              mvpQuickStartDescriptionClass: 'mt-2 max-w-3xl text-sm text-slate-600 md:text-base',
              mvpQuickStartCtaClass:
                'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700',
              mvpQuickStartGridClass: 'mt-5 grid gap-4 lg:grid-cols-3',
              mvpQuickStartCardClass:
                'rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-xl',
              mvpQuickStartCardLinkClass: 'block',
              mvpQuickStartCardBadgeClass:
                'inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
              mvpQuickStartCardTitleClass: 'mt-4 text-xl font-extrabold text-slate-950',
              mvpQuickStartCardDescriptionClass: 'mt-2 text-sm leading-6 text-slate-600',
              mvpQuickStartLinksWrapClass: 'mt-5 flex flex-wrap gap-2',
              mvpQuickStartLinkClass:
                'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700',
              quickActionsSectionClass: 'bg-white text-slate-900 py-12',
              quickActionsContainerClass: 'container mx-auto px-4',
              quickActionsHeaderWrapClass: 'flex items-end justify-between mb-6',
              quickActionsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
              quickActionsCardClass:
                'group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
              liveStatusSectionClass: 'bg-slate-950 text-white py-12 border-y border-slate-800',
              liveStatusContainerClass: 'container mx-auto px-4',
              liveStatusHeaderWrapClass:
                'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6',
              liveStatusGridClass: 'grid lg:grid-cols-3 gap-4',
              liveStatusCardClass: 'rounded-2xl border border-slate-700 bg-slate-900/80 p-5',
              districtServiceSectionClass:
                'bg-slate-900 text-white py-12 border-t border-slate-800',
              districtServiceContainerClass: 'container mx-auto px-4',
              districtServiceHeaderWrapClass:
                'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
              districtServiceGridClass: 'grid lg:grid-cols-3 gap-4',
              districtServiceCardClass:
                'rounded-2xl border border-slate-700 bg-slate-950/80 p-5 transition',
              districtServiceChipsWrapClass: 'mt-6 flex flex-wrap gap-2',
              districtServiceChipClass:
                'rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200',
              popularCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
              popularCategoriesContainerClass: 'container mx-auto px-4',
              popularCategoriesHeaderWrapClass: 'flex items-center justify-between mb-6',
              popularCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3',
              popularCategoriesCardClass:
                'rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
              trendDensitySectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
              trendDensityContainerClass: 'container mx-auto px-4',
              trendDensityGridClass: 'grid lg:grid-cols-2 gap-6',
              trendDensityCardClass: 'rounded-2xl border border-slate-200 bg-slate-50 p-6',
              trendDensityHeaderWrapClass: 'flex items-center justify-between mb-4',
              trendDensityTrendGridClass: 'grid sm:grid-cols-2 gap-2',
              trendDensityTrendItemClass:
                'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
              trendDensityDensityWrapClass: 'space-y-3',
              trendDensityDensityItemClass:
                'block rounded-xl border border-slate-200 bg-white p-3 hover:border-red-300 transition',
              districtsSectionClass: 'bg-white text-slate-900 py-12',
              districtsContainerClass: 'container mx-auto px-4',
              districtsHeaderWrapClass: 'flex items-center justify-between mb-6',
              districtsGridClass: 'grid md:grid-cols-3 gap-4',
              districtsCardClass:
                'rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-red-300 hover:shadow-lg',
              audiencePlansSectionClass: 'bg-slate-950 text-white py-14 border-t border-slate-800',
              audiencePlansContainerClass: 'container mx-auto px-4',
              audiencePlansHeaderWrapClass:
                'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
              audiencePlansGridClass: 'grid lg:grid-cols-3 gap-5',
              audiencePlansCardClass:
                'rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-xl shadow-black/20',
              audiencePlansBadgeClass:
                'inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-200',
              audiencePlansListClass: 'mt-5 space-y-3 text-sm text-slate-300',
              audiencePlansActionClass:
                'mt-6 inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200',
              districtSpotlightsSectionClass:
                'bg-white text-slate-900 py-14 border-t border-slate-200',
              districtSpotlightsContainerClass: 'container mx-auto px-4',
              districtSpotlightsHeaderWrapClass:
                'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
              districtSpotlightsGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-5',
              districtSpotlightsCardClass:
                'rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fff,#f8fafc)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
              historicalSitesSectionClass: 'bg-amber-50 text-slate-900 py-12',
              historicalSitesContainerClass: 'container mx-auto px-4',
              historicalSitesHeaderWrapClass: 'flex items-center justify-between mb-6',
              historicalSitesGridClass: 'grid md:grid-cols-3 gap-5',
              historicalSitesCardClass:
                'group overflow-hidden rounded-2xl border border-amber-200 bg-white transition hover:shadow-xl',
              historicalSitesImageWrapClass: 'h-44 overflow-hidden bg-slate-200',
              historicalSitesImageClass:
                'h-full w-full object-cover transition duration-300 group-hover:scale-105',
              featuredPlacesSectionClass: 'bg-white text-slate-900 py-14',
              featuredPlacesContainerClass: 'container mx-auto px-4',
              featuredPlacesHeaderWrapClass: 'flex items-center justify-between mb-8',
              featuredPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
              recentPlacesSectionClass: 'bg-slate-100 text-slate-900 py-14',
              recentPlacesContainerClass: 'container mx-auto px-4',
              recentPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
              recentReviewsSectionClass:
                'bg-slate-100 text-slate-900 py-14 border-t border-slate-200',
              recentReviewsContainerClass: 'container mx-auto px-4',
              recentReviewsHeaderWrapClass:
                'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
              recentReviewsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
              recentReviewsCardClass:
                'rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:shadow-lg',
              trustSignalsSectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
              trustSignalsContainerClass: 'container mx-auto px-4',
              trustSignalsHeaderWrapClass: 'flex items-center justify-between mb-6',
              trustSignalsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
              trustSignalsCardClass:
                'rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300 hover:bg-white hover:shadow-md',
              guidesCommunitySectionClass: 'bg-white text-slate-900 py-12',
              guidesCommunityContainerClass: 'container mx-auto px-4',
              guidesCommunityPanelClass: 'mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5',
              guidesCommunityLinksWrapClass: 'mt-3 flex flex-wrap gap-2',
              guidesCommunityLinkClass:
                'rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100',
              guidesCommunityGridClass: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4',
              guidesCommunityGuideCardClass:
                'rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
              mainCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
              mainCategoriesContainerClass: 'container mx-auto px-4',
              mainCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-4 gap-3',
              mainCategoriesCardClass:
                'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700',
              recipesSectionClass: 'bg-amber-50 text-slate-900 py-12',
              recipesContainerClass: 'container mx-auto px-4',
              recipesHeaderWrapClass: 'flex items-center justify-between mb-6',
              recipesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
              recipesCardClass:
                'group overflow-hidden rounded-xl border border-amber-200 bg-white transition hover:shadow-lg',
              recipesImageWrapClass: 'h-44 overflow-hidden bg-amber-100',
              recipesImageClass:
                'h-full w-full object-cover transition duration-300 group-hover:scale-105',
              blogSectionClass: 'bg-white text-slate-900 py-14',
              blogContainerClass: 'container mx-auto px-4',
              blogHeaderWrapClass: 'flex items-center justify-between mb-8',
              blogGridClass: 'grid md:grid-cols-3 gap-6',
              blogCardClass:
                'group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:shadow-lg',
              blogImageClass: 'h-48 w-full object-cover transition group-hover:scale-105',
              blogImageFallbackClass: 'h-48 w-full bg-slate-200',
              faqSectionClass: 'bg-slate-900 text-white py-14 border-t border-slate-800',
              faqContainerClass: 'container mx-auto px-4',
              faqIntroWrapClass: 'max-w-4xl',
              faqGridClass: 'mt-6 grid md:grid-cols-2 gap-4',
              faqCardClass: 'rounded-xl border border-slate-700 bg-slate-950 p-5',
              mainCtaSectionClass: 'bg-slate-950 text-white py-16 border-t border-slate-800',
              mainCtaContainerClass: 'container mx-auto px-4 text-center',
              mainCtaDescriptionClass: 'mt-3 text-slate-300 max-w-2xl mx-auto',
              mainCtaActionsWrapClass: 'mt-7 flex flex-col sm:flex-row gap-3 justify-center',
              mainCtaPrimaryButtonClass:
                'rounded-xl bg-red-600 px-7 py-3 font-bold text-white transition hover:bg-red-700',
              mainCtaSecondaryButtonClass:
                'rounded-xl border border-slate-600 bg-slate-900 px-7 py-3 font-bold text-white transition hover:border-slate-400',
            },
            null,
            2,
          ),
        );
        setHeaderMegaMenuText(JSON.stringify(map['header.megaMenu'] || { items: [] }, null, 2));
        setHeaderMobileQuickLinksText(
          JSON.stringify(map['header.mobileQuickLinks'] || { items: [] }, null, 2),
        );
        setHeaderMobileAllLinksText(
          JSON.stringify(map['header.mobileAllLinks'] || { items: [] }, null, 2),
        );
        setReviewAntiSpam((prev) => ({ ...prev, ...(map['reviews.antiSpam'] || {}) }));
        setPlaceSlaTargetsText(
          JSON.stringify(
            map['places.lifecycle.sla.targets'] || { defaultHours: 48, byDistrict: {}, byTeam: {} },
            null,
            2,
          ),
        );
        setSocialRiskThresholdsText(
          JSON.stringify(
            map['social.risk.thresholds'] || {
              scoreAlert: 70,
              zScoreAlert: 2,
              minLastHour: 2,
              minTotal: 5,
            },
            null,
            2,
          ),
        );
        setSocialRiskWebhookText(
          JSON.stringify(
            map['social.risk.webhook'] || {
              enabled: false,
              eventName: 'admin.social_risk.alert',
              userId: '',
              cooldownMinutes: 30,
            },
            null,
            2,
          ),
        );
        setSocialRiskAutoActionsText(
          JSON.stringify(
            map['social.risk.autoActions'] || {
              enabled: false,
              cooldownMinutes: 60,
              note: 'social_risk_auto_action',
              rollbackToDefaultWhenHealthy: true,
              profile: {
                swipeLimit: 60,
                swipeWindowSeconds: 60,
                followLimit: 30,
                followWindowSeconds: 60,
                messageWriteLimit: 40,
                messageWriteWindowSeconds: 60,
              },
            },
            null,
            2,
          ),
        );
      } catch {
        setStatus('Ayarlar okunamadı, varsayılan değerler gösteriliyor.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/admin/site/settings/schema');
        const json = await res.json();
        if (!res.ok || !json?.success || !json.schemas) return;
        setSchemaMap(json.schemas as Record<string, SiteSchemaField[]>);
      } catch {
        // best effort
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/admin/site/settings/presets');
        const json = await res.json();
        if (!res.ok || !json?.success) return;
        const items = Array.isArray(json.presets) ? (json.presets as SitePresetSummary[]) : [];
        setPresets(items);
        if (items.length > 0) setSelectedPresetId(items[0].id);
      } catch {
        // best-effort only
      }
    };
    void run();
  }, []);

  useEffect(() => {
    void loadMediaLibrary();
  }, []);

  useEffect(() => {
    void loadAntiSpamEvents();
  }, []);

  const saveSetting = async (
    key: string,
    value: Record<string, any>,
    description: string,
    mode: SaveMode = 'publish',
  ) => {
    setSaving(true);
    setStatus('');
    try {
      const res = await fetch('/api/admin/site/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, description, mode }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Kaydetme başarısız');
        return;
      }
      setStatus(mode === 'draft' ? `${key} taslak kaydedildi.` : `${key} yayına alındı.`);
    } catch {
      setStatus('Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const saveJsonSetting = async (
    key: string,
    description: string,
    payloadText: string,
    mode: SaveMode,
  ) => {
    try {
      const parsed = JSON.parse(payloadText);
      await saveSetting(key, parsed, description, mode);
    } catch {
      setStatus(`${key} için JSON formatı geçersiz.`);
    }
  };

  const parseJsonSafe = <T,>(text: string, fallback: T): T => {
    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  };

  const applyTemplateToEditor = (templateKey: string, setter: (value: string) => void) => {
    const template = EDITOR_JSON_TEMPLATES[templateKey];
    if (!template) {
      setStatus(`Şablon bulunamadı: ${templateKey}`);
      return;
    }
    setter(template);
    setStatus(`${templateKey} şablonu editöre yüklendi.`);
  };

  const getSlaTargets = () =>
    parseJsonSafe<{
      defaultHours: number;
      byDistrict: Record<string, number>;
      byTeam: Record<string, number>;
    }>(placeSlaTargetsText, { defaultHours: 48, byDistrict: {}, byTeam: {} });

  const updateSlaTargets = (
    mutator: (current: {
      defaultHours: number;
      byDistrict: Record<string, number>;
      byTeam: Record<string, number>;
    }) => {
      defaultHours: number;
      byDistrict: Record<string, number>;
      byTeam: Record<string, number>;
    },
  ) => {
    const current = getSlaTargets();
    const next = mutator(current);
    setPlaceSlaTargetsText(JSON.stringify(next, null, 2));
  };

  const updateSlaDefaultHours = (hours: number) => {
    updateSlaTargets((current) => ({
      ...current,
      defaultHours: Number.isFinite(hours) ? hours : 48,
    }));
  };

  const upsertSlaBucket = (bucket: 'byDistrict' | 'byTeam', key: string, hours: number) => {
    updateSlaTargets((current) => ({
      ...current,
      [bucket]: {
        ...(current[bucket] || {}),
        [key]: Number.isFinite(hours) ? hours : 48,
      },
    }));
  };

  const deleteSlaBucket = (bucket: 'byDistrict' | 'byTeam', key: string) => {
    updateSlaTargets((current) => {
      const nextBucket = { ...(current[bucket] || {}) };
      delete nextBucket[key];
      return { ...current, [bucket]: nextBucket };
    });
  };

  const moveItem = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return next;
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    return next;
  };

  const updateHeaderItem = (index: number, field: 'label' | 'href', value: string) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      headerLinksText,
      { items: [] },
    );
    const nextItems = parsed.items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    setHeaderLinksText(JSON.stringify({ items: nextItems }, null, 2));
  };

  const moveHeaderItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      headerLinksText,
      { items: [] },
    );
    setHeaderLinksText(
      JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2),
    );
  };
  const addHeaderItem = () => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      headerLinksText,
      { items: [] },
    );
    setHeaderLinksText(
      JSON.stringify({ items: [...parsed.items, { label: '', href: '' }] }, null, 2),
    );
  };
  const removeHeaderItem = (index: number) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      headerLinksText,
      { items: [] },
    );
    setHeaderLinksText(
      JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2),
    );
  };

  type HeaderMobileLinkList = 'quick' | 'all';

  const getHeaderMobileLinksText = (list: HeaderMobileLinkList) =>
    list === 'quick' ? headerMobileQuickLinksText : headerMobileAllLinksText;

  const setHeaderMobileLinksText = (list: HeaderMobileLinkList, value: string) => {
    if (list === 'quick') {
      setHeaderMobileQuickLinksText(value);
      return;
    }
    setHeaderMobileAllLinksText(value);
  };

  const getHeaderMobileLinks = (list: HeaderMobileLinkList) =>
    parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      getHeaderMobileLinksText(list),
      { items: [] },
    );

  const setHeaderMobileLinks = (
    list: HeaderMobileLinkList,
    items: Array<{ label: string; href: string }>,
  ) => {
    setHeaderMobileLinksText(list, JSON.stringify({ items }, null, 2));
  };

  const updateHeaderMobileLink = (
    list: HeaderMobileLinkList,
    index: number,
    field: 'label' | 'href',
    value: string,
  ) => {
    const parsed = getHeaderMobileLinks(list);
    setHeaderMobileLinks(
      list,
      parsed.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const moveHeaderMobileLink = (list: HeaderMobileLinkList, index: number, direction: -1 | 1) => {
    const parsed = getHeaderMobileLinks(list);
    setHeaderMobileLinks(list, moveItem(parsed.items, index, direction));
  };

  const addHeaderMobileLink = (list: HeaderMobileLinkList) => {
    const parsed = getHeaderMobileLinks(list);
    setHeaderMobileLinks(list, [...parsed.items, { label: '', href: '/' }]);
  };

  const removeHeaderMobileLink = (list: HeaderMobileLinkList, index: number) => {
    const parsed = getHeaderMobileLinks(list);
    setHeaderMobileLinks(
      list,
      parsed.items.filter((_, idx) => idx !== index),
    );
  };

  type HeaderMegaMenuItem = {
    label: string;
    href: string;
    sub?: Array<{ label: string; href: string }>;
    groups?: Array<{ title: string; links: Array<{ label: string; href: string }> }>;
  };

  const getHeaderMegaMenu = () =>
    parseJsonSafe<{ items: HeaderMegaMenuItem[] }>(headerMegaMenuText, { items: [] });

  const setHeaderMegaMenu = (items: HeaderMegaMenuItem[]) => {
    setHeaderMegaMenuText(JSON.stringify({ items }, null, 2));
  };

  const updateHeaderMegaMenuItem = (index: number, field: 'label' | 'href', value: string) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(
      parsed.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const moveHeaderMegaMenuItem = (index: number, direction: -1 | 1) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(moveItem(parsed.items, index, direction));
  };

  const addHeaderMegaMenuItem = () => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu([...parsed.items, { label: '', href: '/', sub: [] }]);
  };

  const removeHeaderMegaMenuItem = (index: number) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(parsed.items.filter((_, idx) => idx !== index));
  };

  const updateHeaderMegaSubLink = (
    menuIndex: number,
    linkIndex: number,
    field: 'label' | 'href',
    value: string,
  ) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(
      parsed.items.map((item, idx) =>
        idx === menuIndex
          ? {
              ...item,
              sub: (item.sub || []).map((link, currentLinkIndex) =>
                currentLinkIndex === linkIndex ? { ...link, [field]: value } : link,
              ),
            }
          : item,
      ),
    );
  };

  const moveHeaderMegaSubLink = (menuIndex: number, linkIndex: number, direction: -1 | 1) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(
      parsed.items.map((item, idx) =>
        idx === menuIndex ? { ...item, sub: moveItem(item.sub || [], linkIndex, direction) } : item,
      ),
    );
  };

  const addHeaderMegaSubLink = (menuIndex: number) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(
      parsed.items.map((item, idx) =>
        idx === menuIndex
          ? { ...item, sub: [...(item.sub || []), { label: '', href: '/' }] }
          : item,
      ),
    );
  };

  const removeHeaderMegaSubLink = (menuIndex: number, linkIndex: number) => {
    const parsed = getHeaderMegaMenu();
    setHeaderMegaMenu(
      parsed.items.map((item, idx) =>
        idx === menuIndex
          ? {
              ...item,
              sub: (item.sub || []).filter((_, currentLinkIndex) => currentLinkIndex !== linkIndex),
            }
          : item,
      ),
    );
  };

  const updateFaqItem = (index: number, field: 'q' | 'a', value: string) => {
    const parsed = parseJsonSafe<{ items: Array<{ q: string; a: string }> }>(faqText, {
      items: [],
    });
    const nextItems = parsed.items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    setFaqText(JSON.stringify({ items: nextItems }, null, 2));
  };

  const moveFaqItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{ items: Array<{ q: string; a: string }> }>(faqText, {
      items: [],
    });
    setFaqText(JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2));
  };
  const addFaqItem = () => {
    const parsed = parseJsonSafe<{ items: Array<{ q: string; a: string }> }>(faqText, {
      items: [],
    });
    setFaqText(JSON.stringify({ items: [...parsed.items, { q: '', a: '' }] }, null, 2));
  };
  const removeFaqItem = (index: number) => {
    const parsed = parseJsonSafe<{ items: Array<{ q: string; a: string }> }>(faqText, {
      items: [],
    });
    setFaqText(JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2));
  };

  const updatePrimaryActionItem = (
    index: number,
    field: 'title' | 'description' | 'stat' | 'href',
    value: string,
  ) => {
    const parsed = parseJsonSafe<{
      items: Array<{ title: string; description: string; stat: string; href: string }>;
    }>(primaryActionsText, { items: [] });
    const nextItems = parsed.items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    setPrimaryActionsText(JSON.stringify({ items: nextItems }, null, 2));
  };

  const movePrimaryActionItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{
      items: Array<{ title: string; description: string; stat: string; href: string }>;
    }>(primaryActionsText, { items: [] });
    setPrimaryActionsText(
      JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2),
    );
  };
  const addPrimaryActionItem = () => {
    const parsed = parseJsonSafe<{
      items: Array<{ title: string; description: string; stat: string; href: string }>;
    }>(primaryActionsText, { items: [] });
    setPrimaryActionsText(
      JSON.stringify(
        { items: [...parsed.items, { title: '', description: '', stat: '', href: '' }] },
        null,
        2,
      ),
    );
  };
  const removePrimaryActionItem = (index: number) => {
    const parsed = parseJsonSafe<{
      items: Array<{ title: string; description: string; stat: string; href: string }>;
    }>(primaryActionsText, { items: [] });
    setPrimaryActionsText(
      JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2),
    );
  };

  type MvpQuickStartCard = {
    badge: string;
    title: string;
    description: string;
    href: string;
    links: Array<{ label: string; href: string }>;
  };

  const getMvpQuickStartCards = () =>
    parseJsonSafe<{ items: MvpQuickStartCard[] }>(mvpQuickStartText, { items: [] });

  const setMvpQuickStartCards = (items: MvpQuickStartCard[]) => {
    setMvpQuickStartText(JSON.stringify({ items }, null, 2));
  };

  const updateMvpQuickStartCard = (
    index: number,
    field: 'badge' | 'title' | 'description' | 'href',
    value: string,
  ) => {
    const parsed = getMvpQuickStartCards();
    const nextItems = parsed.items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    setMvpQuickStartCards(nextItems);
  };

  const moveMvpQuickStartCard = (index: number, direction: -1 | 1) => {
    const parsed = getMvpQuickStartCards();
    setMvpQuickStartCards(moveItem(parsed.items, index, direction));
  };

  const addMvpQuickStartCard = () => {
    const parsed = getMvpQuickStartCards();
    setMvpQuickStartCards([
      ...parsed.items,
      {
        badge: '',
        title: '',
        description: '',
        href: '/',
        links: [{ label: '', href: '/' }],
      },
    ]);
  };

  const removeMvpQuickStartCard = (index: number) => {
    const parsed = getMvpQuickStartCards();
    setMvpQuickStartCards(parsed.items.filter((_, idx) => idx !== index));
  };

  const updateMvpQuickStartLink = (
    cardIndex: number,
    linkIndex: number,
    field: 'label' | 'href',
    value: string,
  ) => {
    const parsed = getMvpQuickStartCards();
    const nextItems = parsed.items.map((item, idx) => {
      if (idx !== cardIndex) return item;
      const links = (item.links || []).map((link, currentLinkIndex) =>
        currentLinkIndex === linkIndex ? { ...link, [field]: value } : link,
      );
      return { ...item, links };
    });
    setMvpQuickStartCards(nextItems);
  };

  const moveMvpQuickStartLink = (cardIndex: number, linkIndex: number, direction: -1 | 1) => {
    const parsed = getMvpQuickStartCards();
    const nextItems = parsed.items.map((item, idx) =>
      idx === cardIndex
        ? { ...item, links: moveItem(item.links || [], linkIndex, direction) }
        : item,
    );
    setMvpQuickStartCards(nextItems);
  };

  const addMvpQuickStartLink = (cardIndex: number) => {
    const parsed = getMvpQuickStartCards();
    const nextItems = parsed.items.map((item, idx) =>
      idx === cardIndex
        ? { ...item, links: [...(item.links || []), { label: '', href: '/' }] }
        : item,
    );
    setMvpQuickStartCards(nextItems);
  };

  const removeMvpQuickStartLink = (cardIndex: number, linkIndex: number) => {
    const parsed = getMvpQuickStartCards();
    const nextItems = parsed.items.map((item, idx) =>
      idx === cardIndex
        ? {
            ...item,
            links: (item.links || []).filter(
              (_, currentLinkIndex) => currentLinkIndex !== linkIndex,
            ),
          }
        : item,
    );
    setMvpQuickStartCards(nextItems);
  };

  type HomepageSectionCopy = {
    mvpQuickStartBadge: string;
    mvpQuickStartTitle: string;
    mvpQuickStartDescription: string;
    mvpQuickStartCtaLabel: string;
    mvpQuickStartCtaHref: string;
    [key: string]: any;
  };

  const getHomepageSectionCopy = () =>
    parseJsonSafe<HomepageSectionCopy>(homepageSectionCopyText, {
      mvpQuickStartBadge: 'MVP Hızlı Başlangıç',
      mvpQuickStartTitle: 'Şanlıurfa’da en çok kullanılan akışlar tek yerde',
      mvpQuickStartDescription:
        'Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.',
      mvpQuickStartCtaLabel: 'Tüm Şanlıurfa modülleri',
      mvpQuickStartCtaHref: '/kesfet',
    });

  const updateHomepageSectionCopyField = (field: keyof HomepageSectionCopy, value: string) => {
    const parsed = getHomepageSectionCopy();
    setHomepageSectionCopyText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getHomepageSections = () =>
    parseJsonSafe<HomepageSectionsConfig>(homepageSectionsText, {
      order: DEFAULT_HOMEPAGE_SECTION_ORDER,
      visibility: {},
    });

  const setHomepageSections = (sections: HomepageSectionsConfig) => {
    const order = Array.from(new Set(sections.order.filter((item) => item && item.trim())));
    setHomepageSectionsText(
      JSON.stringify(
        {
          order,
          visibility: sections.visibility || {},
        },
        null,
        2,
      ),
    );
  };

  const moveHomepageSection = (index: number, direction: -1 | 1) => {
    const parsed = getHomepageSections();
    setHomepageSections({
      ...parsed,
      order: moveItem(parsed.order || [], index, direction),
    });
  };

  const updateHomepageSectionVisibility = (sectionId: string, visible: boolean) => {
    const parsed = getHomepageSections();
    setHomepageSections({
      ...parsed,
      visibility: {
        ...(parsed.visibility || {}),
        [sectionId]: visible,
      },
    });
  };

  const restoreHomepageSectionDefaults = () => {
    const parsed = getHomepageSections();
    setHomepageSections({
      ...parsed,
      order: [
        ...(parsed.order || []).filter((item) => DEFAULT_HOMEPAGE_SECTION_ORDER.includes(item)),
        ...DEFAULT_HOMEPAGE_SECTION_ORDER.filter((item) => !(parsed.order || []).includes(item)),
      ],
      visibility: parsed.visibility || {},
    });
  };

  const getHomepageSectionStyles = () =>
    parseJsonSafe<Record<string, string>>(homepageSectionStylesText, {});

  const updateHomepageSectionStyleField = (field: string, value: string) => {
    const parsed = getHomepageSectionStyles();
    setHomepageSectionStylesText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getHomepageSchema = () =>
    parseJsonSafe<HomepageSchemaConfig>(homepageSchemaText, DEFAULT_HOMEPAGE_SCHEMA);

  const updateHomepageSchemaField = (field: keyof HomepageSchemaConfig, value: string) => {
    const parsed = getHomepageSchema();
    setHomepageSchemaText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getHomepageSeo = () =>
    parseJsonSafe<HomepageSeoConfig>(homepageSeoText, DEFAULT_HOMEPAGE_SEO);

  const setHomepageSeo = (seoConfig: HomepageSeoConfig) => {
    setHomepageSeoText(JSON.stringify(seoConfig, null, 2));
  };

  const updateHomepageSeoField = (
    field: Exclude<keyof HomepageSeoConfig, 'keywords'>,
    value: string,
  ) => {
    const parsed = getHomepageSeo();
    setHomepageSeo({ ...parsed, [field]: value });
  };

  const updateHomepageSeoKeyword = (index: number, value: string) => {
    const parsed = getHomepageSeo();
    setHomepageSeo({
      ...parsed,
      keywords: (parsed.keywords || []).map((keyword, idx) => (idx === index ? value : keyword)),
    });
  };

  const moveHomepageSeoKeyword = (index: number, direction: -1 | 1) => {
    const parsed = getHomepageSeo();
    setHomepageSeo({ ...parsed, keywords: moveItem(parsed.keywords || [], index, direction) });
  };

  const addHomepageSeoKeyword = () => {
    const parsed = getHomepageSeo();
    setHomepageSeo({ ...parsed, keywords: [...(parsed.keywords || []), ''] });
  };

  const removeHomepageSeoKeyword = (index: number) => {
    const parsed = getHomepageSeo();
    setHomepageSeo({
      ...parsed,
      keywords: (parsed.keywords || []).filter((_, idx) => idx !== index),
    });
  };

  const getHeaderBrand = () =>
    parseJsonSafe<HeaderBrandConfig>(headerBrandText, DEFAULT_HEADER_BRAND);

  const updateHeaderBrandField = (field: keyof HeaderBrandConfig, value: string) => {
    const parsed = getHeaderBrand();
    setHeaderBrandText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getHeaderLabels = () =>
    parseJsonSafe<HeaderLabelsConfig>(headerLabelsText, DEFAULT_HEADER_LABELS);

  const updateHeaderLabelsField = (field: keyof HeaderLabelsConfig, value: string) => {
    const parsed = getHeaderLabels();
    setHeaderLabelsText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getSocialProfiles = () =>
    parseJsonSafe<SocialProfilesConfig>(socialProfilesText, DEFAULT_SOCIAL_PROFILES);

  const updateSocialProfile = (
    channel: SocialProfileKey,
    field: 'enabled' | 'handle' | 'url',
    value: boolean | string,
  ) => {
    const parsed = getSocialProfiles();
    setSocialProfilesText(
      JSON.stringify(
        {
          ...parsed,
          [channel]: {
            ...(parsed[channel] || { enabled: false }),
            [field]: value,
          },
        },
        null,
        2,
      ),
    );
  };

  const getFooterBrand = () =>
    parseJsonSafe<FooterBrandConfig>(footerBrandText, DEFAULT_FOOTER_BRAND);

  const updateFooterBrandField = (field: keyof FooterBrandConfig, value: string) => {
    const parsed = getFooterBrand();
    setFooterBrandText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  const getFooterBottom = () =>
    parseJsonSafe<FooterBottomConfig>(footerBottomText, DEFAULT_FOOTER_BOTTOM);

  const setFooterBottom = (bottom: FooterBottomConfig) => {
    setFooterBottomText(JSON.stringify(bottom, null, 2));
  };

  const updateFooterBottomField = (field: 'copyrightLabel', value: string) => {
    const parsed = getFooterBottom();
    setFooterBottom({ ...parsed, [field]: value });
  };

  const updateFooterLegalLink = (index: number, field: 'label' | 'href', value: string) => {
    const parsed = getFooterBottom();
    setFooterBottom({
      ...parsed,
      legalLinks: (parsed.legalLinks || []).map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    });
  };

  const moveFooterLegalLink = (index: number, direction: -1 | 1) => {
    const parsed = getFooterBottom();
    setFooterBottom({ ...parsed, legalLinks: moveItem(parsed.legalLinks || [], index, direction) });
  };

  const addFooterLegalLink = () => {
    const parsed = getFooterBottom();
    setFooterBottom({
      ...parsed,
      legalLinks: [...(parsed.legalLinks || []), { label: '', href: '/' }],
    });
  };

  const removeFooterLegalLink = (index: number) => {
    const parsed = getFooterBottom();
    setFooterBottom({
      ...parsed,
      legalLinks: (parsed.legalLinks || []).filter((_, idx) => idx !== index),
    });
  };

  const getHeroMeta = () => parseJsonSafe<HeroMetaConfig>(heroMetaText, DEFAULT_HERO_META);

  const updateHeroMetaField = (field: keyof HeroMetaConfig, value: string) => {
    const parsed = getHeroMeta();
    setHeroMetaText(JSON.stringify({ ...parsed, [field]: value }, null, 2));
  };

  type LiveStatusCard = {
    key: string;
    title: string;
    metricLabel: string;
    statusText: string;
    href: string;
    cta: string;
    badgeClass: string;
  };

  const getLiveStatusCards = () =>
    parseJsonSafe<{ items: LiveStatusCard[] }>(liveStatusCardsText, { items: [] });

  const setLiveStatusCards = (items: LiveStatusCard[]) => {
    setLiveStatusCardsText(JSON.stringify({ items }, null, 2));
  };

  const updateLiveStatusCard = (index: number, field: keyof LiveStatusCard, value: string) => {
    const parsed = getLiveStatusCards();
    setLiveStatusCards(
      parsed.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const moveLiveStatusCard = (index: number, direction: -1 | 1) => {
    const parsed = getLiveStatusCards();
    setLiveStatusCards(moveItem(parsed.items, index, direction));
  };

  const addLiveStatusCard = () => {
    const parsed = getLiveStatusCards();
    setLiveStatusCards([
      ...parsed.items,
      {
        key: '',
        title: '',
        metricLabel: '',
        statusText: '',
        href: '/',
        cta: '',
        badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
      },
    ]);
  };

  const removeLiveStatusCard = (index: number) => {
    const parsed = getLiveStatusCards();
    setLiveStatusCards(parsed.items.filter((_, idx) => idx !== index));
  };

  type ServiceQuickLinkCard = {
    key: string;
    categoryLabel: string;
    title: string;
    description: string;
    href: string;
    hoverBorderClass: string;
    categoryLabelClass?: string;
  };

  const getServiceQuickLinks = () =>
    parseJsonSafe<{ items: ServiceQuickLinkCard[] }>(serviceQuickLinksText, { items: [] });

  const setServiceQuickLinks = (items: ServiceQuickLinkCard[]) => {
    setServiceQuickLinksText(JSON.stringify({ items }, null, 2));
  };

  const updateServiceQuickLink = (
    index: number,
    field: keyof ServiceQuickLinkCard,
    value: string,
  ) => {
    const parsed = getServiceQuickLinks();
    setServiceQuickLinks(
      parsed.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const moveServiceQuickLink = (index: number, direction: -1 | 1) => {
    const parsed = getServiceQuickLinks();
    setServiceQuickLinks(moveItem(parsed.items, index, direction));
  };

  const addServiceQuickLink = () => {
    const parsed = getServiceQuickLinks();
    setServiceQuickLinks([
      ...parsed.items,
      {
        key: '',
        categoryLabel: '',
        title: '',
        description: '',
        href: '/',
        hoverBorderClass: 'hover:border-red-400/60',
        categoryLabelClass: 'text-red-300',
      },
    ]);
  };

  const removeServiceQuickLink = (index: number) => {
    const parsed = getServiceQuickLinks();
    setServiceQuickLinks(parsed.items.filter((_, idx) => idx !== index));
  };

  type CommunityPanel = {
    title: string;
    description: string;
    items: Array<{ label: string; href: string }>;
  };

  const getCommunityPanel = () =>
    parseJsonSafe<CommunityPanel>(communityPanelText, { title: '', description: '', items: [] });

  const setCommunityPanel = (panel: CommunityPanel) => {
    setCommunityPanelText(JSON.stringify(panel, null, 2));
  };

  const updateCommunityPanelField = (field: 'title' | 'description', value: string) => {
    const parsed = getCommunityPanel();
    setCommunityPanel({ ...parsed, [field]: value });
  };

  const updateCommunityPanelItem = (index: number, field: 'label' | 'href', value: string) => {
    const parsed = getCommunityPanel();
    setCommunityPanel({
      ...parsed,
      items: parsed.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    });
  };

  const moveCommunityPanelItem = (index: number, direction: -1 | 1) => {
    const parsed = getCommunityPanel();
    setCommunityPanel({ ...parsed, items: moveItem(parsed.items, index, direction) });
  };

  const addCommunityPanelItem = () => {
    const parsed = getCommunityPanel();
    setCommunityPanel({ ...parsed, items: [...parsed.items, { label: '', href: '/' }] });
  };

  const removeCommunityPanelItem = (index: number) => {
    const parsed = getCommunityPanel();
    setCommunityPanel({ ...parsed, items: parsed.items.filter((_, idx) => idx !== index) });
  };

  type TrendingFallbackQuery = {
    query: string;
  };

  const getTrendingFallbackQueries = () =>
    parseJsonSafe<{ items: TrendingFallbackQuery[] }>(trendingFallbackQueriesText, { items: [] });

  const setTrendingFallbackQueries = (items: TrendingFallbackQuery[]) => {
    setTrendingFallbackQueriesText(JSON.stringify({ items }, null, 2));
  };

  const updateTrendingFallbackQuery = (index: number, value: string) => {
    const parsed = getTrendingFallbackQueries();
    setTrendingFallbackQueries(
      parsed.items.map((item, idx) => (idx === index ? { ...item, query: value } : item)),
    );
  };

  const moveTrendingFallbackQuery = (index: number, direction: -1 | 1) => {
    const parsed = getTrendingFallbackQueries();
    setTrendingFallbackQueries(moveItem(parsed.items, index, direction));
  };

  const addTrendingFallbackQuery = () => {
    const parsed = getTrendingFallbackQueries();
    setTrendingFallbackQueries([...parsed.items, { query: '' }]);
  };

  const removeTrendingFallbackQuery = (index: number) => {
    const parsed = getTrendingFallbackQueries();
    setTrendingFallbackQueries(parsed.items.filter((_, idx) => idx !== index));
  };

  const updateQuickCategoryItem = (index: number, field: 'slug' | 'name', value: string) => {
    const parsed = parseJsonSafe<{ items: Array<{ slug: string; name: string }> }>(
      quickCategoriesText,
      {
        items: [],
      },
    );
    const nextItems = parsed.items.map((item, idx) =>
      idx === index ? { ...item, [field]: value } : item,
    );
    setQuickCategoriesText(JSON.stringify({ items: nextItems }, null, 2));
  };

  const moveQuickCategoryItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{ items: Array<{ slug: string; name: string }> }>(
      quickCategoriesText,
      {
        items: [],
      },
    );
    setQuickCategoriesText(
      JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2),
    );
  };

  const addQuickCategoryItem = () => {
    const parsed = parseJsonSafe<{ items: Array<{ slug: string; name: string }> }>(
      quickCategoriesText,
      {
        items: [],
      },
    );
    setQuickCategoriesText(
      JSON.stringify({ items: [...parsed.items, { slug: '', name: '' }] }, null, 2),
    );
  };

  const removeQuickCategoryItem = (index: number) => {
    const parsed = parseJsonSafe<{ items: Array<{ slug: string; name: string }> }>(
      quickCategoriesText,
      {
        items: [],
      },
    );
    setQuickCategoriesText(
      JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2),
    );
  };

  const updateFeaturedGuideItem = (index: number, field: 'title' | 'href', value: string) => {
    const parsed = parseJsonSafe<{ items: Array<{ title: string; href: string }> }>(
      featuredGuidesText,
      { items: [] },
    );
    setFeaturedGuidesText(
      JSON.stringify(
        {
          items: parsed.items.map((item, idx) =>
            idx === index ? { ...item, [field]: value } : item,
          ),
        },
        null,
        2,
      ),
    );
  };

  const moveFeaturedGuideItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{ items: Array<{ title: string; href: string }> }>(
      featuredGuidesText,
      { items: [] },
    );
    setFeaturedGuidesText(
      JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2),
    );
  };

  const addFeaturedGuideItem = () => {
    const parsed = parseJsonSafe<{ items: Array<{ title: string; href: string }> }>(
      featuredGuidesText,
      { items: [] },
    );
    setFeaturedGuidesText(
      JSON.stringify({ items: [...parsed.items, { title: '', href: '/' }] }, null, 2),
    );
  };

  const removeFeaturedGuideItem = (index: number) => {
    const parsed = parseJsonSafe<{ items: Array<{ title: string; href: string }> }>(
      featuredGuidesText,
      { items: [] },
    );
    setFeaturedGuidesText(
      JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2),
    );
  };

  const updateHeroQuickLinkItem = (index: number, field: 'label' | 'href', value: string) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      heroQuickLinksText,
      { items: [] },
    );
    setHeroQuickLinksText(
      JSON.stringify(
        {
          items: parsed.items.map((item, idx) =>
            idx === index ? { ...item, [field]: value } : item,
          ),
        },
        null,
        2,
      ),
    );
  };

  const moveHeroQuickLinkItem = (index: number, direction: -1 | 1) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      heroQuickLinksText,
      { items: [] },
    );
    setHeroQuickLinksText(
      JSON.stringify({ items: moveItem(parsed.items, index, direction) }, null, 2),
    );
  };

  const addHeroQuickLinkItem = () => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      heroQuickLinksText,
      { items: [] },
    );
    setHeroQuickLinksText(
      JSON.stringify({ items: [...parsed.items, { label: '', href: '/' }] }, null, 2),
    );
  };

  const removeHeroQuickLinkItem = (index: number) => {
    const parsed = parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(
      heroQuickLinksText,
      { items: [] },
    );
    setHeroQuickLinksText(
      JSON.stringify({ items: parsed.items.filter((_, idx) => idx !== index) }, null, 2),
    );
  };

  const updateFooterItem = (
    group: 'explore' | 'districts' | 'popular' | 'company' | 'services',
    index: number,
    field: 'label' | 'href',
    value: string,
  ) => {
    const parsed = parseJsonSafe<Record<string, Array<{ label: string; href: string }>>>(
      footerLinksText,
      {
        explore: [],
        districts: [],
        popular: [],
        company: [],
        services: [],
      },
    );
    const base = Array.isArray(parsed[group]) ? parsed[group] : [];
    parsed[group] = base.map((item, idx) => (idx === index ? { ...item, [field]: value } : item));
    setFooterLinksText(JSON.stringify(parsed, null, 2));
  };

  const moveFooterItem = (
    group: 'explore' | 'districts' | 'popular' | 'company' | 'services',
    index: number,
    direction: -1 | 1,
  ) => {
    const parsed = parseJsonSafe<Record<string, Array<{ label: string; href: string }>>>(
      footerLinksText,
      {
        explore: [],
        districts: [],
        popular: [],
        company: [],
        services: [],
      },
    );
    const base = Array.isArray(parsed[group]) ? parsed[group] : [];
    parsed[group] = moveItem(base, index, direction);
    setFooterLinksText(JSON.stringify(parsed, null, 2));
  };
  const addFooterItem = (group: 'explore' | 'districts' | 'popular' | 'company' | 'services') => {
    const parsed = parseJsonSafe<Record<string, Array<{ label: string; href: string }>>>(
      footerLinksText,
      {
        explore: [],
        districts: [],
        popular: [],
        company: [],
        services: [],
      },
    );
    const base = Array.isArray(parsed[group]) ? parsed[group] : [];
    parsed[group] = [...base, { label: '', href: '' }];
    setFooterLinksText(JSON.stringify(parsed, null, 2));
  };
  const removeFooterItem = (
    group: 'explore' | 'districts' | 'popular' | 'company' | 'services',
    index: number,
  ) => {
    const parsed = parseJsonSafe<Record<string, Array<{ label: string; href: string }>>>(
      footerLinksText,
      {
        explore: [],
        districts: [],
        popular: [],
        company: [],
        services: [],
      },
    );
    const base = Array.isArray(parsed[group]) ? parsed[group] : [];
    parsed[group] = base.filter((_, idx) => idx !== index);
    setFooterLinksText(JSON.stringify(parsed, null, 2));
  };

  const previewHomeWithDrafts = async () => {
    setSaving(true);
    setStatus('');
    try {
      const updates: Array<{ key: string; value: Record<string, any>; description: string }> = [
        {
          key: 'homepage.schema',
          value: parseJsonSafe(homepageSchemaText, {
            siteName: 'Sanliurfa.com',
            alternateName: 'Şanlıurfa Şehir Rehberi',
            baseUrl: 'https://sanliurfa.com',
            searchPathTemplate: '/arama?q={search_term_string}',
            organizationId: '/#organization',
            webpageId: '/#webpage',
            cityName: 'Şanlıurfa',
            trendingListName: 'Şanlıurfa Bugün En Çok Arananlar',
            servicesListName: 'Şanlıurfa Hızlı Servisler',
            webpageName: 'Şanlıurfa Şehir Rehberi | Sanliurfa.com',
          }),
          description: 'Ana sayfa structured data ayarları',
        },
        {
          key: 'homepage.seo',
          value: parseJsonSafe(homepageSeoText, {
            title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
            description:
              'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
            canonical: '/',
            ogImage: '/images/hero/hero-home.webp',
            keywords: [
              'Şanlıurfa',
              'Şanlıurfa şehir rehberi',
              'Şanlıurfa mekanlar',
              'Şanlıurfa nöbetçi eczane',
              'Şanlıurfa otobüs saatleri',
              'Şanlıurfa gezilecek yerler',
              'Sanliurfa.com',
            ],
          }),
          description: 'Ana sayfa SEO title/description/keywords',
        },
        { key: 'homepage.hero', value: hero as any, description: 'Ana sayfa hero alanı' },
        {
          key: 'homepage.heroMeta',
          value: parseJsonSafe(heroMetaText, DEFAULT_HERO_META),
          description: 'Ana sayfa hero meta/etiket alanı',
        },
        { key: 'homepage.mainCta', value: mainCta as any, description: 'Ana sayfa CTA alanı' },
        {
          key: 'header.utilityLinks',
          value: parseJsonSafe(headerLinksText, { items: [] }),
          description: 'Header üst hızlı linkleri',
        },
        {
          key: 'header.brand',
          value: parseJsonSafe(headerBrandText, {
            topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
            logoTitle: 'Sanliurfa',
            logoHighlight: '.com',
          }),
          description: 'Header marka alanı',
        },
        {
          key: 'header.labels',
          value: parseJsonSafe(headerLabelsText, {
            viewAllLabel: 'Tümünü Gör',
            loginLabel: 'Giriş',
            registerLabel: 'Kayıt Ol',
            mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
          }),
          description: 'Header etiket/metin alanı',
        },
        {
          key: 'social.profiles',
          value: parseJsonSafe(socialProfilesText, {
            instagram: { enabled: false, handle: '', url: '' },
            tiktok: { enabled: false, handle: '', url: '' },
            youtube: { enabled: false, handle: '', url: '' },
            x: { enabled: false, handle: '', url: '' },
          }),
          description: 'Sosyal medya profil yönetimi',
        },
        {
          key: 'footer.links',
          value: parseJsonSafe(footerLinksText, {}),
          description: 'Footer link grupları',
        },
        {
          key: 'footer.brand',
          value: parseJsonSafe(footerBrandText, {
            title: 'Sanliurfa',
            highlight: '.com',
            description:
              "Şanlıurfa’nın en kapsamlı şehir rehberi. Mekanlar, gezilecek yerler, etkinlikler ve daha fazlası.",
            infoNote: 'Resmi sosyal medya hesabımız bulunmamaktadır.',
          }),
          description: 'Footer marka/intro alanı',
        },
        {
          key: 'footer.bottom',
          value: parseJsonSafe(footerBottomText, {
            copyrightLabel: '© 2026 Sanliurfa.com — Tarihin Sıfır Noktası',
            legalLinks: [
              { label: 'Gizlilik', href: '/gizlilik-politikasi' },
              { label: 'Koşullar', href: '/kullanim-kosullari' },
              { label: 'İletişim', href: '/iletisim' },
            ],
          }),
          description: 'Footer alt satır alanı',
        },
        {
          key: 'homepage.primaryActions',
          value: parseJsonSafe(primaryActionsText, { items: [] }),
          description: 'Ana sayfa hızlı erişim modülleri',
        },
        {
          key: 'homepage.mvpQuickStart',
          value: parseJsonSafe(mvpQuickStartText, { items: [] }),
          description: 'Ana sayfa MVP hızlı başlangıç kartları',
        },
        {
          key: 'homepage.quickCategories',
          value: parseJsonSafe(quickCategoriesText, { items: [] }),
          description: 'Ana sayfa popüler kategori kutuları',
        },
        {
          key: 'homepage.featuredGuides',
          value: parseJsonSafe(featuredGuidesText, { items: [] }),
          description: 'Ana sayfa rehber linkleri',
        },
        {
          key: 'homepage.faq',
          value: parseJsonSafe(faqText, { items: [] }),
          description: 'Ana sayfa SSS alanı',
        },
        {
          key: 'homepage.heroQuickLinks',
          value: parseJsonSafe(heroQuickLinksText, { items: [] }),
          description: 'Ana sayfa hero hızlı linkleri',
        },
        {
          key: 'homepage.liveStatusCards',
          value: parseJsonSafe(liveStatusCardsText, { items: [] }),
          description: 'Ana sayfa güncel durum kartları',
        },
        {
          key: 'homepage.serviceQuickLinks',
          value: parseJsonSafe(serviceQuickLinksText, { items: [] }),
          description: 'Ana sayfa servis hızlı link kartları',
        },
        {
          key: 'homepage.communityPanel',
          value: parseJsonSafe(communityPanelText, { title: '', description: '', items: [] }),
          description: 'Ana sayfa topluluk paneli',
        },
        {
          key: 'homepage.trendingFallbackQueries',
          value: parseJsonSafe(trendingFallbackQueriesText, { items: [] }),
          description: 'Trend aramalar fallback listesi',
        },
        {
          key: 'homepage.sections',
          value: parseJsonSafe(homepageSectionsText, { order: [], visibility: {} }),
          description: 'Ana sayfa section görünürlük ve sıra ayarları',
        },
        {
          key: 'homepage.sectionCopy',
          value: parseJsonSafe(homepageSectionCopyText, {
            mvpQuickStartBadge: 'MVP Hızlı Başlangıç',
            mvpQuickStartTitle: 'Şanlıurfa’da en çok kullanılan akışlar tek yerde',
            mvpQuickStartDescription:
              'Siteyi kullanan kişi önce günlük servise, sonra mekan/gezi keşfine, ardından topluluk veya işletme başvurusuna hızlıca ulaşmalı.',
            mvpQuickStartCtaLabel: 'Tüm Şanlıurfa modülleri',
            mvpQuickStartCtaHref: '/kesfet',
            quickActionsTitle: 'Hızlı Erişim Modülleri',
            quickActionsDescription: 'Şanlıurfa’da günlük ihtiyaçlar için tek tıkla erişim',
            quickActionsCtaLabel: 'Tüm modüller →',
            liveStatusTitle: 'Güncel Durum Merkezi',
            liveStatusDescription:
              'Nöbetçi eczane, otobüs ve uçak servislerinin operasyonel görünümü',
            liveStatusUpdatedPrefix: 'Son güncelleme',
            districtServiceTitle: 'Konum ve İlçeye Göre Hızlı Başlangıç',
            districtServiceDescription:
              'Yaşadığın veya gideceğin ilçeyi seç, servisleri ilçe odaklı başlat.',
            districtServiceCtaLabel: 'Tüm ilçe rehberi →',
            popularCategoriesTitle: 'Popüler Mekan Kategorileri',
            popularCategoriesCtaLabel: 'Mekan Rehberi →',
            trendingTitle: 'Bugün En Çok Arananlar',
            trendingCtaLabel: 'Aramaya Git →',
            densityTitle: 'Kategori Yoğunluk Haritası',
            densityCtaLabel: 'Kategoriler →',
            districtsTitle: 'İlçe Bazlı Şanlıurfa Rehberi',
            districtsCtaLabel: 'Tüm İlçeler →',
            historicalSitesTitle: 'Şanlıurfa Gezilecek Yerler',
            historicalSitesCtaLabel: 'Gezi Rehberi →',
            featuredPlacesTitle: 'Öne Çıkan Mekanlar',
            featuredPlacesCtaLabel: 'Tümü →',
            recentPlacesTitle: 'Yeni Eklenen Mekanlar',
            audiencePlansTitle: 'Şanlıurfa’yı amacına göre planla',
            audiencePlansDescription:
              'Turist, aile, öğrenci ve yerel kullanıcı senaryoları için hazır keşif akışları.',
            districtSpotlightsTitle: 'İlçeye göre öne çıkan mekan kümeleri',
            districtSpotlightsDescription:
              'Merkezden Halfeti’ye kadar öne çıkan yoğunlukları ve mekan kümelerini tek bakışta gör.',
            districtSpotlightsCtaLabel: 'İlçe sayfalarını aç →',
            recentReviewsTitle: 'Son yorumlanan mekanlar',
            recentReviewsDescription:
              'Topluluğun son değerlendirdiği mekanları puan, kategori ve yorum özetiyle izle.',
            trustSignalsTitle: 'Son Güncellenen Mekanlar',
            trustSignalsSubtitle: 'Güven sinyali: canlı içerik güncelleme akışı',
            guidesTitle: 'Öne Çıkan Rehber Sayfaları',
            mainCategoriesTitle: 'Şanlıurfa Ana Kategoriler',
            recipesTitle: 'Şanlıurfa Özel Yemek Tarifleri',
            recipesCtaLabel: 'Tüm Tarifler →',
            blogTitle: 'Blogdan Son Yazılar',
            blogCtaLabel: 'Blog →',
            faqTitle: 'AEO ve GEO için hızlı cevap bölümü',
            faqDescription:
              'Bu bölüm, kullanıcıların en sık sorduğu Şanlıurfa odaklı sorulara kısa ve net yanıtlar sunar.',
          }),
          description: 'Ana sayfa section metinleri',
        },
        {
          key: 'homepage.sectionStyles',
          value: parseJsonSafe(homepageSectionStylesText, {
            sectionHeadingClass: 'text-2xl md:text-3xl font-bold',
            sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
            sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
            sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
            sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
            mvpQuickStartSectionClass: 'relative z-10 -mt-8 px-4',
            mvpQuickStartContainerClass: 'container mx-auto',
            mvpQuickStartPanelClass:
              'rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 md:p-6',
            mvpQuickStartHeaderClass:
              'flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between',
            mvpQuickStartBadgeClass: 'text-xs font-bold uppercase tracking-[0.26em] text-red-600',
            mvpQuickStartTitleClass: 'mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl',
            mvpQuickStartDescriptionClass: 'mt-2 max-w-3xl text-sm text-slate-600 md:text-base',
            mvpQuickStartCtaClass:
              'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700',
            mvpQuickStartGridClass: 'mt-5 grid gap-4 lg:grid-cols-3',
            mvpQuickStartCardClass:
              'rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-xl',
            mvpQuickStartCardLinkClass: 'block',
            mvpQuickStartCardBadgeClass:
              'inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
            mvpQuickStartCardTitleClass: 'mt-4 text-xl font-extrabold text-slate-950',
            mvpQuickStartCardDescriptionClass: 'mt-2 text-sm leading-6 text-slate-600',
            mvpQuickStartLinksWrapClass: 'mt-5 flex flex-wrap gap-2',
            mvpQuickStartLinkClass:
              'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700',
            quickActionsSectionClass: 'bg-white text-slate-900 py-12',
            quickActionsContainerClass: 'container mx-auto px-4',
            quickActionsHeaderWrapClass: 'flex items-end justify-between mb-6',
            quickActionsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
            quickActionsCardClass:
              'group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
            liveStatusSectionClass: 'bg-slate-950 text-white py-12 border-y border-slate-800',
            liveStatusContainerClass: 'container mx-auto px-4',
            liveStatusHeaderWrapClass:
              'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6',
            liveStatusGridClass: 'grid lg:grid-cols-3 gap-4',
            liveStatusCardClass: 'rounded-2xl border border-slate-700 bg-slate-900/80 p-5',
            districtServiceSectionClass: 'bg-slate-900 text-white py-12 border-t border-slate-800',
            districtServiceContainerClass: 'container mx-auto px-4',
            districtServiceHeaderWrapClass:
              'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
            districtServiceGridClass: 'grid lg:grid-cols-3 gap-4',
            districtServiceCardClass:
              'rounded-2xl border border-slate-700 bg-slate-950/80 p-5 transition',
            districtServiceChipsWrapClass: 'mt-6 flex flex-wrap gap-2',
            districtServiceChipClass:
              'rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200',
            popularCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
            popularCategoriesContainerClass: 'container mx-auto px-4',
            popularCategoriesHeaderWrapClass: 'flex items-center justify-between mb-6',
            popularCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3',
            popularCategoriesCardClass:
              'rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
            trendDensitySectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
            trendDensityContainerClass: 'container mx-auto px-4',
            trendDensityGridClass: 'grid lg:grid-cols-2 gap-6',
            trendDensityCardClass: 'rounded-2xl border border-slate-200 bg-slate-50 p-6',
            trendDensityHeaderWrapClass: 'flex items-center justify-between mb-4',
            trendDensityTrendGridClass: 'grid sm:grid-cols-2 gap-2',
            trendDensityTrendItemClass:
              'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
            trendDensityDensityWrapClass: 'space-y-3',
            trendDensityDensityItemClass:
              'block rounded-xl border border-slate-200 bg-white p-3 hover:border-red-300 transition',
            districtsSectionClass: 'bg-white text-slate-900 py-12',
            districtsContainerClass: 'container mx-auto px-4',
            districtsHeaderWrapClass: 'flex items-center justify-between mb-6',
            districtsGridClass: 'grid md:grid-cols-3 gap-4',
            districtsCardClass:
              'rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-red-300 hover:shadow-lg',
            audiencePlansSectionClass: 'bg-slate-950 text-white py-14 border-t border-slate-800',
            audiencePlansContainerClass: 'container mx-auto px-4',
            audiencePlansHeaderWrapClass:
              'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
            audiencePlansGridClass: 'grid lg:grid-cols-3 gap-5',
            audiencePlansCardClass:
              'rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-xl shadow-black/20',
            audiencePlansBadgeClass:
              'inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-red-200',
            audiencePlansListClass: 'mt-5 space-y-3 text-sm text-slate-300',
            audiencePlansActionClass:
              'mt-6 inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200',
            districtSpotlightsSectionClass:
              'bg-white text-slate-900 py-14 border-t border-slate-200',
            districtSpotlightsContainerClass: 'container mx-auto px-4',
            districtSpotlightsHeaderWrapClass:
              'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
            districtSpotlightsGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-5',
            districtSpotlightsCardClass:
              'rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fff,#f8fafc)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
            historicalSitesSectionClass: 'bg-amber-50 text-slate-900 py-12',
            historicalSitesContainerClass: 'container mx-auto px-4',
            historicalSitesHeaderWrapClass: 'flex items-center justify-between mb-6',
            historicalSitesGridClass: 'grid md:grid-cols-3 gap-5',
            historicalSitesCardClass:
              'group overflow-hidden rounded-2xl border border-amber-200 bg-white transition hover:shadow-xl',
            historicalSitesImageWrapClass: 'h-44 overflow-hidden bg-slate-200',
            historicalSitesImageClass:
              'h-full w-full object-cover transition duration-300 group-hover:scale-105',
            featuredPlacesSectionClass: 'bg-white text-slate-900 py-14',
            featuredPlacesContainerClass: 'container mx-auto px-4',
            featuredPlacesHeaderWrapClass: 'flex items-center justify-between mb-8',
            featuredPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
            recentPlacesSectionClass: 'bg-slate-100 text-slate-900 py-14',
            recentPlacesContainerClass: 'container mx-auto px-4',
            recentPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
            recentReviewsSectionClass:
              'bg-slate-100 text-slate-900 py-14 border-t border-slate-200',
            recentReviewsContainerClass: 'container mx-auto px-4',
            recentReviewsHeaderWrapClass:
              'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
            recentReviewsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
            recentReviewsCardClass:
              'rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-red-300 hover:shadow-lg',
            trustSignalsSectionClass: 'bg-white text-slate-900 py-12 border-t border-slate-200',
            trustSignalsContainerClass: 'container mx-auto px-4',
            trustSignalsHeaderWrapClass: 'flex items-center justify-between mb-6',
            trustSignalsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
            trustSignalsCardClass:
              'rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300 hover:bg-white hover:shadow-md',
            guidesCommunitySectionClass: 'bg-white text-slate-900 py-12',
            guidesCommunityContainerClass: 'container mx-auto px-4',
            guidesCommunityPanelClass: 'mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5',
            guidesCommunityLinksWrapClass: 'mt-3 flex flex-wrap gap-2',
            guidesCommunityLinkClass:
              'rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100',
            guidesCommunityGridClass: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4',
            guidesCommunityGuideCardClass:
              'rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-slate-800 transition hover:border-red-300 hover:text-red-700',
            mainCategoriesSectionClass: 'bg-slate-100 text-slate-900 py-12',
            mainCategoriesContainerClass: 'container mx-auto px-4',
            mainCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-4 gap-3',
            mainCategoriesCardClass:
              'rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700',
            recipesSectionClass: 'bg-amber-50 text-slate-900 py-12',
            recipesContainerClass: 'container mx-auto px-4',
            recipesHeaderWrapClass: 'flex items-center justify-between mb-6',
            recipesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-5',
            recipesCardClass:
              'group overflow-hidden rounded-xl border border-amber-200 bg-white transition hover:shadow-lg',
            recipesImageWrapClass: 'h-44 overflow-hidden bg-amber-100',
            recipesImageClass:
              'h-full w-full object-cover transition duration-300 group-hover:scale-105',
            blogSectionClass: 'bg-white text-slate-900 py-14',
            blogContainerClass: 'container mx-auto px-4',
            blogHeaderWrapClass: 'flex items-center justify-between mb-8',
            blogGridClass: 'grid md:grid-cols-3 gap-6',
            blogCardClass:
              'group block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:shadow-lg',
            blogImageClass: 'h-48 w-full object-cover transition group-hover:scale-105',
            blogImageFallbackClass: 'h-48 w-full bg-slate-200',
            faqSectionClass: 'bg-slate-900 text-white py-14 border-t border-slate-800',
            faqContainerClass: 'container mx-auto px-4',
            faqIntroWrapClass: 'max-w-4xl',
            faqGridClass: 'mt-6 grid md:grid-cols-2 gap-4',
            faqCardClass: 'rounded-xl border border-slate-700 bg-slate-950 p-5',
            mainCtaSectionClass: 'bg-slate-950 text-white py-16 border-t border-slate-800',
            mainCtaContainerClass: 'container mx-auto px-4 text-center',
            mainCtaDescriptionClass: 'mt-3 text-slate-300 max-w-2xl mx-auto',
            mainCtaActionsWrapClass: 'mt-7 flex flex-col sm:flex-row gap-3 justify-center',
            mainCtaPrimaryButtonClass:
              'rounded-xl bg-red-600 px-7 py-3 font-bold text-white transition hover:bg-red-700',
            mainCtaSecondaryButtonClass:
              'rounded-xl border border-slate-600 bg-slate-900 px-7 py-3 font-bold text-white transition hover:border-slate-400',
          }),
          description: 'Ana sayfa section style tokenları',
        },
        {
          key: 'header.megaMenu',
          value: parseJsonSafe(headerMegaMenuText, { items: [] }),
          description: 'Header mega menü ayarları',
        },
        {
          key: 'header.mobileQuickLinks',
          value: parseJsonSafe(headerMobileQuickLinksText, { items: [] }),
          description: 'Header mobil hızlı link ayarları',
        },
        {
          key: 'header.mobileAllLinks',
          value: parseJsonSafe(headerMobileAllLinksText, { items: [] }),
          description: 'Header mobil tüm link ayarları',
        },
      ];
      for (const item of updates) {
        await saveSetting(item.key, item.value, item.description, 'draft');
      }
      setStatus('Taslaklar kaydedildi. Önizleme yeni sekmede açılıyor.');
      window.open('/?sitePreview=1', '_blank');
    } catch {
      setStatus('Taslak önizleme hazırlanırken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const onField =
    (key: keyof HeroConfig) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setHero((prev) => ({ ...prev, [key]: e.target.value }));

  const searchImages = async () => {
    if (!imageQuery.trim()) return;
    try {
      const res = await fetch(
        `/api/admin/site/media/search?q=${encodeURIComponent(imageQuery)}&provider=all&limit=8`,
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Görsel arama başarısız');
        return;
      }
      setImageResults(Array.isArray(json.results) ? json.results : []);
    } catch {
      setStatus('Görsel arama sırasında hata oluştu.');
    }
  };

  const importImage = async (url: string) => {
    if (!assetKey.trim()) {
      setStatus('assetKey zorunlu');
      return;
    }
    try {
      const res = await fetch('/api/admin/site/media/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetKey,
          url,
          alt: `${assetKey} görseli`,
          metadata: { source: 'admin-search' },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Görsel import başarısız');
        return;
      }
      setStatus(`Görsel kaydedildi: ${assetKey}`);
      await loadMediaLibrary();
    } catch {
      setStatus('Görsel import sırasında hata oluştu.');
    }
  };

  const toMediaDraft = (item: MediaAssetRow): MediaDraftRow => ({
    url: item.url || '',
    alt: item.alt || '',
    bucket: String(item.metadata?.bucket || ''),
    provider: String(item.metadata?.provider || ''),
    mimeType: item.mime_type || '',
    width: item.width ? String(item.width) : '',
    height: item.height ? String(item.height) : '',
  });

  const loadMediaLibrary = async () => {
    setMediaLoading(true);
    try {
      const search = new URLSearchParams();
      search.set('limit', '48');
      if (mediaBucketFilter.trim()) search.set('bucket', mediaBucketFilter.trim());
      const res = await fetch(`/api/admin/site/media?${search.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Medya listesi alınamadı');
        return;
      }
      const items = Array.isArray(json.items) ? json.items : [];
      setMediaItems(items);
      setMediaDrafts(
        Object.fromEntries(
          items.map((item: MediaAssetRow) => [item.asset_key, toMediaDraft(item)]),
        ),
      );
    } catch {
      setStatus('Medya listesi alınırken hata oluştu.');
    } finally {
      setMediaLoading(false);
    }
  };

  const applyMediaToHero = (url: string) => {
    setHero((prev) => ({ ...prev, backgroundImage: url }));
    setStatus('Görsel URL hero alanına uygulandı. Kaydetmek için "Yayına Al" tıklayın.');
  };

  const updateMediaDraftField =
    (assetKeyToEdit: string, field: keyof MediaDraftRow) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMediaDrafts((prev) => ({
        ...prev,
        [assetKeyToEdit]: {
          ...(prev[assetKeyToEdit] || {
            url: '',
            alt: '',
            bucket: '',
            provider: '',
            mimeType: '',
            width: '',
            height: '',
          }),
          [field]: value,
        },
      }));
    };

  const saveMediaAsset = async (assetKeyToSave: string) => {
    const draft = mediaDrafts[assetKeyToSave];
    if (!draft?.url.trim()) {
      setStatus('Medya URL zorunlu.');
      return;
    }
    try {
      const res = await fetch('/api/admin/site/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetKey: assetKeyToSave,
          url: draft.url.trim(),
          alt: draft.alt.trim(),
          mimeType: draft.mimeType.trim() || null,
          width: draft.width.trim() ? Number(draft.width) : null,
          height: draft.height.trim() ? Number(draft.height) : null,
          metadata: {
            ...(mediaItems.find((item) => item.asset_key === assetKeyToSave)?.metadata || {}),
            ...(draft.bucket.trim() ? { bucket: draft.bucket.trim() } : {}),
            ...(draft.provider.trim() ? { provider: draft.provider.trim() } : {}),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Medya güncellenemedi');
        return;
      }
      setStatus(`Medya güncellendi: ${assetKeyToSave}`);
      await loadMediaLibrary();
    } catch {
      setStatus('Medya güncelleme sırasında hata oluştu.');
    }
  };

  const deleteMediaAsset = async (assetKeyToDelete: string) => {
    try {
      const res = await fetch('/api/admin/site/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetKey: assetKeyToDelete }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Medya silinemedi');
        return;
      }
      setStatus(`Medya silindi: ${assetKeyToDelete}`);
      await loadMediaLibrary();
    } catch {
      setStatus('Medya silme sırasında hata oluştu.');
    }
  };

  const loadSettingHistory = async () => {
    const key = historyKey.trim();
    if (!key) {
      setStatus('Geçmiş için ayar anahtarı girin.');
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/site/settings?key=${encodeURIComponent(key)}&history=1`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Geçmiş alınamadı');
        return;
      }
      const items = Array.isArray(json.history) ? json.history : [];
      setHistoryItems(items);
      if (items.length === 0) {
        setStatus(`${key} için sürüm geçmişi bulunamadı.`);
      } else {
        setStatus(`${key} için ${items.length} sürüm getirildi.`);
      }
    } catch {
      setStatus('Geçmiş alınırken hata oluştu.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadSettingDiff = async () => {
    const key = diffKey.trim();
    const fromVersion = Number(diffFromVersion);
    const toVersion = Number(diffToVersion);
    if (!key) {
      setStatus('Fark için ayar anahtarı girin.');
      return;
    }
    if (
      !Number.isInteger(fromVersion) ||
      fromVersion < 1 ||
      !Number.isInteger(toVersion) ||
      toVersion < 1
    ) {
      setStatus('Fark sürüm numaraları geçersiz.');
      return;
    }

    setDiffLoading(true);
    setDiffResult(null);
    try {
      const qp = new URLSearchParams({
        key,
        fromVersion: String(fromVersion),
        toVersion: String(toVersion),
      });
      const res = await fetch(`/api/admin/site/settings/diff?${qp.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Fark alınamadı');
        return;
      }
      setDiffResult(json as SettingDiffResult);
      setStatus(
        `Fark hazır: +${json.summary?.added || 0} / -${json.summary?.removed || 0} / ~${json.summary?.changed || 0}`,
      );
    } catch {
      setStatus('Fark alınırken hata oluştu.');
    } finally {
      setDiffLoading(false);
    }
  };

  const rollbackSetting = async () => {
    try {
      const res = await fetch('/api/admin/site/settings/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: rollbackKey,
          versionNo: Number(rollbackVersion),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Geri alma başarısız');
        return;
      }
      setStatus(`${rollbackKey} v${rollbackVersion} sürümüne döndürüldü.`);
    } catch {
      setStatus('Geri alma sırasında hata oluştu.');
    }
  };

  const previewRollback = async () => {
    setRollbackPreviewLoading(true);
    setRollbackPreview(null);
    try {
      const qp = new URLSearchParams({
        key: rollbackKey,
        version: rollbackVersion,
      });
      const res = await fetch(`/api/admin/site/settings/rollback-preview?${qp.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Geri alma deneme önizlemesi alınamadı');
        return;
      }
      setRollbackPreview(json as RollbackPreview);
      setStatus(
        `Geri alma deneme önizlemesi hazır: ${json?.summary?.changed || 0} alan değişecek.`,
      );
    } catch {
      setStatus('Geri alma deneme önizlemesi sırasında hata oluştu.');
    } finally {
      setRollbackPreviewLoading(false);
    }
  };

  const applyPreset = async () => {
    if (!selectedPresetId) {
      setStatus('Önce preset seçin.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site/settings/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId: selectedPresetId,
          mode: presetMode,
          note: `Admin preset uygulama (${selectedPresetId})`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Preset uygulanamadı');
        return;
      }
      setStatus(
        `${selectedPresetId} preset uygulandı (${presetMode}) - ${Array.isArray(json.appliedKeys) ? json.appliedKeys.length : 0} anahtar`,
      );
      window.location.reload();
    } catch {
      setStatus('Preset uygulanırken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const loadPresetPreview = async () => {
    if (!selectedPresetId) {
      setStatus('Önce preset seçin.');
      return;
    }
    setPresetPreviewLoading(true);
    setPresetPreview(null);
    try {
      const qp = new URLSearchParams({ presetId: selectedPresetId });
      const res = await fetch(`/api/admin/site/settings/presets/preview?${qp.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Preset önizleme alınamadı');
        return;
      }
      setPresetPreview(json as SitePresetPreview);
      setStatus('Preset fark önizlemesi hazır.');
    } catch {
      setStatus('Preset önizleme alınırken hata oluştu.');
    } finally {
      setPresetPreviewLoading(false);
    }
  };

  const loadAuditTimeline = async () => {
    setAuditLoading(true);
    try {
      const qp = new URLSearchParams({ limit: '60' });
      if (auditKeyFilter.trim()) qp.set('key', auditKeyFilter.trim());
      if (auditActionFilter.trim()) qp.set('action', auditActionFilter.trim());
      const res = await fetch(`/api/admin/site/audit?${qp.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Audit timeline alınamadı');
        return;
      }
      setAuditItems(Array.isArray(json.items) ? json.items : []);
      setStatus(`Audit kayıtları yüklendi: ${Array.isArray(json.items) ? json.items.length : 0}`);
    } catch {
      setStatus('Audit timeline alınırken hata oluştu.');
    } finally {
      setAuditLoading(false);
    }
  };

  const loadAntiSpamEvents = async () => {
    setAntiSpamEventsLoading(true);
    try {
      const res = await fetch('/api/admin/reviews/antispam-events?limit=100');
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setStatus(json?.error || 'Anti-spam event listesi alınamadı');
        return;
      }
      setAntiSpamEvents(Array.isArray(json.items) ? json.items : []);
    } catch {
      setStatus('Anti-spam event listesi alınırken hata oluştu.');
    } finally {
      setAntiSpamEventsLoading(false);
    }
  };

  const addAllowlistIdentity = (rawIdentity: string) => {
    const identity = rawIdentity.trim().toLowerCase();
    if (!identity) return;
    const existing = Array.isArray(reviewAntiSpam.allowlist) ? reviewAntiSpam.allowlist : [];
    if (existing.includes(identity)) {
      setStatus(`Allowlist içinde zaten mevcut: ${identity}`);
      return;
    }
    setReviewAntiSpam((prev) => ({ ...prev, allowlist: [...(prev.allowlist || []), identity] }));
    setAllowlistInput('');
    setStatus(`Allowlist eklendi: ${identity}. Kalıcı olması için kaydet butonuna basın.`);
  };

  const removeAllowlistIdentity = (identity: string) => {
    setReviewAntiSpam((prev) => ({
      ...prev,
      allowlist: (prev.allowlist || []).filter((item) => item !== identity),
    }));
    setStatus(`Allowlist kaldırıldı: ${identity}. Kalıcı olması için kaydet butonuna basın.`);
  };

  const addAllowlistFromEvent = (event: AntiSpamEventItem) => {
    const identity = String(event.actor_email || event.actor_user_id || '')
      .trim()
      .toLowerCase();
    if (!identity) {
      setStatus('Bu kayıt için eklenecek kullanıcı kimliği bulunamadı.');
      return;
    }
    addAllowlistIdentity(identity);
  };

  if (loading) return <div className="p-6 text-sm text-gray-600">Yükleniyor...</div>;

  const sectionButtons = (onDraft: () => void, onPublish: () => void) => (
    <div className="mt-4 flex items-center gap-3">
      <button
        onClick={onDraft}
        disabled={saving}
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? 'Kaydediliyor...' : 'Taslak Kaydet'}
      </button>
      <button
        onClick={onPublish}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? 'Kaydediliyor...' : 'Yayına Al'}
      </button>
    </div>
  );

  const adminQuickSections = [
    'Landing Şablon Kütüphanesi',
    'Ana Sayfa Yapılandırılmış Veri Form Editörü',
    'Ana Sayfa SEO Form Editörü',
    'Ana Sayfa Hero Yönetimi',
    'Hero Meta Form Editörü',
    'Ana Sayfa Ana CTA Yönetimi',
    'Hızlı Erişim Form Editörü',
    'MVP Hızlı Başlangıç Form Editörü',
    'Öne Çıkan Rehber Linkleri Form Editörü',
    'Popüler Kategoriler Form Editörü',
    'Hero Hızlı Linkleri Form Editörü',
    'Canlı Durum Kartları Form Editörü',
    'Servis Hızlı Link Kartları Form Editörü',
    'Topluluk Paneli Form Editörü',
    'Trend Fallback Sorguları Form Editörü',
    'Ana Sayfa Section Sıra/Görünürlük Form Editörü',
    'MVP Hızlı Başlangıç Başlık/CTA Form Editörü',
    'Ana Sayfa Section Metinleri Genel Form Editörü',
    'MVP Hızlı Başlangıç Stil Form Editörü',
    'Ana Sayfa Section Style Genel Form Editörü',
    'SSS Form Editörü',
    'Sosyal Profil Form Editörü',
    'Header Marka Form Editörü',
    'Header Metin Etiketleri Form Editörü',
    'Header Mega Menü Form Editörü',
    'Header Mobil Hızlı Linkler Form Editörü',
    'Header Mobil Tüm Linkler Form Editörü',
    'Header Link Form Editörü',
    'Footer Link Form Editörü',
    'Footer Marka/Intro Form Editörü',
    'Footer Alt Satır Form Editörü',
    'Mekan Yaşam Döngüsü SLA Form Editörü',
    'Sosyal Risk Eşik Form Editörü',
    'Sosyal Risk Webhook Form Editörü',
    'Sosyal Risk Otomatik Aksiyon Form Editörü',
    'Yorum Anti-Spam Yönetimi',
  ];

  const toggleJsonEditors = () => {
    const nextOpen = !jsonEditorsExpanded;
    document.querySelectorAll<HTMLDetailsElement>('[data-json-editor-card]').forEach((element) => {
      element.open = nextOpen;
    });
    setJsonEditorsExpanded(nextOpen);
  };

  const clearAdminQuickFilters = () => {
    setAdminQuickFilter('');
    setAdminQuickGroupFilter('Tümü');
  };

  const adminQuickGroups = [
    'Tümü',
    'Ana Sayfa',
    'Header',
    'Footer',
    'Sosyal',
    'Operasyon',
    'Landing',
    'Moderasyon',
  ];

  const filteredAdminQuickSections = adminQuickSections.filter((title) => {
    const matchesText = normalizeAdminSearchText(title).includes(
      normalizeAdminSearchText(adminQuickFilter),
    );
    const group = getAdminSectionGroup(title);
    const matchesGroup = adminQuickGroupFilter === 'Tümü' || group === adminQuickGroupFilter;
    return matchesText && matchesGroup;
  });

  const countAdminQuickGroup = (group: string) =>
    group === 'Tümü'
      ? adminQuickSections.length
      : adminQuickSections.filter((title) => getAdminSectionGroup(title) === group).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-20 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Admin Hızlı Geçiş</h2>
            <p className="text-xs text-slate-500">
              Uzun içerik yönetim ekranında doğrudan ilgili form grubuna atlar.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleJsonEditors}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
          >
            {jsonEditorsExpanded ? 'JSON fallback gizle' : 'JSON fallback göster'}
          </button>
          <input
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-100"
            value={adminQuickFilter}
            onChange={(event) => setAdminQuickFilter(event.target.value)}
            placeholder="Form ara..."
          />
          <button
            type="button"
            onClick={clearAdminQuickFilters}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-white"
          >
            Filtreleri temizle
          </button>
          <div className="flex max-w-full gap-1 overflow-auto">
            {adminQuickGroups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setAdminQuickGroupFilter(group)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  adminQuickGroupFilter === group
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {group}
                <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] text-slate-500">
                  {countAdminQuickGroup(group)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-auto lg:max-h-20 lg:max-w-4xl">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {filteredAdminQuickSections.length}/{adminQuickSections.length} form
            </span>
            {filteredAdminQuickSections.map((title) => (
              <a
                key={title}
                href={`#${createAdminAnchorId(title)}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                <span>{title.replace(' Form Editörü', '')}</span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                  {getAdminSectionGroup(title)}
                </span>
              </a>
            ))}
            {filteredAdminQuickSections.length === 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Eşleşen form yok
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        id={createAdminAnchorId('Landing Şablon Kütüphanesi')}
        className="scroll-mt-32 rounded-xl border border-indigo-200 bg-indigo-50 p-5"
      >
        <h2 className="text-xl font-bold text-indigo-950">Landing Şablon Kütüphanesi</h2>
        <p className="mt-1 text-sm text-indigo-900">
          Hero dahil tüm landing bloklarını tek işlemle taslak veya canlıya uygula.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm"
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm"
            value={presetMode}
            onChange={(e) => setPresetMode((e.target.value as SaveMode) || 'draft')}
          >
            <option value="draft">Taslak</option>
            <option value="publish">Yayın</option>
          </select>
          <button
            onClick={() => void applyPreset()}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
            disabled={saving || !selectedPresetId}
          >
            {saving ? 'Uygulanıyor...' : 'Şablonu Uygula'}
          </button>
          <button
            onClick={() => void loadPresetPreview()}
            className="rounded-lg border border-indigo-400 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
            disabled={presetPreviewLoading || !selectedPresetId}
          >
            {presetPreviewLoading ? 'Hazırlanıyor...' : 'Şablon Fark Önizleme'}
          </button>
        </div>
        {selectedPresetId && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-950">
            {presets
              .filter((preset) => preset.id === selectedPresetId)
              .map((preset) => (
                <div key={preset.id}>
                  <p className="font-semibold">{preset.label}</p>
                  <p className="text-xs text-indigo-800">{preset.description}</p>
                  <p className="mt-1 text-xs text-indigo-700">
                    Anahtarlar: {preset.keys.join(', ')}
                  </p>
                </div>
              ))}
          </div>
        )}
        {presetPreview && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3">
            <p className="text-sm font-semibold text-indigo-900">
              {presetPreview.presetLabel} için fark özeti
            </p>
            <div className="mt-2 space-y-2 text-xs text-indigo-900">
              {presetPreview.keyDiffs.map((item) => (
                <div key={item.key} className="rounded border border-indigo-100 bg-indigo-50 p-2">
                  <p className="font-mono text-indigo-900">{item.key}</p>
                  <p>
                    +{item.summary.added} / -{item.summary.removed} / ~{item.summary.changed}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4">
          <button
            onClick={() => void previewHomeWithDrafts()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Hazırlanıyor...' : 'Taslakları Kaydet + Ana Sayfa Önizle'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <JsonEditorCard
          title="Ana Sayfa Yapılandırılmış Veri JSON (DB)"
          description="`homepage.schema` anahtarı (WebSite/Organization/WebPage script değerleri)"
          value={homepageSchemaText}
          onChange={setHomepageSchemaText}
          onLoadTemplate={() => applyTemplateToEditor('homepage.schema', setHomepageSchemaText)}
          onDraft={() =>
            void saveJsonSetting(
              'homepage.schema',
              'Ana sayfa structured data ayarları',
              homepageSchemaText,
              'draft',
            )
          }
          onPublish={() =>
            void saveJsonSetting(
              'homepage.schema',
              'Ana sayfa structured data ayarları',
              homepageSchemaText,
              'publish',
            )
          }
        />
      </div>

      <FormEditorCard title="Ana Sayfa Yapılandırılmış Veri Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().siteName || ''}
            onChange={(event) => updateHomepageSchemaField('siteName', event.target.value)}
            placeholder="Site adı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().alternateName || ''}
            onChange={(event) => updateHomepageSchemaField('alternateName', event.target.value)}
            placeholder="Alternatif ad"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().baseUrl || ''}
            onChange={(event) => updateHomepageSchemaField('baseUrl', event.target.value)}
            placeholder="Base URL"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().searchPathTemplate || ''}
            onChange={(event) =>
              updateHomepageSchemaField('searchPathTemplate', event.target.value)
            }
            placeholder="/arama?q={search_term_string}"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().organizationId || ''}
            onChange={(event) => updateHomepageSchemaField('organizationId', event.target.value)}
            placeholder="/#organization"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().webpageId || ''}
            onChange={(event) => updateHomepageSchemaField('webpageId', event.target.value)}
            placeholder="/#webpage"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().cityName || ''}
            onChange={(event) => updateHomepageSchemaField('cityName', event.target.value)}
            placeholder="Şanlıurfa"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().webpageName || ''}
            onChange={(event) => updateHomepageSchemaField('webpageName', event.target.value)}
            placeholder="WebPage adı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().trendingListName || ''}
            onChange={(event) => updateHomepageSchemaField('trendingListName', event.target.value)}
            placeholder="Trend liste adı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSchema().servicesListName || ''}
            onChange={(event) => updateHomepageSchemaField('servicesListName', event.target.value)}
            placeholder="Servis liste adı"
          />
        </div>
      </FormEditorCard>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <JsonEditorCard
          title="Ana Sayfa SEO JSON (DB)"
          description="`homepage.seo` anahtarı (title, description, canonical, ogImage, keywords)"
          value={homepageSeoText}
          onChange={setHomepageSeoText}
          onLoadTemplate={() => applyTemplateToEditor('homepage.seo', setHomepageSeoText)}
          onDraft={() =>
            void saveJsonSetting(
              'homepage.seo',
              'Ana sayfa SEO title/description/keywords',
              homepageSeoText,
              'draft',
            )
          }
          onPublish={() =>
            void saveJsonSetting(
              'homepage.seo',
              'Ana sayfa SEO title/description/keywords',
              homepageSeoText,
              'publish',
            )
          }
        />
      </div>

      <FormEditorCard title="Ana Sayfa SEO Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getHomepageSeo().title || ''}
            onChange={(event) => updateHomepageSeoField('title', event.target.value)}
            placeholder="SEO title"
          />
          <textarea
            className="min-h-24 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getHomepageSeo().description || ''}
            onChange={(event) => updateHomepageSeoField('description', event.target.value)}
            placeholder="Meta description"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSeo().canonical || ''}
            onChange={(event) => updateHomepageSeoField('canonical', event.target.value)}
            placeholder="Canonical (/)"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHomepageSeo().ogImage || ''}
            onChange={(event) => updateHomepageSeoField('ogImage', event.target.value)}
            placeholder="OG görsel (/images/...)"
          />
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-gray-800">Odak anahtar kelimeler</p>
          {(getHomepageSeo().keywords || []).map((keyword, idx) => (
            <div key={`homepage-seo-keyword-${idx}`} className="grid gap-2 md:grid-cols-[auto_1fr]">
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveHomepageSeoKeyword(idx, -1)}
                >
                  Yukarı
                </button>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveHomepageSeoKeyword(idx, 1)}
                >
                  Aşağı
                </button>
                <button
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => removeHomepageSeoKeyword(idx)}
                >
                  Sil
                </button>
              </div>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={keyword || ''}
                onChange={(event) => updateHomepageSeoKeyword(idx, event.target.value)}
                placeholder="Şanlıurfa"
              />
            </div>
          ))}
        </div>
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHomepageSeoKeyword()}
        >
          + Yeni Anahtar Kelime
        </button>
      </FormEditorCard>

      <div
        id={createAdminAnchorId('Ana Sayfa Hero Yönetimi')}
        className="scroll-mt-32 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-xl font-bold text-gray-900">Ana Sayfa Hero Yönetimi (DB)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Hero metinleri ve görsel URL&apos;si database üzerinden yönetilir.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Badge</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={hero.badge}
              onChange={onField('badge')}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Arama Placeholder</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={hero.searchPlaceholder}
              onChange={onField('searchPlaceholder')}
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Başlık</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={hero.title}
            onChange={onField('title')}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Açıklama</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            rows={4}
            value={hero.description}
            onChange={onField('description')}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Arka Plan Görsel URL</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={hero.backgroundImage}
            onChange={onField('backgroundImage')}
          />
        </label>
        {sectionButtons(
          () => void saveSetting('homepage.hero', hero, 'Ana sayfa hero alanı', 'draft'),
          () => void saveSetting('homepage.hero', hero, 'Ana sayfa hero alanı', 'publish'),
        )}
      </div>

      <JsonEditorCard
        title="Ana Sayfa Hero Meta JSON (DB)"
        description="`homepage.heroMeta` anahtarı (hero kart/istatistik etiketleri)"
        value={heroMetaText}
        onChange={setHeroMetaText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.heroMeta',
            'Ana sayfa hero meta/etiket alanı',
            heroMetaText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.heroMeta',
            'Ana sayfa hero meta/etiket alanı',
            heroMetaText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Hero Meta Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().heroImageAlt || ''}
            onChange={(event) => updateHeroMetaField('heroImageAlt', event.target.value)}
            placeholder="Hero görsel alt metni"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().searchButtonLabel || ''}
            onChange={(event) => updateHeroMetaField('searchButtonLabel', event.target.value)}
            placeholder="Arama butonu"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().businessCardBadge || ''}
            onChange={(event) => updateHeroMetaField('businessCardBadge', event.target.value)}
            placeholder="İşletme kart rozeti"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().businessCardTitle || ''}
            onChange={(event) => updateHeroMetaField('businessCardTitle', event.target.value)}
            placeholder="İşletme kart başlığı"
          />
          <textarea
            className="min-h-20 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getHeroMeta().businessCardDescription || ''}
            onChange={(event) => updateHeroMetaField('businessCardDescription', event.target.value)}
            placeholder="İşletme kart açıklaması"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().communityCardBadge || ''}
            onChange={(event) => updateHeroMetaField('communityCardBadge', event.target.value)}
            placeholder="Topluluk kart rozeti"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().communityCardTitle || ''}
            onChange={(event) => updateHeroMetaField('communityCardTitle', event.target.value)}
            placeholder="Topluluk kart başlığı"
          />
          <textarea
            className="min-h-20 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getHeroMeta().communityCardDescription || ''}
            onChange={(event) =>
              updateHeroMetaField('communityCardDescription', event.target.value)
            }
            placeholder="Topluluk kart açıklaması"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsPanelTitle || ''}
            onChange={(event) => updateHeroMetaField('statsPanelTitle', event.target.value)}
            placeholder="İstatistik panel başlığı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsPanelSubtitle || ''}
            onChange={(event) => updateHeroMetaField('statsPanelSubtitle', event.target.value)}
            placeholder="İstatistik panel açıklaması"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsActivePlacesLabel || ''}
            onChange={(event) => updateHeroMetaField('statsActivePlacesLabel', event.target.value)}
            placeholder="Aktif mekan etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsPharmacyLabel || ''}
            onChange={(event) => updateHeroMetaField('statsPharmacyLabel', event.target.value)}
            placeholder="Eczane etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsBusRouteLabel || ''}
            onChange={(event) => updateHeroMetaField('statsBusRouteLabel', event.target.value)}
            placeholder="Otobüs etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsEventsLabel || ''}
            onChange={(event) => updateHeroMetaField('statsEventsLabel', event.target.value)}
            placeholder="Etkinlik etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeroMeta().statsUpdatedPrefix || ''}
            onChange={(event) => updateHeroMetaField('statsUpdatedPrefix', event.target.value)}
            placeholder="Güncelleme ön eki"
          />
        </div>
        <details className="rounded border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">
            Hero stil sınıfları
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              'heroSectionClass',
              'heroOverlayClass',
              'heroContainerClass',
              'heroGridClass',
              'heroStatsPanelClass',
              'heroStatsPanelTitleClass',
              'heroStatsPanelSubtitleClass',
              'heroStatsUpdatedClass',
              'statsCardClass',
              'statsLabelClass',
              'statsValueClass',
              'heroQuickLinkClass',
              'heroQuickLinkHoverClass',
              'searchFormClass',
              'searchRowClass',
              'searchInputClass',
              'searchButtonClass',
              'businessCardClass',
              'communityCardClass',
              'heroBadgeClass',
              'heroTitleClass',
              'heroDescriptionClass',
            ].map((field) => (
              <input
                key={field}
                className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                value={String(getHeroMeta()[field as keyof HeroMetaConfig] || '')}
                onChange={(event) =>
                  updateHeroMetaField(field as keyof HeroMetaConfig, event.target.value)
                }
                placeholder={field}
              />
            ))}
          </div>
        </details>
      </FormEditorCard>

      <div
        id={createAdminAnchorId('Ana Sayfa Ana CTA Yönetimi')}
        className="scroll-mt-32 rounded-xl border border-gray-200 bg-white p-5"
      >
        <h2 className="text-xl font-bold text-gray-900">Ana Sayfa Ana CTA Yönetimi (DB)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Hero altı dönüşüm çağrısını database üzerinden yönetin.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Başlık</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={mainCta.title}
            onChange={(e) => setMainCta((p) => ({ ...p, title: e.target.value }))}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-gray-700">Açıklama</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            rows={3}
            value={mainCta.description}
            onChange={(e) => setMainCta((p) => ({ ...p, description: e.target.value }))}
          />
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Birincil Buton Metni</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={mainCta.primaryLabel}
              onChange={(e) => setMainCta((p) => ({ ...p, primaryLabel: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Birincil Buton Linki</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={mainCta.primaryHref}
              onChange={(e) => setMainCta((p) => ({ ...p, primaryHref: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">İkincil Buton Metni</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={mainCta.secondaryLabel}
              onChange={(e) => setMainCta((p) => ({ ...p, secondaryLabel: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">İkincil Buton Linki</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={mainCta.secondaryHref}
              onChange={(e) => setMainCta((p) => ({ ...p, secondaryHref: e.target.value }))}
            />
          </label>
        </div>
        {sectionButtons(
          () => void saveSetting('homepage.mainCta', mainCta, 'Ana sayfa CTA alanı', 'draft'),
          () => void saveSetting('homepage.mainCta', mainCta, 'Ana sayfa CTA alanı', 'publish'),
        )}
      </div>

      <JsonEditorCard
        title="Ana Sayfa Hızlı Erişim Modülleri JSON (DB)"
        description="`homepage.primaryActions` anahtarı"
        value={primaryActionsText}
        onChange={setPrimaryActionsText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.primaryActions',
            'Ana sayfa hızlı erişim modülleri',
            primaryActionsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.primaryActions',
            'Ana sayfa hızlı erişim modülleri',
            primaryActionsText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Hızlı Erişim Form Editörü">
        {parseJsonSafe<{
          items: Array<{ title: string; description: string; stat: string; href: string }>;
        }>(primaryActionsText, { items: [] }).items.map((item, idx) => (
          <div
            key={`pa-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-2 md:grid-cols-2"
          >
            <div className="md:col-span-2 flex gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => movePrimaryActionItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => movePrimaryActionItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removePrimaryActionItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.title || ''}
              onChange={(e) => updatePrimaryActionItem(idx, 'title', e.target.value)}
              placeholder="Başlık"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.stat || ''}
              onChange={(e) => updatePrimaryActionItem(idx, 'stat', e.target.value)}
              placeholder="İstatistik"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
              value={item.description || ''}
              onChange={(e) => updatePrimaryActionItem(idx, 'description', e.target.value)}
              placeholder="Açıklama"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
              value={item.href || ''}
              onChange={(e) => updatePrimaryActionItem(idx, 'href', e.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addPrimaryActionItem()}
        >
          + Yeni Hızlı Erişim
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="MVP Hızlı Başlangıç Kartları JSON (DB)"
        description="`homepage.mvpQuickStart` anahtarı; ana sayfadaki günlük ihtiyaç, keşif ve topluluk kartlarını yönetir."
        value={mvpQuickStartText}
        onChange={setMvpQuickStartText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.mvpQuickStart',
            'Ana sayfa MVP hızlı başlangıç kartları',
            mvpQuickStartText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.mvpQuickStart',
            'Ana sayfa MVP hızlı başlangıç kartları',
            mvpQuickStartText,
            'publish',
          )
        }
      />

      <FormEditorCard title="MVP Hızlı Başlangıç Form Editörü">
        {getMvpQuickStartCards().items.map((item, idx) => (
          <div key={`mvp-card-${idx}`} className="space-y-3 rounded border border-gray-200 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveMvpQuickStartCard(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveMvpQuickStartCard(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeMvpQuickStartCard(idx)}
              >
                Kartı Sil
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.badge || ''}
                onChange={(e) => updateMvpQuickStartCard(idx, 'badge', e.target.value)}
                placeholder="Rozet (Günlük İhtiyaç)"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.href || ''}
                onChange={(e) => updateMvpQuickStartCard(idx, 'href', e.target.value)}
                placeholder="Kart linki (/kesfet)"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
                value={item.title || ''}
                onChange={(e) => updateMvpQuickStartCard(idx, 'title', e.target.value)}
                placeholder="Kart başlığı"
              />
              <textarea
                className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
                rows={2}
                value={item.description || ''}
                onChange={(e) => updateMvpQuickStartCard(idx, 'description', e.target.value)}
                placeholder="Kart açıklaması"
              />
            </div>
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Kart Linkleri
              </p>
              {(item.links || []).map((link, linkIdx) => (
                <div
                  key={`mvp-card-${idx}-link-${linkIdx}`}
                  className="grid gap-2 md:grid-cols-[auto_auto_1fr_1fr_auto]"
                >
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveMvpQuickStartLink(idx, linkIdx, -1)}
                  >
                    Yukarı
                  </button>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveMvpQuickStartLink(idx, linkIdx, 1)}
                  >
                    Aşağı
                  </button>
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    value={link.label || ''}
                    onChange={(e) => updateMvpQuickStartLink(idx, linkIdx, 'label', e.target.value)}
                    placeholder="Link etiketi"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    value={link.href || ''}
                    onChange={(e) => updateMvpQuickStartLink(idx, linkIdx, 'href', e.target.value)}
                    placeholder="Link (/...)"
                  />
                  <button
                    className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                    onClick={() => removeMvpQuickStartLink(idx, linkIdx)}
                  >
                    Sil
                  </button>
                </div>
              ))}
              <button
                className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
                onClick={() => addMvpQuickStartLink(idx)}
              >
                + Link Ekle
              </button>
            </div>
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addMvpQuickStartCard()}
        >
          + Yeni MVP Kartı
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Öne Çıkan Rehber Linkleri JSON (DB)"
        description="`homepage.featuredGuides` anahtarı"
        value={featuredGuidesText}
        onChange={setFeaturedGuidesText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.featuredGuides',
            'Ana sayfa rehber linkleri',
            featuredGuidesText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.featuredGuides',
            'Ana sayfa rehber linkleri',
            featuredGuidesText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Öne Çıkan Rehber Linkleri Form Editörü">
        {parseJsonSafe<{ items: Array<{ title: string; href: string }> }>(featuredGuidesText, {
          items: [],
        }).items.map((item, idx) => (
          <div
            key={`featured-guide-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveFeaturedGuideItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveFeaturedGuideItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeFeaturedGuideItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.title || ''}
              onChange={(event) => updateFeaturedGuideItem(idx, 'title', event.target.value)}
              placeholder="Rehber başlığı"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(event) => updateFeaturedGuideItem(idx, 'href', event.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addFeaturedGuideItem()}
        >
          + Yeni Rehber Linki
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Popüler Kategoriler JSON (DB)"
        description="`homepage.quickCategories` anahtarı"
        value={quickCategoriesText}
        onChange={setQuickCategoriesText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.quickCategories',
            'Ana sayfa popüler kategori kutuları',
            quickCategoriesText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.quickCategories',
            'Ana sayfa popüler kategori kutuları',
            quickCategoriesText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Popüler Kategoriler Form Editörü">
        {parseJsonSafe<{ items: Array<{ slug: string; name: string }> }>(quickCategoriesText, {
          items: [],
        }).items.map((item, idx) => (
          <div
            key={`qc-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-2 md:grid-cols-2"
          >
            <div className="md:col-span-2 flex gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveQuickCategoryItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveQuickCategoryItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeQuickCategoryItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.slug || ''}
              onChange={(e) => updateQuickCategoryItem(idx, 'slug', e.target.value)}
              placeholder="slug (kebapcilar)"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.name || ''}
              onChange={(e) => updateQuickCategoryItem(idx, 'name', e.target.value)}
              placeholder="Görünen ad (Kebapçılar)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addQuickCategoryItem()}
        >
          + Yeni Kategori
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Ana Sayfa SSS JSON (DB)"
        description="`homepage.faq` anahtarı"
        value={faqText}
        onChange={setFaqText}
        onDraft={() =>
          void saveJsonSetting('homepage.faq', 'Ana sayfa SSS alanı', faqText, 'draft')
        }
        onPublish={() =>
          void saveJsonSetting('homepage.faq', 'Ana sayfa SSS alanı', faqText, 'publish')
        }
      />

      <JsonEditorCard
        title="Hero Hızlı Linkleri JSON (DB)"
        description="`homepage.heroQuickLinks` anahtarı"
        value={heroQuickLinksText}
        onChange={setHeroQuickLinksText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.heroQuickLinks',
            'Ana sayfa hero hızlı linkleri',
            heroQuickLinksText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.heroQuickLinks',
            'Ana sayfa hero hızlı linkleri',
            heroQuickLinksText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Hero Hızlı Linkleri Form Editörü">
        {parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(heroQuickLinksText, {
          items: [],
        }).items.map((item, idx) => (
          <div
            key={`hero-quick-link-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeroQuickLinkItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeroQuickLinkItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeHeroQuickLinkItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.label || ''}
              onChange={(event) => updateHeroQuickLinkItem(idx, 'label', event.target.value)}
              placeholder="Link etiketi"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(event) => updateHeroQuickLinkItem(idx, 'href', event.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHeroQuickLinkItem()}
        >
          + Yeni Hero Hızlı Linki
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Canlı Durum Kartları JSON (DB)"
        description="`homepage.liveStatusCards` anahtarı"
        value={liveStatusCardsText}
        onChange={setLiveStatusCardsText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.liveStatusCards',
            'Ana sayfa güncel durum kartları',
            liveStatusCardsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.liveStatusCards',
            'Ana sayfa güncel durum kartları',
            liveStatusCardsText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Canlı Durum Kartları Form Editörü">
        {getLiveStatusCards().items.map((item, idx) => (
          <div
            key={`live-status-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveLiveStatusCard(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveLiveStatusCard(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeLiveStatusCard(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.key || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'key', e.target.value)}
              placeholder="Anahtar (pharmacy)"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'href', e.target.value)}
              placeholder="Link (/saglik/...)"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
              value={item.title || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'title', e.target.value)}
              placeholder="Başlık"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.metricLabel || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'metricLabel', e.target.value)}
              placeholder="Metrik etiketi"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.statusText || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'statusText', e.target.value)}
              placeholder="Durum metni"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.cta || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'cta', e.target.value)}
              placeholder="CTA metni"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
              value={item.badgeClass || ''}
              onChange={(e) => updateLiveStatusCard(idx, 'badgeClass', e.target.value)}
              placeholder="Badge class"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addLiveStatusCard()}
        >
          + Yeni Canlı Durum Kartı
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Servis Hızlı Link Kartları JSON (DB)"
        description="`homepage.serviceQuickLinks` anahtarı"
        value={serviceQuickLinksText}
        onChange={setServiceQuickLinksText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.serviceQuickLinks',
            'Ana sayfa servis hızlı link kartları',
            serviceQuickLinksText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.serviceQuickLinks',
            'Ana sayfa servis hızlı link kartları',
            serviceQuickLinksText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Servis Hızlı Link Kartları Form Editörü">
        {getServiceQuickLinks().items.map((item, idx) => (
          <div
            key={`service-quick-link-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveServiceQuickLink(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveServiceQuickLink(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeServiceQuickLink(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.key || ''}
              onChange={(event) => updateServiceQuickLink(idx, 'key', event.target.value)}
              placeholder="Anahtar (pharmacy)"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(event) => updateServiceQuickLink(idx, 'href', event.target.value)}
              placeholder="Link (/nobetci-eczaneler)"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.categoryLabel || ''}
              onChange={(event) => updateServiceQuickLink(idx, 'categoryLabel', event.target.value)}
              placeholder="Kategori etiketi"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.title || ''}
              onChange={(event) => updateServiceQuickLink(idx, 'title', event.target.value)}
              placeholder="Başlık"
            />
            <textarea
              className="min-h-20 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
              value={item.description || ''}
              onChange={(event) => updateServiceQuickLink(idx, 'description', event.target.value)}
              placeholder="Açıklama"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
              value={item.hoverBorderClass || ''}
              onChange={(event) =>
                updateServiceQuickLink(idx, 'hoverBorderClass', event.target.value)
              }
              placeholder="Hover border class"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 font-mono text-xs"
              value={item.categoryLabelClass || ''}
              onChange={(event) =>
                updateServiceQuickLink(idx, 'categoryLabelClass', event.target.value)
              }
              placeholder="Kategori class (opsiyonel)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addServiceQuickLink()}
        >
          + Yeni Servis Hızlı Link Kartı
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Topluluk Paneli JSON (DB)"
        description="`homepage.communityPanel` anahtarı"
        value={communityPanelText}
        onChange={setCommunityPanelText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.communityPanel',
            'Ana sayfa topluluk paneli',
            communityPanelText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.communityPanel',
            'Ana sayfa topluluk paneli',
            communityPanelText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Topluluk Paneli Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getCommunityPanel().title || ''}
            onChange={(event) => updateCommunityPanelField('title', event.target.value)}
            placeholder="Panel başlığı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getCommunityPanel().description || ''}
            onChange={(event) => updateCommunityPanelField('description', event.target.value)}
            placeholder="Panel açıklaması"
          />
        </div>
        <div className="mt-3 space-y-2">
          {getCommunityPanel().items.map((item, idx) => (
            <div
              key={`community-panel-item-${idx}`}
              className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
            >
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveCommunityPanelItem(idx, -1)}
                >
                  Yukarı
                </button>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveCommunityPanelItem(idx, 1)}
                >
                  Aşağı
                </button>
                <button
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => removeCommunityPanelItem(idx)}
                >
                  Sil
                </button>
              </div>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.label || ''}
                onChange={(event) => updateCommunityPanelItem(idx, 'label', event.target.value)}
                placeholder="Link etiketi"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.href || ''}
                onChange={(event) => updateCommunityPanelItem(idx, 'href', event.target.value)}
                placeholder="Link (/topluluk)"
              />
            </div>
          ))}
        </div>
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addCommunityPanelItem()}
        >
          + Yeni Topluluk Linki
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Trend Fallback Sorguları JSON (DB)"
        description="`homepage.trendingFallbackQueries` anahtarı"
        value={trendingFallbackQueriesText}
        onChange={setTrendingFallbackQueriesText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.trendingFallbackQueries',
            'Trend aramalar fallback listesi',
            trendingFallbackQueriesText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.trendingFallbackQueries',
            'Trend aramalar fallback listesi',
            trendingFallbackQueriesText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Trend Fallback Sorguları Form Editörü">
        {getTrendingFallbackQueries().items.map((item, idx) => (
          <div
            key={`trending-fallback-query-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-[auto_1fr]"
          >
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveTrendingFallbackQuery(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveTrendingFallbackQuery(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeTrendingFallbackQuery(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.query || ''}
              onChange={(event) => updateTrendingFallbackQuery(idx, event.target.value)}
              placeholder="Şanlıurfa nöbetçi eczane"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addTrendingFallbackQuery()}
        >
          + Yeni Trend Sorgusu
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Ana Sayfa Section Yönetimi JSON (DB)"
        description="`homepage.sections` anahtarı (order + visibility)"
        value={homepageSectionsText}
        onChange={setHomepageSectionsText}
        onLoadTemplate={() => applyTemplateToEditor('homepage.sections', setHomepageSectionsText)}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.sections',
            'Ana sayfa section görünürlük ve sıra ayarları',
            homepageSectionsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.sections',
            'Ana sayfa section görünürlük ve sıra ayarları',
            homepageSectionsText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Ana Sayfa Section Sıra/Görünürlük Form Editörü">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
            onClick={() => restoreHomepageSectionDefaults()}
          >
            Eksik Varsayılanları Tamamla
          </button>
        </div>
        <div className="space-y-2">
          {getHomepageSections().order.map((sectionId, idx) => {
            const sections = getHomepageSections();
            const visible = sections.visibility?.[sectionId] !== false;
            return (
              <div
                key={`homepage-section-${sectionId}`}
                className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-[auto_auto_1fr_auto] md:items-center"
              >
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveHomepageSection(idx, -1)}
                >
                  Yukarı
                </button>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveHomepageSection(idx, 1)}
                >
                  Aşağı
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {HOMEPAGE_SECTION_LABELS[sectionId] || sectionId}
                  </p>
                  <p className="text-xs text-gray-500">{sectionId}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(event) =>
                      updateHomepageSectionVisibility(sectionId, event.target.checked)
                    }
                  />
                  Görünür
                </label>
              </div>
            );
          })}
        </div>
      </FormEditorCard>

      <JsonEditorCard
        title="Ana Sayfa Section Metinleri JSON (DB)"
        description="`homepage.sectionCopy` anahtarı"
        value={homepageSectionCopyText}
        onChange={setHomepageSectionCopyText}
        onDraft={() =>
          void saveJsonSetting(
            'homepage.sectionCopy',
            'Ana sayfa section başlık/açıklama/cta metinleri',
            homepageSectionCopyText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.sectionCopy',
            'Ana sayfa section başlık/açıklama/cta metinleri',
            homepageSectionCopyText,
            'publish',
          )
        }
      />
      <FormEditorCard title="MVP Hızlı Başlangıç Başlık/CTA Form Editörü">
        {(() => {
          const copy = getHomepageSectionCopy();
          return (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Rozet
                </span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={copy.mvpQuickStartBadge || ''}
                  onChange={(e) =>
                    updateHomepageSectionCopyField('mvpQuickStartBadge', e.target.value)
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  CTA Linki
                </span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={copy.mvpQuickStartCtaHref || ''}
                  onChange={(e) =>
                    updateHomepageSectionCopyField('mvpQuickStartCtaHref', e.target.value)
                  }
                  placeholder="/kesfet"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Başlık
                </span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={copy.mvpQuickStartTitle || ''}
                  onChange={(e) =>
                    updateHomepageSectionCopyField('mvpQuickStartTitle', e.target.value)
                  }
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Açıklama
                </span>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  rows={3}
                  value={copy.mvpQuickStartDescription || ''}
                  onChange={(e) =>
                    updateHomepageSectionCopyField('mvpQuickStartDescription', e.target.value)
                  }
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  CTA Metni
                </span>
                <input
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  value={copy.mvpQuickStartCtaLabel || ''}
                  onChange={(e) =>
                    updateHomepageSectionCopyField('mvpQuickStartCtaLabel', e.target.value)
                  }
                />
              </label>
            </div>
          );
        })()}
      </FormEditorCard>

      <FormEditorCard title="Ana Sayfa Section Metinleri Genel Form Editörü">
        <p className="text-sm text-gray-600">
          MVP hızlı başlangıç dışındaki tüm ana sayfa başlık, açıklama ve CTA metinleri.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(getHomepageSectionCopy())
            .filter(
              ([field, value]) =>
                !MVP_QUICK_START_COPY_KEYS.includes(field) && typeof value === 'string',
            )
            .map(([field, value]) => {
              const multiline = /description|subtitle/i.test(field);
              return (
                <label key={field} className={multiline ? 'block md:col-span-2' : 'block'}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {field}
                  </span>
                  {multiline ? (
                    <textarea
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      rows={3}
                      value={String(value || '')}
                      onChange={(event) =>
                        updateHomepageSectionCopyField(
                          field as keyof HomepageSectionCopy,
                          event.target.value,
                        )
                      }
                    />
                  ) : (
                    <input
                      className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      value={String(value || '')}
                      onChange={(event) =>
                        updateHomepageSectionCopyField(
                          field as keyof HomepageSectionCopy,
                          event.target.value,
                        )
                      }
                    />
                  )}
                </label>
              );
            })}
        </div>
      </FormEditorCard>
      <JsonEditorCard
        title="Ana Sayfa Section Style JSON (DB)"
        description="`homepage.sectionStyles` anahtarı"
        value={homepageSectionStylesText}
        onChange={setHomepageSectionStylesText}
        onLoadTemplate={() =>
          applyTemplateToEditor('homepage.sectionStyles', setHomepageSectionStylesText)
        }
        onDraft={() =>
          void saveJsonSetting(
            'homepage.sectionStyles',
            'Ana sayfa section style tokenları',
            homepageSectionStylesText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'homepage.sectionStyles',
            'Ana sayfa section style tokenları',
            homepageSectionStylesText,
            'publish',
          )
        }
      />

      <FormEditorCard title="MVP Hızlı Başlangıç Stil Form Editörü">
        <div className="space-y-2">
          {MVP_QUICK_START_STYLE_KEYS.map((styleKey) => {
            const styles = getHomepageSectionStyles();
            return (
              <label key={`mvp-style-${styleKey}`} className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {styleKey}
                </span>
                <textarea
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                  rows={2}
                  value={styles[styleKey] || ''}
                  onChange={(event) =>
                    updateHomepageSectionStyleField(styleKey, event.target.value)
                  }
                />
              </label>
            );
          })}
        </div>
      </FormEditorCard>

      <FormEditorCard title="Ana Sayfa Section Style Genel Form Editörü">
        <p className="text-sm text-gray-600">
          MVP hızlı başlangıç dışındaki section class tokenlarını düzenler. Görsel sistemi bozmamak
          için JSON fallback korunur.
        </p>
        <details className="rounded border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-gray-800">
            Tüm genel style tokenları
          </summary>
          <div className="mt-3 space-y-2">
            {Object.entries(getHomepageSectionStyles())
              .filter(
                ([field, value]) =>
                  !MVP_QUICK_START_STYLE_KEYS.includes(field) && typeof value === 'string',
              )
              .map(([field, value]) => (
                <label key={`section-style-${field}`} className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {field}
                  </span>
                  <textarea
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
                    rows={2}
                    value={String(value || '')}
                    onChange={(event) => updateHomepageSectionStyleField(field, event.target.value)}
                  />
                </label>
              ))}
          </div>
        </details>
      </FormEditorCard>

      <FormEditorCard title="SSS Form Editörü">
        {parseJsonSafe<{ items: Array<{ q: string; a: string }> }>(faqText, {
          items: [],
        }).items.map((item, idx) => (
          <div key={`faq-${idx}`} className="grid gap-2 rounded border border-gray-200 p-2">
            <div className="flex gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveFaqItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveFaqItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeFaqItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.q || ''}
              onChange={(e) => updateFaqItem(idx, 'q', e.target.value)}
              placeholder="Soru"
            />
            <textarea
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              rows={3}
              value={item.a || ''}
              onChange={(e) => updateFaqItem(idx, 'a', e.target.value)}
              placeholder="Cevap"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addFaqItem()}
        >
          + Yeni SSS
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Header Link JSON (DB)"
        description="`header.utilityLinks` anahtarı"
        value={headerLinksText}
        onChange={setHeaderLinksText}
        onDraft={() =>
          void saveJsonSetting(
            'header.utilityLinks',
            'Header üst hızlı linkleri',
            headerLinksText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'header.utilityLinks',
            'Header üst hızlı linkleri',
            headerLinksText,
            'publish',
          )
        }
      />
      <JsonEditorCard
        title="Header Marka JSON (DB)"
        description="`header.brand` anahtarı"
        value={headerBrandText}
        onChange={setHeaderBrandText}
        onLoadTemplate={() => applyTemplateToEditor('header.brand', setHeaderBrandText)}
        onDraft={() =>
          void saveJsonSetting('header.brand', 'Header marka alanı', headerBrandText, 'draft')
        }
        onPublish={() =>
          void saveJsonSetting('header.brand', 'Header marka alanı', headerBrandText, 'publish')
        }
      />

      <FormEditorCard title="Header Marka Form Editörü">
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-3"
            value={getHeaderBrand().topStripText || ''}
            onChange={(event) => updateHeaderBrandField('topStripText', event.target.value)}
            placeholder="Üst şerit metni"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderBrand().logoTitle || ''}
            onChange={(event) => updateHeaderBrandField('logoTitle', event.target.value)}
            placeholder="Logo ana metni"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderBrand().logoHighlight || ''}
            onChange={(event) => updateHeaderBrandField('logoHighlight', event.target.value)}
            placeholder="Logo vurgu metni"
          />
        </div>
      </FormEditorCard>

      <JsonEditorCard
        title="Header Metin Etiketleri JSON (DB)"
        description="`header.labels` anahtarı"
        value={headerLabelsText}
        onChange={setHeaderLabelsText}
        onLoadTemplate={() => applyTemplateToEditor('header.labels', setHeaderLabelsText)}
        onDraft={() =>
          void saveJsonSetting(
            'header.labels',
            'Header metin etiketleri',
            headerLabelsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'header.labels',
            'Header metin etiketleri',
            headerLabelsText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Header Metin Etiketleri Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderLabels().viewAllLabel || ''}
            onChange={(event) => updateHeaderLabelsField('viewAllLabel', event.target.value)}
            placeholder="Tümünü gör etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderLabels().loginLabel || ''}
            onChange={(event) => updateHeaderLabelsField('loginLabel', event.target.value)}
            placeholder="Giriş etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderLabels().registerLabel || ''}
            onChange={(event) => updateHeaderLabelsField('registerLabel', event.target.value)}
            placeholder="Kayıt etiketi"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getHeaderLabels().mobileBusinessCtaLabel || ''}
            onChange={(event) =>
              updateHeaderLabelsField('mobileBusinessCtaLabel', event.target.value)
            }
            placeholder="Mobil işletme CTA etiketi"
          />
        </div>
      </FormEditorCard>
      <JsonEditorCard
        title="Sosyal Profiller JSON (DB)"
        description="`social.profiles` anahtarı"
        value={socialProfilesText}
        onChange={setSocialProfilesText}
        onLoadTemplate={() => applyTemplateToEditor('social.profiles', setSocialProfilesText)}
        onDraft={() =>
          void saveJsonSetting(
            'social.profiles',
            'Sosyal medya profil yönetimi',
            socialProfilesText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'social.profiles',
            'Sosyal medya profil yönetimi',
            socialProfilesText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Sosyal Profil Form Editörü">
        <p className="text-sm text-gray-600">
          Hesap yoksa kapalı bırakın; kapalı kanallar footer veya görünür alanda listelenmez.
        </p>
        <div className="space-y-3">
          {SOCIAL_PROFILE_KEYS.map((channel) => {
            const profile = getSocialProfiles()[channel] || { enabled: false, handle: '', url: '' };
            return (
              <div
                key={channel}
                className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-[auto_1fr_1fr] md:items-center"
              >
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={Boolean(profile.enabled)}
                    onChange={(event) =>
                      updateSocialProfile(channel, 'enabled', event.target.checked)
                    }
                  />
                  {SOCIAL_PROFILE_LABELS[channel]}
                </label>
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={profile.handle || ''}
                  onChange={(event) => updateSocialProfile(channel, 'handle', event.target.value)}
                  placeholder="@kullaniciadi"
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={profile.url || ''}
                  onChange={(event) => updateSocialProfile(channel, 'url', event.target.value)}
                  placeholder="https://..."
                />
              </div>
            );
          })}
        </div>
      </FormEditorCard>

      <JsonEditorCard
        title="Header Mega Menü JSON (DB)"
        description="`header.megaMenu` anahtarı"
        value={headerMegaMenuText}
        onChange={setHeaderMegaMenuText}
        onLoadTemplate={() => applyTemplateToEditor('header.megaMenu', setHeaderMegaMenuText)}
        onDraft={() =>
          void saveJsonSetting(
            'header.megaMenu',
            'Header mega menü ayarları',
            headerMegaMenuText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'header.megaMenu',
            'Header mega menü ayarları',
            headerMegaMenuText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Header Mega Menü Form Editörü">
        <p className="text-sm text-gray-600">
          Üst menü ve doğrudan alt linkleri yönetir. Gelişmiş grup yapısı gerekiyorsa JSON editör
          fallback olarak korunur.
        </p>
        {getHeaderMegaMenu().items.map((item, idx) => (
          <div key={`header-mega-${idx}`} className="space-y-3 rounded border border-gray-200 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMegaMenuItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMegaMenuItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeHeaderMegaMenuItem(idx)}
              >
                Menüyü Sil
              </button>
              <button
                className="rounded border border-emerald-400 px-2 py-1 text-xs text-emerald-700"
                onClick={() => addHeaderMegaSubLink(idx)}
              >
                + Alt Link
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.label || ''}
                onChange={(event) => updateHeaderMegaMenuItem(idx, 'label', event.target.value)}
                placeholder="Menü etiketi"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.href || ''}
                onChange={(event) => updateHeaderMegaMenuItem(idx, 'href', event.target.value)}
                placeholder="Menü linki (/...)"
              />
            </div>
            <div className="space-y-2">
              {(item.sub || []).map((link, linkIdx) => (
                <div
                  key={`header-mega-${idx}-sub-${linkIdx}`}
                  className="grid gap-2 rounded border border-gray-100 p-2 md:grid-cols-2"
                >
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => moveHeaderMegaSubLink(idx, linkIdx, -1)}
                    >
                      Yukarı
                    </button>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => moveHeaderMegaSubLink(idx, linkIdx, 1)}
                    >
                      Aşağı
                    </button>
                    <button
                      className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      onClick={() => removeHeaderMegaSubLink(idx, linkIdx)}
                    >
                      Sil
                    </button>
                  </div>
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    value={link.label || ''}
                    onChange={(event) =>
                      updateHeaderMegaSubLink(idx, linkIdx, 'label', event.target.value)
                    }
                    placeholder="Alt link etiketi"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    value={link.href || ''}
                    onChange={(event) =>
                      updateHeaderMegaSubLink(idx, linkIdx, 'href', event.target.value)
                    }
                    placeholder="Alt link (/...)"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHeaderMegaMenuItem()}
        >
          + Yeni Mega Menü
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Header Mobil Hızlı Linkler JSON (DB)"
        description="`header.mobileQuickLinks` anahtarı"
        value={headerMobileQuickLinksText}
        onChange={setHeaderMobileQuickLinksText}
        onLoadTemplate={() =>
          applyTemplateToEditor('header.mobileQuickLinks', setHeaderMobileQuickLinksText)
        }
        onDraft={() =>
          void saveJsonSetting(
            'header.mobileQuickLinks',
            'Header mobil hızlı link ayarları',
            headerMobileQuickLinksText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'header.mobileQuickLinks',
            'Header mobil hızlı link ayarları',
            headerMobileQuickLinksText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Header Mobil Hızlı Linkler Form Editörü">
        {getHeaderMobileLinks('quick').items.map((item, idx) => (
          <div
            key={`header-mobile-quick-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMobileLink('quick', idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMobileLink('quick', idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeHeaderMobileLink('quick', idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.label || ''}
              onChange={(event) =>
                updateHeaderMobileLink('quick', idx, 'label', event.target.value)
              }
              placeholder="Etiket"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(event) => updateHeaderMobileLink('quick', idx, 'href', event.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHeaderMobileLink('quick')}
        >
          + Yeni Mobil Hızlı Link
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Header Mobil Tüm Linkler JSON (DB)"
        description="`header.mobileAllLinks` anahtarı"
        value={headerMobileAllLinksText}
        onChange={setHeaderMobileAllLinksText}
        onLoadTemplate={() =>
          applyTemplateToEditor('header.mobileAllLinks', setHeaderMobileAllLinksText)
        }
        onDraft={() =>
          void saveJsonSetting(
            'header.mobileAllLinks',
            'Header mobil tüm link ayarları',
            headerMobileAllLinksText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'header.mobileAllLinks',
            'Header mobil tüm link ayarları',
            headerMobileAllLinksText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Header Mobil Tüm Linkler Form Editörü">
        {getHeaderMobileLinks('all').items.map((item, idx) => (
          <div
            key={`header-mobile-all-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
          >
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMobileLink('all', idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderMobileLink('all', idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeHeaderMobileLink('all', idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.label || ''}
              onChange={(event) => updateHeaderMobileLink('all', idx, 'label', event.target.value)}
              placeholder="Etiket"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(event) => updateHeaderMobileLink('all', idx, 'href', event.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHeaderMobileLink('all')}
        >
          + Yeni Mobil Tüm Link
        </button>
      </FormEditorCard>
      <FormEditorCard title="Header Link Form Editörü">
        {parseJsonSafe<{ items: Array<{ label: string; href: string }> }>(headerLinksText, {
          items: [],
        }).items.map((item, idx) => (
          <div
            key={`h-${idx}`}
            className="grid gap-2 rounded border border-gray-200 p-2 md:grid-cols-2"
          >
            <div className="md:col-span-2 flex gap-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderItem(idx, -1)}
              >
                Yukarı
              </button>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => moveHeaderItem(idx, 1)}
              >
                Aşağı
              </button>
              <button
                className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                onClick={() => removeHeaderItem(idx)}
              >
                Sil
              </button>
            </div>
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.label || ''}
              onChange={(e) => updateHeaderItem(idx, 'label', e.target.value)}
              placeholder="Etiket"
            />
            <input
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={item.href || ''}
              onChange={(e) => updateHeaderItem(idx, 'href', e.target.value)}
              placeholder="Bağlantı (/...)"
            />
          </div>
        ))}
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addHeaderItem()}
        >
          + Yeni Header Linki
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Footer Link JSON (DB)"
        description="`footer.links` anahtarı"
        value={footerLinksText}
        onChange={setFooterLinksText}
        onDraft={() =>
          void saveJsonSetting('footer.links', 'Footer link grupları', footerLinksText, 'draft')
        }
        onPublish={() =>
          void saveJsonSetting('footer.links', 'Footer link grupları', footerLinksText, 'publish')
        }
      />
      <FormEditorCard title="Footer Link Form Editörü">
        {(['explore', 'districts', 'popular', 'company', 'services'] as const).map((group) => (
          <div key={group} className="space-y-2 rounded border border-gray-200 p-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-gray-600">{group}</p>
              <button
                className="rounded border border-emerald-400 px-2 py-1 text-[10px] text-emerald-700"
                onClick={() => addFooterItem(group)}
              >
                + Ekle
              </button>
            </div>
            {(
              parseJsonSafe<Record<string, Array<{ label: string; href: string }>>>(
                footerLinksText,
                {
                  explore: [],
                  districts: [],
                  popular: [],
                  company: [],
                  services: [],
                },
              )[group] || []
            ).map((item, idx) => (
              <div key={`${group}-${idx}`} className="grid gap-2 md:grid-cols-2">
                <div className="md:col-span-2 flex gap-2">
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveFooterItem(group, idx, -1)}
                  >
                    Yukarı
                  </button>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => moveFooterItem(group, idx, 1)}
                  >
                    Aşağı
                  </button>
                  <button
                    className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                    onClick={() => removeFooterItem(group, idx)}
                  >
                    Sil
                  </button>
                </div>
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={item.label || ''}
                  onChange={(e) => updateFooterItem(group, idx, 'label', e.target.value)}
                  placeholder="Etiket"
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                  value={item.href || ''}
                  onChange={(e) => updateFooterItem(group, idx, 'href', e.target.value)}
                  placeholder="Bağlantı (/...)"
                />
              </div>
            ))}
          </div>
        ))}
      </FormEditorCard>

      <JsonEditorCard
        title="Footer Marka/Intro JSON (DB)"
        description="`footer.brand` anahtarı"
        value={footerBrandText}
        onChange={setFooterBrandText}
        onDraft={() =>
          void saveJsonSetting('footer.brand', 'Footer marka/intro alanı', footerBrandText, 'draft')
        }
        onPublish={() =>
          void saveJsonSetting(
            'footer.brand',
            'Footer marka/intro alanı',
            footerBrandText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Footer Marka/Intro Form Editörü">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getFooterBrand().title || ''}
            onChange={(event) => updateFooterBrandField('title', event.target.value)}
            placeholder="Marka başlığı"
          />
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={getFooterBrand().highlight || ''}
            onChange={(event) => updateFooterBrandField('highlight', event.target.value)}
            placeholder="Marka vurgu metni"
          />
          <textarea
            className="min-h-24 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getFooterBrand().description || ''}
            onChange={(event) => updateFooterBrandField('description', event.target.value)}
            placeholder="Footer açıklaması"
          />
          <textarea
            className="min-h-20 rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            value={getFooterBrand().infoNote || ''}
            onChange={(event) => updateFooterBrandField('infoNote', event.target.value)}
            placeholder="Bilgi notu"
          />
        </div>
      </FormEditorCard>

      <JsonEditorCard
        title="Footer Alt Satır JSON (DB)"
        description="`footer.bottom` anahtarı"
        value={footerBottomText}
        onChange={setFooterBottomText}
        onDraft={() =>
          void saveJsonSetting(
            'footer.bottom',
            'Footer alt satır legal link alanı',
            footerBottomText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'footer.bottom',
            'Footer alt satır legal link alanı',
            footerBottomText,
            'publish',
          )
        }
      />

      <FormEditorCard title="Footer Alt Satır Form Editörü">
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          value={getFooterBottom().copyrightLabel || ''}
          onChange={(event) => updateFooterBottomField('copyrightLabel', event.target.value)}
          placeholder="Copyright metni"
        />
        <div className="space-y-2">
          {(getFooterBottom().legalLinks || []).map((item, idx) => (
            <div
              key={`footer-legal-${idx}`}
              className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2"
            >
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveFooterLegalLink(idx, -1)}
                >
                  Yukarı
                </button>
                <button
                  className="rounded border px-2 py-1 text-xs"
                  onClick={() => moveFooterLegalLink(idx, 1)}
                >
                  Aşağı
                </button>
                <button
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => removeFooterLegalLink(idx)}
                >
                  Sil
                </button>
              </div>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.label || ''}
                onChange={(event) => updateFooterLegalLink(idx, 'label', event.target.value)}
                placeholder="Etiket"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={item.href || ''}
                onChange={(event) => updateFooterLegalLink(idx, 'href', event.target.value)}
                placeholder="Bağlantı (/...)"
              />
            </div>
          ))}
        </div>
        <button
          className="rounded border border-emerald-400 px-3 py-1 text-xs text-emerald-700"
          onClick={() => addFooterLegalLink()}
        >
          + Yeni Legal Link
        </button>
      </FormEditorCard>

      <JsonEditorCard
        title="Mekan Yaşam Döngüsü SLA Hedefleri JSON (DB)"
        description="`places.lifecycle.sla.targets` anahtarı"
        value={placeSlaTargetsText}
        onChange={setPlaceSlaTargetsText}
        onDraft={() =>
          void saveJsonSetting(
            'places.lifecycle.sla.targets',
            'Mekan yaşam döngüsü segment SLA hedefleri',
            placeSlaTargetsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'places.lifecycle.sla.targets',
            'Mekan yaşam döngüsü segment SLA hedefleri',
            placeSlaTargetsText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Mekan Yaşam Döngüsü SLA Form Editörü">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-gray-700">
            <span className="mb-1 block font-semibold">Varsayılan Saat</span>
            <input
              className="w-full rounded border border-gray-300 px-2 py-1"
              type="number"
              value={getSlaTargets().defaultHours}
              onChange={(e) => updateSlaDefaultHours(Number(e.target.value || 48))}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-gray-700">İlçeye Göre</p>
              <button
                className="rounded border border-emerald-400 px-2 py-1 text-[10px] text-emerald-700"
                onClick={async () => {
                  const key = (await (window as any).promptInput?.('İlçe anahtarı:'))?.trim();
                  if (!key) return;
                  const hoursStr = await (window as any).promptInput?.('Hedef saat:', '48');
                  const hours = Number(hoursStr ?? '48') || 48;
                  upsertSlaBucket('byDistrict', key, hours);
                }}
              >
                + Ekle
              </button>
            </div>
            {Object.entries(getSlaTargets().byDistrict || {}).map(([key, val]) => (
              <div key={`district-${key}`} className="grid gap-2 md:grid-cols-3">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  value={key}
                  disabled
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={val}
                  onChange={(e) => upsertSlaBucket('byDistrict', key, Number(e.target.value || 48))}
                />
                <button
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => deleteSlaBucket('byDistrict', key)}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-gray-700">byTeam</p>
              <button
                className="rounded border border-emerald-400 px-2 py-1 text-[10px] text-emerald-700"
                onClick={async () => {
                  const key = (await (window as any).promptInput?.('Team key:'))?.trim();
                  if (!key) return;
                  const hoursStr = await (window as any).promptInput?.('Target hour:', '48');
                  const hours = Number(hoursStr ?? '48') || 48;
                  upsertSlaBucket('byTeam', key, hours);
                }}
              >
                + Ekle
              </button>
            </div>
            {Object.entries(getSlaTargets().byTeam || {}).map(([key, val]) => (
              <div key={`team-${key}`} className="grid gap-2 md:grid-cols-3">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  value={key}
                  disabled
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={val}
                  onChange={(e) => upsertSlaBucket('byTeam', key, Number(e.target.value || 48))}
                />
                <button
                  className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                  onClick={() => deleteSlaBucket('byTeam', key)}
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        </div>
      </FormEditorCard>

      <JsonEditorCard
        title="Sosyal Risk Eşik JSON (DB)"
        description="`social.risk.thresholds` anahtarı"
        value={socialRiskThresholdsText}
        onChange={setSocialRiskThresholdsText}
        onDraft={() =>
          void saveJsonSetting(
            'social.risk.thresholds',
            'Sosyal risk dashboard alarm eşikleri',
            socialRiskThresholdsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'social.risk.thresholds',
            'Sosyal risk dashboard alarm eşikleri',
            socialRiskThresholdsText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Sosyal Risk Eşik Form Editörü">
        {(() => {
          const cfg = parseJsonSafe<{
            scoreAlert: number;
            zScoreAlert: number;
            minLastHour: number;
            minTotal: number;
            byTenant?: Record<
              string,
              { scoreAlert?: number; zScoreAlert?: number; minLastHour?: number; minTotal?: number }
            >;
          }>(socialRiskThresholdsText, {
            scoreAlert: 70,
            zScoreAlert: 2,
            minLastHour: 2,
            minTotal: 5,
            byTenant: {},
          });
          const setRoot = (patch: Record<string, unknown>) =>
            setSocialRiskThresholdsText(JSON.stringify({ ...cfg, ...patch }, null, 2));
          const setTenant = (tenantId: string, patch: Record<string, unknown>) => {
            const next = {
              ...cfg,
              byTenant: {
                ...(cfg.byTenant || {}),
                [tenantId]: { ...(cfg.byTenant?.[tenantId] || {}), ...patch },
              },
            };
            setSocialRiskThresholdsText(JSON.stringify(next, null, 2));
          };
          const delTenant = (tenantId: string) => {
            const byTenant = { ...(cfg.byTenant || {}) };
            delete byTenant[tenantId];
            setSocialRiskThresholdsText(JSON.stringify({ ...cfg, byTenant }, null, 2));
          };
          return (
            <div className="space-y-2">
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={cfg.scoreAlert}
                  onChange={(e) => setRoot({ scoreAlert: Number(e.target.value || 70) })}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={cfg.zScoreAlert}
                  onChange={(e) => setRoot({ zScoreAlert: Number(e.target.value || 2) })}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={cfg.minLastHour}
                  onChange={(e) => setRoot({ minLastHour: Number(e.target.value || 2) })}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  type="number"
                  value={cfg.minTotal}
                  onChange={(e) => setRoot({ minTotal: Number(e.target.value || 5) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Tenant Bazlı Özel Ayar</p>
                <button
                  className="rounded border border-emerald-400 px-2 py-1 text-[10px] text-emerald-700"
                  onClick={async () => {
                    const tenantId = (await (window as any).promptInput?.('Tenant ID:'))?.trim();
                    if (!tenantId) return;
                    setTenant(tenantId, {});
                  }}
                >
                  + Tenant Ekle
                </button>
              </div>
              {Object.entries(cfg.byTenant || {}).map(([tenantId, t]) => (
                <div
                  key={`tenant-th-${tenantId}`}
                  className="grid gap-2 rounded border border-gray-200 p-2 md:grid-cols-5"
                >
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs md:col-span-1"
                    value={tenantId}
                    disabled
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    type="number"
                    value={t.scoreAlert ?? ''}
                    onChange={(e) =>
                      setTenant(tenantId, { scoreAlert: Number(e.target.value || 0) || undefined })
                    }
                    placeholder="skor"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    type="number"
                    value={t.zScoreAlert ?? ''}
                    onChange={(e) =>
                      setTenant(tenantId, { zScoreAlert: Number(e.target.value || 0) || undefined })
                    }
                    placeholder="z skoru"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    type="number"
                    value={t.minLastHour ?? ''}
                    onChange={(e) =>
                      setTenant(tenantId, { minLastHour: Number(e.target.value || 0) || undefined })
                    }
                    placeholder="son saat"
                  />
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                      type="number"
                      value={t.minTotal ?? ''}
                      onChange={(e) =>
                        setTenant(tenantId, { minTotal: Number(e.target.value || 0) || undefined })
                      }
                      placeholder="minimum toplam"
                    />
                    <button
                      className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      onClick={() => delTenant(tenantId)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </FormEditorCard>

      <JsonEditorCard
        title="Sosyal Risk Webhook JSON (DB)"
        description="`social.risk.webhook` anahtarı"
        value={socialRiskWebhookText}
        onChange={setSocialRiskWebhookText}
        onDraft={() =>
          void saveJsonSetting(
            'social.risk.webhook',
            'Sosyal risk alarm webhook ayarları',
            socialRiskWebhookText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'social.risk.webhook',
            'Sosyal risk alarm webhook ayarları',
            socialRiskWebhookText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Sosyal Risk Webhook Form Editörü">
        {(() => {
          const cfg = parseJsonSafe<{
            enabled: boolean;
            eventName: string;
            userId?: string;
            cooldownMinutes: number;
          }>(socialRiskWebhookText, {
            enabled: false,
            eventName: 'admin.social_risk.alert',
            userId: '',
            cooldownMinutes: 30,
          });
          const setCfg = (patch: Record<string, unknown>) =>
            setSocialRiskWebhookText(JSON.stringify({ ...cfg, ...patch }, null, 2));
          return (
            <div className="grid gap-2 md:grid-cols-4">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ enabled: e.target.checked })}
                />
                Aktif
              </label>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                value={cfg.eventName}
                onChange={(e) => setCfg({ eventName: e.target.value })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                value={cfg.userId || ''}
                onChange={(e) => setCfg({ userId: e.target.value })}
                placeholder="userId (opsiyonel)"
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.cooldownMinutes}
                onChange={(e) => setCfg({ cooldownMinutes: Number(e.target.value || 30) })}
              />
            </div>
          );
        })()}
      </FormEditorCard>

      <JsonEditorCard
        title="Sosyal Risk Otomatik Aksiyon JSON (DB)"
        description="`social.risk.autoActions` anahtarı"
        value={socialRiskAutoActionsText}
        onChange={setSocialRiskAutoActionsText}
        onDraft={() =>
          void saveJsonSetting(
            'social.risk.autoActions',
            'Sosyal risk otomatik aksiyon politika ayarları',
            socialRiskAutoActionsText,
            'draft',
          )
        }
        onPublish={() =>
          void saveJsonSetting(
            'social.risk.autoActions',
            'Sosyal risk otomatik aksiyon politika ayarları',
            socialRiskAutoActionsText,
            'publish',
          )
        }
      />
      <FormEditorCard title="Sosyal Risk Otomatik Aksiyon Form Editörü">
        {(() => {
          const cfg = parseJsonSafe<{
            enabled: boolean;
            cooldownMinutes: number;
            note: string;
            rollbackToDefaultWhenHealthy: boolean;
            profile: {
              swipeLimit: number;
              swipeWindowSeconds: number;
              followLimit: number;
              followWindowSeconds: number;
              messageWriteLimit: number;
              messageWriteWindowSeconds: number;
            };
          }>(socialRiskAutoActionsText, {
            enabled: false,
            cooldownMinutes: 60,
            note: 'social_risk_auto_action',
            rollbackToDefaultWhenHealthy: true,
            profile: {
              swipeLimit: 60,
              swipeWindowSeconds: 60,
              followLimit: 30,
              followWindowSeconds: 60,
              messageWriteLimit: 40,
              messageWriteWindowSeconds: 60,
            },
          });
          const setCfg = (patch: Record<string, unknown>) =>
            setSocialRiskAutoActionsText(JSON.stringify({ ...cfg, ...patch }, null, 2));
          const setProfile = (patch: Record<string, unknown>) =>
            setSocialRiskAutoActionsText(
              JSON.stringify({ ...cfg, profile: { ...cfg.profile, ...patch } }, null, 2),
            );
          return (
            <div className="grid gap-2 md:grid-cols-4">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ enabled: e.target.checked })}
                />
                Aktif
              </label>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.cooldownMinutes}
                onChange={(e) => setCfg({ cooldownMinutes: Number(e.target.value || 60) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs md:col-span-2"
                value={cfg.note}
                onChange={(e) => setCfg({ note: e.target.value })}
              />
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={cfg.rollbackToDefaultWhenHealthy}
                  onChange={(e) => setCfg({ rollbackToDefaultWhenHealthy: e.target.checked })}
                />
                Sağlıklı durumda otomatik geri dönüş
              </label>
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.swipeLimit}
                onChange={(e) => setProfile({ swipeLimit: Number(e.target.value || 60) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.swipeWindowSeconds}
                onChange={(e) => setProfile({ swipeWindowSeconds: Number(e.target.value || 60) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.followLimit}
                onChange={(e) => setProfile({ followLimit: Number(e.target.value || 30) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.followWindowSeconds}
                onChange={(e) => setProfile({ followWindowSeconds: Number(e.target.value || 60) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.messageWriteLimit}
                onChange={(e) => setProfile({ messageWriteLimit: Number(e.target.value || 40) })}
              />
              <input
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                type="number"
                value={cfg.profile.messageWriteWindowSeconds}
                onChange={(e) =>
                  setProfile({ messageWriteWindowSeconds: Number(e.target.value || 60) })
                }
              />
            </div>
          );
        })()}
      </FormEditorCard>

      <div
        id={createAdminAnchorId('Yorum Anti-Spam Yönetimi')}
        className="scroll-mt-32 rounded-xl border border-rose-200 bg-rose-50 p-5"
      >
        <h2 className="text-xl font-bold text-rose-900">Review Anti-Spam Politikası</h2>
        <p className="mt-1 text-sm text-rose-800">
          Yorumlar için otomatik moderasyon ve blok eşiklerini yönetin.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-rose-900">
            <input
              type="checkbox"
              checked={reviewAntiSpam.enabled}
              onChange={(e) => setReviewAntiSpam((p) => ({ ...p, enabled: e.target.checked }))}
            />
            Anti-spam aktif
          </label>
          <input
            className="rounded border border-rose-300 px-3 py-2 text-sm"
            type="number"
            value={reviewAntiSpam.autoModerateThreshold}
            onChange={(e) =>
              setReviewAntiSpam((p) => ({
                ...p,
                autoModerateThreshold: Number(e.target.value || 0),
              }))
            }
            placeholder="Otomatik moderasyon eşiği"
          />
          <input
            className="rounded border border-rose-300 px-3 py-2 text-sm"
            type="number"
            value={reviewAntiSpam.hardBlockThreshold}
            onChange={(e) =>
              setReviewAntiSpam((p) => ({ ...p, hardBlockThreshold: Number(e.target.value || 0) }))
            }
            placeholder="Kesin blok eşiği"
          />
          <input
            className="rounded border border-rose-300 px-3 py-2 text-sm"
            type="number"
            value={reviewAntiSpam.minLength}
            onChange={(e) =>
              setReviewAntiSpam((p) => ({ ...p, minLength: Number(e.target.value || 0) }))
            }
            placeholder="Min uzunluk"
          />
          <input
            className="rounded border border-rose-300 px-3 py-2 text-sm"
            type="number"
            value={reviewAntiSpam.repeatedCharLimit}
            onChange={(e) =>
              setReviewAntiSpam((p) => ({ ...p, repeatedCharLimit: Number(e.target.value || 0) }))
            }
            placeholder="Tekrarlı karakter limiti"
          />
          <input
            className="rounded border border-rose-300 px-3 py-2 text-sm md:col-span-2"
            value={reviewAntiSpam.suspiciousKeywords.join(', ')}
            onChange={(e) =>
              setReviewAntiSpam((p) => ({
                ...p,
                suspiciousKeywords: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="şüpheli kelimeler (virgülle)"
          />
        </div>
        <div className="mt-3 rounded border border-rose-200 bg-white p-3">
          <p className="text-sm font-semibold text-rose-900">
            Allowlist (otomatik moderasyon dışı)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              className="min-w-[260px] flex-1 rounded border border-rose-300 px-3 py-2 text-sm"
              value={allowlistInput}
              onChange={(e) => setAllowlistInput(e.target.value)}
              placeholder="Kullanıcı e-posta veya user id"
            />
            <button
              onClick={() => addAllowlistIdentity(allowlistInput)}
              className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800"
            >
              Allowlist'e Ekle
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(reviewAntiSpam.allowlist || []).map((identity) => (
              <span
                key={identity}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-xs text-rose-900"
              >
                {identity}
                <button
                  onClick={() => removeAllowlistIdentity(identity)}
                  className="rounded bg-white px-1 text-[10px] font-semibold text-rose-800"
                >
                  Kaldır
                </button>
              </span>
            ))}
            {(reviewAntiSpam.allowlist || []).length === 0 && (
              <span className="text-xs text-rose-700">Allowlist boş.</span>
            )}
          </div>
        </div>
        <div className="mt-3 rounded border border-rose-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-rose-900">Son anti-spam olayları</p>
            <button
              onClick={() => void loadAntiSpamEvents()}
              className="rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
            >
              {antiSpamEventsLoading ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>
          <div className="mt-2 max-h-64 overflow-auto rounded border border-rose-100">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-rose-100 text-left text-rose-800">
                  <th className="px-2 py-2">Tarih</th>
                  <th className="px-2 py-2">Kullanıcı</th>
                  <th className="px-2 py-2">Skor</th>
                  <th className="px-2 py-2">Neden</th>
                  <th className="px-2 py-2">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {antiSpamEvents.map((item) => (
                  <tr key={item.id} className="border-b border-rose-50">
                    <td className="px-2 py-2 text-rose-900">
                      {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
                    </td>
                    <td className="px-2 py-2 text-rose-900 font-mono">
                      {item.actor_email || item.actor_user_id || '-'}
                    </td>
                    <td className="px-2 py-2 text-rose-900">
                      {typeof item.metadata?.score === 'number' ? item.metadata.score : '-'}
                    </td>
                    <td className="px-2 py-2 text-rose-900">
                      {Array.isArray(item.metadata?.reasons)
                        ? item.metadata?.reasons.join(', ')
                        : '-'}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => addAllowlistFromEvent(item)}
                        className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-rose-800 border border-rose-300"
                      >
                        Allowlist'e al
                      </button>
                    </td>
                  </tr>
                ))}
                {antiSpamEvents.length === 0 && !antiSpamEventsLoading && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-rose-700">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={() =>
              void saveSetting(
                'reviews.antiSpam',
                reviewAntiSpam as any,
                'Yorum anti-spam politikası',
                'publish',
              )
            }
            className="rounded bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            Yorum Anti-Spam Politikasını Kaydet
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">
          Görsel API Arama ve İçe Aktarma (Unsplash + Pexels)
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Arama yap, uygun görseli seç ve `site_media_assets` tablosuna kaydet.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Arama (örn: Göbeklitepe gün batımı)"
            value={imageQuery}
            onChange={(e) => setImageQuery(e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Görsel anahtarı (örn: homepage.hero.background)"
            value={assetKey}
            onChange={(e) => setAssetKey(e.target.value)}
          />
          <button
            onClick={() => void searchImages()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Görsel Ara
          </button>
        </div>
        {imageResults.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {imageResults.map((img, idx) => (
              <div
                key={`${img.provider}-${img.id}-${idx}`}
                className="rounded-lg border border-gray-200 p-3"
              >
                <img
                  src={img.thumb || img.url}
                  alt={img.author || 'görsel'}
                  className="h-40 w-full rounded object-cover"
                />
                <p className="mt-2 text-xs text-gray-600">
                  {img.provider} / {img.author || 'Bilinmeyen'}
                </p>
                <button
                  onClick={() => void importImage(img.url)}
                  className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Bu Görseli Kaydet
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Medya Kütüphanesi (DB)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Kaydedilen görselleri filtrele, hero alanına uygula veya gereksiz kayıtları temizle.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Klasör filtresi (örn: places, blog)"
            value={mediaBucketFilter}
            onChange={(e) => setMediaBucketFilter(e.target.value)}
          />
          <button
            onClick={() => void loadMediaLibrary()}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {mediaLoading ? 'Yükleniyor...' : 'Kütüphaneyi Yenile'}
          </button>
        </div>

        {mediaItems.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mediaItems.map((item) => (
              <div key={item.asset_key} className="rounded-lg border border-gray-200 p-3">
                <img
                  src={item.url}
                  alt={item.alt || item.asset_key}
                  className="h-40 w-full rounded object-cover"
                />
                <p className="mt-2 text-xs text-gray-600 break-all">{item.asset_key}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {item.metadata?.provider || 'yerel'} / {item.metadata?.bucket || '-'}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={mediaDrafts[item.asset_key]?.alt || ''}
                    onChange={updateMediaDraftField(item.asset_key, 'alt')}
                    placeholder="alt metni"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={mediaDrafts[item.asset_key]?.bucket || ''}
                    onChange={updateMediaDraftField(item.asset_key, 'bucket')}
                    placeholder="klasör"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={mediaDrafts[item.asset_key]?.provider || ''}
                    onChange={updateMediaDraftField(item.asset_key, 'provider')}
                    placeholder="sağlayıcı"
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={mediaDrafts[item.asset_key]?.mimeType || ''}
                    onChange={updateMediaDraftField(item.asset_key, 'mimeType')}
                    placeholder="MIME tipi"
                  />
                </div>
                <input
                  className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  value={mediaDrafts[item.asset_key]?.url || item.url}
                  onChange={updateMediaDraftField(item.asset_key, 'url')}
                  placeholder="görsel URL"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => applyMediaToHero(item.url)}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Hero&apos;ya Uygula
                  </button>
                  <button
                    onClick={() => void saveMediaAsset(item.asset_key)}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Güncelle
                  </button>
                  <button
                    onClick={() => void deleteMediaAsset(item.asset_key)}
                    className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Schema Tabanlı Alan Rehberi</h2>
        <p className="mt-1 text-sm text-gray-600">
          Admin form alanlarının zorunlu şema yapısı. JSON editörden önce alan tiplerini doğrular.
        </p>
        <div className="mt-4 flex gap-3">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={schemaKey}
            onChange={(e) => setSchemaKey(e.target.value)}
          >
            {Object.keys(schemaMap).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(schemaMap[schemaKey] || []).map((field) => (
            <div
              key={`${schemaKey}-${field.key}`}
              className="rounded border border-gray-200 bg-gray-50 p-2 text-xs"
            >
              <p className="font-mono text-gray-900">{field.key}</p>
              <p className="text-gray-700">
                tip: {field.type} | zorunlu: {field.required ? 'evet' : 'hayır'}
              </p>
              {field.note && <p className="text-gray-500">{field.note}</p>}
            </div>
          ))}
        </div>
        {schemaKey === 'homepage.hero' && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm font-semibold text-indigo-900">Otomatik Form (homepage.hero)</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {(schemaMap['homepage.hero'] || [])
                .filter((f) => f.type === 'string')
                .map((f) => (
                  <label key={`auto-hero-${f.key}`} className="text-xs text-indigo-900">
                    <span className="mb-1 block font-mono">{f.key}</span>
                    <input
                      className="w-full rounded border border-indigo-300 px-2 py-1"
                      value={String((hero as any)[f.key] || '')}
                      onChange={(e) =>
                        setHero((prev) => ({ ...prev, [f.key]: e.target.value }) as HeroConfig)
                      }
                    />
                  </label>
                ))}
            </div>
            <div className="mt-2">
              <button
                onClick={() =>
                  void saveSetting('homepage.hero', hero as any, 'Otomatik form kaydı', 'publish')
                }
                className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
              >
                Otomatik Form ile Yayına Al
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Sürüm Geri Alma</h2>
        <p className="mt-1 text-sm text-gray-600">Yayınlanmış bir ayarı eski sürüme geri döndür.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={rollbackKey}
            onChange={(e) => setRollbackKey(e.target.value)}
            placeholder="ayar anahtarı"
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={rollbackVersion}
            onChange={(e) => setRollbackVersion(e.target.value)}
            placeholder="sürüm no"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void previewRollback()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              {rollbackPreviewLoading ? 'Önizleme...' : 'Deneme Önizle'}
            </button>
            <button
              onClick={() => void rollbackSetting()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Geri Alma Uygula
            </button>
          </div>
        </div>
        {rollbackPreview && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">
              Deneme sonucu: {rollbackPreview.summary?.changed || 0} alan değişecek
            </p>
            <div className="mt-2 space-y-1">
              {(rollbackPreview.changed || []).slice(0, 20).map((item) => (
                <p key={item.path} className="font-mono">
                  {item.path}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Ayar Sürüm Geçmişi</h2>
        <p className="mt-1 text-sm text-gray-600">
          Belirli bir `setting_key` için son sürümleri listele.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={historyKey}
            onChange={(e) => setHistoryKey(e.target.value)}
            placeholder="ayar anahtarı (örn: homepage.hero)"
          />
          <button
            onClick={() => void loadSettingHistory()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {historyLoading ? 'Yükleniyor...' : 'Geçmişi Getir'}
          </button>
        </div>

        {historyItems.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-2 py-2">Sürüm</th>
                  <th className="px-2 py-2">Not</th>
                  <th className="px-2 py-2">Değiştiren</th>
                  <th className="px-2 py-2">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.map((item) => (
                  <tr
                    key={`${item.version_no}-${item.created_at || ''}`}
                    className="border-b border-gray-100"
                  >
                    <td className="px-2 py-2 font-medium text-gray-800">v{item.version_no}</td>
                    <td className="px-2 py-2 text-gray-700">{item.note || '-'}</td>
                    <td className="px-2 py-2 text-gray-700">{item.changed_by || '-'}</td>
                    <td className="px-2 py-2 text-gray-700">
                      {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Ayar Sürüm Karşılaştırma</h2>
        <p className="mt-1 text-sm text-gray-600">
          İki sürüm arasındaki alan bazlı farkları gösterir.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={diffKey}
            onChange={(e) => setDiffKey(e.target.value)}
            placeholder="ayar anahtarı"
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={diffFromVersion}
            onChange={(e) => setDiffFromVersion(e.target.value)}
            placeholder="önceki sürüm"
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            value={diffToVersion}
            onChange={(e) => setDiffToVersion(e.target.value)}
            placeholder="sonraki sürüm"
          />
          <button
            onClick={() => void loadSettingDiff()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {diffLoading ? 'Yükleniyor...' : 'Farkı Getir'}
          </button>
        </div>

        {diffResult && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-gray-700">
              Özet: +{diffResult.summary.added} / -{diffResult.summary.removed} / ~
              {diffResult.summary.changed}
            </p>

            {diffResult.diff.changed.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Değişen Alanlar</h3>
                <div className="mt-2 space-y-2">
                  {diffResult.diff.changed.slice(0, 50).map((item) => (
                    <div
                      key={`chg-${item.path}`}
                      className="rounded border border-gray-200 bg-gray-50 p-2"
                    >
                      <p className="font-mono text-xs text-gray-800">{item.path}</p>
                      <p className="text-xs text-rose-700">Eski: {item.prev}</p>
                      <p className="text-xs text-emerald-700">Yeni: {item.next}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diffResult.diff.added.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Eklenen Alanlar</h3>
                <ul className="mt-2 list-disc pl-5 text-xs text-emerald-700">
                  {diffResult.diff.added.slice(0, 50).map((item) => (
                    <li key={`add-${item.path}`} className="font-mono">
                      {item.path}: {item.next}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diffResult.diff.removed.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900">Silinen Alanlar</h3>
                <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
                  {diffResult.diff.removed.slice(0, 50).map((item) => (
                    <li key={`rem-${item.path}`} className="font-mono">
                      {item.path}: {item.prev}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-bold text-gray-900">Denetim Zaman Akışı</h2>
        <p className="mt-1 text-sm text-gray-600">
          İçerik/görsel değişikliklerinin kim-ne-zaman kaydını filtreleyerek görüntüleyin.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="anahtar filtresi (örn: homepage.hero)"
            value={auditKeyFilter}
            onChange={(e) => setAuditKeyFilter(e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            placeholder="işlem filtresi (draft_save/publish/rollback/media_import)"
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
          />
          <button
            onClick={() => void loadAuditTimeline()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            {auditLoading ? 'Yükleniyor...' : 'Zaman Akışını Getir'}
          </button>
          <a
            href={`/api/admin/site/audit/export?${new URLSearchParams({
              ...(auditKeyFilter.trim() ? { key: auditKeyFilter.trim() } : {}),
              ...(auditActionFilter.trim() ? { action: auditActionFilter.trim() } : {}),
              limit: '2000',
            }).toString()}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
          >
            CSV Dışa Aktar
          </a>
        </div>

        {auditItems.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-2 py-2">Tarih</th>
                  <th className="px-2 py-2">Anahtar</th>
                  <th className="px-2 py-2">İşlem</th>
                  <th className="px-2 py-2">E-posta</th>
                  <th className="px-2 py-2">IP</th>
                  <th className="px-2 py-2">Meta Veri</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="px-2 py-2 text-xs text-gray-700">
                      {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-gray-800">
                      {item.setting_key}
                    </td>
                    <td className="px-2 py-2 text-xs text-blue-700">{item.action}</td>
                    <td className="px-2 py-2 text-xs text-gray-700">{item.actor_email || '-'}</td>
                    <td className="px-2 py-2 text-xs text-gray-700">{item.ip_address || '-'}</td>
                    <td className="px-2 py-2 text-xs text-gray-700 font-mono">
                      {item.metadata ? JSON.stringify(item.metadata).slice(0, 140) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {status && <p className="text-sm font-medium text-slate-700">{status}</p>}
    </div>
  );
}

function JsonEditorCard(props: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onLoadTemplate?: () => void;
  onDraft: () => void;
  onPublish: () => void;
}) {
  return (
    <details data-json-editor-card className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <summary className="cursor-pointer select-none">
        <span className="text-base font-bold text-slate-900">{props.title}</span>
        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          JSON fallback
        </span>
        <span className="mt-1 block text-sm text-slate-600">{props.description}</span>
      </summary>
      <textarea
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs"
        rows={12}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-3">
        {props.onLoadTemplate && (
          <button
            onClick={props.onLoadTemplate}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Şablon Yükle
          </button>
        )}
        <button
          onClick={props.onDraft}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Taslak Kaydet
        </button>
        <button
          onClick={props.onPublish}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Yayına Al
        </button>
      </div>
    </details>
  );
}

function createAdminAnchorId(title: string) {
  return `admin-form-${normalizeAdminSearchText(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

function normalizeAdminSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function getAdminSectionGroup(title: string) {
  const normalized = normalizeAdminSearchText(title);
  if (normalized.includes('header')) return 'Header';
  if (normalized.includes('footer')) return 'Footer';
  if (normalized.includes('sosyal')) return 'Sosyal';
  if (
    normalized.includes('risk') ||
    normalized.includes('sla') ||
    normalized.includes('anti-spam')
  ) {
    return 'Operasyon';
  }
  if (normalized.includes('landing')) return 'Landing';
  if (normalized.includes('yorum')) return 'Moderasyon';
  return 'Ana Sayfa';
}

function FormEditorCard(props: { title: string; children: ReactNode }) {
  const group = getAdminSectionGroup(props.title);
  return (
    <div
      id={createAdminAnchorId(props.title)}
      className="scroll-mt-32 rounded-xl border border-gray-200 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <h3 className="text-base font-bold text-gray-900">{props.title}</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {group}
        </span>
      </div>
      <div className="mt-3 space-y-2">{props.children}</div>
    </div>
  );
}
