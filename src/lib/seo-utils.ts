/**
 * SEO utilities and helpers
 */

import type { Breadcrumb, FAQ, Review } from '../types/seo';
import { getPublicAppUrl } from './public-app-url';

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string, baseUrl = getPublicAppUrl()): string {
  // Remove trailing slash except for root
  const cleanPath = path === '/' ? '' : path.replace(/\/$/, '');
  return `${baseUrl}${cleanPath}`;
}

/**
 * Generate meta description with proper truncation
 */
export function generateMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  
  // Find last space before maxLength
  const lastSpace = description.lastIndexOf(' ', maxLength - 3);
  if (lastSpace > 0) {
    return description.substring(0, lastSpace) + '...';
  }
  
  return description.substring(0, maxLength - 3) + '...';
}

/**
 * Generate Open Graph image URL
 */
export function getOgImageUrl(options: {
  title: string;
  description?: string;
  image?: string;
}): string {
  // Use custom image if provided
  if (options.image) return options.image;
  
  // Generate OG image with title
  const title = encodeURIComponent(options.title);
  return `${getPublicAppUrl()}/og-image.png?title=${title}`;
}

/**
 * Generate JSON-LD breadcrumb structured data
 */
export function generateBreadcrumbSchema(breadcrumbs: Breadcrumb[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/**
 * Generate JSON-LD FAQ structured data
 */
export function generateFAQSchema(faqs: FAQ[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD review structured data
 */
export function generateReviewSchema(review: Review & { itemName: string }): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Thing',
      name: review.itemName,
    },
    author: {
      '@type': 'Person',
      name: review.author,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
    },
    reviewBody: review.body,
    datePublished: review.datePublished,
  };
}

/**
 * Generate JSON-LD local business structured data
 */
export function generateLocalBusinessSchema(): Record<string, any> {
  const appUrl = getPublicAppUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'Sanliurfa.com',
    description: 'Şanlıurfa gezi rehberi - Balıklıgöl, Göbeklitepe ve daha fazlası',
    url: appUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${appUrl}/logo.png`,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Şanlıurfa',
      addressRegion: 'Şanlıurfa',
      addressCountry: 'TR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.1591,
      longitude: 38.7969,
    },
  };
}

/**
 * Generate JSON-LD tourist attraction schema
 */
export function generateTouristAttractionSchema(data: {
  name: string;
  description: string;
  image: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}): Record<string, any> {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: data.name,
    description: data.description,
    image: data.image,
  };

  if (data.address) {
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: data.address,
    };
  }

  if (data.latitude && data.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  return schema;
}

/**
 * Generate structured data script tag content
 */
export function generateStructuredDataScript(schema: Record<string, any>): string {
  return JSON.stringify(schema, null, 2);
}

/**
 * Validate URL slug
 */
export function validateSlug(slug: string): boolean {
  // Allow alphanumeric, hyphens, and underscores
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length <= 100;
}

/**
 * Turkish character map for slug generation
 */
const turkishMap: Record<string, string> = {
  'ç': 'c', 'Ç': 'c',
  'ğ': 'g', 'Ğ': 'g',
  'ı': 'i', 'İ': 'i',
  'ö': 'o', 'Ö': 'o',
  'ş': 's', 'Ş': 's',
  'ü': 'u', 'Ü': 'u',
};

/**
 * Normalize Turkish characters
 */
function normalizeTurkish(str: string): string {
  return str.replace(/[çÇğĞıİöÖşŞüÜ]/g, char => turkishMap[char] || char);
}

/**
 * Generate URL slug from title
 */
export function generateSlug(title: string): string {
  return normalizeTurkish(title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove special chars except spaces and hyphens
    .replace(/[\s]+/g, '-')     // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '')     // Remove leading/trailing hyphens
    .substring(0, 100);          // Limit length
}

/**
 * Parse SEO meta from content
 */
export function parseSEOMeta(content: string): {
  title?: string;
  description?: string;
  keywords?: string[];
} {
  const meta: { title?: string; description?: string; keywords?: string[] } = {};

  // Extract title from first h1
  const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    meta.title = titleMatch[1].trim();
  }

  // Extract first paragraph as description
  const descMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
  if (descMatch) {
    meta.description = descMatch[1].trim();
  }

  return meta;
}

/**
 * Check if image needs alt text
 */
export function needsAltText(imageUrl: string): boolean {
  // Decorative images that don't need alt text
  const decorativePatterns = [
    /spacer/i,
    /decoration/i,
    /divider/i,
    /background/i,
    /pattern/i,
  ];

  return !decorativePatterns.some((pattern) => pattern.test(imageUrl));
}

/**
 * Generate image alt text
 */
export function generateImageAlt(filename: string, context?: string): string {
  // Remove extension and convert to readable text
  const name = filename
    .replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  if (context) {
    return `${name} - ${context}`;
  }

  return name;
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Extract headings for table of contents
 */
export function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = [];
  const regex = /<h([2-4])[^>]*>([^<]+)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[\s\W]+/g, '-');
    
    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Generate hreflang tags for multilingual content
 */
export function generateHreflang(
  _path: string,
  languages: Array<{ code: string; url: string }>,
  defaultLang = 'tr'
): Array<{ rel: string; hreflang: string; href: string }> {
  const tags: Array<{ rel: string; hreflang: string; href: string }> = [];

  for (const lang of languages) {
    tags.push({
      rel: 'alternate',
      hreflang: lang.code,
      href: lang.url,
    });
  }

  // Add x-default
  const defaultUrl = languages.find((l) => l.code === defaultLang)?.url || languages[0]?.url;
  if (defaultUrl) {
    tags.push({
      rel: 'alternate',
      hreflang: 'x-default',
      href: defaultUrl,
    });
  }

  return tags;
}

/**
 * Format price for schema.org
 */
export function formatPrice(price: number, currency = 'TRY'): string {
  return `${price.toFixed(2)} ${currency}`;
}

/**
 * Check if content has enough words for SEO
 */
export function hasEnoughWords(content: string, minWords = 300): boolean {
  const wordCount = content.trim().split(/\s+/).length;
  return wordCount >= minWords;
}

/**
 * Get SEO score for content
 */
export function getSEOScore(content: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Word count check
  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount < 300) {
    score -= 20;
    issues.push(`İçerik çok kısa (${wordCount} kelime). En az 300 kelime önerilir.`);
  }

  // Heading structure check
  const hasH1 = /<h1[^>]*>/i.test(content);
  const hasH2 = /<h2[^>]*>/i.test(content);
  
  if (!hasH1) {
    score -= 15;
    issues.push('H1 başlığı bulunmuyor.');
  }
  
  if (!hasH2) {
    score -= 10;
    suggestions.push('H2 alt başlıkları ekleyerek içeriği bölümlere ayırabilirsiniz.');
  }

  // Image alt check
  const images = content.match(/<img[^>]*>/gi) || [];
  const imagesWithoutAlt = images.filter((img) => !/alt=/i.test(img));
  
  if (imagesWithoutAlt.length > 0) {
    score -= 5 * Math.min(imagesWithoutAlt.length, 3);
    issues.push(`${imagesWithoutAlt.length} resim alt etiketi eksik.`);
  }

  // Internal links check
  const internalLinks = (content.match(/<a[^>]*href="\/[^"]*"/gi) || []).length;
  if (internalLinks < 2) {
    score -= 10;
    suggestions.push('Dahili bağlantılar ekleyerek site içi gezinmeyi iyileştirin.');
  }

  // External links check
  const externalLinks = (content.match(/<a[^>]*href="https?:\/\//gi) || []).length;
  if (externalLinks === 0) {
    suggestions.push('Güvenilir kaynaklara dış bağlantılar ekleyebilirsiniz.');
  }

  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}
