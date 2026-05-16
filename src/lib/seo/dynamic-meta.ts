/**
 * Dynamic SEO Meta Tags Generator
 * For Astro pages
 */

export interface SEOMeta {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'place';
  canonical?: string;
  noindex?: boolean;
  structuredData?: Record<string, any>;
}

import { getPublicAppUrl } from '../public-app-url';
import { PUBLISHER_PROFILE } from '../transparency';

const BASE_URL = getPublicAppUrl();
const DEFAULT_IMAGE = `${BASE_URL}/images/og-default.jpg`;
const DEFAULT_DESCRIPTION = 'Şanlıurfa\'nın tarihi yerleri, mekanları ve kültürel zenginlikleri hakkında kapsamlı rehber. Göbeklitepe, Balıklıgöl ve daha fazlası.';

/**
 * Generate meta tags object for Astro
 */
export function generateMetaTags(meta: Partial<SEOMeta> = {}): SEOMeta {
  return {
    title: meta.title ? `${meta.title} | Sanliurfa.com` : 'Sanliurfa.com - Şehrin Rehberi',
    description: meta.description || DEFAULT_DESCRIPTION,
    keywords: meta.keywords || ['şanlıurfa', 'göbeklitepe', 'balıklıgöl', 'urfa', 'tarihi yerler'],
    ogImage: meta.ogImage || DEFAULT_IMAGE,
    ogType: meta.ogType || 'website',
    ...(meta.canonical ? { canonical: meta.canonical } : {}),
    ...(meta.noindex !== undefined ? { noindex: meta.noindex } : {}),
    ...(meta.structuredData ? { structuredData: meta.structuredData } : {}),
  };
}

/**
 * Generate place meta tags
 */
export function generatePlaceMeta(
  place: {
    name: string;
    description?: string;
    category: string;
    image?: string;
    slug: string;
    rating?: number;
  }
): SEOMeta {
  return generateMetaTags({
    title: place.name,
    description: place.description || `${place.name} - Şanlıurfa ${place.category} hakkında bilgi, yorumlar ve fotoğraflar.`,
    keywords: [place.name, 'şanlıurfa', place.category, 'mekan', 'gezi'],
    ...(place.image ? { ogImage: place.image } : {}),
    ogType: 'place',
    canonical: `${BASE_URL}/mekan/${place.slug}`,
    structuredData: generatePlaceStructuredData(place),
  });
}

/**
 * Generate blog post meta tags
 */
export function generateBlogMeta(
  post: {
    title: string;
    excerpt?: string;
    slug: string;
    coverImage?: string;
    publishedAt?: Date;
    author?: string;
  }
): SEOMeta {
  return generateMetaTags({
    title: post.title,
    description: post.excerpt || `${post.title} - Şanlıurfa hakkında detaylı blog yazısı.`,
    keywords: ['şanlıurfa', 'blog', 'gezi', 'tarih', 'kültür'],
    ...(post.coverImage ? { ogImage: post.coverImage } : {}),
    ogType: 'article',
    canonical: `${BASE_URL}/blog/${post.slug}`,
    structuredData: generateArticleStructuredData(post),
  });
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate place structured data
 */
function generatePlaceStructuredData(
  place: {
    name: string;
    description?: string;
    category: string;
    image?: string;
    slug: string;
    rating?: number;
  }
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: place.name,
    ...(place.description ? { description: place.description } : {}),
    ...(place.image ? { image: place.image } : {}),
    url: `${BASE_URL}/mekan/${place.slug}`,
    ...(place.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: place.rating,
            bestRating: 5,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Şanlıurfa',
      addressCountry: 'TR',
    },
  };
}

/**
 * Generate article structured data
 */
function generateArticleStructuredData(
  post: {
    title: string;
    excerpt?: string;
    slug: string;
    coverImage?: string;
    publishedAt?: Date;
    author?: string;
  }
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.coverImage ? { image: post.coverImage } : {}),
    url: `${BASE_URL}/blog/${post.slug}`,
    ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author,
        }
      : {
          '@type': 'Organization',
          name: 'Sanliurfa.com',
        },
    publisher: {
      '@type': 'Organization',
      name: 'Sanliurfa.com',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`,
      },
    },
  };
}

/**
 * Generate organization structured data
 */
export function generateOrganizationStructuredData(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PUBLISHER_PROFILE.siteName,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    email: PUBLISHER_PROFILE.generalEmail,
    foundingDate: PUBLISHER_PROFILE.foundedYear,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: PUBLISHER_PROFILE.generalEmail,
      },
      {
        '@type': 'ContactPoint',
        contactType: 'business inquiry',
        email: PUBLISHER_PROFILE.businessEmail,
      },
    ],
  };
}

/**
 * Generate FAQ structured data
 */
export function generateFAQStructuredData(
  faqs: Array<{ question: string; answer: string }>
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
