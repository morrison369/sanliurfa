/**
 * Schema.org Structured Data
 * JSON-LD for rich snippets, SEO enhancement
 */

import { queryOne } from './postgres';
import { logger } from './logging';
import {
  buildBreadcrumbSchema,
  buildOrganizationSchema,
  buildPlaceRichSnippet,
} from './rich-snippets';

const BASE_URL = process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';

export interface SchemaData {
  '@context': string;
  '@type': string | string[];
  [key: string]: any;
}

// Organization schema
export function getOrganizationSchema(): SchemaData {
  return { '@context': 'https://schema.org', ...buildOrganizationSchema() } as SchemaData;
}

// Place schema
export async function getPlaceSchema(placeId: string): Promise<SchemaData | null> {
  try {
    const place = await queryOne(
      `SELECT id, slug, name, description, short_description, latitude, longitude, address, category,
              images, image_url, rating, rating_count, review_count, price_range, phone, website, opening_hours
       FROM places WHERE id = $1`,
      [placeId]
    );

    if (!place) return null;

    return {
      '@context': 'https://schema.org',
      ...buildPlaceRichSnippet(place, { path: `/places/${place.slug || place.id}` }),
    } as SchemaData;
  } catch (error) {
    logger.error(
      'Failed to generate place schema',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

// Event schema
export async function getEventSchema(eventId: string): Promise<SchemaData | null> {
  try {
    const event = await queryOne(
      `SELECT * FROM events WHERE id = $1`,
      [eventId]
    );

    if (!event) return null;
    const title = event.title || event.name || 'Şanlıurfa etkinliği';
    const startDateValue = event.start_date || event.date || event.created_at || new Date();
    const eventPath = event.slug ? `/etkinlikler/${event.slug}` : `/etkinlikler/${event.id}`;

    const schema: SchemaData = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: title,
      description: event.description,
      startDate: new Date(startDateValue).toISOString(),
      image: event.image_url || `${BASE_URL}/images/og-default.jpg`,
      url: `${BASE_URL}${eventPath}`,
      location: {
        '@type': 'Place',
        name: event.location || 'Şanlıurfa'
      }
    };

    if (event.price) {
      schema.offers = {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: 'TRY'
      };
    }

    return schema;
  } catch (error) {
    logger.error(
      'Failed to generate event schema',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

// Blog post schema
export async function getArticleSchema(postId: string): Promise<SchemaData | null> {
  try {
    const post = await queryOne(
      `SELECT * FROM blog_posts WHERE id = $1 AND status = 'published'`,
      [postId]
    );

    if (!post) return null;

    const author = await queryOne(
      `SELECT full_name FROM users WHERE id = $1`,
      [post.author_id]
    );

    const schema: SchemaData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: (post.excerpt || post.content || '').substring(0, 160),
      image: post.image_url || post.cover_image || post.featured_image || `${BASE_URL}/images/og-default.jpg`,
      datePublished: new Date(post.created_at).toISOString(),
      dateModified: new Date(post.updated_at).toISOString(),
      url: `${BASE_URL}/blog/${post.slug || post.id}`,
      author: {
        '@type': 'Person',
        name: author?.full_name || 'Şanlıurfa Rehberi'
      }
    };

    return schema;
  } catch (error) {
    logger.error(
      'Failed to generate article schema',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

// Breadcrumb schema
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>): SchemaData {
  return {
    '@context': 'https://schema.org',
    ...buildBreadcrumbSchema(items)
  } as SchemaData;
}

// FAQPage schema
export function getFaqSchema(faqs: Array<{ question: string; answer: string }>): SchemaData {
  const mainEntity = faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity
  };
}

export function schemaToJson(schema: SchemaData): string {
  return JSON.stringify(schema, null, 2);
}
