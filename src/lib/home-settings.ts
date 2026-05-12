import type { HomeSectionCopy } from '../types/home';
import { createHomeSectionState } from './home-data';
import { mergeHomepageSeo } from './home-presentation';
import { getSiteSetting, getSiteSettingRequired } from './site-content';

export const HOMEPAGE_SECTION_IDS = [
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
] as const;

export const HOMEPAGE_SECTIONS_FALLBACK = {
  order: [...HOMEPAGE_SECTION_IDS],
  visibility: {},
};

export type HomeSectionRegistryRow = Record<string, unknown>;
export const HOMEPAGE_SECTION_COPY_OVERRIDES: Array<{
  sectionKey: string;
  title?: keyof HomeSectionCopy;
  description?: keyof HomeSectionCopy;
  cta?: keyof HomeSectionCopy;
}> = [
  { sectionKey: 'quick-actions', title: 'quickActionsTitle', description: 'quickActionsDescription', cta: 'quickActionsCtaLabel' },
  { sectionKey: 'mvp-quick-start', title: 'mvpQuickStartTitle', description: 'mvpQuickStartDescription', cta: 'mvpQuickStartCtaLabel' },
  { sectionKey: 'live-status', title: 'liveStatusTitle', description: 'liveStatusDescription' },
  { sectionKey: 'district-service', title: 'districtServiceTitle', description: 'districtServiceDescription', cta: 'districtServiceCtaLabel' },
  { sectionKey: 'popular-categories', title: 'popularCategoriesTitle', cta: 'popularCategoriesCtaLabel' },
  { sectionKey: 'districts', title: 'districtsTitle', cta: 'districtsCtaLabel' },
  { sectionKey: 'historical-sites', title: 'historicalSitesTitle', cta: 'historicalSitesCtaLabel' },
  { sectionKey: 'featured-places', title: 'featuredPlacesTitle', cta: 'featuredPlacesCtaLabel' },
  { sectionKey: 'recent-places', title: 'recentPlacesTitle' },
  { sectionKey: 'trust-signals', title: 'trustSignalsTitle', description: 'trustSignalsSubtitle' },
  { sectionKey: 'guides-community', title: 'guidesTitle' },
  { sectionKey: 'audience-plans', title: 'audiencePlansTitle', description: 'audiencePlansDescription' },
  { sectionKey: 'district-spotlights', title: 'districtSpotlightsTitle', description: 'districtSpotlightsDescription', cta: 'districtSpotlightsCtaLabel' },
  { sectionKey: 'recent-reviews', title: 'recentReviewsTitle', description: 'recentReviewsDescription' },
  { sectionKey: 'main-categories', title: 'mainCategoriesTitle' },
  { sectionKey: 'recipes', title: 'recipesTitle', cta: 'recipesCtaLabel' },
  { sectionKey: 'blog', title: 'blogTitle', cta: 'blogCtaLabel' },
  { sectionKey: 'faq', title: 'faqTitle', description: 'faqDescription' },
];

export function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readItems(value: unknown): Array<Record<string, unknown>> {
  const record = readRecord(value);
  if (!record || !Array.isArray(record.items)) return [];
  return record.items.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)));
}

export function resolveHomepageSections(params: {
  homepageSectionsSetting: unknown;
  platformHomepageSections: Array<{ section_key?: string; is_active?: boolean }>;
}) {
  const { homepageSectionsSetting, platformHomepageSections } = params;
  const homepageSectionsSettingRecord = readRecord(homepageSectionsSetting);
  const homepageSettingVisibility =
    homepageSectionsSettingRecord?.visibility &&
    typeof homepageSectionsSettingRecord.visibility === 'object'
      ? (homepageSectionsSettingRecord.visibility as Record<string, boolean>)
      : {};

  const configuredSectionOrder =
    platformHomepageSections.length > 0
      ? platformHomepageSections
          .map((item) => String(item.section_key || '').trim())
          .filter((item) => item)
      : Array.isArray(homepageSectionsSettingRecord?.order)
        ? homepageSectionsSettingRecord.order
            .map((item: unknown) => String(item || '').trim())
            .filter((item) => item)
        : HOMEPAGE_SECTIONS_FALLBACK.order;

  const sectionOrderList = [
    ...configuredSectionOrder.filter((id) => HOMEPAGE_SECTION_IDS.includes(id as (typeof HOMEPAGE_SECTION_IDS)[number])),
    ...HOMEPAGE_SECTION_IDS.filter((id) => !configuredSectionOrder.includes(id)),
  ];

  const { sectionOrderMap, sectionVisibilitySetting } = createHomeSectionState({
    homepageSectionIds: [...HOMEPAGE_SECTION_IDS],
    configuredSectionOrder: sectionOrderList,
    platformHomepageSections,
    homepageSettingVisibility,
  });

  const homepageSectionRegistry = Object.fromEntries(
    platformHomepageSections.map((section) => [String(section.section_key || '').trim(), section]),
  );

  return {
    sectionOrderMap,
    sectionVisibilitySetting,
    homepageSectionRegistry,
  };
}

export function summarizeHomepageSections(params: {
  sectionOrderMap: Record<string, number>;
  sectionVisibilitySetting: Record<string, boolean>;
}) {
  const { sectionOrderMap, sectionVisibilitySetting } = params;
  return [...HOMEPAGE_SECTION_IDS]
    .map((id) => ({
      id,
      order: Number(sectionOrderMap[id] || 999),
      enabled: sectionVisibilitySetting[id] !== false,
    }))
    .sort((a, b) => a.order - b.order);
}

export function applySectionContentOverrides(
  sectionCopy: HomeSectionCopy,
  homepageSectionRegistry: Record<string, HomeSectionRegistryRow>,
  overrides: Array<{
    sectionKey: string;
    title?: keyof HomeSectionCopy;
    description?: keyof HomeSectionCopy;
    cta?: keyof HomeSectionCopy;
  }>,
): HomeSectionCopy {
  for (const override of overrides) {
    const section = homepageSectionRegistry[override.sectionKey];
    if (!section) continue;
    if (override.title && section.title) {
      sectionCopy[override.title] = String(section.title);
    }
    if (override.description && section.description) {
      sectionCopy[override.description] = String(section.description);
    }
    const config = readRecord(section.config);
    if (override.cta && config?.ctaLabel) {
      sectionCopy[override.cta] = String(config.ctaLabel);
    }
  }
  return sectionCopy;
}

export async function loadHomepagePresentationSettings<
  THeroConfig extends Record<string, unknown>,
  THeroMeta extends Record<string, unknown>,
  TMainCtaConfig extends Record<string, unknown>,
  TSeo extends Record<string, unknown>,
  THomepageSchema extends Record<string, unknown>,
  TSectionCopy extends Record<string, unknown>,
  TSectionStyles extends Record<string, unknown>,
>(params: {
  heroConfig: THeroConfig;
  heroMeta: THeroMeta;
  mainCtaConfig: TMainCtaConfig;
  seo: TSeo;
  homepageSchema: THomepageSchema;
  sectionCopy: TSectionCopy;
  sectionStyles: TSectionStyles;
  platformHeroAssetUrl: string;
  platformHomepageSeoPayload: Record<string, unknown> | null;
  platformHomepageCanonical: string;
}) {
  let heroConfig = await getSiteSettingRequired<THeroConfig>('homepage.hero');
  const heroMeta = await getSiteSettingRequired<THeroMeta>('homepage.heroMeta');
  const mainCtaConfig = await getSiteSettingRequired<TMainCtaConfig>('homepage.mainCta');
  let seo = await getSiteSettingRequired<TSeo>('homepage.seo');
  const homepageSchema = await getSiteSettingRequired<THomepageSchema>('homepage.schema');
  const sectionCopy = {
    ...params.sectionCopy,
    ...(await getSiteSetting('homepage.sectionCopy', params.sectionCopy)),
  };
  const sectionStyles = {
    ...params.sectionStyles,
    ...(await getSiteSetting('homepage.sectionStyles', params.sectionStyles)),
  };

  if (params.platformHeroAssetUrl) {
    heroConfig = {
      ...heroConfig,
      backgroundImage: params.platformHeroAssetUrl,
    } as THeroConfig;
  }

  seo = mergeHomepageSeo({
    seo,
    platformHomepageSeoPayload: params.platformHomepageSeoPayload,
    platformHomepageCanonical: params.platformHomepageCanonical,
  });

  return {
    heroConfig,
    heroMeta,
    mainCtaConfig,
    seo,
    homepageSchema,
    sectionCopy,
    sectionStyles,
  };
}
