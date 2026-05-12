import { resolveContentImage } from './content-images';

type PlaceLike = {
  slug?: string | null;
  image_url?: string | null;
  cover_image?: string | null;
  images?: Array<string | null> | null;
};

type RecipeLike = {
  slug?: string | null;
  cover_image?: string | null;
  image_url?: string | null;
  images?: Array<string | null> | null;
};

type BlogLike = {
  slug?: string | null;
  featured_image?: string | null;
  cover_image?: string | null;
  image?: string | null;
};

type HistoricalLike = {
  slug?: string | null;
  image_url?: string | null;
  cover_image?: string | null;
  image?: string | null;
};

type EventLike = {
  slug?: string | null;
  image_url?: string | null;
  cover_image?: string | null;
  image?: string | null;
};

function firstNonEmpty(values: Array<string | null | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function isPublicLocalImage(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('/images/') || trimmed.startsWith('/uploads/');
}

export function resolvePlaceImage(place: PlaceLike, options?: { thumb?: boolean }) {
  return resolveContentImage({
    category: 'places',
    slug: place.slug,
    explicit: firstNonEmpty([place.image_url, place.cover_image, place.images?.[0] || undefined]),
    placeholder: '/images/placeholder-place.jpg',
    thumb: options?.thumb === true,
    preferLocal: true,
    allowExternalExplicit: false,
  });
}

export function resolveRecipeImage(recipe: RecipeLike, options?: { thumb?: boolean }) {
  return resolveContentImage({
    category: 'foods',
    slug: recipe.slug,
    explicit: firstNonEmpty([recipe.cover_image, recipe.image_url, recipe.images?.[0] || undefined]),
    placeholder: '/images/foods/default.jpg',
    thumb: options?.thumb === true,
    preferLocal: true,
    allowExternalExplicit: false,
  });
}

export function resolveBlogImage(post: BlogLike, options?: { thumb?: boolean }) {
  return resolveContentImage({
    category: 'blog',
    slug: post.slug,
    explicit: firstNonEmpty([post.featured_image, post.cover_image, post.image]),
    placeholder: '/images/placeholder-blog.jpg',
    thumb: options?.thumb === true,
    preferLocal: true,
    allowExternalExplicit: false,
  });
}

export function resolveHistoricalImage(site: HistoricalLike, options?: { thumb?: boolean }) {
  return resolveContentImage({
    category: 'tarihi-yerler',
    slug: site.slug,
    explicit: firstNonEmpty([site.image_url, site.cover_image, site.image]),
    placeholder: '/images/placeholder-historical.jpg',
    thumb: options?.thumb === true,
    preferLocal: true,
    allowExternalExplicit: false,
  });
}

export function resolveEventImage(event: EventLike, options?: { thumb?: boolean }) {
  return resolveContentImage({
    category: 'etkinlikler',
    slug: event.slug,
    explicit: firstNonEmpty([event.image_url, event.cover_image, event.image]),
    placeholder: '/images/placeholder-event.jpg',
    thumb: options?.thumb === true,
    preferLocal: true,
    allowExternalExplicit: false,
  });
}

export function normalizeGalleryImages(
  values: Array<string | null | undefined>,
  fallback?: string,
) {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || !isPublicLocalImage(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
  }

  if (isPublicLocalImage(fallback) && !seen.has(fallback)) {
    seen.add(fallback);
  }

  return Array.from(seen);
}
