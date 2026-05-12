/**
 * SEO Yardimci Fonksiyonlari
 * 
 * S canonical URL, OG etiketleri, Schema.org ve Twitter Card olusturma
 * yardimci fonksiyonlarini icerir.
 */

import { SITE } from '../data/site';

/**
 * Canonical URL olusturur.
 * 
 * @param path - Sayfa yolu (orn: '/isletme/gobeklitepe')
 * @returns Tam canonical URL
 */
export function generateCanonicalUrl(path: string): string {
  // Base URL'den trailing slash'i kaldir
  const baseUrl = SITE.url.replace(/\/$/, '');
  
  // Path'in basinda / yoksa ekle
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Canonical URL'ler trailing slash icermemeli
  const clean = cleanPath.replace(/\/$/, '');
  
  return `${baseUrl}${clean}`;
}

/**
 * Open Graph etiketleri icin veri objesi olusturur.
 * 
 * @param params - OG parametreleri
 * @returns OG etiketleri
 */
export function generateOGTags(params: {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  siteName?: string;
  locale?: string;
}): Record<string, string> {
  const {
    title,
    description,
    url,
    image,
    type = 'website',
    siteName = SITE.name,
    locale = SITE.locale,
  } = params;

  const canonicalUrl = generateCanonicalUrl(url);
  const ogImage = image || SITE.ogImage;

  // Mutlak URL'e cevir (goreli yollar icin)
  const ogImageUrl = ogImage.startsWith('http')
    ? ogImage
    : `${SITE.url}${ogImage}`;

  const tags: Record<string, string> = {
    'og:title': title,
    'og:description': description,
    'og:url': canonicalUrl,
    'og:type': type,
    'og:site_name': siteName,
    'og:locale': locale,
    'og:image': ogImageUrl,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': `${title} - ${siteName}`,
  };

  return tags;
}

/**
 * Twitter Card etiketleri olusturur.
 * 
 * @param params - Twitter card parametreleri
 * @returns Twitter Card etiketleri
 */
export function generateTwitterCard(params: {
  title: string;
  description: string;
  image?: string;
  card?: 'summary_large_image' | 'summary';
  site?: string;
  creator?: string;
}): Record<string, string> {
  const {
    title,
    description,
    image,
    card = 'summary_large_image',
    site,
    creator,
  } = params;

  const tags: Record<string, string> = {
    'twitter:card': card,
    'twitter:title': title,
    'twitter:description': description,
  };

  const resolvedSite = site ?? (SITE.twitter ? `@${SITE.twitter}` : '');
  if (resolvedSite) {
    tags['twitter:site'] = resolvedSite;
  }

  if (image) {
    const imageUrl = image.startsWith('http')
      ? image
      : `${SITE.url}${image}`;
    tags['twitter:image'] = imageUrl;
  }

  if (creator) {
    tags['twitter:creator'] = creator;
  }

  return tags;
}

/**
 * Schema.org JSON-LD verisi olusturur.
 * 
 * @param params - Schema.org parametreleri
 * @returns JSON-LD string
 */
export function generateSchemaOrg(params: {
  type: 'WebPage' | 'Article' | 'LocalBusiness' | 'Restaurant' | 'LodgingBusiness' | 'TouristAttraction' | 'Event' | 'BlogPosting';
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  publisher?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  priceRange?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  startDate?: string;
  endDate?: string;
  location?: string;
}): string {
  const {
    type,
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    author,
    publisher = SITE.name,
    address,
    geo,
    priceRange,
    aggregateRating,
    startDate,
    endDate,
    location,
  } = params;

  const canonicalUrl = generateCanonicalUrl(url);

  // Temel schema objesi
   
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description: description,
    url: canonicalUrl,
  };

  // Gorsel
  if (image) {
    schema.image = image.startsWith('http')
      ? image
      : `${SITE.url}${image}`;
  }

  // Tarih bilgisi (Article ve BlogPosting icin)
  if (datePublished) {
    schema.datePublished = datePublished;
  }
  if (dateModified) {
    schema.dateModified = dateModified;
  }

  // Yazar bilgisi
  if (author) {
    schema.author = {
      '@type': 'Organization',
      name: author,
      url: SITE.url,
    };
  }

  // Yayinci bilgisi
  schema.publisher = {
    '@type': 'Organization',
    name: publisher,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.url}/images/logo.png`,
    },
  };

  // Adres bilgisi (LocalBusiness ve turleri icin)
  if (address) {
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: address.addressLocality || 'Şanlıurfa',
      addressRegion: address.addressRegion || 'Şanlıurfa',
      addressCountry: address.addressCountry || 'TR',
    };
    if (address.streetAddress) {
      schema.address.streetAddress = address.streetAddress;
    }
    if (address.postalCode) {
      schema.address.postalCode = address.postalCode;
    }
  }

  // Koordinatlar
  if (geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  // Fiyat araligi
  if (priceRange) {
    schema.priceRange = priceRange;
  }

  // Toplam puanlama
  if (aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
      bestRating: aggregateRating.bestRating || 5,
      worstRating: aggregateRating.worstRating || 1,
    };
  }

  // Etkinlik tarihleri
  if (startDate) {
    schema.startDate = startDate;
  }
  if (endDate) {
    schema.endDate = endDate;
  }
  if (location) {
    schema.location = {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Şanlıurfa',
        addressCountry: 'TR',
      },
    };
  }

  return JSON.stringify(schema);
}

/**
 * Tum SEO meta etiketlerini tek seferde olusturur.
 * 
 * @param params - SEO parametreleri
 * @returns Meta etiketleri array'i
 */
export function generateSEOMeta(params: {
  title: string;
  description: string;
  url: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article';
  datePublished?: string;
  dateModified?: string;
  author?: string;
  noindex?: boolean;
  nofollow?: boolean;
}): Record<string, string> {
  const {
    title,
    description,
    url,
    image,
    keywords,
    type = 'website',
    datePublished,
    dateModified,
    author,
    noindex = false,
    nofollow = false,
  } = params;

  const canonicalUrl = generateCanonicalUrl(url);

  // Temel meta etiketleri
  const meta: Record<string, string> = {
    title: `${title} | ${SITE.name}`,
    description: description,
    'og:title': title,
    'og:description': description,
    'og:url': canonicalUrl,
    'og:type': type,
    'og:site_name': SITE.name,
    'og:locale': SITE.locale,
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'canonical': canonicalUrl,
  };

  if (SITE.twitter) {
    meta['twitter:site'] = `@${SITE.twitter}`;
  }

  // Gorseller
  const imageUrl = image
    ? image.startsWith('http')
      ? image
      : `${SITE.url}${image}`
    : `${SITE.url}${SITE.ogImage}`;

  meta['og:image'] = imageUrl;
  meta['og:image:width'] = '1200';
  meta['og:image:height'] = '630';
  meta['twitter:image'] = imageUrl;

  // Anahtar kelimeler
  if (keywords && keywords.length > 0) {
    meta['keywords'] = keywords.join(', ');
  }

  // Tarih bilgisi
  if (datePublished) {
    meta['article:published_time'] = datePublished;
  }
  if (dateModified) {
    meta['article:modified_time'] = dateModified;
  }

  // Yazar
  if (author) {
    meta['article:author'] = author;
  }

  // Robot etiketleri
  if (noindex || nofollow) {
    const robots: string[] = [];
    if (noindex) robots.push('noindex');
    if (nofollow) robots.push('nofollow');
    meta['robots'] = robots.join(', ');
  }

  return meta;
}
