const SITE_URL = 'https://sanliurfa.com';
const DEFAULT_IMAGE = '/images/og-default.jpg';

export type JsonLdNode = Record<string, any>;

type BreadcrumbItem = {
  name: string;
  url: string;
};

type ReviewLike = {
  rating?: number | string | null;
  title?: string | null;
  content?: string | null;
  full_name?: string | null;
  created_at?: string | Date | null;
};

type PlaceLike = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  short_description?: string | null;
  category?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: Record<string, string> | string | null;
  images?: string[] | string | null;
  image_url?: string | null;
  rating?: number | string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  rating_count?: number | string | null;
  price_range?: number | string | null;
};

const categorySchemaTypes: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'CafeOrCoffeeShop',
  hotel: 'Hotel',
  museum: 'Museum',
  park: 'Park',
  shopping: 'Store',
  entertainment: 'EntertainmentBusiness',
};

const dayMap: Record<string, string> = {
  monday: 'Mo',
  tuesday: 'Tu',
  wednesday: 'We',
  thursday: 'Th',
  friday: 'Fr',
  saturday: 'Sa',
  sunday: 'Su',
};

export function absoluteUrl(value?: string | null, fallback = DEFAULT_IMAGE): string {
  const path = value && value.trim() ? value.trim() : fallback;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function compactJsonLd<T extends JsonLdNode | JsonLdNode[]>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => compactJsonLd(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
      .map(([key, entry]) => {
        if (Array.isArray(entry)) {
          return [key, entry.filter((item) => item !== undefined && item !== null && item !== '')];
        }

        if (typeof entry === 'object') {
          return [key, compactJsonLd(entry as JsonLdNode)];
        }

        return [key, entry];
      })
      .filter(([, entry]) => !(Array.isArray(entry) && entry.length === 0))
  ) as T;
}

export function toJsonLdGraph(nodes: JsonLdNode | JsonLdNode[]): JsonLdNode {
  const graph = (Array.isArray(nodes) ? nodes : [nodes]).map(({ '@context': _context, ...node }) =>
    compactJsonLd(node)
  );

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildOrganizationSchema(): JsonLdNode {
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': `${SITE_URL}/#organization`,
    name: 'Şanlıurfa.com',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/logo.png'),
    },
    image: absoluteUrl('/images/og-default.jpg'),
    description: 'Şanlıurfa odaklı şehir rehberi, mekan keşfi ve yerel topluluk platformu.',
    areaServed: {
      '@type': 'City',
      name: 'Şanlıurfa',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Şanlıurfa',
      addressRegion: 'Şanlıurfa',
      addressCountry: 'TR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'info@sanliurfa.com',
      availableLanguage: ['tr'],
    },
  };
}

export function buildWebSiteSchema(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Şanlıurfa.com',
    url: SITE_URL,
    inLanguage: 'tr-TR',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/places?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}${items.at(-1)?.url || '/'}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url, '/'),
    })),
  };
}

export function buildPlaceRichSnippet(
  place: PlaceLike,
  options: { path?: string; reviews?: ReviewLike[] } = {}
): JsonLdNode {
  const path = options.path || `/places/${place.slug || place.id || ''}`;
  const url = absoluteUrl(path, '/places');
  const images = normalizeImages(place.images, place.image_url);
  const rating = normalizeRating(place.rating ?? place.average_rating);
  const reviewCount = normalizeCount(place.review_count ?? place.rating_count);

  return compactJsonLd({
    '@type': getPlaceSchemaType(place.category),
    '@id': `${url}#place`,
    name: place.name,
    url,
    mainEntityOfPage: url,
    description: normalizeDescription(place.short_description || place.description),
    image: images,
    priceRange: getPriceRange(place.price_range),
    telephone: place.phone || undefined,
    sameAs: place.website && /^https?:\/\//i.test(place.website) ? [place.website] : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: place.address || 'Şanlıurfa',
      addressLocality: 'Şanlıurfa',
      addressRegion: 'Şanlıurfa',
      addressCountry: 'TR',
    },
    geo: buildGeo(place.latitude, place.longitude),
    openingHours: normalizeOpeningHours(place.opening_hours),
    aggregateRating:
      rating && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: rating,
            bestRating: 5,
            worstRating: 1,
            reviewCount,
            ratingCount: reviewCount,
          }
        : undefined,
    review: normalizeReviews(options.reviews),
  });
}

export function buildPlaceItemListSchema(places: PlaceLike[], pageUrl: string): JsonLdNode {
  return compactJsonLd({
    '@type': 'ItemList',
    '@id': `${absoluteUrl(pageUrl, '/places')}#itemlist`,
    name: 'Şanlıurfa mekanları',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: places.length,
    itemListElement: places.map((place, index) => {
      const path = `/places/${place.slug || place.id || ''}`;
      const url = absoluteUrl(path, '/places');
      const item = buildPlaceRichSnippet(place, { path });
      return {
        '@type': 'ListItem',
        position: index + 1,
        url,
        item: {
          '@type': item['@type'],
          '@id': item['@id'],
          name: item.name,
          url: item.url,
          image: item.image,
          priceRange: item.priceRange,
          aggregateRating: item.aggregateRating,
        },
      };
    }),
  });
}

function getPlaceSchemaType(category?: string | null): string {
  return categorySchemaTypes[String(category || '').toLowerCase()] || 'LocalBusiness';
}

function normalizeDescription(value?: string | null): string {
  const text = String(value || 'Şanlıurfa mekan rehberi kaydı.')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 300 ? `${text.slice(0, 297)}...` : text;
}

function normalizeImages(images?: string[] | string | null, fallback?: string | null): string[] {
  const values = Array.isArray(images)
    ? images
    : typeof images === 'string' && images.trim().startsWith('{')
      ? images.replace(/[{}"]/g, '').split(',')
      : typeof images === 'string'
        ? [images]
        : [];

  const normalized = values
    .map((item) => absoluteUrl(item, fallback || DEFAULT_IMAGE))
    .filter((item, index, source) => source.indexOf(item) === index);

  return normalized.length ? normalized : [absoluteUrl(fallback, DEFAULT_IMAGE)];
}

function normalizeRating(value?: number | string | null): number | undefined {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating <= 0) return undefined;
  return Math.min(5, Math.max(1, Number(rating.toFixed(1))));
}

function normalizeCount(value?: number | string | null): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

function getPriceRange(value?: number | string | null): string {
  const level = Math.min(4, Math.max(1, Number(value) || 2));
  return '₺'.repeat(level);
}

function buildGeo(latitude?: number | string | null, longitude?: number | string | null): JsonLdNode | undefined {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return {
    '@type': 'GeoCoordinates',
    latitude: lat,
    longitude: lng,
  };
}

function normalizeOpeningHours(value?: Record<string, string> | string | null): string[] | undefined {
  if (!value || typeof value === 'string') return undefined;

  const hours = Object.entries(value)
    .map(([day, range]) => {
      const schemaDay = dayMap[day.toLowerCase()];
      const normalizedRange = String(range).replace(/\s/g, '');
      if (!schemaDay || !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(normalizedRange)) return undefined;
      return `${schemaDay} ${normalizedRange}`;
    })
    .filter(Boolean) as string[];

  return hours.length ? hours : undefined;
}

function normalizeReviews(reviews?: ReviewLike[]): JsonLdNode[] | undefined {
  if (!reviews?.length) return undefined;

  const normalized = reviews
    .slice(0, 5)
    .map((review) => {
      const rating = normalizeRating(review.rating);
      const text = normalizeDescription(review.content);
      if (!rating || !text) return undefined;

      return compactJsonLd({
        '@type': 'Review',
        name: review.title || 'Mekan değerlendirmesi',
        reviewBody: text,
        datePublished: review.created_at ? new Date(review.created_at).toISOString() : undefined,
        author: {
          '@type': 'Person',
          name: review.full_name || 'Şanlıurfa.com kullanıcısı',
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rating,
          bestRating: 5,
          worstRating: 1,
        },
      });
    })
    .filter(Boolean) as JsonLdNode[];

  return normalized.length ? normalized : undefined;
}
