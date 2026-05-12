/**
 * Unit tests — src/lib/landing/landing-schema.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  resolveSchemaType,
  buildItemListSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  type LandingPlace,
} from '../landing/landing-schema';

// resolvePlaceImage mock — testlerde gerçek resolver çağırmamak için
vi.mock('../public-image-resolvers', () => ({
  resolvePlaceImage: ({ slug, image_url }: { slug: string; image_url?: string | null }) =>
    image_url ?? `/uploads/places/${slug}.jpg`,
}));

describe('resolveSchemaType', () => {
  it('otel/konaklama → LodgingBusiness', () => {
    expect(resolveSchemaType('Otel')).toBe('LodgingBusiness');
    expect(resolveSchemaType('Pansiyon')).toBe('LodgingBusiness');
    expect(resolveSchemaType('Apart Otel')).toBe('LodgingBusiness');
    expect(resolveSchemaType('Konaklama')).toBe('LodgingBusiness');
  });

  it('cafe/kahve → CafeOrCoffeeShop', () => {
    expect(resolveSchemaType('Cafe')).toBe('CafeOrCoffeeShop');
    expect(resolveSchemaType('Kahve dükkanı')).toBe('CafeOrCoffeeShop');
    expect(resolveSchemaType('Kahvehane')).toBe('CafeOrCoffeeShop');
  });

  it('sıra gecesi/eğlence → EntertainmentBusiness', () => {
    expect(resolveSchemaType('Sıra Geces')).toBe('EntertainmentBusiness');
    expect(resolveSchemaType('Eğlence Mekanı')).toBe('EntertainmentBusiness');
    expect(resolveSchemaType('Müzik Sahnesi')).toBe('EntertainmentBusiness');
  });

  it('tarihi/müze/turistik → TouristAttraction', () => {
    expect(resolveSchemaType('Tarihi Yer')).toBe('TouristAttraction');
    expect(resolveSchemaType('Müze')).toBe('TouristAttraction');
    expect(resolveSchemaType('Park')).toBe('TouristAttraction');
    expect(resolveSchemaType('Gezilecek Yer')).toBe('TouristAttraction');
    expect(resolveSchemaType('Dini Yer')).toBe('TouristAttraction');
  });

  it('restoran/kebap/ciğer → Restaurant', () => {
    expect(resolveSchemaType('Kebapçı')).toBe('Restaurant');
    expect(resolveSchemaType('Ciğerci')).toBe('Restaurant');
    expect(resolveSchemaType('Lahmacuncu')).toBe('Restaurant');
    expect(resolveSchemaType('Restoran')).toBe('Restaurant');
    expect(resolveSchemaType('Kahvaltıcı')).toBe('Restaurant');
    expect(resolveSchemaType('Tatlıcı')).toBe('Restaurant');
  });

  it('boş/null/bilinmeyen → LocalBusiness fallback', () => {
    expect(resolveSchemaType(null)).toBe('LocalBusiness');
    expect(resolveSchemaType(undefined)).toBe('LocalBusiness');
    expect(resolveSchemaType('')).toBe('LocalBusiness');
    expect(resolveSchemaType('Bilinmeyen Kategori')).toBe('LocalBusiness');
  });
});

describe('buildItemListSchema', () => {
  const samplePlaces: LandingPlace[] = [
    { slug: 'kebapci-a', name: 'Kebapçı A', rating: 4.5, review_count: 120, category_name: 'Kebapçı' },
    { slug: 'kebapci-b', name: 'Kebapçı B', rating: '4.2', review_count: '80', short_description: 'Açıklama', image_url: '/uploads/test.jpg' },
  ];

  it('ItemList @type döner', () => {
    const json = buildItemListSchema({
      places: samplePlaces,
      pageName: 'En İyi Kebapçılar',
      pagePath: '/en-iyi-kebapcilar',
      baseUrl: 'https://sanliurfa.com',
      type: 'Restaurant',
    });
    expect(json['@context']).toBe('https://schema.org');
    expect(json['@type']).toBe('ItemList');
    expect(json.name).toBe('En İyi Kebapçılar');
    expect(json.url).toBe('https://sanliurfa.com/en-iyi-kebapcilar');
    expect(json.numberOfItems).toBe(2);
  });

  it('itemListElement ListItem array döner', () => {
    const json = buildItemListSchema({
      places: samplePlaces,
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
      type: 'Restaurant',
    });
    expect(json.itemListElement).toHaveLength(2);
    const first = json.itemListElement[0];
    expect(first['@type']).toBe('ListItem');
    expect(first.position).toBe(1);
    const item = first.item as Record<string, unknown>;
    expect(item['@type']).toBe('Restaurant');
    expect(item.name).toBe('Kebapçı A');
  });

  it('aggregateRating sayısal değerlerden inşa eder', () => {
    const json = buildItemListSchema({
      places: samplePlaces,
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
      type: 'Restaurant',
    });
    const item = json.itemListElement[0].item as Record<string, unknown>;
    expect(item.aggregateRating).toBeDefined();
    const rating = item.aggregateRating as Record<string, number>;
    expect(rating.ratingValue).toBe(4.5);
    expect(rating.reviewCount).toBe(120);
    expect(rating.bestRating).toBe(5);
    expect(rating.worstRating).toBe(1);
  });

  it('string "4.2" rating sayıya çevrilir', () => {
    const json = buildItemListSchema({
      places: samplePlaces,
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
      type: 'Restaurant',
    });
    const item = json.itemListElement[1].item as Record<string, unknown>;
    const rating = item.aggregateRating as Record<string, number>;
    expect(rating.ratingValue).toBe(4.2);
    expect(rating.reviewCount).toBe(80);
  });

  it('rating yoksa aggregateRating eklenmez', () => {
    const json = buildItemListSchema({
      places: [{ slug: 'x', name: 'No Rating Place' }],
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
      type: 'Restaurant',
    });
    const item = json.itemListElement[0].item as Record<string, unknown>;
    expect(item.aggregateRating).toBeUndefined();
  });

  it('limit option uygulanır', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ slug: `p${i}`, name: `Place ${i}` }));
    const json = buildItemListSchema({
      places: many,
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
      limit: 5,
    });
    expect(json.itemListElement).toHaveLength(5);
    expect(json.numberOfItems).toBe(20);
  });

  it('type override yoksa kategori bazlı auto-resolve', () => {
    const json = buildItemListSchema({
      places: [{ slug: 'a', name: 'A', category_name: 'Otel' }, { slug: 'b', name: 'B', category_name: 'Müze' }],
      pageName: 'Test',
      pagePath: '/test',
      baseUrl: 'https://sanliurfa.com',
    });
    const item0 = json.itemListElement[0].item as Record<string, unknown>;
    const item1 = json.itemListElement[1].item as Record<string, unknown>;
    expect(item0['@type']).toBe('LodgingBusiness');
    expect(item1['@type']).toBe('TouristAttraction');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('BreadcrumbList JSON-LD üretir', () => {
    const json = buildBreadcrumbSchema({
      baseUrl: 'https://sanliurfa.com',
      crumbs: [
        { name: 'Ana Sayfa', href: '/' },
        { name: 'Yeme İçme', href: '/yeme-icme' },
        { name: 'Kebapçılar', href: '/en-iyi-kebapcilar' },
      ],
    });
    expect(json['@type']).toBe('BreadcrumbList');
    expect(json.itemListElement).toHaveLength(3);
    expect(json.itemListElement[0].name).toBe('Ana Sayfa');
    expect(json.itemListElement[0].item).toBe('https://sanliurfa.com/');
    expect(json.itemListElement[2].position).toBe(3);
  });

  it('absolute URL crumb değiştirilmez', () => {
    const json = buildBreadcrumbSchema({
      baseUrl: 'https://sanliurfa.com',
      crumbs: [{ name: 'External', href: 'https://other.com/page' }],
    });
    expect(json.itemListElement[0].item).toBe('https://other.com/page');
  });
});

describe('buildFAQSchema', () => {
  it('FAQPage JSON-LD üretir', () => {
    const json = buildFAQSchema([
      { q: 'Soru 1?', a: 'Cevap 1.' },
      { q: 'Soru 2?', a: 'Cevap 2.' },
    ]);
    expect(json).not.toBeNull();
    expect(json!['@type']).toBe('FAQPage');
    expect(json!.mainEntity).toHaveLength(2);
    expect(json!.mainEntity[0].name).toBe('Soru 1?');
    expect(json!.mainEntity[0].acceptedAnswer.text).toBe('Cevap 1.');
  });

  it('legacy {S, C} formatını destekler', () => {
    const json = buildFAQSchema([{ S: 'Eski Soru', C: 'Eski Cevap' }]);
    expect(json).not.toBeNull();
    expect(json!.mainEntity[0].name).toBe('Eski Soru');
    expect(json!.mainEntity[0].acceptedAnswer.text).toBe('Eski Cevap');
  });

  it('boş array → null', () => {
    expect(buildFAQSchema([])).toBeNull();
  });
});
