const DEFAULT_CITY_OG_IMAGE = '/images/places/balikligol.jpg';

const ROUTE_OG_IMAGE_RULES: Array<[RegExp, string]> = [
  [/^\/gezilecek-yerler|^\/tarihi-yerler|gobeklitepe|harran/i, '/images/places/gobeklitepe.jpg'],
  [/^\/yeme-icme|^\/yemek-tarifleri|kebap|ciger|lahmacun|sira-gecesi/i, '/images/foods/homepage/urfa-kebabi-card.png'],
  [/^\/konaklama|otel|hotel/i, '/images/places/hanehan-otel/exterior.jpg'],
  [/^\/etkinlikler/i, '/images/etkinlikler/sanliurfa-kultur-festivali.jpg'],
  [/^\/blog/i, '/images/blog/tarihi-yerler-rehberi.jpg'],
  [/^\/eslesme|^\/topluluk|^\/kullanicilar|^\/mesajlar/i, '/images/places/balikligol.jpg'],
  [/^\/saglik|eczane|hastane|klinik/i, '/images/places/balikligol.jpg'],
  [/^\/harita|^\/mekanlar|^\/isletme|^\/ilceler|^\/mahalleler/i, DEFAULT_CITY_OG_IMAGE],
];

function normalizePathname(pathname: string | undefined): string {
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function resolveSeoOgImage(input: {
  ogImage?: string | null;
  pathname?: string;
  title?: string;
}): string {
  const ogImage = typeof input.ogImage === 'string' ? input.ogImage.trim() : '';
  const pathname = normalizePathname(input.pathname);
  const haystack = `${pathname} ${input.title || ''}`;

  if (ogImage && ogImage !== '/images/hero/hero-home.webp' && !ogImage.includes('/placeholder')) {
    return ogImage;
  }

  for (const [pattern, image] of ROUTE_OG_IMAGE_RULES) {
    if (pattern.test(haystack)) return image;
  }

  return DEFAULT_CITY_OG_IMAGE;
}
