/**
 * SEO Utilities
 * Helper functions for SEO optimization
 */

import { slugify } from '../utils';

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string, siteUrl = 'https://sanliurfa.com'): string {
  // Remove trailing slash except for root
  const cleanPath = path === '/' ? '/' : path.replace(/\/$/, '');
  return `${siteUrl}${cleanPath}`;
}

/**
 * Generate meta description with optimal length
 * Google typically shows 150-160 characters
 */
export function optimizeDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  
  // Try to end at a complete sentence
  const truncated = description.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxLength * 0.8) {
    return truncated.slice(0, lastPeriod + 1);
  }
  
  return truncated.slice(0, lastSpace) + '...';
}

/**
 * Generate Open Graph image URL
 */
export function getOgImageUrl(type: string, data?: { title?: string; image?: string }): string {
  // Use provided image or generate dynamic OG image
  if (data?.image) return data.image;
  
  // Dynamic OG image generation (would use a service like Vercel OG)
  const params = new URLSearchParams();
  if (data?.title) params.set('title', data.title);
  params.set('type', type);
  
  return `https://sanliurfa.com/api/og?${params.toString()}`;
}

/**
 * Generate breadcrumb items from URL path
 */
export function generateBreadcrumbs(path: string): Array<{ name: string; url: string }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: Array<{ name: string; url: string }> = [
    { name: 'Anasayfa', url: '/' },
  ];
  
  let currentPath = '';
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      name: formatBreadcrumbName(segment),
      url: currentPath,
    });
  });
  
  return breadcrumbs;
}

/**
 * Format segment name for breadcrumb
 */
function formatBreadcrumbName(segment: string): string {
  // Decode URL segment
  const decoded = decodeURIComponent(segment);
  
  // Replace hyphens with spaces and capitalize
  return decoded
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Generate internal links for content auto-linking
 * Automatically link place names in content
 */
export async function autoLinkContent(
  content: string,
  places: Array<{ name: string; slug: string }>
): Promise<string> {
  let linkedContent = content;
  
  // Sort by length (longest first) to avoid partial matches
  const sortedPlaces = [...places].sort((a, b) => b.name.length - a.name.length);
  
  for (const place of sortedPlaces) {
    // Create regex that matches whole word/phrase
    const regex = new RegExp(
      `\\b${escapeRegex(place.name)}\\b`,
      'gi'
    );
    
    // Only link first occurrence to avoid over-linking
    let count = 0;
    linkedContent = linkedContent.replace(regex, (match) => {
      count++;
      if (count > 1) return match; // Only first occurrence
      return `<a href="/yerler/${place.slug}" class="internal-link">${match}</a>`;
    });
  }
  
  return linkedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate FAQ schema from content
 */
export function generateFAQ(questions: Array<{ q: string; a: string }>): {
  questions: Array<{ question: string; answer: string }>;
} {
  return {
    questions: questions.map(({ q, a }) => ({
      question: q,
      answer: a,
    })),
  };
}

/**
 * Generate related links for a page
 */
export function generateRelatedLinks(
  currentSlug: string,
  items: Array<{ slug: string; name: string; category?: string }>,
  limit = 5
): Array<{ slug: string; name: string }> {
  // Filter out current item and shuffle
  const related = items
    .filter((item) => item.slug !== currentSlug)
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
  
  return related.map((item) => ({
    slug: item.slug,
    name: item.name,
  }));
}

/**
 * Generate pagination URLs
 */
export function generatePaginationUrls(
  baseUrl: string,
  currentPage: number,
  totalPages: number
): {
  prev: string | null;
  next: string | null;
  canonical: string;
} {
  const prev = currentPage > 1 
    ? `${baseUrl}?page=${currentPage - 1}` 
    : null;
  
  const next = currentPage < totalPages 
    ? `${baseUrl}?page=${currentPage + 1}` 
    : null;
  
  const canonical = currentPage === 1 
    ? baseUrl 
    : `${baseUrl}?page=${currentPage}`;
  
  return { prev, next, canonical };
}

/**
 * Check if URL is indexable
 */
export function isIndexable(path: string): boolean {
  // Non-indexable paths
  const nonIndexablePatterns = [
    /^\/admin/,
    /^\/profil/,
    /^\/api/,
    /^\/giris/,
    /^\/kayit/,
    /\?.*page=\d+/, // Pagination pages (optional)
  ];
  
  return !nonIndexablePatterns.some((pattern) => pattern.test(path));
}

/**
 * Generate alternate language URLs (for future multi-language support)
 * Currently disabled as site is Turkish-only
 */
export function generateAlternateUrls(
  path: string,
  _languages: string[] = ['tr']
): Array<{ lang: string; url: string }> {
  // Return only Turkish (single language policy)
  return [{ lang: 'tr', url: `https://sanliurfa.com${path}` }];
}

/**
 * Calculate reading time for content
 */
export function calculateReadingTime(content: string): number {
  // Average reading speed: 200 words per minute for Turkish
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Generate meta robots tag value
 */
export function getMetaRobots(
  path: string,
  options: {
    noindex?: boolean;
    nofollow?: boolean;
    noarchive?: boolean;
  } = {}
): string {
  if (options.noindex || !isIndexable(path)) {
    return 'noindex, nofollow';
  }
  
  const directives = ['index', 'follow', 'max-image-preview:large'];
  
  if (options.noarchive) {
    directives.push('noarchive');
  }
  
  return directives.join(', ');
}

