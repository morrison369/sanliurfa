/**
 * SEO and structured data types
 */

// Breadcrumb item for structured data
export interface Breadcrumb {
  name: string;
  url: string;
}

// FAQ item for structured data
export interface FAQ {
  question: string;
  answer: string;
}

// Review item for structured data
export interface Review {
  author: string;
  rating: number;
  body: string;
  datePublished: string;
}

// SEO metadata for pages
export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

// Open Graph metadata
export interface OpenGraph {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  url?: string;
  siteName?: string;
  locale?: string;
}

// Twitter Card metadata
export interface TwitterCard {
  card?: 'summary' | 'summary_large_image';
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  site?: string;
  creator?: string;
}

// Schema.org Article
export interface ArticleSchema {
  headline: string;
  description: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  publisher?: {
    name: string;
    logo: string;
  };
}

// Schema.org Place
export interface PlaceSchema {
  name: string;
  description: string;
  image?: string | string[];
  address?: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    addressCountry: string;
    postalCode?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  url?: string;
}

// Schema.org Event
export interface EventSchema {
  name: string;
  description: string;
  image?: string;
  startDate: string;
  endDate?: string;
  eventStatus?: 'EventScheduled' | 'EventPostponed' | 'EventCancelled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
  location?: PlaceSchema;
  offers?: {
    price?: number;
    priceCurrency?: string;
    availability?: string;
    url?: string;
  };
  organizer?: {
    name: string;
    url?: string;
  };
}

// Sitemap entry
export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: Array<{
    loc: string;
    caption?: string;
  }>;
}

// Robots directive
export interface RobotsDirective {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
  sitemap?: string;
}

// Performance metric
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: string;
}

// SEO audit result
export interface SEOAuditResult {
  score: number;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  suggestions: string[];
}
