export interface HomeLinkItem {
  href: string;
  label: string;
}

export interface HomeHeroQuickLink extends HomeLinkItem {}

export interface HomeMvpCard {
  badge: string;
  title: string;
  description: string;
  href: string;
  links: HomeLinkItem[];
}

export interface HomeActionCard {
  href: string;
  icon?: string;
  stat: string;
  title: string;
  description: string;
}

export interface HomeLiveStatusCard {
  icon?: string;
  title: string;
  badgeClass: string;
  statusText: string;
  metric: string;
  metricLabel: string;
  freshness: string;
  href: string;
  cta: string;
  stale?: boolean;
}

export interface HomeReviewHighlight {
  place_slug: string;
  place_name: string;
  rating?: number | null;
  excerpt: string;
  author_name: string;
  createdLabel: string;
}

export interface HomeDistrictSpotlight {
  district_name: string;
  district_slug: string;
  place_slug: string;
  place_name: string;
  rating?: number | null;
  review_count?: number | null;
}

export interface HomeTrustSignal {
  slug: string;
  name: string;
  district: string;
  updatedAt: string;
  rating: string;
}

export interface HomeTrendingSearch {
  query: string;
}

export interface HomeCategoryDensityCard {
  slug: string;
  name: string;
  count: number;
  ratio: number;
}

export interface HomeRecipeCard {
  slug: string;
  name: string;
  cover_image?: string | null;
  description?: string | null;
}

export interface HomeCategoryLink {
  slug: string;
  name: string;
}

export interface HomeHistoricalSite {
  slug: string;
  name: string;
  cover_image?: string | null;
  images?: string[] | null;
  short_description?: string | null;
}

export interface HomeDistrictCard {
  slug: string;
  name: string;
  description?: string | null;
  place_count?: number | null;
}

export interface HomeGuideLink {
  title: string;
  href: string;
  icon?: string;
}

export interface HomeCommunityPanelLink {
  label: string;
  href: string;
}

export interface HomeCommunityPanel {
  title: string;
  description: string;
  items: HomeCommunityPanelLink[];
}

export interface HomeFaqItem {
  S: string;
  C: string;
}

export interface HomeBlogCard {
  slug: string;
  title: string;
  cover_image?: string | null;
  category?: string | null;
  excerpt?: string | null;
}

export interface HomeServiceQuickLink {
  key: string;
  icon?: string;
  categoryLabel: string;
  title: string;
  description: string;
  href: string;
  hoverBorderClass?: string;
}

export interface HomeDistrictServiceLink {
  name: string;
  href: string;
  placeCount: number;
}

export interface HomeAudiencePlan {
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  cta: string;
}
