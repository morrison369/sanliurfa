import { HOMEPAGE_CTA_CONFIG, HOMEPAGE_PUBLIC_SECTION_ORDER } from '../data/homepage-shell';
import { HOMEPAGE_THEME_TOKENS } from '../data/homepage-theme';

type SettingBundle = Record<string, Record<string, any>>;

export type SitePreset = {
  id: string;
  label: string;
  description: string;
  tags: string[];
  settings: SettingBundle;
};

export const SECTION_STYLES_BASE = {
  sectionHeadingClass: 'text-2xl md:text-3xl font-bold',
  sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
  sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
  sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
  sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
  mvpQuickStartSectionClass: 'relative z-10 -mt-8 px-4',
  mvpQuickStartContainerClass: 'container mx-auto',
  mvpQuickStartPanelClass: 'rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 md:p-6',
  mvpQuickStartHeaderClass: 'flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between',
  mvpQuickStartBadgeClass: 'text-xs font-bold uppercase tracking-[0.26em] text-red-600',
  mvpQuickStartTitleClass: 'mt-2 text-2xl font-extrabold text-slate-950 md:text-3xl',
  mvpQuickStartDescriptionClass: 'mt-2 max-w-3xl text-sm text-slate-600 md:text-base',
  mvpQuickStartCtaClass: 'inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700',
  mvpQuickStartGridClass: 'mt-5 grid gap-4 lg:grid-cols-3',
  mvpQuickStartCardClass: 'rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-xl',
  mvpQuickStartCardLinkClass: 'block',
  mvpQuickStartCardBadgeClass: 'inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
  mvpQuickStartCardTitleClass: 'mt-4 text-xl font-extrabold text-slate-950',
  mvpQuickStartCardDescriptionClass: 'mt-2 text-sm leading-6 text-slate-600',
  mvpQuickStartLinksWrapClass: 'mt-5 flex flex-wrap gap-2',
  mvpQuickStartLinkClass: 'rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700',
  quickActionsSectionClass: 'bg-white text-slate-900 py-12',
  quickActionsContainerClass: 'container mx-auto px-4',
  quickActionsHeaderWrapClass: 'flex items-end justify-between mb-6',
  quickActionsGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4',
  quickActionsCardClass:
    'group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg',
  liveStatusSectionClass: 'bg-slate-950 text-white py-12 border-y border-slate-800',
  liveStatusContainerClass: 'container mx-auto px-4',
  liveStatusHeaderWrapClass: 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6',
  liveStatusGridClass: 'grid lg:grid-cols-3 gap-4',
  liveStatusCardClass: 'rounded-2xl border border-slate-700 bg-slate-900/80 p-5',
  districtServiceSectionClass: 'bg-slate-900 text-white py-12 border-t border-slate-800',
  districtServiceContainerClass: 'container mx-auto px-4',
  districtServiceHeaderWrapClass: 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
  districtServiceGridClass: 'grid lg:grid-cols-3 gap-4',
  districtServiceCardClass: 'rounded-2xl border border-slate-700 bg-slate-950/80 p-5 transition',
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
  audiencePlansHeaderWrapClass: 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
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
  districtSpotlightsHeaderWrapClass: 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
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
  historicalSitesImageClass: 'h-full w-full object-cover transition duration-300 group-hover:scale-105',
  featuredPlacesSectionClass: 'bg-white text-slate-900 py-14',
  featuredPlacesContainerClass: 'container mx-auto px-4',
  featuredPlacesHeaderWrapClass: 'flex items-center justify-between mb-8',
  featuredPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
  recentPlacesSectionClass: 'bg-slate-100 text-slate-900 py-14',
  recentPlacesContainerClass: 'container mx-auto px-4',
  recentPlacesGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
  recentReviewsSectionClass: 'bg-slate-100 text-slate-900 py-14 border-t border-slate-200',
  recentReviewsContainerClass: 'container mx-auto px-4',
  recentReviewsHeaderWrapClass: 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8',
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
  mainCtaPrimaryButtonClass: 'rounded-xl bg-red-600 px-7 py-3 font-bold text-white transition hover:bg-red-700',
  mainCtaSecondaryButtonClass:
    'rounded-xl border border-slate-600 bg-slate-900 px-7 py-3 font-bold text-white transition hover:border-slate-400',
};

const agencyModernPreset: SitePreset = {
  id: 'agency-modern',
  label: 'Ajans Modern Landing',
  description: 'Ana sayfada güçlü hero, ulaşım/eczane aksiyonları ve premium konumlandırma.',
  tags: ['landing', 'seo', 'conversion'],
  settings: {
    'homepage.schema': {
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
    'homepage.seo': {
      title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
      description:
        'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, uçak saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
      canonical: '/',
      ogImage: '/images/hero/sanliurfa-landing.jpg',
      keywords: [
        'Şanlıurfa',
        'Şanlıurfa şehir rehberi',
        'Şanlıurfa mekanlar',
        'Şanlıurfa nöbetçi eczane',
        'Şanlıurfa otobüs saatleri',
        'Şanlıurfa uçak saatleri',
        'Sanliurfa.com',
      ],
    },
    'homepage.hero': {
      badge: 'ŞANLIURFA ŞEHİR PLATFORMU',
      title: 'Şanlıurfa’da mekan, ulaşım ve günlük ihtiyaçlara tek noktadan erişim',
      description:
        'Nöbetçi eczane, otobüs ve uçak saatleri, mekan keşfi, yorumlar ve topluluk özelliklerini aynı platformda profesyonel deneyimle yönetin.',
      searchPlaceholder: "Şanlıurfa’da mekan, kategori, ilçe veya hizmet ara...",
      backgroundImage: '/images/hero/sanliurfa-landing.jpg',
    },
    'homepage.heroMeta': {
      heroSectionClass: 'relative overflow-hidden border-b border-slate-800',
      heroOverlayClass:
        'absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,113,113,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.16),transparent_45%),linear-gradient(180deg,#020617,#0f172a)]',
      heroContainerClass: 'relative container mx-auto px-4 pt-28 pb-20',
      heroGridClass: 'grid lg:grid-cols-2 gap-10 items-center',
      heroStatsPanelClass: 'rounded-3xl border border-slate-700 bg-slate-900/70 p-6 backdrop-blur',
      heroStatsPanelTitleClass: 'text-lg font-bold text-white',
      heroStatsPanelSubtitleClass: 'mt-1 text-sm text-slate-400',
      heroStatsUpdatedClass: 'mt-4 text-xs text-slate-500',
      heroImageAlt: 'Şanlıurfa şehir rehberi hero görseli',
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
      heroQuickLinkClass: 'rounded-full border border-slate-600 bg-slate-900/70 px-4 py-2 text-sm font-semibold',
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
    },
    'homepage.mainCta': {
      title: 'İşletmenizi profesyonel Şanlıurfa rehberine taşıyın',
      description:
        'Mekan profilinizi oluşturun, yorumları yönetin ve yerel görünürlüğünüzü tek panelden artırın.',
      primaryLabel: 'İşletme Kaydı Oluştur',
      primaryHref: '/isletme-kayit',
      secondaryLabel: 'Tüm Mekanları Gör',
      secondaryHref: '/mekanlar',
    },
    'homepage.cta': HOMEPAGE_CTA_CONFIG,
    'homepage.sectionOrder': {
      items: HOMEPAGE_PUBLIC_SECTION_ORDER,
    },
    'homepage.theme': HOMEPAGE_THEME_TOKENS,
    'homepage.sectionStyles': SECTION_STYLES_BASE,
    'homepage.primaryActions': {
      items: [
        {
          title: 'Nöbetçi Eczaneler',
          description: 'Güncel nöbetçi eczane listesi',
          stat: '24/7 Güncel',
          href: '/saglik/nobetci-eczaneler',
        },
        {
          title: 'Otobüs Saatleri',
          description: 'Şehir içi ulaşım planlama',
          stat: 'Hat Bazlı',
          href: '/ulasim/otobus-saatleri',
        },
        {
          title: 'Uçak Saatleri',
          description: 'GAP Havalimanı uçuş bilgileri',
          stat: 'Anlık Takip',
          href: '/ulasim/ucak-saatleri',
        },
        {
          title: 'Mekan Rehberi',
          description: 'Kategorilere göre keşfet',
          stat: '82+ Kategori',
          href: '/mekanlar',
        },
      ],
    },
    'homepage.mvpQuickStart': {
      items: [
        {
          badge: 'Günlük İhtiyaç',
          title: 'Nöbetçi eczane, otobüs ve uçak saatleri',
          description: 'Şanlıurfa’da bugün ihtiyacın olan servisleri tek ekrandan aç.',
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
      ],
    },
    'homepage.quickCategories': {
      items: [
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
      ],
    },
    'homepage.featuredGuides': {
      items: [
        { label: 'Balıklıgöl Rehberi', href: '/tarihi-yerler/balikligol' },
        { label: 'Göbeklitepe Ziyaret Planı', href: '/tarihi-yerler/gobeklitepe' },
        { label: 'Yemek Tarifleri', href: '/yemek-tarifleri' },
        { label: 'Topluluk ve Eşleşme', href: '/topluluk' },
      ],
    },
    'homepage.heroQuickLinks': {
      items: [
        { label: 'Nöbetçi Eczaneler', href: '/saglik/nobetci-eczaneler' },
        { label: 'Otobüs Saatleri', href: '/ulasim/otobus-saatleri' },
        { label: 'Uçak Saatleri', href: '/ulasim/ucak-saatleri' },
        { label: 'Etkinlikler', href: '/etkinlikler' },
        { label: 'Yemek Tarifleri', href: '/yemek-tarifleri' },
      ],
    },
    'homepage.faq': {
      items: [
        {
          q: 'Nöbetçi eczane verileri ne kadar güncel?',
          a: 'Nöbetçi eczane listesi düzenli aralıklarla güncellenir ve ana sayfa hızlı erişimden doğrudan ulaşılır.',
        },
        {
          q: 'Otobüs ve uçak saatleri aynı platformda mı?',
          a: 'Evet. Ulaşım menüsü altında otobüs ve uçak saatleri ayrı sayfalarda sunulur.',
        },
        {
          q: 'Mekan eklemek ücretli mi?',
          a: 'İlk fazda tüm mekan ekleme ve temel sosyal özellikler ücretsiz olarak açıktır.',
        },
      ],
    },
    'homepage.liveStatusCards': {
      items: [
        {
          key: 'pharmacy',
          title: 'Nöbetçi Eczane Durumu',
          metricLabel: 'kayıtlı nöbetçi eczane',
          statusText: 'Aktif veri akışı',
          href: '/saglik/nobetci-eczaneler',
          cta: 'Nöbetçi Eczaneleri Aç',
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        },
        {
          key: 'bus',
          title: 'Otobüs Saatleri Durumu',
          metricLabel: 'aktif otobüs hattı',
          statusText: 'Hat verisi hazır',
          href: '/ulasim/otobus-saatleri',
          cta: 'Otobüs Saatlerini Aç',
          badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
        },
        {
          key: 'flight',
          title: 'Uçak Saatleri Durumu',
          metricLabel: 'havalimanı odaklı takip',
          statusText: 'Planlama rehberi aktif',
          href: '/ulasim/ucak-saatleri',
          cta: 'Uçak Saatlerini Aç',
          badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
        },
      ],
    },
    'homepage.serviceQuickLinks': {
      items: [
        {
          key: 'pharmacy',
          categoryLabel: 'Sağlık',
          title: 'Yakındaki Nöbetçi Eczane Akışı',
          description: 'İlçe seçimiyle anında nöbetçi eczane sonuçlarını açın.',
          href: '/saglik/nobetci-eczaneler',
          hoverBorderClass: 'hover:border-emerald-400/60',
        },
        {
          key: 'bus',
          categoryLabel: 'Ulaşım',
          title: 'İlçe Bazlı Otobüs Saatleri',
          description: 'Günlük rota planı için hat ve saat ekranına hızlı geçiş yapın.',
          href: '/ulasim/otobus-saatleri',
          hoverBorderClass: 'hover:border-sky-400/60',
        },
        {
          key: 'flight',
          categoryLabel: 'Havalimanı',
          title: 'GAP Uçak Saatleri ve Planlama',
          description: 'Varış-kalkış odaklı uçuş planlamasını tek ekranda yönetin.',
          href: '/ulasim/ucak-saatleri',
          hoverBorderClass: 'hover:border-violet-400/60',
        },
      ],
    },
    'homepage.communityPanel': {
      title: 'Topluluk ve Eşleşme',
      description:
        'Sosyal özellikler (takip, aktivite, mesajlaşma) ve eşleşme modülüyle topluluk deneyimini genişletebilirsiniz.',
      items: [
        { label: 'Topluluk Özellikleri', href: '/takipciler' },
        { label: 'Eşleşme', href: '/eslesme' },
        { label: 'Üyelik Durumu', href: '/abonelik' },
      ],
    },
    'homepage.trendingFallbackQueries': {
      items: [
        { query: 'Şanlıurfa nöbetçi eczane' },
        { query: 'Şanlıurfa otobüs saatleri' },
        { query: 'Şanlıurfa uçak saatleri' },
        { query: 'Şanlıurfa kebapçılar' },
        { query: 'Şanlıurfa gezilecek yerler' },
      ],
    },
    'homepage.sectionCopy': {
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
    'header.utilityLinks': {
      items: [
        { label: 'Nöbetçi Eczane', href: '/saglik/nobetci-eczaneler' },
        { label: 'Otobüs Saatleri', href: '/ulasim/otobus-saatleri' },
        { label: 'Uçak Saatleri', href: '/ulasim/ucak-saatleri' },
        { label: 'Mekan Ekle', href: '/isletme-kayit' },
      ],
    },
    'header.brand': {
      topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
      logoTitle: 'Sanliurfa',
      logoHighlight: '.com',
    },
    'header.labels': {
      viewAllLabel: 'Tümünü Gör',
      loginLabel: 'Giriş',
      registerLabel: 'Kayıt Ol',
      mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
    },
    'social.profiles': {
      instagram: { enabled: false, handle: '', url: '' },
      tiktok: { enabled: false, handle: '', url: '' },
      youtube: { enabled: false, handle: '', url: '' },
      x: { enabled: false, handle: '', url: '' },
    },
    'adsense.slots': {
      client: 'ca-pub-7160871802649062',
      autoAdsEnabled: true,
      homepageBanner: '',
      blogListSidebar: '',
      blogDetailInline: '',
      blogDetailSidebar: '',
      classifiedDetail: '',
    },
    'footer.links': {
      explore: [
        { label: 'Mekanlar', href: '/mekanlar' },
        { label: 'Tarihi Yerler', href: '/tarihi-yerler' },
        { label: 'Etkinlikler', href: '/etkinlikler' },
      ],
      districts: [
        { label: 'Eyyübiye', href: '/ilceler/eyyubiye' },
        { label: 'Haliliye', href: '/ilceler/haliliye' },
        { label: 'Karaköprü', href: '/ilceler/karakopru' },
      ],
      popular: [
        { label: 'Nöbetçi Eczaneler', href: '/saglik/nobetci-eczaneler' },
        { label: 'Otobüs Saatleri', href: '/ulasim/otobus-saatleri' },
        { label: 'Uçak Saatleri', href: '/ulasim/ucak-saatleri' },
      ],
      company: [
        { label: 'Hakkımızda', href: '/hakkinda' },
        { label: 'İletişim', href: '/iletisim' },
      ],
      services: [
        { label: 'İşletme Kaydı', href: '/isletme-kayit' },
        { label: 'Topluluk', href: '/topluluk' },
      ],
    },
  },
};

const serviceDensePreset: SitePreset = {
  id: 'service-dense',
  label: 'Servis Odaklı Yoğun Landing',
  description: 'Hızlı servis modüllerini öne çıkaran, operasyonel içerik ağırlıklı preset.',
  tags: ['operations', 'service', 'local'],
  settings: {
    ...agencyModernPreset.settings,
    'homepage.hero': {
      ...agencyModernPreset.settings['homepage.hero'],
      badge: 'ŞANLIURFA GÜNLÜK YAŞAM REHBERİ',
      title: 'Şanlıurfa’da günlük ihtiyaçlar için tek ekran',
    },
    'homepage.mainCta': {
      ...agencyModernPreset.settings['homepage.mainCta'],
      secondaryLabel: 'Nöbetçi Eczane Aç',
      secondaryHref: '/saglik/nobetci-eczaneler',
    },
    'homepage.cta': {
      ...(agencyModernPreset.settings['homepage.cta'] as Record<string, any>),
      secondary: {
        ...((agencyModernPreset.settings['homepage.cta'] as Record<string, any>).secondary || {}),
        label: 'Nöbetçi Eczane',
        href: '/saglik/nobetci-eczaneler',
        ariaLabel: 'Nöbetçi eczane sayfasını aç',
      },
    },
  },
};

const sectionStyleMinimalPreset: SitePreset = {
  id: 'section-style-minimal',
  label: 'Section Style: Minimal',
  description: 'Ana sayfa bloklarında daha sade ve düşük kontrastlı kart/kenarlık stilleri.',
  tags: ['style', 'section-styles', 'minimal'],
  settings: {
    'homepage.sectionStyles': {
      ...SECTION_STYLES_BASE,
      quickActionsCardClass: 'group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300',
      liveStatusCardClass: 'rounded-xl border border-slate-700 bg-slate-900 p-5',
      trustSignalsCardClass: 'rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300',
      mainCtaPrimaryButtonClass: 'rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700',
    },
  },
};

const sectionStyleAgencyPreset: SitePreset = {
  id: 'section-style-agency',
  label: 'Section Style: Agency',
  description: 'Ajans seviyesi güçlü kontrast, daha belirgin hover ve premium kart stilleri.',
  tags: ['style', 'section-styles', 'agency'],
  settings: {
    'homepage.sectionStyles': {
      ...SECTION_STYLES_BASE,
      sectionHeadingClass: 'text-2xl md:text-4xl font-extrabold tracking-tight',
      sectionHeadingSpacedClass: 'text-2xl md:text-4xl font-extrabold tracking-tight mb-6',
      quickActionsCardClass:
        'group rounded-2xl border border-slate-300 bg-white p-5 transition hover:-translate-y-1 hover:border-red-400 hover:shadow-xl',
      trendDensityCardClass: 'rounded-2xl border border-slate-300 bg-white p-6 shadow-sm',
      mainCtaPrimaryButtonClass:
        'rounded-xl bg-red-600 px-8 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-700',
    },
  },
};

const sectionStyleDensePreset: SitePreset = {
  id: 'section-style-dense',
  label: 'Section Style: Dense',
  description: 'Bilgi yoğun görünüm için daha sıkı spacing ve kompakt kart yapısı.',
  tags: ['style', 'section-styles', 'dense'],
  settings: {
    'homepage.sectionStyles': {
      ...SECTION_STYLES_BASE,
      quickActionsGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-3',
      quickActionsCardClass: 'group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-red-300',
      popularCategoriesGridClass: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2',
      trendDensityGridClass: 'grid lg:grid-cols-2 gap-4',
      recipesGridClass: 'grid md:grid-cols-2 lg:grid-cols-4 gap-4',
      blogGridClass: 'grid md:grid-cols-4 gap-4',
      faqGridClass: 'mt-5 grid md:grid-cols-3 gap-3',
    },
  },
};

export const SITE_CONTENT_PRESETS: SitePreset[] = [
  agencyModernPreset,
  serviceDensePreset,
  sectionStyleMinimalPreset,
  sectionStyleAgencyPreset,
  sectionStyleDensePreset,
];

export function findSitePresetById(id: string): SitePreset | null {
  return SITE_CONTENT_PRESETS.find((preset) => preset.id === id) || null;
}
