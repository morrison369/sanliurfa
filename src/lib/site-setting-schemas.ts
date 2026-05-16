import { z } from 'zod';

const linkSchema = z.object({
  href: z.string().min(1),
  label: z.string().min(1),
});

const primaryActionSchema = z.object({
  icon: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
  stat: z.string().min(1),
});

const quickCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
});

const guideSchema = z.object({
  title: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().min(1).optional(),
});

const faqSchema = z.object({
  S: z.string().min(1),
  C: z.string().min(1),
});

const liveStatusCardSchema = z.object({
  key: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  title: z.string().min(1),
  metric: z.string().min(1).optional(),
  metricLabel: z.string().min(1).optional(),
  statusText: z.string().min(1).optional(),
  freshnessKey: z.string().min(1).optional(),
  href: z.string().min(1),
  cta: z.string().min(1).optional(),
  badgeClass: z.string().min(1).optional(),
});

const quickAccessCardSchema = z.object({
  icon: z.string().min(1).optional(),
  title: z.string().min(1),
  desc: z.string().min(1),
  href: z.string().min(1),
  cta: z.string().min(1),
});

const routeCardSchema = z.object({
  title: z.string().min(1),
  desc: z.string().min(1),
  href: z.string().min(1),
  image: z.string().min(1),
});

const serviceQuickLinkSchema = z.object({
  key: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  categoryLabel: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
  hoverBorderClass: z.string().min(1).optional(),
  categoryLabelClass: z.string().min(1).optional(),
});

const communityPanelSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  items: z.array(linkSchema),
});

const searchQuerySchema = z.object({
  query: z.string().min(1),
  search_count: z.number().optional(),
});

const homeSectionIdSchema = z.enum([
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
]);

const mvpCardSchema = z.object({
  badge: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
  links: z.array(linkSchema),
});

const adsenseSlotsSchema = z.object({
  client: z.string().min(1).optional(),
  autoAdsEnabled: z.boolean().optional(),
  homepageBanner: z.string().optional(),
  blogListSidebar: z.string().optional(),
  blogDetailInline: z.string().optional(),
  blogDetailSidebar: z.string().optional(),
  classifiedDetail: z.string().optional(),
});

const adsenseSmokeCacheSchema = z.object({
  generatedAt: z.string().min(1).optional(),
  rows: z.array(z.object({
    placement: z.string().min(1),
    url: z.string().nullable().optional(),
    ok: z.boolean().optional(),
    placementDetected: z.boolean().optional(),
    slotDetected: z.boolean().optional(),
    statusCode: z.number().nullable().optional(),
    note: z.string().min(1).optional(),
  })).optional(),
});

export const siteSettingSchemas = {
  'homepage.primaryActions': z.object({ items: z.array(primaryActionSchema) }),
  'homepage.quickCategories': z.object({ items: z.array(quickCategorySchema) }),
  'homepage.featuredGuides': z.object({ items: z.array(guideSchema) }),
  'homepage.faq': z.object({ items: z.array(faqSchema) }),
  'homepage.heroQuickLinks': z.object({ items: z.array(linkSchema) }),
  'homepage.quickAccess': z.object({ items: z.array(quickAccessCardSchema) }),
  'homepage.routes': z.object({ items: z.array(routeCardSchema) }),
  'homepage.liveStatusCards': z.object({ items: z.array(liveStatusCardSchema) }),
  'homepage.serviceQuickLinks': z.object({ items: z.array(serviceQuickLinkSchema) }),
  'homepage.communityPanel': communityPanelSchema,
  'homepage.trendingFallbackQueries': z.object({ items: z.array(searchQuerySchema) }),
  'homepage.sections': z.object({
    order: z.array(homeSectionIdSchema),
    visibility: z.record(z.string(), z.boolean()).optional(),
  }),
  'homepage.mvpQuickStart': z.object({ items: z.array(mvpCardSchema) }),
  'adsense.slots': adsenseSlotsSchema,
  'adsense.smokeCache': adsenseSmokeCacheSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

type SiteSettingSchemaKey = keyof typeof siteSettingSchemas;

export function validateSiteSettingValue<T extends Record<string, unknown>>(key: string, value: T): T | null {
  const schema = (siteSettingSchemas as Record<string, z.ZodTypeAny>)[key as SiteSettingSchemaKey];
  if (!schema) return value;
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return parsed.data as T;
}
