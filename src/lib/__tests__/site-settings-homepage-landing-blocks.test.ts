import { describe, expect, it } from 'vitest';
import { validateSiteSetting } from '../site-settings-schema';
import { validateSiteSettingWithZod } from '../site-settings-zod';

describe('site settings homepage landing blocks', () => {
  it('accepts valid homepage.schema payload', () => {
    const payload = {
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
    expect(validateSiteSetting('homepage.schema', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.schema', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.schema payload', () => {
    const payload = {
      siteName: 'Sanliurfa.com',
      alternateName: 'Şanlıurfa Şehir Rehberi',
      baseUrl: 'http://sanliurfa.com',
      searchPathTemplate: 'arama?q={search_term_string}',
      organizationId: '#organization',
      webpageId: '/#webpage',
      cityName: 'Şanlıurfa',
      trendingListName: 'Şanlıurfa Bugün En Çok Arananlar',
      servicesListName: 'Şanlıurfa Hızlı Servisler',
      webpageName: 'Şanlıurfa Şehir Rehberi | Sanliurfa.com',
    };
    expect(validateSiteSetting('homepage.schema', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.schema', payload).ok).toBe(false);
  });

  it('accepts valid homepage.seo payload', () => {
    const payload = {
      title: 'Sanliurfa.com | Şanlıurfa Şehir Rehberi, Mekanlar ve Günlük Yaşam',
      description:
        'Şanlıurfa şehir rehberi: mekanlar, nöbetçi eczaneler, otobüs saatleri, etkinlikler, ilçeler, gezi rotaları ve yemek tarifleri.',
      canonical: '/',
      ogImage: '/images/hero/hero-home.webp',
      keywords: ['Şanlıurfa', 'Şanlıurfa şehir rehberi', 'Sanliurfa.com'],
    };
    expect(validateSiteSetting('homepage.seo', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.seo', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.seo payload', () => {
    const payload = {
      title: '',
      description: 'Açıklama',
      canonical: 'https://external.example.com',
      ogImage: '/hero.jpg',
      keywords: [],
    };
    expect(validateSiteSetting('homepage.seo', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.seo', payload).ok).toBe(false);
  });

  it('accepts valid homepage.quickCategories payload', () => {
    const payload = {
      items: [
        { slug: 'kebapcilar', name: 'Kebapçılar' },
        { slug: 'cigerciler', name: 'Ciğerciler' },
      ],
    };
    expect(validateSiteSetting('homepage.quickCategories', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.quickCategories', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.quickCategories slug format', () => {
    const payload = {
      items: [{ slug: 'Kebapcilar!', name: 'Kebapçılar' }],
    };
    expect(validateSiteSetting('homepage.quickCategories', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.quickCategories', payload).ok).toBe(false);
  });

  it('accepts valid homepage.heroMeta payload', () => {
    const payload = {
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
      businessCardDescription: 'Açıklama',
      communityCardBadge: 'Topluluk Modu',
      communityCardTitle: 'Mesajlaşma ve Eşleşmeye Katıl',
      communityCardDescription: 'Açıklama',
      statsPanelTitle: 'Şanlıurfa Bugün',
      statsPanelSubtitle: 'Anlık şehir verileri',
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
    };
    expect(validateSiteSetting('homepage.heroMeta', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.heroMeta', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.heroMeta payload', () => {
    const payload = {
      heroSectionClass: '',
      heroOverlayClass:
        'absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,113,113,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.16),transparent_45%),linear-gradient(180deg,#020617,#0f172a)]',
      heroContainerClass: 'relative container mx-auto px-4 pt-28 pb-20',
      heroGridClass: 'grid lg:grid-cols-2 gap-10 items-center',
      heroStatsPanelClass: 'rounded-3xl border border-slate-700 bg-slate-900/70 p-6 backdrop-blur',
      heroStatsPanelTitleClass: 'text-lg font-bold text-white',
      heroStatsPanelSubtitleClass: 'mt-1 text-sm text-slate-400',
      heroStatsUpdatedClass: 'mt-4 text-xs text-slate-500',
      heroImageAlt: '',
      searchButtonLabel: 'Ara',
      businessCardBadge: 'Ücretsiz Açık',
      businessCardTitle: 'İşletmeni Sanliurfa.com’a Ekle',
      businessCardDescription: 'Açıklama',
      communityCardBadge: 'Topluluk Modu',
      communityCardTitle: 'Mesajlaşma ve Eşleşmeye Katıl',
      communityCardDescription: 'Açıklama',
      statsPanelTitle: 'Şanlıurfa Bugün',
      statsPanelSubtitle: 'Anlık şehir verileri',
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
    };
    expect(validateSiteSetting('homepage.heroMeta', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.heroMeta', payload).ok).toBe(false);
  });

  it('accepts valid homepage.liveStatusCards payload', () => {
    const payload = {
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
      ],
    };
    expect(validateSiteSetting('homepage.liveStatusCards', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.liveStatusCards', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.serviceQuickLinks href', () => {
    const payload = {
      items: [
        {
          key: 'flight',
          categoryLabel: 'Havalimanı',
          title: 'GAP Uçak Saatleri ve Planlama',
          description: 'Varış-kalkış odaklı uçuş planlamasını tek ekranda yönetin.',
          href: 'https://external.example.com',
          hoverBorderClass: 'hover:border-violet-400/60',
        },
      ],
    };
    const schemaResult = validateSiteSetting('homepage.serviceQuickLinks', payload);
    expect(schemaResult.ok).toBe(false);
    const zodResult = validateSiteSettingWithZod('homepage.serviceQuickLinks', payload);
    expect(zodResult.ok).toBe(false);
  });

  it('accepts valid homepage.sections payload', () => {
    const payload = {
      order: ['hero', 'quick-actions', 'live-status', 'blog'],
      visibility: {
        hero: true,
        'quick-actions': true,
        'live-status': true,
        blog: false,
      },
    };
    expect(validateSiteSetting('homepage.sections', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.sections', payload).ok).toBe(true);
  });

  it('accepts valid homepage.sectionCopy payload', () => {
    const payload = {
      mvpQuickStartBadge: 'Yeni',
      mvpQuickStartTitle: 'Hızlı Başlangıç',
      mvpQuickStartDescription: 'Açıklama',
      mvpQuickStartCtaLabel: 'Başla →',
      mvpQuickStartCtaHref: '/kesfet',
      quickActionsTitle: 'Hızlı Erişim Modülleri',
      quickActionsDescription: 'Açıklama',
      quickActionsCtaLabel: 'Tüm modüller →',
      liveStatusTitle: 'Güncel Durum Merkezi',
      liveStatusDescription: 'Açıklama',
      liveStatusUpdatedPrefix: 'Son güncelleme',
      districtServiceTitle: 'Konum ve İlçeye Göre Hızlı Başlangıç',
      districtServiceDescription: 'Açıklama',
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
      audiencePlansDescription: 'Açıklama',
      districtSpotlightsTitle: 'İlçeye göre öne çıkan mekan kümeleri',
      districtSpotlightsDescription: 'Açıklama',
      districtSpotlightsCtaLabel: 'İlçe sayfalarını aç →',
      recentReviewsTitle: 'Son yorumlanan mekanlar',
      recentReviewsDescription: 'Açıklama',
      trustSignalsTitle: 'Son Güncellenen Mekanlar',
      trustSignalsSubtitle: 'Güven sinyali',
      guidesTitle: 'Öne Çıkan Rehber Sayfaları',
      mainCategoriesTitle: 'Şanlıurfa Ana Kategoriler',
      recipesTitle: 'Şanlıurfa Özel Yemek Tarifleri',
      recipesCtaLabel: 'Tüm Tarifler →',
      blogTitle: 'Blogdan Son Yazılar',
      blogCtaLabel: 'Blog →',
      faqTitle: 'AEO ve GEO için hızlı cevap bölümü',
      faqDescription: 'Açıklama',
    };
    expect(validateSiteSetting('homepage.sectionCopy', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.sectionCopy', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.sectionCopy payload', () => {
    const payload = {
      quickActionsTitle: '',
    };
    expect(validateSiteSetting('homepage.sectionCopy', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.sectionCopy', payload).ok).toBe(false);
  });

  it('accepts valid homepage.sectionStyles payload', () => {
    const payload = {
      sectionHeadingClass: 'text-2xl md:text-3xl font-bold',
      sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
      sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
      sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
      sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
      mvpQuickStartSectionClass: 'bg-white py-10',
      mvpQuickStartContainerClass: 'container mx-auto px-4',
      mvpQuickStartPanelClass: 'rounded-2xl border p-6',
      mvpQuickStartHeaderClass: 'mb-4',
      mvpQuickStartBadgeClass: 'text-xs font-bold uppercase text-red-600',
      mvpQuickStartTitleClass: 'text-2xl font-bold',
      mvpQuickStartDescriptionClass: 'text-slate-600',
      mvpQuickStartCtaClass: 'text-red-600 font-semibold',
      mvpQuickStartGridClass: 'grid md:grid-cols-3 gap-4',
      mvpQuickStartCardClass: 'rounded-xl border p-4',
      mvpQuickStartCardLinkClass: 'block',
      mvpQuickStartCardBadgeClass: 'text-xs text-slate-500',
      mvpQuickStartCardTitleClass: 'font-semibold',
      mvpQuickStartCardDescriptionClass: 'text-sm text-slate-600',
      mvpQuickStartLinksWrapClass: 'flex flex-wrap gap-2 mt-4',
      mvpQuickStartLinkClass: 'rounded-full border px-3 py-1 text-sm',
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
      districtServiceHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
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
    };
    expect(validateSiteSetting('homepage.sectionStyles', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('homepage.sectionStyles', payload).ok).toBe(true);
  });

  it('rejects invalid homepage.sectionStyles payload', () => {
    const payload = {
      sectionHeadingClass: '',
      sectionHeadingSpacedClass: 'text-2xl md:text-3xl font-bold mb-6',
      sectionHeadingSpacedLgClass: 'text-2xl md:text-3xl font-bold mb-8',
      sectionCtaLinkClass: 'text-red-600 font-semibold hover:text-red-700',
      sectionMutedTextLineClampClass: 'text-sm text-slate-600 mt-1 line-clamp-2',
      quickActionsSectionClass: '',
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
      districtServiceHeaderWrapClass:
        'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-6',
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
    };
    expect(validateSiteSetting('homepage.sectionStyles', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.sectionStyles', payload).ok).toBe(false);
  });

  it('rejects invalid homepage.sections visibility type', () => {
    const payload = {
      order: ['hero'],
      visibility: {
        hero: 'yes',
      },
    };
    expect(validateSiteSetting('homepage.sections', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('homepage.sections', payload).ok).toBe(false);
  });

  it('accepts valid header.megaMenu payload', () => {
    const payload = {
      items: [
        {
          label: 'Mekanlar',
          href: '/mekanlar',
          groups: [
            {
              title: 'Yeme İçme',
              links: [{ label: 'Kebapçılar', href: '/mekanlar/kebapcilar' }],
            },
          ],
        },
      ],
    };
    expect(validateSiteSetting('header.megaMenu', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('header.megaMenu', payload).ok).toBe(true);
  });

  it('rejects invalid header.megaMenu payload without sub/groups', () => {
    const payload = {
      items: [{ label: 'Mekanlar', href: '/mekanlar' }],
    };
    expect(validateSiteSetting('header.megaMenu', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('header.megaMenu', payload).ok).toBe(false);
  });

  it('accepts valid header.brand payload', () => {
    const payload = {
      topStripText: 'ŞANLIURFA ODAKLI DİJİTAL ŞEHİR REHBERİ',
      logoTitle: 'Sanliurfa',
      logoHighlight: '.com',
    };
    expect(validateSiteSetting('header.brand', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('header.brand', payload).ok).toBe(true);
  });

  it('rejects invalid header.labels payload', () => {
    const payload = {
      viewAllLabel: 'Tümünü Gör',
      loginLabel: '',
      registerLabel: 'Kayıt Ol',
      mobileBusinessCtaLabel: 'İşletmenizi Ekleyin',
    };
    expect(validateSiteSetting('header.labels', payload).ok).toBe(false);
    expect(validateSiteSettingWithZod('header.labels', payload).ok).toBe(false);
  });

  it('accepts valid footer.brand payload', () => {
    const payload = {
      title: 'Sanliurfa',
      highlight: '.com',
      description: "Şanlıurfa’nın en kapsamlı şehir rehberi.",
      infoNote: 'Resmi sosyal medya hesabımız bulunmamaktadır.',
    };
    expect(validateSiteSetting('footer.brand', payload).ok).toBe(true);
    expect(validateSiteSettingWithZod('footer.brand', payload).ok).toBe(true);
  });

  it('accepts valid footer.bottom payload and rejects external legal links', () => {
    const validPayload = {
      copyrightLabel: '© 2026 Sanliurfa.com',
      legalLinks: [
        { label: 'Gizlilik', href: '/gizlilik-politikasi' },
        { label: 'Koşullar', href: '/kullanim-kosullari' },
      ],
    };
    expect(validateSiteSetting('footer.bottom', validPayload).ok).toBe(true);
    expect(validateSiteSettingWithZod('footer.bottom', validPayload).ok).toBe(true);

    const invalidPayload = {
      ...validPayload,
      legalLinks: [{ label: 'X', href: 'https://x.com/sanliurfa' }],
    };
    expect(validateSiteSetting('footer.bottom', invalidPayload).ok).toBe(false);
    expect(validateSiteSettingWithZod('footer.bottom', invalidPayload).ok).toBe(false);
  });
});
