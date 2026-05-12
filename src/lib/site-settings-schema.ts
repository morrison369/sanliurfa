type ValidationResult = { ok: true } | { ok: false; error: string };
export type SiteSettingSchemaField = {
  key: string;
  type: 'string' | 'array' | 'object';
  required: boolean;
  note?: string;
};

export const SITE_SETTING_SCHEMAS: Record<string, SiteSettingSchemaField[]> = {
  'homepage.schema': [
    { key: 'siteName', type: 'string', required: true },
    { key: 'alternateName', type: 'string', required: true },
    { key: 'baseUrl', type: 'string', required: true },
    { key: 'searchPathTemplate', type: 'string', required: true },
    { key: 'organizationId', type: 'string', required: true },
    { key: 'webpageId', type: 'string', required: true },
    { key: 'cityName', type: 'string', required: true },
    { key: 'trendingListName', type: 'string', required: true },
    { key: 'servicesListName', type: 'string', required: true },
    { key: 'webpageName', type: 'string', required: true },
  ],
  'homepage.seo': [
    { key: 'title', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'canonical', type: 'string', required: true, note: 'dahili route' },
    { key: 'ogImage', type: 'string', required: true, note: '/images/ ile başlamalı' },
    { key: 'keywords', type: 'array', required: true },
  ],
  'homepage.hero': [
    { key: 'badge', type: 'string', required: true },
    { key: 'title', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'searchPlaceholder', type: 'string', required: true },
    { key: 'backgroundImage', type: 'string', required: true, note: '/images/ ile başlamalı' },
  ],
  'homepage.heroMeta': [
    { key: 'heroSectionClass', type: 'string', required: true },
    { key: 'heroOverlayClass', type: 'string', required: true },
    { key: 'heroContainerClass', type: 'string', required: true },
    { key: 'heroGridClass', type: 'string', required: true },
    { key: 'heroStatsPanelClass', type: 'string', required: true },
    { key: 'heroStatsPanelTitleClass', type: 'string', required: true },
    { key: 'heroStatsPanelSubtitleClass', type: 'string', required: true },
    { key: 'heroStatsUpdatedClass', type: 'string', required: true },
    { key: 'heroImageAlt', type: 'string', required: true },
    { key: 'searchButtonLabel', type: 'string', required: true },
    { key: 'businessCardBadge', type: 'string', required: true },
    { key: 'businessCardTitle', type: 'string', required: true },
    { key: 'businessCardDescription', type: 'string', required: true },
    { key: 'communityCardBadge', type: 'string', required: true },
    { key: 'communityCardTitle', type: 'string', required: true },
    { key: 'communityCardDescription', type: 'string', required: true },
    { key: 'statsPanelTitle', type: 'string', required: true },
    { key: 'statsPanelSubtitle', type: 'string', required: true },
    { key: 'statsActivePlacesLabel', type: 'string', required: true },
    { key: 'statsPharmacyLabel', type: 'string', required: true },
    { key: 'statsBusRouteLabel', type: 'string', required: true },
    { key: 'statsEventsLabel', type: 'string', required: true },
    { key: 'statsUpdatedPrefix', type: 'string', required: true },
    { key: 'statsCardClass', type: 'string', required: true },
    { key: 'statsLabelClass', type: 'string', required: true },
    { key: 'statsValueClass', type: 'string', required: true },
    { key: 'heroQuickLinkClass', type: 'string', required: true },
    { key: 'heroQuickLinkHoverClass', type: 'string', required: true },
    { key: 'searchFormClass', type: 'string', required: true },
    { key: 'searchRowClass', type: 'string', required: true },
    { key: 'searchInputClass', type: 'string', required: true },
    { key: 'searchButtonClass', type: 'string', required: true },
    { key: 'businessCardClass', type: 'string', required: true },
    { key: 'communityCardClass', type: 'string', required: true },
    { key: 'heroBadgeClass', type: 'string', required: true },
    { key: 'heroTitleClass', type: 'string', required: true },
    { key: 'heroDescriptionClass', type: 'string', required: true },
  ],
  'homepage.mainCta': [
    { key: 'title', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'primaryLabel', type: 'string', required: true },
    { key: 'primaryHref', type: 'string', required: true, note: 'dahili route' },
    { key: 'secondaryLabel', type: 'string', required: true },
    { key: 'secondaryHref', type: 'string', required: true, note: 'dahili route' },
  ],
  'homepage.cta': [
    { key: 'title', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'primary', type: 'object', required: true },
    { key: 'secondary', type: 'object', required: true },
  ],
  'homepage.sectionOrder': [{ key: 'items', type: 'array', required: true }],
  'homepage.theme': [
    { key: 'landingSand', type: 'string', required: false },
    { key: 'landingCream', type: 'string', required: false },
    { key: 'landingGreen', type: 'string', required: false },
    { key: 'landingCopper', type: 'string', required: false },
    { key: 'landingCopperStrong', type: 'string', required: false },
    { key: 'landingGold', type: 'string', required: false },
    { key: 'landingInk', type: 'string', required: false },
    { key: 'landingMuted', type: 'string', required: false },
    { key: 'landingSurface', type: 'string', required: false },
    { key: 'landingSurfaceHover', type: 'string', required: false },
    { key: 'landingStone', type: 'string', required: false },
  ],
  'header.utilityLinks': [{ key: 'items', type: 'array', required: true }],
  'header.brand': [
    { key: 'topStripText', type: 'string', required: true },
    { key: 'logoTitle', type: 'string', required: true },
    { key: 'logoHighlight', type: 'string', required: true },
  ],
  'header.labels': [
    { key: 'viewAllLabel', type: 'string', required: true },
    { key: 'loginLabel', type: 'string', required: true },
    { key: 'registerLabel', type: 'string', required: true },
    { key: 'mobileBusinessCtaLabel', type: 'string', required: true },
  ],
  'header.megaMenu': [{ key: 'items', type: 'array', required: true }],
  'header.mobileQuickLinks': [{ key: 'items', type: 'array', required: true }],
  'header.mobileAllLinks': [{ key: 'items', type: 'array', required: true }],
  'homepage.primaryActions': [{ key: 'items', type: 'array', required: true }],
  'homepage.mvpQuickStart': [{ key: 'items', type: 'array', required: true }],
  'homepage.quickCategories': [{ key: 'items', type: 'array', required: true }],
  'homepage.featuredGuides': [{ key: 'items', type: 'array', required: true }],
  'homepage.faq': [{ key: 'items', type: 'array', required: true, note: 'q/a alanları zorunlu' }],
  'homepage.heroQuickLinks': [{ key: 'items', type: 'array', required: true }],
  'homepage.liveStatusCards': [{ key: 'items', type: 'array', required: true }],
  'homepage.serviceQuickLinks': [{ key: 'items', type: 'array', required: true }],
  'homepage.communityPanel': [
    { key: 'title', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'items', type: 'array', required: true },
  ],
  'homepage.trendingFallbackQueries': [{ key: 'items', type: 'array', required: true }],
  'homepage.sections': [
    { key: 'order', type: 'array', required: true },
    { key: 'visibility', type: 'object', required: true, note: 'Record<sectionId, boolean>' },
  ],
  'homepage.sectionCopy': [
    { key: 'fields', type: 'object', required: true, note: 'section başlık/açıklama metinleri' },
  ],
  'homepage.sectionStyles': [
    { key: 'fields', type: 'object', required: true, note: 'section class tokenları' },
  ],
  'footer.links': [
    { key: 'explore', type: 'array', required: true },
    { key: 'districts', type: 'array', required: true },
    { key: 'popular', type: 'array', required: true },
    { key: 'company', type: 'array', required: true },
    { key: 'services', type: 'array', required: true },
  ],
  'footer.brand': [
    { key: 'title', type: 'string', required: true },
    { key: 'highlight', type: 'string', required: true },
    { key: 'description', type: 'string', required: true },
    { key: 'infoNote', type: 'string', required: true },
  ],
  'footer.bottom': [
    { key: 'copyrightLabel', type: 'string', required: true },
    { key: 'legalLinks', type: 'array', required: true },
  ],
  'reviews.antiSpam': [
    { key: 'enabled', type: 'object', required: false, note: 'boolean benzeri (zod doğrular)' },
    { key: 'autoModerateThreshold', type: 'object', required: false, note: 'number' },
    { key: 'hardBlockThreshold', type: 'object', required: false, note: 'number' },
    { key: 'minLength', type: 'object', required: false, note: 'number' },
    { key: 'repeatedCharLimit', type: 'object', required: false, note: 'number' },
    { key: 'suspiciousKeywords', type: 'array', required: false },
    { key: 'allowlist', type: 'array', required: false, note: 'userId/email allowlist' },
  ],
  'places.lifecycle.sla.targets': [
    { key: 'defaultHours', type: 'object', required: true, note: 'number' },
    { key: 'byDistrict', type: 'object', required: true, note: 'Record<string, number>' },
    { key: 'byTeam', type: 'object', required: true, note: 'Record<string, number>' },
  ],
  'social.risk.thresholds': [
    { key: 'scoreAlert', type: 'object', required: true, note: 'number (1-100)' },
    { key: 'zScoreAlert', type: 'object', required: true, note: 'number (0-10)' },
    { key: 'minLastHour', type: 'object', required: true, note: 'number' },
    { key: 'minTotal', type: 'object', required: true, note: 'number' },
    {
      key: 'byTenant',
      type: 'object',
      required: false,
      note: 'Record<tenantId, threshold object>',
    },
  ],
  'social.risk.webhook': [
    { key: 'enabled', type: 'object', required: true, note: 'boolean' },
    { key: 'eventName', type: 'string', required: true },
    { key: 'userId', type: 'string', required: false },
    { key: 'cooldownMinutes', type: 'object', required: true, note: 'number' },
  ],
  'social.risk.autoActions': [
    { key: 'enabled', type: 'object', required: true, note: 'boolean' },
    { key: 'cooldownMinutes', type: 'object', required: true, note: 'number' },
    { key: 'note', type: 'string', required: true },
    { key: 'rollbackToDefaultWhenHealthy', type: 'object', required: true, note: 'boolean' },
    { key: 'profile', type: 'object', required: true, note: 'rate limit profile object' },
  ],
  'social.profiles': [
    { key: 'instagram', type: 'object', required: true },
    { key: 'tiktok', type: 'object', required: true },
    { key: 'youtube', type: 'object', required: true },
    { key: 'x', type: 'object', required: true },
  ],
};

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isInternalHref(href: unknown): boolean {
  if (typeof href !== 'string') return false;
  if (!href.startsWith('/')) return false;
  if (href.includes('..') || href.includes('://') || href.includes('\\')) return false;
  return true;
}

function validateLinkList(items: unknown): ValidationResult {
  if (!Array.isArray(items)) return { ok: false, error: 'items dizi olmalı' };
  for (const item of items) {
    if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
    const label =
      typeof item.label === 'string'
        ? item.label
        : typeof item.title === 'string'
          ? item.title
          : '';
    if (!label.trim()) {
      return { ok: false, error: 'label (veya title) zorunlu' };
    }
    if (!isInternalHref(item.href)) {
      return { ok: false, error: `geçersiz href: ${String(item.href || '')}` };
    }
  }
  return { ok: true };
}

function validateMegaMenuItems(items: unknown): ValidationResult {
  if (!Array.isArray(items)) return { ok: false, error: 'items dizi olmalı' };
  for (const section of items) {
    if (!isObject(section)) return { ok: false, error: 'megaMenu section object olmalı' };
    if (typeof section.label !== 'string' || !section.label.trim()) {
      return { ok: false, error: 'megaMenu section label zorunlu' };
    }
    if (!isInternalHref(section.href)) {
      return { ok: false, error: 'megaMenu section href geçersiz' };
    }

    const hasSub = Array.isArray(section.sub) && section.sub.length > 0;
    const hasGroups = Array.isArray(section.groups) && section.groups.length > 0;

    if (!hasSub && !hasGroups) {
      return { ok: false, error: 'megaMenu section en az bir sub veya groups içermeli' };
    }

    if (section.sub !== undefined) {
      const subValidation = validateLinkList(section.sub);
      if (!subValidation.ok) {
        return {
          ok: false,
          error: `megaMenu sub: ${'error' in subValidation ? subValidation.error : 'validation_failed'}`,
        };
      }
    }

    if (section.groups !== undefined) {
      if (!Array.isArray(section.groups)) {
        return { ok: false, error: 'megaMenu groups dizi olmalı' };
      }
      for (const group of section.groups) {
        if (!isObject(group)) return { ok: false, error: 'megaMenu group object olmalı' };
        if (typeof group.title !== 'string' || !group.title.trim()) {
          return { ok: false, error: 'megaMenu group title zorunlu' };
        }
        const linksValidation = validateLinkList(group.links);
        if (!linksValidation.ok) {
          return {
            ok: false,
            error: `megaMenu group links: ${'error' in linksValidation ? linksValidation.error : 'validation_failed'}`,
          };
        }
      }
    }
  }
  return { ok: true };
}

export function validateSiteSetting(key: string, value: unknown): ValidationResult {
  if (!isObject(value)) return { ok: false, error: 'value JSON object olmalı' };

  if (key === 'homepage.schema') {
    const required = [
      'siteName',
      'alternateName',
      'baseUrl',
      'searchPathTemplate',
      'organizationId',
      'webpageId',
      'cityName',
      'trendingListName',
      'servicesListName',
      'webpageName',
    ] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    if (!String(value.baseUrl).startsWith('https://')) {
      return { ok: false, error: 'baseUrl https:// ile başlamalı' };
    }
    if (!String(value.searchPathTemplate).startsWith('/')) {
      return { ok: false, error: 'searchPathTemplate / ile başlamalı' };
    }
    if (!String(value.organizationId).startsWith('/#')) {
      return { ok: false, error: 'organizationId /# ile başlamalı' };
    }
    if (!String(value.webpageId).startsWith('/#')) {
      return { ok: false, error: 'webpageId /# ile başlamalı' };
    }
    return { ok: true };
  }

  if (key === 'homepage.seo') {
    const required = ['title', 'description', 'canonical', 'ogImage'] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    if (!isInternalHref(value.canonical)) {
      return { ok: false, error: 'canonical dahili route olmalı' };
    }
    if (!String(value.ogImage).startsWith('/images/')) {
      return { ok: false, error: 'ogImage /images/ ile başlamalı' };
    }
    if (!Array.isArray(value.keywords) || value.keywords.length === 0) {
      return { ok: false, error: 'keywords en az 1 elemanlı dizi olmalı' };
    }
    for (const keyword of value.keywords) {
      if (typeof keyword !== 'string' || !keyword.trim()) {
        return { ok: false, error: 'keywords string ve dolu olmalı' };
      }
    }
    return { ok: true };
  }

  if (key === 'homepage.hero') {
    const required = ['badge', 'title', 'description', 'searchPlaceholder', 'backgroundImage'];
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    if (!String(value.backgroundImage).startsWith('/images/')) {
      return { ok: false, error: 'backgroundImage /images/ ile başlamalı' };
    }
    return { ok: true };
  }

  if (key === 'homepage.mainCta') {
    const required = [
      'title',
      'description',
      'primaryLabel',
      'primaryHref',
      'secondaryLabel',
      'secondaryHref',
    ];
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    if (!isInternalHref(value.primaryHref) || !isInternalHref(value.secondaryHref)) {
      return { ok: false, error: 'CTA href alanları dahili route olmalı' };
    }
    return { ok: true };
  }

  if (key === 'homepage.heroMeta') {
    const required = [
      'heroSectionClass',
      'heroOverlayClass',
      'heroContainerClass',
      'heroGridClass',
      'heroStatsPanelClass',
      'heroStatsPanelTitleClass',
      'heroStatsPanelSubtitleClass',
      'heroStatsUpdatedClass',
      'heroImageAlt',
      'searchButtonLabel',
      'businessCardBadge',
      'businessCardTitle',
      'businessCardDescription',
      'communityCardBadge',
      'communityCardTitle',
      'communityCardDescription',
      'statsPanelTitle',
      'statsPanelSubtitle',
      'statsActivePlacesLabel',
      'statsPharmacyLabel',
      'statsBusRouteLabel',
      'statsEventsLabel',
      'statsUpdatedPrefix',
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
    ] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    return { ok: true };
  }

  if (
    key === 'header.utilityLinks' ||
    key === 'header.mobileQuickLinks' ||
    key === 'header.mobileAllLinks' ||
    key === 'homepage.primaryActions' ||
    key === 'homepage.mvpQuickStart' ||
    key === 'homepage.quickCategories' ||
    key === 'homepage.featuredGuides' ||
    key === 'homepage.faq' ||
    key === 'homepage.heroQuickLinks' ||
    key === 'homepage.liveStatusCards' ||
    key === 'homepage.serviceQuickLinks' ||
    key === 'homepage.trendingFallbackQueries'
  ) {
    if (!Array.isArray(value.items)) return { ok: false, error: 'items dizi olmalı' };
    if (key === 'homepage.faq') {
      for (const item of value.items) {
        if (
          !isObject(item) ||
          typeof item.q !== 'string' ||
          typeof item.a !== 'string' ||
          !item.q.trim() ||
          !item.a.trim()
        ) {
          return { ok: false, error: 'faq items q/a zorunlu' };
        }
      }
      return { ok: true };
    }
    if (key === 'homepage.primaryActions') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        if (!item.title || !item.description || !item.stat)
          return { ok: false, error: 'primaryActions item alanları eksik' };
        if (!isInternalHref(item.href)) return { ok: false, error: 'primaryActions href geçersiz' };
      }
      return { ok: true };
    }
    if (key === 'homepage.mvpQuickStart') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        const required = ['badge', 'title', 'description', 'href'] as const;
        for (const field of required) {
          if (typeof item[field] !== 'string' || !item[field].trim()) {
            return { ok: false, error: `mvpQuickStart.${field} zorunlu` };
          }
        }
        if (!isInternalHref(item.href)) return { ok: false, error: 'mvpQuickStart href geçersiz' };
        if (!Array.isArray(item.links))
          return { ok: false, error: 'mvpQuickStart.links dizi olmalı' };
        const links = validateLinkList(item.links);
        if (links.ok === false) return { ok: false, error: `mvpQuickStart.links: ${links.error}` };
      }
      return { ok: true };
    }
    if (key === 'homepage.quickCategories') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        if (typeof item.slug !== 'string' || !item.slug.trim()) {
          return { ok: false, error: 'quickCategories.slug zorunlu' };
        }
        if (!/^[a-z0-9-]+$/.test(item.slug)) {
          return { ok: false, error: 'quickCategories.slug formatı geçersiz' };
        }
        if (typeof item.name !== 'string' || !item.name.trim()) {
          return { ok: false, error: 'quickCategories.name zorunlu' };
        }
      }
      return { ok: true };
    }
    if (key === 'homepage.featuredGuides') {
      return validateLinkList(value.items);
    }
    if (key === 'homepage.heroQuickLinks') {
      return validateLinkList(value.items);
    }
    if (key === 'homepage.liveStatusCards') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        const required = [
          'key',
          'title',
          'metricLabel',
          'statusText',
          'href',
          'cta',
          'badgeClass',
        ] as const;
        for (const field of required) {
          if (typeof item[field] !== 'string' || !item[field].trim()) {
            return { ok: false, error: `liveStatusCards.${field} zorunlu` };
          }
        }
        if (!isInternalHref(item.href))
          return { ok: false, error: 'liveStatusCards href geçersiz' };
      }
      return { ok: true };
    }
    if (key === 'homepage.serviceQuickLinks') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        const required = [
          'key',
          'categoryLabel',
          'title',
          'description',
          'href',
          'hoverBorderClass',
        ] as const;
        for (const field of required) {
          if (typeof item[field] !== 'string' || !item[field].trim()) {
            return { ok: false, error: `serviceQuickLinks.${field} zorunlu` };
          }
        }
        if (!isInternalHref(item.href))
          return { ok: false, error: 'serviceQuickLinks href geçersiz' };
      }
      return { ok: true };
    }
    if (key === 'homepage.trendingFallbackQueries') {
      for (const item of value.items) {
        if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
        if (typeof item.query !== 'string' || !item.query.trim()) {
          return { ok: false, error: 'trendingFallbackQueries.query zorunlu' };
        }
      }
      return { ok: true };
    }
    return validateLinkList(value.items);
  }

  if (key === 'header.megaMenu') {
    return validateMegaMenuItems(value.items);
  }

  if (key === 'header.brand') {
    const required = ['topStripText', 'logoTitle', 'logoHighlight'] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    return { ok: true };
  }

  if (key === 'header.labels') {
    const required = [
      'viewAllLabel',
      'loginLabel',
      'registerLabel',
      'mobileBusinessCtaLabel',
    ] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    return { ok: true };
  }

  if (key === 'homepage.sections') {
    if (!Array.isArray(value.order)) return { ok: false, error: 'order dizi olmalı' };
    if (value.order.some((item: unknown) => typeof item !== 'string' || !item.trim())) {
      return { ok: false, error: 'order string[] olmalı' };
    }
    if (!isObject(value.visibility)) return { ok: false, error: 'visibility object olmalı' };
    for (const [sectionKey, sectionVisible] of Object.entries(value.visibility)) {
      if (typeof sectionVisible !== 'boolean') {
        return { ok: false, error: `visibility.${sectionKey} boolean olmalı` };
      }
    }
    return { ok: true };
  }

  if (key === 'homepage.sectionCopy') {
    const required = [
      'mvpQuickStartBadge',
      'mvpQuickStartTitle',
      'mvpQuickStartDescription',
      'mvpQuickStartCtaLabel',
      'mvpQuickStartCtaHref',
      'quickActionsTitle',
      'quickActionsDescription',
      'quickActionsCtaLabel',
      'liveStatusTitle',
      'liveStatusDescription',
      'liveStatusUpdatedPrefix',
      'districtServiceTitle',
      'districtServiceDescription',
      'districtServiceCtaLabel',
      'popularCategoriesTitle',
      'popularCategoriesCtaLabel',
      'trendingTitle',
      'trendingCtaLabel',
      'densityTitle',
      'densityCtaLabel',
      'districtsTitle',
      'districtsCtaLabel',
      'historicalSitesTitle',
      'historicalSitesCtaLabel',
      'featuredPlacesTitle',
      'featuredPlacesCtaLabel',
      'recentPlacesTitle',
      'audiencePlansTitle',
      'audiencePlansDescription',
      'districtSpotlightsTitle',
      'districtSpotlightsDescription',
      'districtSpotlightsCtaLabel',
      'recentReviewsTitle',
      'recentReviewsDescription',
      'trustSignalsTitle',
      'trustSignalsSubtitle',
      'guidesTitle',
      'mainCategoriesTitle',
      'recipesTitle',
      'recipesCtaLabel',
      'blogTitle',
      'blogCtaLabel',
      'faqTitle',
      'faqDescription',
    ] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    if (!isInternalHref(value.mvpQuickStartCtaHref)) {
      return { ok: false, error: 'mvpQuickStartCtaHref geçersiz' };
    }
    return { ok: true };
  }

  if (key === 'homepage.sectionStyles') {
    const required = [
      'sectionHeadingClass',
      'sectionHeadingSpacedClass',
      'sectionHeadingSpacedLgClass',
      'sectionCtaLinkClass',
      'sectionMutedTextLineClampClass',
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
      'quickActionsSectionClass',
      'quickActionsContainerClass',
      'quickActionsHeaderWrapClass',
      'quickActionsGridClass',
      'quickActionsCardClass',
      'liveStatusSectionClass',
      'liveStatusContainerClass',
      'liveStatusHeaderWrapClass',
      'liveStatusGridClass',
      'liveStatusCardClass',
      'districtServiceSectionClass',
      'districtServiceContainerClass',
      'districtServiceHeaderWrapClass',
      'districtServiceGridClass',
      'districtServiceCardClass',
      'districtServiceChipsWrapClass',
      'districtServiceChipClass',
      'popularCategoriesSectionClass',
      'popularCategoriesContainerClass',
      'popularCategoriesHeaderWrapClass',
      'popularCategoriesGridClass',
      'popularCategoriesCardClass',
      'trendDensitySectionClass',
      'trendDensityContainerClass',
      'trendDensityGridClass',
      'trendDensityCardClass',
      'trendDensityHeaderWrapClass',
      'trendDensityTrendGridClass',
      'trendDensityTrendItemClass',
      'trendDensityDensityWrapClass',
      'trendDensityDensityItemClass',
      'districtsSectionClass',
      'districtsContainerClass',
      'districtsHeaderWrapClass',
      'districtsGridClass',
      'districtsCardClass',
      'audiencePlansSectionClass',
      'audiencePlansContainerClass',
      'audiencePlansHeaderWrapClass',
      'audiencePlansGridClass',
      'audiencePlansCardClass',
      'audiencePlansBadgeClass',
      'audiencePlansListClass',
      'audiencePlansActionClass',
      'districtSpotlightsSectionClass',
      'districtSpotlightsContainerClass',
      'districtSpotlightsHeaderWrapClass',
      'districtSpotlightsGridClass',
      'districtSpotlightsCardClass',
      'historicalSitesSectionClass',
      'historicalSitesContainerClass',
      'historicalSitesHeaderWrapClass',
      'historicalSitesGridClass',
      'historicalSitesCardClass',
      'historicalSitesImageWrapClass',
      'historicalSitesImageClass',
      'featuredPlacesSectionClass',
      'featuredPlacesContainerClass',
      'featuredPlacesHeaderWrapClass',
      'featuredPlacesGridClass',
      'recentPlacesSectionClass',
      'recentPlacesContainerClass',
      'recentPlacesGridClass',
      'recentReviewsSectionClass',
      'recentReviewsContainerClass',
      'recentReviewsHeaderWrapClass',
      'recentReviewsGridClass',
      'recentReviewsCardClass',
      'trustSignalsSectionClass',
      'trustSignalsContainerClass',
      'trustSignalsHeaderWrapClass',
      'trustSignalsGridClass',
      'trustSignalsCardClass',
      'guidesCommunitySectionClass',
      'guidesCommunityContainerClass',
      'guidesCommunityPanelClass',
      'guidesCommunityLinksWrapClass',
      'guidesCommunityLinkClass',
      'guidesCommunityGridClass',
      'guidesCommunityGuideCardClass',
      'mainCategoriesSectionClass',
      'mainCategoriesContainerClass',
      'mainCategoriesGridClass',
      'mainCategoriesCardClass',
      'recipesSectionClass',
      'recipesContainerClass',
      'recipesHeaderWrapClass',
      'recipesGridClass',
      'recipesCardClass',
      'recipesImageWrapClass',
      'recipesImageClass',
      'blogSectionClass',
      'blogContainerClass',
      'blogHeaderWrapClass',
      'blogGridClass',
      'blogCardClass',
      'blogImageClass',
      'blogImageFallbackClass',
      'faqSectionClass',
      'faqContainerClass',
      'faqIntroWrapClass',
      'faqGridClass',
      'faqCardClass',
      'mainCtaSectionClass',
      'mainCtaContainerClass',
      'mainCtaDescriptionClass',
      'mainCtaActionsWrapClass',
      'mainCtaPrimaryButtonClass',
      'mainCtaSecondaryButtonClass',
    ] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    return { ok: true };
  }

  if (key === 'homepage.communityPanel') {
    if (typeof value.title !== 'string' || !value.title.trim()) {
      return { ok: false, error: 'title zorunlu' };
    }
    if (typeof value.description !== 'string' || !value.description.trim()) {
      return { ok: false, error: 'description zorunlu' };
    }
    if (!Array.isArray(value.items)) return { ok: false, error: 'items dizi olmalı' };
    for (const item of value.items) {
      if (!isObject(item)) return { ok: false, error: 'items içeriği object olmalı' };
      if (typeof item.label !== 'string' || !item.label.trim()) {
        return { ok: false, error: 'communityPanel.items.label zorunlu' };
      }
      if (!isInternalHref(item.href))
        return { ok: false, error: 'communityPanel.items href geçersiz' };
    }
    return { ok: true };
  }

  if (key === 'footer.links') {
    const groups = ['explore', 'districts', 'popular', 'company', 'services'] as const;
    for (const group of groups) {
      const result = validateLinkList(value[group]);
      if (!result.ok) {
        return {
          ok: false,
          error: `footer.${group}: ${'error' in result ? result.error : 'validation_failed'}`,
        };
      }
    }
    return { ok: true };
  }

  if (key === 'footer.brand') {
    const required = ['title', 'highlight', 'description', 'infoNote'] as const;
    for (const field of required) {
      if (typeof value[field] !== 'string' || !value[field].trim()) {
        return { ok: false, error: `${field} zorunlu` };
      }
    }
    return { ok: true };
  }

  if (key === 'footer.bottom') {
    if (typeof value.copyrightLabel !== 'string' || !value.copyrightLabel.trim()) {
      return { ok: false, error: 'copyrightLabel zorunlu' };
    }
    const linksResult = validateLinkList(value.legalLinks);
    if (!linksResult.ok) {
      return {
        ok: false,
        error: `footer.bottom.legalLinks: ${'error' in linksResult ? linksResult.error : 'validation_failed'}`,
      };
    }
    return { ok: true };
  }

  if (key === 'reviews.antiSpam') {
    if (typeof value.enabled !== 'boolean') return { ok: false, error: 'enabled boolean olmalı' };
    if (typeof value.autoModerateThreshold !== 'number')
      return { ok: false, error: 'autoModerateThreshold number olmalı' };
    if (typeof value.hardBlockThreshold !== 'number')
      return { ok: false, error: 'hardBlockThreshold number olmalı' };
    if (typeof value.minLength !== 'number') return { ok: false, error: 'minLength number olmalı' };
    if (typeof value.repeatedCharLimit !== 'number')
      return { ok: false, error: 'repeatedCharLimit number olmalı' };
    if (
      !Array.isArray(value.suspiciousKeywords) ||
      value.suspiciousKeywords.some((x: unknown) => typeof x !== 'string')
    ) {
      return { ok: false, error: 'suspiciousKeywords string[] olmalı' };
    }
    if (value.allowlist !== undefined) {
      if (
        !Array.isArray(value.allowlist) ||
        value.allowlist.some((x: unknown) => typeof x !== 'string')
      ) {
        return { ok: false, error: 'allowlist string[] olmalı' };
      }
    }
    return { ok: true };
  }

  if (key === 'places.lifecycle.sla.targets') {
    if (typeof value.defaultHours !== 'number') {
      return { ok: false, error: 'defaultHours number olmalı' };
    }
    if (!isObject(value.byDistrict) || !isObject(value.byTeam)) {
      return { ok: false, error: 'byDistrict/byTeam object olmalı' };
    }
    const maps = [value.byDistrict, value.byTeam];
    for (const map of maps) {
      for (const [entryKey, entryValue] of Object.entries(map)) {
        if (typeof entryValue !== 'number' || !Number.isFinite(entryValue)) {
          return { ok: false, error: `${entryKey} hedefi number olmalı` };
        }
      }
    }
    return { ok: true };
  }

  if (key === 'social.risk.thresholds') {
    const requiredNumeric = ['scoreAlert', 'zScoreAlert', 'minLastHour', 'minTotal'] as const;
    for (const field of requiredNumeric) {
      if (typeof value[field] !== 'number' || !Number.isFinite(value[field])) {
        return { ok: false, error: `${field} number olmalı` };
      }
    }
    if (value.byTenant !== undefined) {
      if (!isObject(value.byTenant)) return { ok: false, error: 'byTenant object olmalı' };
      for (const [tenantId, tenantConfig] of Object.entries(value.byTenant)) {
        if (!isObject(tenantConfig))
          return { ok: false, error: `${tenantId} threshold object olmalı` };
        for (const key of ['scoreAlert', 'zScoreAlert', 'minLastHour', 'minTotal'] as const) {
          const v = (tenantConfig as Record<string, unknown>)[key];
          if (v !== undefined && (typeof v !== 'number' || !Number.isFinite(v))) {
            return { ok: false, error: `${tenantId}.${key} number olmalı` };
          }
        }
      }
    }
    return { ok: true };
  }

  if (key === 'social.risk.webhook') {
    if (typeof value.enabled !== 'boolean') return { ok: false, error: 'enabled boolean olmalı' };
    if (typeof value.eventName !== 'string' || !value.eventName.trim()) {
      return { ok: false, error: 'eventName zorunlu' };
    }
    if (value.userId !== undefined && typeof value.userId !== 'string') {
      return { ok: false, error: 'userId string olmalı' };
    }
    if (typeof value.cooldownMinutes !== 'number' || !Number.isFinite(value.cooldownMinutes)) {
      return { ok: false, error: 'cooldownMinutes number olmalı' };
    }
    return { ok: true };
  }

  if (key === 'social.risk.autoActions') {
    if (typeof value.enabled !== 'boolean') return { ok: false, error: 'enabled boolean olmalı' };
    if (typeof value.cooldownMinutes !== 'number' || !Number.isFinite(value.cooldownMinutes)) {
      return { ok: false, error: 'cooldownMinutes number olmalı' };
    }
    if (typeof value.note !== 'string' || !value.note.trim()) {
      return { ok: false, error: 'note zorunlu' };
    }
    if (typeof value.rollbackToDefaultWhenHealthy !== 'boolean') {
      return { ok: false, error: 'rollbackToDefaultWhenHealthy boolean olmalı' };
    }
    if (!isObject(value.profile)) return { ok: false, error: 'profile object olmalı' };
    const profileFields = [
      'swipeLimit',
      'swipeWindowSeconds',
      'followLimit',
      'followWindowSeconds',
      'messageWriteLimit',
      'messageWriteWindowSeconds',
    ] as const;
    for (const field of profileFields) {
      if (typeof value.profile[field] !== 'number' || !Number.isFinite(value.profile[field])) {
        return { ok: false, error: `profile.${field} number olmalı` };
      }
    }
    return { ok: true };
  }

  if (key === 'social.profiles') {
    const channels = ['instagram', 'tiktok', 'youtube', 'x'] as const;
    for (const channel of channels) {
      const profile = value[channel];
      if (!isObject(profile)) return { ok: false, error: `${channel} object olmalı` };
      if (typeof profile.enabled !== 'boolean') {
        return { ok: false, error: `${channel}.enabled boolean olmalı` };
      }
      if (profile.handle !== undefined && typeof profile.handle !== 'string') {
        return { ok: false, error: `${channel}.handle string olmalı` };
      }
      if (profile.url !== undefined && typeof profile.url !== 'string') {
        return { ok: false, error: `${channel}.url string olmalı` };
      }
      if (profile.enabled && !String(profile.handle || '').trim()) {
        return { ok: false, error: `${channel}.handle zorunlu` };
      }
      if (profile.enabled && !String(profile.url || '').trim()) {
        return { ok: false, error: `${channel}.url zorunlu` };
      }
      if (profile.enabled && typeof profile.url === 'string') {
        const validUrl = /^https?:\/\//i.test(profile.url.trim());
        if (!validUrl) return { ok: false, error: `${channel}.url http/https olmalı` };
      }
    }
    return { ok: true };
  }

  return { ok: false, error: `tanımsız ayar anahtarı: ${key}` };
}
