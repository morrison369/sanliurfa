export interface HomeSectionOrderMap {
  [sectionKey: string]: number;
}

export interface HomeHeroConfig {
  badge: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  backgroundImage: string;
}

export interface HomeHeroMeta {
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
}

export interface HomeQuickLink {
  href: string;
  label: string;
}

export interface HomeStatsSnapshot {
  totalPlaceCount: number;
  pharmacyCount: number;
  busRouteCount: number;
  upcomingEventsCount: number;
  generatedAtIso: string;
}

export interface HomeSectionCopy {
  [key: string]: string;
}

export interface HomeSectionStyles {
  [key: string]: string;
}
