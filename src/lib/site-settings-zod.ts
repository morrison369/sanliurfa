import { z } from 'zod';

const InternalHref = z
  .string()
  .min(1)
  .refine(
    (href) =>
      href.startsWith('/') && !href.includes('://') && !href.includes('..') && !href.includes('\\'),
    {
      message: 'dahili href olmalı',
    },
  );

const LinkItem = z
  .object({
    label: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    href: InternalHref,
  })
  .refine((item) => Boolean(item.label?.trim() || item.title?.trim()), {
    message: 'label (veya title) zorunlu',
  });

const HeroSchema = z.object({
  badge: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  searchPlaceholder: z.string().min(1),
  backgroundImage: z.string().startsWith('/images/'),
});

const HomepageSchemaSchema = z.object({
  siteName: z.string().min(1),
  alternateName: z.string().min(1),
  baseUrl: z.url().startsWith('https://'),
  searchPathTemplate: z.string().min(1).startsWith('/'),
  organizationId: z.string().min(1).startsWith('/#'),
  webpageId: z.string().min(1).startsWith('/#'),
  cityName: z.string().min(1),
  trendingListName: z.string().min(1),
  servicesListName: z.string().min(1),
  webpageName: z.string().min(1),
});

const HomepageSeoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  canonical: InternalHref,
  ogImage: z.string().startsWith('/images/'),
  keywords: z.array(z.string().min(1)).min(1),
});

const HeroMetaSchema = z.object({
  heroSectionClass: z.string().min(1),
  heroOverlayClass: z.string().min(1),
  heroContainerClass: z.string().min(1),
  heroGridClass: z.string().min(1),
  heroStatsPanelClass: z.string().min(1),
  heroStatsPanelTitleClass: z.string().min(1),
  heroStatsPanelSubtitleClass: z.string().min(1),
  heroStatsUpdatedClass: z.string().min(1),
  heroImageAlt: z.string().min(1),
  searchButtonLabel: z.string().min(1),
  businessCardBadge: z.string().min(1),
  businessCardTitle: z.string().min(1),
  businessCardDescription: z.string().min(1),
  communityCardBadge: z.string().min(1),
  communityCardTitle: z.string().min(1),
  communityCardDescription: z.string().min(1),
  statsPanelTitle: z.string().min(1),
  statsPanelSubtitle: z.string().min(1),
  statsActivePlacesLabel: z.string().min(1),
  statsPharmacyLabel: z.string().min(1),
  statsBusRouteLabel: z.string().min(1),
  statsEventsLabel: z.string().min(1),
  statsUpdatedPrefix: z.string().min(1),
  statsCardClass: z.string().min(1),
  statsLabelClass: z.string().min(1),
  statsValueClass: z.string().min(1),
  heroQuickLinkClass: z.string().min(1),
  heroQuickLinkHoverClass: z.string().min(1),
  searchFormClass: z.string().min(1),
  searchRowClass: z.string().min(1),
  searchInputClass: z.string().min(1),
  searchButtonClass: z.string().min(1),
  businessCardClass: z.string().min(1),
  communityCardClass: z.string().min(1),
  heroBadgeClass: z.string().min(1),
  heroTitleClass: z.string().min(1),
  heroDescriptionClass: z.string().min(1),
});

const MainCtaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  primaryLabel: z.string().min(1),
  primaryHref: InternalHref,
  secondaryLabel: z.string().min(1),
  secondaryHref: InternalHref,
});

const HomepageCtaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  primary: z.object({
    href: InternalHref,
    label: z.string().min(1),
    ariaLabel: z.string().min(1),
  }),
  secondary: z.object({
    href: InternalHref,
    label: z.string().min(1),
    ariaLabel: z.string().min(1),
  }),
});

const HomepageSectionOrderSchema = z.object({
  items: z.array(z.string().min(1)).min(1),
});

const HomepageThemeSchema = z.object({
  landingSand: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingCream: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingGreen: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingCopper: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingCopperStrong: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingGold: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingInk: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingMuted: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingSurface: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingSurfaceHover: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  landingStone: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
});

const HeaderBrandSchema = z.object({
  topStripText: z.string().min(1),
  logoTitle: z.string().min(1),
  logoHighlight: z.string().min(1),
});

const HeaderLabelsSchema = z.object({
  viewAllLabel: z.string().min(1),
  loginLabel: z.string().min(1),
  registerLabel: z.string().min(1),
  mobileBusinessCtaLabel: z.string().min(1),
});

const PrimaryActionItem = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  stat: z.string().min(1),
  href: InternalHref,
});

const MvpQuickStartItem = z.object({
  badge: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  href: InternalHref,
  links: z.array(LinkItem).min(1),
});

const QuickCategoryItem = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug formatı geçersiz'),
  name: z.string().min(1),
});

const FaqItem = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
});

const LiveStatusCardItem = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  metricLabel: z.string().min(1),
  statusText: z.string().min(1),
  href: InternalHref,
  cta: z.string().min(1),
  badgeClass: z.string().min(1),
});

const HomepageQuickAccessItem = z.object({
  icon: z.string().min(1).optional(),
  title: z.string().min(1),
  desc: z.string().min(1),
  href: InternalHref,
  cta: z.string().min(1),
});

const HomepageRouteItem = z.object({
  title: z.string().min(1),
  desc: z.string().min(1),
  href: InternalHref,
  image: z.string().startsWith('/images/'),
});

const ServiceQuickLinkItem = z.object({
  key: z.string().min(1),
  categoryLabel: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  href: InternalHref,
  hoverBorderClass: z.string().min(1),
});

const TrendingFallbackQueryItem = z.object({
  query: z.string().min(1),
});

const MegaMenuItem = z
  .object({
    label: z.string().min(1),
    href: InternalHref,
    sub: z.array(LinkItem).optional(),
    groups: z
      .array(
        z.object({
          title: z.string().min(1),
          links: z.array(LinkItem).min(1),
        }),
      )
      .optional(),
  })
  .superRefine((item, ctx) => {
    const hasSub = Array.isArray(item.sub) && item.sub.length > 0;
    const hasGroups = Array.isArray(item.groups) && item.groups.length > 0;
    if (!hasSub && !hasGroups) {
      ctx.addIssue({
        code: 'custom',
        message: 'section en az bir sub veya groups içermeli',
      });
    }
  });

const HomepageSectionsSchema = z.object({
  order: z.array(z.string().min(1)),
  visibility: z.record(z.string(), z.boolean()),
});

const HomepageSectionCopySchema = z.object({
  mvpQuickStartBadge: z.string().min(1),
  mvpQuickStartTitle: z.string().min(1),
  mvpQuickStartDescription: z.string().min(1),
  mvpQuickStartCtaLabel: z.string().min(1),
  mvpQuickStartCtaHref: InternalHref,
  quickActionsTitle: z.string().min(1),
  quickActionsDescription: z.string().min(1),
  quickActionsCtaLabel: z.string().min(1),
  liveStatusTitle: z.string().min(1),
  liveStatusDescription: z.string().min(1),
  liveStatusUpdatedPrefix: z.string().min(1),
  districtServiceTitle: z.string().min(1),
  districtServiceDescription: z.string().min(1),
  districtServiceCtaLabel: z.string().min(1),
  popularCategoriesTitle: z.string().min(1),
  popularCategoriesCtaLabel: z.string().min(1),
  trendingTitle: z.string().min(1),
  trendingCtaLabel: z.string().min(1),
  densityTitle: z.string().min(1),
  densityCtaLabel: z.string().min(1),
  districtsTitle: z.string().min(1),
  districtsCtaLabel: z.string().min(1),
  historicalSitesTitle: z.string().min(1),
  historicalSitesCtaLabel: z.string().min(1),
  featuredPlacesTitle: z.string().min(1),
  featuredPlacesCtaLabel: z.string().min(1),
  recentPlacesTitle: z.string().min(1),
  audiencePlansTitle: z.string().min(1),
  audiencePlansDescription: z.string().min(1),
  districtSpotlightsTitle: z.string().min(1),
  districtSpotlightsDescription: z.string().min(1),
  districtSpotlightsCtaLabel: z.string().min(1),
  recentReviewsTitle: z.string().min(1),
  recentReviewsDescription: z.string().min(1),
  trustSignalsTitle: z.string().min(1),
  trustSignalsSubtitle: z.string().min(1),
  guidesTitle: z.string().min(1),
  mainCategoriesTitle: z.string().min(1),
  recipesTitle: z.string().min(1),
  recipesCtaLabel: z.string().min(1),
  blogTitle: z.string().min(1),
  blogCtaLabel: z.string().min(1),
  faqTitle: z.string().min(1),
  faqDescription: z.string().min(1),
});

const HomepageSectionStylesSchema = z.object({
  sectionHeadingClass: z.string().min(1),
  sectionHeadingSpacedClass: z.string().min(1),
  sectionHeadingSpacedLgClass: z.string().min(1),
  sectionCtaLinkClass: z.string().min(1),
  sectionMutedTextLineClampClass: z.string().min(1),
  mvpQuickStartSectionClass: z.string().min(1),
  mvpQuickStartContainerClass: z.string().min(1),
  mvpQuickStartPanelClass: z.string().min(1),
  mvpQuickStartHeaderClass: z.string().min(1),
  mvpQuickStartBadgeClass: z.string().min(1),
  mvpQuickStartTitleClass: z.string().min(1),
  mvpQuickStartDescriptionClass: z.string().min(1),
  mvpQuickStartCtaClass: z.string().min(1),
  mvpQuickStartGridClass: z.string().min(1),
  mvpQuickStartCardClass: z.string().min(1),
  mvpQuickStartCardLinkClass: z.string().min(1),
  mvpQuickStartCardBadgeClass: z.string().min(1),
  mvpQuickStartCardTitleClass: z.string().min(1),
  mvpQuickStartCardDescriptionClass: z.string().min(1),
  mvpQuickStartLinksWrapClass: z.string().min(1),
  mvpQuickStartLinkClass: z.string().min(1),
  quickActionsSectionClass: z.string().min(1),
  quickActionsContainerClass: z.string().min(1),
  quickActionsHeaderWrapClass: z.string().min(1),
  quickActionsGridClass: z.string().min(1),
  quickActionsCardClass: z.string().min(1),
  liveStatusSectionClass: z.string().min(1),
  liveStatusContainerClass: z.string().min(1),
  liveStatusHeaderWrapClass: z.string().min(1),
  liveStatusGridClass: z.string().min(1),
  liveStatusCardClass: z.string().min(1),
  districtServiceSectionClass: z.string().min(1),
  districtServiceContainerClass: z.string().min(1),
  districtServiceHeaderWrapClass: z.string().min(1),
  districtServiceGridClass: z.string().min(1),
  districtServiceCardClass: z.string().min(1),
  districtServiceChipsWrapClass: z.string().min(1),
  districtServiceChipClass: z.string().min(1),
  popularCategoriesSectionClass: z.string().min(1),
  popularCategoriesContainerClass: z.string().min(1),
  popularCategoriesHeaderWrapClass: z.string().min(1),
  popularCategoriesGridClass: z.string().min(1),
  popularCategoriesCardClass: z.string().min(1),
  trendDensitySectionClass: z.string().min(1),
  trendDensityContainerClass: z.string().min(1),
  trendDensityGridClass: z.string().min(1),
  trendDensityCardClass: z.string().min(1),
  trendDensityHeaderWrapClass: z.string().min(1),
  trendDensityTrendGridClass: z.string().min(1),
  trendDensityTrendItemClass: z.string().min(1),
  trendDensityDensityWrapClass: z.string().min(1),
  trendDensityDensityItemClass: z.string().min(1),
  districtsSectionClass: z.string().min(1),
  districtsContainerClass: z.string().min(1),
  districtsHeaderWrapClass: z.string().min(1),
  districtsGridClass: z.string().min(1),
  districtsCardClass: z.string().min(1),
  audiencePlansSectionClass: z.string().min(1),
  audiencePlansContainerClass: z.string().min(1),
  audiencePlansHeaderWrapClass: z.string().min(1),
  audiencePlansGridClass: z.string().min(1),
  audiencePlansCardClass: z.string().min(1),
  audiencePlansBadgeClass: z.string().min(1),
  audiencePlansListClass: z.string().min(1),
  audiencePlansActionClass: z.string().min(1),
  districtSpotlightsSectionClass: z.string().min(1),
  districtSpotlightsContainerClass: z.string().min(1),
  districtSpotlightsHeaderWrapClass: z.string().min(1),
  districtSpotlightsGridClass: z.string().min(1),
  districtSpotlightsCardClass: z.string().min(1),
  historicalSitesSectionClass: z.string().min(1),
  historicalSitesContainerClass: z.string().min(1),
  historicalSitesHeaderWrapClass: z.string().min(1),
  historicalSitesGridClass: z.string().min(1),
  historicalSitesCardClass: z.string().min(1),
  historicalSitesImageWrapClass: z.string().min(1),
  historicalSitesImageClass: z.string().min(1),
  featuredPlacesSectionClass: z.string().min(1),
  featuredPlacesContainerClass: z.string().min(1),
  featuredPlacesHeaderWrapClass: z.string().min(1),
  featuredPlacesGridClass: z.string().min(1),
  recentPlacesSectionClass: z.string().min(1),
  recentPlacesContainerClass: z.string().min(1),
  recentPlacesGridClass: z.string().min(1),
  recentReviewsSectionClass: z.string().min(1),
  recentReviewsContainerClass: z.string().min(1),
  recentReviewsHeaderWrapClass: z.string().min(1),
  recentReviewsGridClass: z.string().min(1),
  recentReviewsCardClass: z.string().min(1),
  trustSignalsSectionClass: z.string().min(1),
  trustSignalsContainerClass: z.string().min(1),
  trustSignalsHeaderWrapClass: z.string().min(1),
  trustSignalsGridClass: z.string().min(1),
  trustSignalsCardClass: z.string().min(1),
  guidesCommunitySectionClass: z.string().min(1),
  guidesCommunityContainerClass: z.string().min(1),
  guidesCommunityPanelClass: z.string().min(1),
  guidesCommunityLinksWrapClass: z.string().min(1),
  guidesCommunityLinkClass: z.string().min(1),
  guidesCommunityGridClass: z.string().min(1),
  guidesCommunityGuideCardClass: z.string().min(1),
  mainCategoriesSectionClass: z.string().min(1),
  mainCategoriesContainerClass: z.string().min(1),
  mainCategoriesGridClass: z.string().min(1),
  mainCategoriesCardClass: z.string().min(1),
  recipesSectionClass: z.string().min(1),
  recipesContainerClass: z.string().min(1),
  recipesHeaderWrapClass: z.string().min(1),
  recipesGridClass: z.string().min(1),
  recipesCardClass: z.string().min(1),
  recipesImageWrapClass: z.string().min(1),
  recipesImageClass: z.string().min(1),
  blogSectionClass: z.string().min(1),
  blogContainerClass: z.string().min(1),
  blogHeaderWrapClass: z.string().min(1),
  blogGridClass: z.string().min(1),
  blogCardClass: z.string().min(1),
  blogImageClass: z.string().min(1),
  blogImageFallbackClass: z.string().min(1),
  faqSectionClass: z.string().min(1),
  faqContainerClass: z.string().min(1),
  faqIntroWrapClass: z.string().min(1),
  faqGridClass: z.string().min(1),
  faqCardClass: z.string().min(1),
  mainCtaSectionClass: z.string().min(1),
  mainCtaContainerClass: z.string().min(1),
  mainCtaDescriptionClass: z.string().min(1),
  mainCtaActionsWrapClass: z.string().min(1),
  mainCtaPrimaryButtonClass: z.string().min(1),
  mainCtaSecondaryButtonClass: z.string().min(1),
});

const CommunityPanelSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  items: z.array(
    z.object({
      label: z.string().min(1),
      href: InternalHref,
    }),
  ),
});

const FooterSchema = z.object({
  explore: z.array(LinkItem),
  districts: z.array(LinkItem),
  popular: z.array(LinkItem),
  company: z.array(LinkItem),
  services: z.array(LinkItem),
});

const FooterBrandSchema = z.object({
  title: z.string().min(1),
  highlight: z.string().min(1),
  description: z.string().min(1),
  infoNote: z.string().min(1),
});

const FooterBottomSchema = z.object({
  copyrightLabel: z.string().min(1),
  legalLinks: z.array(LinkItem),
});

const SocialProfileChannelSchema = z
  .object({
    enabled: z.boolean(),
    handle: z.string().optional(),
    url: z.string().optional(),
  })
  .superRefine((profile, ctx) => {
    const handle = profile.handle?.trim() || '';
    const url = profile.url?.trim() || '';
    if (!profile.enabled) return;
    if (!handle) {
      ctx.addIssue({ code: 'custom', path: ['handle'], message: 'handle zorunlu' });
    }
    if (!url) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'url zorunlu' });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      ctx.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'url http/https olmalı',
      });
    }
  });

const SocialProfilesSchema = z.object({
  instagram: SocialProfileChannelSchema,
  tiktok: SocialProfileChannelSchema,
  youtube: SocialProfileChannelSchema,
  x: SocialProfileChannelSchema,
});

const SettingSchemaMap: Record<string, z.ZodTypeAny> = {
  'homepage.schema': HomepageSchemaSchema,
  'homepage.seo': HomepageSeoSchema,
  'homepage.hero': HeroSchema,
  'homepage.heroMeta': HeroMetaSchema,
  'homepage.mainCta': MainCtaSchema,
  'homepage.cta': HomepageCtaSchema,
  'homepage.sectionOrder': HomepageSectionOrderSchema,
  'homepage.theme': HomepageThemeSchema,
  'header.utilityLinks': z.object({ items: z.array(LinkItem) }),
  'header.brand': HeaderBrandSchema,
  'header.labels': HeaderLabelsSchema,
  'header.megaMenu': z.object({ items: z.array(MegaMenuItem) }),
  'header.mobileQuickLinks': z.object({ items: z.array(LinkItem) }),
  'header.mobileAllLinks': z.object({ items: z.array(LinkItem) }),
  'homepage.primaryActions': z.object({ items: z.array(PrimaryActionItem) }),
  'homepage.mvpQuickStart': z.object({ items: z.array(MvpQuickStartItem) }),
  'homepage.quickCategories': z.object({ items: z.array(QuickCategoryItem) }),
  'homepage.featuredGuides': z.object({ items: z.array(LinkItem) }),
  'homepage.faq': z.object({ items: z.array(FaqItem) }),
  'homepage.heroQuickLinks': z.object({ items: z.array(LinkItem) }),
  'homepage.quickAccess': z.object({ items: z.array(HomepageQuickAccessItem) }),
  'homepage.routes': z.object({ items: z.array(HomepageRouteItem) }),
  'homepage.liveStatusCards': z.object({ items: z.array(LiveStatusCardItem) }),
  'homepage.serviceQuickLinks': z.object({ items: z.array(ServiceQuickLinkItem) }),
  'homepage.communityPanel': CommunityPanelSchema,
  'homepage.trendingFallbackQueries': z.object({ items: z.array(TrendingFallbackQueryItem) }),
  'homepage.sections': HomepageSectionsSchema,
  'homepage.sectionCopy': HomepageSectionCopySchema,
  'homepage.sectionStyles': HomepageSectionStylesSchema,
  'footer.links': FooterSchema,
  'footer.brand': FooterBrandSchema,
  'footer.bottom': FooterBottomSchema,
  'reviews.antiSpam': z.object({
    enabled: z.boolean(),
    autoModerateThreshold: z.number().min(1).max(100),
    hardBlockThreshold: z.number().min(1).max(100),
    minLength: z.number().min(1).max(500),
    repeatedCharLimit: z.number().min(2).max(50),
    suspiciousKeywords: z.array(z.string().min(1)),
    allowlist: z.array(z.string().min(1)).optional(),
  }),
  'places.lifecycle.sla.targets': z.object({
    defaultHours: z.number().min(1).max(720),
    byDistrict: z.record(z.string(), z.number().min(1).max(720)),
    byTeam: z.record(z.string(), z.number().min(1).max(720)),
  }),
  'social.risk.thresholds': z.object({
    scoreAlert: z.number().min(1).max(100),
    zScoreAlert: z.number().min(0).max(10),
    minLastHour: z.number().min(1).max(1000),
    minTotal: z.number().min(1).max(10000),
    byTenant: z
      .record(
        z.string(),
        z.object({
          scoreAlert: z.number().min(1).max(100).optional(),
          zScoreAlert: z.number().min(0).max(10).optional(),
          minLastHour: z.number().min(1).max(1000).optional(),
          minTotal: z.number().min(1).max(10000).optional(),
        }),
      )
      .optional(),
  }),
  'social.risk.webhook': z.object({
    enabled: z.boolean(),
    eventName: z.string().min(1),
    userId: z.string().optional(),
    cooldownMinutes: z.number().min(1).max(1440),
  }),
  'social.risk.autoActions': z.object({
    enabled: z.boolean(),
    cooldownMinutes: z.number().min(1).max(1440),
    note: z.string().min(1),
    rollbackToDefaultWhenHealthy: z.boolean(),
    profile: z.object({
      swipeLimit: z.number().min(1).max(100000),
      swipeWindowSeconds: z.number().min(10).max(86400),
      followLimit: z.number().min(1).max(100000),
      followWindowSeconds: z.number().min(10).max(86400),
      messageWriteLimit: z.number().min(1).max(100000),
      messageWriteWindowSeconds: z.number().min(10).max(86400),
    }),
  }),
  'social.profiles': SocialProfilesSchema,
};

export function validateSiteSettingWithZod(
  key: string,
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  const schema = SettingSchemaMap[key];
  if (!schema) return { ok: false, error: `zod schema tanımsız: ${key}` };
  const result = schema.safeParse(value);
  if (result.success) return { ok: true };
  return { ok: false, error: result.error.issues[0]?.message || 'zod validation failed' };
}
