import { normalizeTurkishSearchText } from '../lib/search/search-normalization';

export interface CuratedPlaceFallback {
  slug: string;
  name: string;
  category_name: string;
  category_slug: string;
  district_name: string;
  district_slug: string;
  is_verified: boolean;
  is_featured: boolean;
  rating: number;
  review_count: number;
  price_range: string;
  address: string;
  phone: string;
  short_description: string;
  description: string;
  images: string[];
  latitude?: number;
  longitude?: number;
}

const curatedPlaceFallbacks: Record<string, CuratedPlaceFallback> = {
  gobeklitepe: {
    slug: 'gobeklitepe',
    name: 'Göbeklitepe',
    category_name: 'Tarihi Yer',
    category_slug: 'tarihi-yerler',
    district_name: 'Haliliye',
    district_slug: 'haliliye',
    is_verified: true,
    is_featured: true,
    rating: 4.9,
    review_count: 4521,
    price_range: '₺₺',
    address: 'Örencik Mahallesi, Haliliye/Şanlıurfa',
    phone: '+90 414 318 10 00',
    short_description: 'UNESCO Dünya Mirası listesinde yer alan, insanlık tarihinin bilinen en eski anıtsal tapınak merkezi.',
    description: 'Göbeklitepe, Şanlıurfa şehir merkezine yaklaşık 18 km mesafede bulunan ve Neolitik döneme tarihlenen arkeolojik alandır. T biçimli dikilitaşları, hayvan kabartmaları ve ritüel yapılarıyla dünya arkeoloji tarihinde özel bir yere sahiptir.',
    images: ['/images/historical/gobeklitepe.webp'],
    latitude: 37.2231,
    longitude: 38.9222,
  },
  balikligol: {
    slug: 'balikligol',
    name: 'Balıklıgöl',
    category_name: 'Tarihi Yer',
    category_slug: 'tarihi-yerler',
    district_name: 'Eyyübiye',
    district_slug: 'eyyubiye',
    is_verified: true,
    is_featured: true,
    rating: 4.9,
    review_count: 2847,
    price_range: 'Ücretsiz',
    address: 'Balıklıgöl Mahallesi, Eyyübiye/Şanlıurfa',
    phone: '+90 414 318 10 00',
    short_description: "Şanlıurfa'nın sembolü olan, Hz. İbrahim anlatısıyla bilinen kutsal göl ve tarihi ziyaret alanı.",
    description: 'Balıklıgöl, Şanlıurfa merkezde yer alan ve kutsal balıklarıyla tanınan tarihi bir ziyaret noktasıdır.',
    images: ['/images/historical/balikligol.webp'],
    latitude: 37.1591,
    longitude: 38.7969,
  },
};

export function getCuratedPlaceFallbackBySlug(slug: string | null | undefined): CuratedPlaceFallback | null {
  if (!slug) return null;
  return curatedPlaceFallbacks[String(slug)] || null;
}

export function searchCuratedPlaceFallbacks(query: string, limit: number = 5) {
  const normalizedNeedle = normalizeTurkishSearchText(query);
  if (!normalizedNeedle) return [];

  return Object.values(curatedPlaceFallbacks)
    .map((place) => {
      const haystack = normalizeTurkishSearchText(
        [
          place.name,
          place.slug,
          place.category_name,
          place.district_name,
          place.short_description,
          place.description,
        ].join(' '),
      );
      const exact = haystack.includes(normalizedNeedle);
      if (!exact) return null;

      return {
        id: `curated:${place.slug}`,
        slug: place.slug,
        href: `/isletme/${place.slug}`,
        name: place.name,
        description: place.description,
        short_description: place.short_description,
        image_url: place.images[0] || null,
        category: place.category_name,
        city: 'Şanlıurfa',
        district: place.district_name,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        rating: place.rating,
        review_count: place.review_count,
        created_at: null,
        relevance_score: normalizeTurkishSearchText(place.name) === normalizedNeedle ? 1 : 0.82,
        source: 'curated-place-fallback',
      };
    })
    .filter((place): place is NonNullable<typeof place> => Boolean(place))
    .sort((a, b) => Number(b.relevance_score) - Number(a.relevance_score))
    .slice(0, limit);
}
