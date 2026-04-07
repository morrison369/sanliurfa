/**
 * SEO utilities for meta tags, Open Graph, structured data
 */

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  robots?: string;
  author?: string;
  publishedTime?: Date;
  modifiedTime?: Date;
  tags?: string[];
  lang?: 'tr' | 'en';
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

/**
 * Generate meta tags for SEO
 */
export function generateMetaTags(config: SEOConfig): Record<string, string> {
  return {
    'og:title': config.title,
    'og:description': config.description,
    'og:type': config.ogType || 'website',
    'og:image': config.ogImage || '/og-image.png',
    'og:url': config.canonical || '',
    'twitter:card': config.twitterCard || 'summary_large_image',
    'twitter:title': config.title,
    'twitter:description': config.description,
    'twitter:image': config.ogImage || '/og-image.png',
    'description': config.description,
    'keywords': config.tags?.join(', ') || '',
    'author': config.author || 'Şanlıurfa.com',
    'robots': config.robots || 'index, follow',
    'language': config.lang === 'tr' ? 'Turkish' : 'English',
    'revisit-after': '7 days',
    'viewport': 'width=device-width, initial-scale=1.0'
  };
}

/**
 * Generate JSON-LD structured data for Organization
 */
export function generateOrganizationSchema(baseUrl: string): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Şanlıurfa.com',
    'description': 'Şanlıurfa\'nın En Kapsamlı Rehberi',
    'url': baseUrl,
    'logo': `${baseUrl}/logo.png`,
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'Customer Service',
      'telephone': '+90-414-XXXXXXX',
      'email': 'info@sanliurfa.com'
    },
    'sameAs': [
      'https://www.facebook.com/sanliurfa',
      'https://www.twitter.com/sanliurfa',
      'https://www.instagram.com/sanliurfa',
      'https://www.youtube.com/sanliurfa'
    ],
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'TR',
      'addressRegion': 'Şanlıurfa',
      'postalCode': '63xxx'
    }
  };
}

/**
 * Generate JSON-LD for Place/LocalBusiness
 */
export function generateLocalBusinessSchema(place: {
  name: string;
  description: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  image?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': place.name,
    'description': place.description,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': place.address,
      'addressCountry': 'TR',
      'addressRegion': 'Şanlıurfa'
    },
    ...(place.phone && { 'telephone': place.phone }),
    ...(place.website && { 'url': place.website }),
    ...(place.image && { 'image': place.image }),
    ...(place.latitude && place.longitude && {
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': place.latitude,
        'longitude': place.longitude
      }
    }),
    ...(place.rating && place.reviewCount && {
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': place.rating,
        'reviewCount': place.reviewCount
      }
    })
  };
}

/**
 * Generate JSON-LD for Article/BlogPost
 */
export function generateArticleSchema(article: {
  headline: string;
  description: string;
  image?: string;
  author: string;
  publishedTime: Date;
  modifiedTime?: Date;
  url: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': article.headline,
    'description': article.description,
    'image': article.image || '/og-image.png',
    'author': {
      '@type': 'Person',
      'name': article.author
    },
    'datePublished': article.publishedTime.toISOString(),
    'dateModified': article.modifiedTime?.toISOString() || article.publishedTime.toISOString(),
    'url': article.url,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': article.url
    }
  };
}

/**
 * Generate JSON-LD for BreadcrumbList (navigation)
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, idx) => ({
      '@type': 'ListItem',
      'position': idx + 1,
      'name': item.name,
      'item': item.url
    }))
  };
}

/**
 * Generate JSON-LD for FAQPage
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}

/**
 * Generate sitemap URLs for SEO
 */
export function generateSitemapUrl(
  loc: string,
  lastmod?: Date,
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
  priority?: number
): string {
  const url = new URL(loc);
  const parts = [
    `  <url>`,
    `    <loc>${escapeXml(url.href)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>`] : []),
    ...(changefreq ? [`    <changefreq>${changefreq}</changefreq>`] : []),
    ...(priority !== undefined ? [`    <priority>${priority}</priority>`] : []),
    `  </url>`
  ];

  return parts.join('\n');
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate sitemap XML
 */
export function generateSitemap(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/**
 * Generate robots.txt
 */
export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*.json$
Disallow: /search?

User-agent: Googlebot
Allow: /

Sitemap: https://sanliurfa.com/sitemap.xml

# Crawl-delay to be respectful to server
Crawl-delay: 1`;
}

/**
 * Social media meta tags
 */
export const socialMediaMeta = {
  facebook: (url: string, title: string, description: string, image: string) => ({
    'og:url': url,
    'og:type': 'website',
    'og:title': title,
    'og:description': description,
    'og:image': image
  }),

  twitter: (handle: string, title: string, description: string, image: string) => ({
    'twitter:card': 'summary_large_image',
    'twitter:site': handle,
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image
  }),

  linkedin: (url: string) => ({
    'linkedin:url': url
  })
};

/**
 * Keywords for Şanlıurfa
 */
export const keywordSuggestions = {
  places: [
    'Şanlıurfa gezilecek yerler',
    'Göbekli Tepe',
    'Şanlı Urfa rehberi',
    'Urfada yapılacak şeyler',
    'Diyarbakır Kalesi',
    'Balıklı Göl'
  ],
  tourism: [
    'Şanlıurfa turizm',
    'Urfa otelleri',
    'Urfa rehberi',
    'Urfa turları',
    'antik şehirler Urfa',
    'dinî turlar Urfa'
  ],
  dining: [
    'Şanlıurfa kebab',
    'Urfa yemek',
    'Şanlıurfa restoranları',
    'Urfa lezzetleri',
    'Urfa çöp şişi',
    'Urfa humus'
  ],
  local: [
    'Şanlıurfa haber',
    'Urfa etkinlik',
    'Urfa harita',
    'Urfa kültür',
    'Urfa sanat',
    'Urfa müzeler'
  ]
};

/**
 * Check page SEO score (0-100)
 */
export function calculateSEOScore(config: SEOConfig): number {
  let score = 0;

  // Title (15 points)
  if (config.title && config.title.length > 0) {
    score += 10;
    if (config.title.length >= 30 && config.title.length <= 60) {
      score += 5;
    }
  }

  // Description (15 points)
  if (config.description && config.description.length > 0) {
    score += 10;
    if (config.description.length >= 120 && config.description.length <= 160) {
      score += 5;
    }
  }

  // Canonical (10 points)
  if (config.canonical) {
    score += 10;
  }

  // OG Image (10 points)
  if (config.ogImage) {
    score += 10;
  }

  // Author (10 points)
  if (config.author) {
    score += 10;
  }

  // Tags/Keywords (20 points)
  if (config.tags && config.tags.length > 0) {
    score += 10;
    if (config.tags.length >= 5) {
      score += 10;
    }
  }

  // Dates (10 points)
  if (config.publishedTime || config.modifiedTime) {
    score += 10;
  }

  return Math.min(score, 100);
}
