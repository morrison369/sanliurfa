/**
 * Landing page schema/SEO helpers.
 *
 * Best-of (en-iyi-*) ve şehir rehberi (sanliurfa-*) landing sayfaları için ortak
 * JSON-LD builder'lar. Sayfa-bazlı tekrar eden ~50 satır schema bloğunu tek yerden
 * üretir; @type dispatch + image + aggregateRating + breadcrumb + FAQ tek pattern.
 *
 * Kullanım:
 *   import { buildItemListSchema, buildBreadcrumbSchema, buildFAQSchema, resolveSchemaType } from '@/lib/landing/landing-schema';
 *   const itemListJson = buildItemListSchema({ places, pageName, pagePath, baseUrl, type: 'Restaurant' });
 *   <script type="application/ld+json" set:html={JSON.stringify(itemListJson)} is:inline />
 */

import { resolvePlaceImage } from '../public-image-resolvers';

export type LandingItemType =
  | 'Restaurant'
  | 'LodgingBusiness'
  | 'TouristAttraction'
  | 'LocalBusiness'
  | 'EntertainmentBusiness'
  | 'CafeOrCoffeeShop';

export interface LandingPlace {
  slug: string;
  name: string;
  address?: string | null;
  rating?: number | string | null;
  review_count?: number | string | null;
  short_description?: string | null;
  category_name?: string | null;
  image_url?: string | null;
  images?: string[] | null;
}

export interface BreadcrumbCrumb {
  name: string;
  href: string;
}

export interface FaqItem {
  q?: string;
  a?: string;
  S?: string; // legacy schema (en-iyi-kebapcilar.astro)
  C?: string;
}

/**
 * Category slug/name → Schema.org @type dispatch.
 * Restaurant/Cafe/Hotel/Attraction ayrımı SEO için kritik.
 */
export function resolveSchemaType(category?: string | null): LandingItemType {
  if (!category) return 'LocalBusiness';
  const c = category.toLowerCase();
  if (c.includes('otel') || c.includes('pansiyon') || c.includes('apart') || c.includes('konaklama')) return 'LodgingBusiness';
  if (c.includes('cafe') || c.includes('kahve') || c.includes('kahvehane')) return 'CafeOrCoffeeShop';
  if (c.includes('sıra geces') || c.includes('eğlence') || c.includes('sahne') || c.includes('müzik')) return 'EntertainmentBusiness';
  if (
    c.includes('tarihi') || c.includes('müze') || c.includes('park') ||
    c.includes('gezilecek') || c.includes('turistik') || c.includes('dini')
  ) return 'TouristAttraction';
  if (c.includes('kebap') || c.includes('ciğer') || c.includes('lahmacun') || c.includes('restoran') || c.includes('yeme') || c.includes('kahvaltı') || c.includes('tatlı')) return 'Restaurant';
  return 'LocalBusiness';
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickImage(place: LandingPlace): string | undefined {
  if (place.image_url) return place.image_url;
  if (Array.isArray(place.images) && place.images.length > 0) return place.images[0];
  return undefined;
}

/**
 * ItemList JSON-LD — best-of liste sayfaları için sıralı mekan listesi.
 * @type dispatch: caller `type` override eder ya da place.category_name'den otomatik resolve eder.
 */
export function buildItemListSchema(opts: {
  places: LandingPlace[];
  pageName: string;
  pagePath: string;       // örn. '/en-iyi-kebapcilar'
  baseUrl: string;
  type?: LandingItemType; // global override; aksi halde her item kendi kategorisinden resolve eder
  description?: string;
  limit?: number;
}) {
  const { places, pageName, pagePath, baseUrl, type, description, limit = 10 } = opts;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageName,
    description: description ?? pageName,
    url: `${baseUrl}${pagePath}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, limit).map((p, i) => {
      const itemType = type ?? resolveSchemaType(p.category_name);
      const ratingValue = toNumber(p.rating);
      const reviewCount = toNumber(p.review_count);
      const image = pickImage(p);
      const item: Record<string, unknown> = {
        '@type': itemType,
        name: p.name,
        url: `${baseUrl}/isletme/${p.slug}`,
        address: { '@type': 'PostalAddress', addressLocality: 'Şanlıurfa', addressCountry: 'TR' },
      };
      if (p.short_description) item.description = p.short_description;
      if (image) {
        try {
          const resolved = resolvePlaceImage({ slug: p.slug, image_url: image });
          item.image = resolved.startsWith('http') ? resolved : `${baseUrl}${resolved}`;
        } catch { item.image = image; }
      }
      if (ratingValue !== undefined) {
        item.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue,
          reviewCount: reviewCount ?? 1,
          bestRating: 5,
          worstRating: 1,
        };
      }
      return { '@type': 'ListItem', position: i + 1, item };
    }),
  };
}

/**
 * BreadcrumbList JSON-LD — kanonik navigasyon zinciri.
 */
export function buildBreadcrumbSchema(opts: { crumbs: BreadcrumbCrumb[]; baseUrl: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: opts.crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.href.startsWith('http') ? c.href : `${opts.baseUrl}${c.href}`,
    })),
  };
}

/**
 * FAQPage JSON-LD — SSS bölümü için.
 * Hem `{ q, a }` hem legacy `{ S, C }` formatını destekler.
 */
export function buildFAQSchema(faqItems: FaqItem[]) {
  if (faqItems.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q ?? item.S ?? '',
      acceptedAnswer: { '@type': 'Answer', text: item.a ?? item.C ?? '' },
    })),
  };
}
