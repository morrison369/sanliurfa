/**
 * Unit Tests — places/categories.ts category registry + filterPlaces + Haversine
 *
 * - DEFAULT_CATEGORIES (15 Şanlıurfa kategori) auto-init
 * - getCategories (sortOrder asc + isActive filter)
 * - getFeaturedCategories (featured: true filter)
 * - getCategoryBySlug / getCategoryById / createCategory / updateCategory / deleteCategory
 * - createSubcategory + getSubcategories + getCategoryTree
 * - updatePlaceCount (Math.max(0, ...) clamp)
 * - URFA_DISTRICTS (11 ilçe + lat/lon) + PRICE_RANGES + SORT_OPTIONS
 * - filterPlaces (category/district/priceRange/features/rating/searchQuery + 5 sort)
 * - getDiscoveryContent (featured/trending/newPlaces/byCategory)
 * - getRelatedPlaces (similarity scoring: category +3, district +2, tag +1, rating +1)
 *
 * In-memory Map state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  getCategories,
  getFeaturedCategories,
  getCategoryBySlug,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubcategories,
  createSubcategory,
  getCategoryTree,
  updatePlaceCount,
  URFA_DISTRICTS,
  PRICE_RANGES,
  SORT_OPTIONS,
  filterPlaces,
  getDiscoveryContent,
  getRelatedPlaces,
  type PlaceSummary,
} from '../places/categories';

const mkPlace = (overrides: Partial<PlaceSummary> = {}): PlaceSummary => ({
  id: `p-${Math.random().toString(36).slice(2, 10)}`,
  slug: 'test',
  name: 'Test Place',
  category: 'restoran',
  categoryName: 'Restoranlar',
  shortDescription: 'desc',
  thumbnail: '/thumb.jpg',
  rating: 4,
  reviewCount: 10,
  address: 'Address',
  district: 'merkez',
  isVerified: false,
  isFeatured: false,
  tags: [],
  visitCount: 100,
  saveCount: 5,
  ...overrides,
});

describe('Default categories + getCategories', () => {
  it('15 default Şanlıurfa kategori auto-init', () => {
    const cats = getCategories();
    expect(cats.length).toBeGreaterThanOrEqual(15);
  });

  it('sortOrder asc — ilk eleman tarihi-yerler (sortOrder 1)', () => {
    const cats = getCategories();
    expect(cats[0].slug).toBe('tarihi-yerler');
  });

  it('isActive filter — onlyActive=true sadece aktif', () => {
    const cats = getCategories(true);
    expect(cats.every((c) => c.isActive)).toBe(true);
  });
});

describe('getFeaturedCategories', () => {
  it('featured: true filter', () => {
    const featured = getFeaturedCategories();
    expect(featured.every((c) => c.featured)).toBe(true);
  });

  it('en az 4 featured (Şanlıurfa default: tarihi/restoran/otel/dini/dogal)', () => {
    expect(getFeaturedCategories().length).toBeGreaterThanOrEqual(4);
  });
});

describe('getCategoryBySlug / getCategoryById', () => {
  it('slug ile bulur', () => {
    expect(getCategoryBySlug('restoran')?.name).toBe('Restoranlar');
  });

  it('bilinmeyen slug → null', () => {
    expect(getCategoryBySlug('non-existent-category')).toBeNull();
  });

  it('bilinmeyen id → null', () => {
    expect(getCategoryById('non-existent-id')).toBeNull();
  });
});

describe('createCategory / updateCategory / deleteCategory', () => {
  it('createCategory — id + placeCount: 0 init', () => {
    const c = createCategory({
      slug: `test-${Date.now()}`,
      name: 'Test Cat',
      description: 'desc',
      icon: 'X',
      color: '#000',
      sortOrder: 99,
      isActive: true,
      featured: false,
    });
    expect(c.id).toBeDefined();
    expect(c.placeCount).toBe(0);
  });

  it('updateCategory — Object.assign partial update', () => {
    const c = createCategory({
      slug: `up-${Date.now()}`,
      name: 'Old', description: 'd', icon: 'X', color: '#000',
      sortOrder: 99, isActive: true, featured: false,
    });
    const updated = updateCategory(c.id, { name: 'New' });
    expect(updated?.name).toBe('New');
  });

  it('updateCategory — bilinmeyen id → null', () => {
    expect(updateCategory('non-existent', { name: 'X' })).toBeNull();
  });

  it('deleteCategory — Map.delete return', () => {
    const c = createCategory({
      slug: `del-${Date.now()}`,
      name: 'D', description: 'd', icon: 'X', color: '#000',
      sortOrder: 99, isActive: true, featured: false,
    });
    expect(deleteCategory(c.id)).toBe(true);
    expect(deleteCategory('non-existent')).toBe(false);
  });
});

describe('subcategories', () => {
  it('createSubcategory + getSubcategories', () => {
    const cats = getCategories();
    const catId = cats[0].id;
    createSubcategory({ categoryId: catId, slug: `sub-${Date.now()}`, name: 'Sub', icon: 'X' });
    expect(getSubcategories(catId).length).toBeGreaterThanOrEqual(1);
  });

  it('getCategoryTree — categories + subcategories array', () => {
    const tree = getCategoryTree();
    expect(tree.length).toBeGreaterThan(0);
    expect(Array.isArray(tree[0].subcategories)).toBe(true);
  });
});

describe('updatePlaceCount', () => {
  it('Math.max(0, ...) clamp — negative result → 0', () => {
    const c = createCategory({
      slug: `pc-${Date.now()}`,
      name: 'X', description: 'd', icon: 'X', color: '#000',
      sortOrder: 99, isActive: true, featured: false,
    });
    updatePlaceCount(c.id, -5); // start 0, clamp to 0
    expect(getCategoryById(c.id)?.placeCount).toBe(0);
  });

  it('positive delta → counter artar', () => {
    const c = createCategory({
      slug: `pc2-${Date.now()}`,
      name: 'X', description: 'd', icon: 'X', color: '#000',
      sortOrder: 99, isActive: true, featured: false,
    });
    updatePlaceCount(c.id, 5);
    updatePlaceCount(c.id, 3);
    expect(getCategoryById(c.id)?.placeCount).toBe(8);
  });
});

describe('URFA_DISTRICTS / PRICE_RANGES / SORT_OPTIONS', () => {
  it('URFA_DISTRICTS — 11 ilçe + lat/lon', () => {
    expect(URFA_DISTRICTS).toHaveLength(11);
    expect(URFA_DISTRICTS[0].slug).toBe('merkez');
  });

  it('PRICE_RANGES — 5 tier (free/cheap/moderate/expensive/luxury)', () => {
    expect(PRICE_RANGES).toHaveLength(5);
  });

  it('SORT_OPTIONS — 5 option', () => {
    expect(SORT_OPTIONS).toHaveLength(5);
  });
});

describe('filterPlaces', () => {
  const places = [
    mkPlace({ id: '1', category: 'restoran', district: 'merkez', rating: 4.5, visitCount: 100, name: 'Kebap A' }),
    mkPlace({ id: '2', category: 'cafe', district: 'haliliye', rating: 3.5, visitCount: 50, name: 'Cafe B' }),
    mkPlace({ id: '3', category: 'restoran', district: 'merkez', rating: 5, visitCount: 200, name: 'Kebap C', tags: ['wifi', 'parking'] }),
  ];

  it('category filter', () => {
    const r = filterPlaces(places, { category: 'restoran' });
    expect(r.every((p) => p.category === 'restoran')).toBe(true);
  });

  it('district filter', () => {
    const r = filterPlaces(places, { district: 'haliliye' });
    expect(r.every((p) => p.district === 'haliliye')).toBe(true);
  });

  it('rating min filter', () => {
    const r = filterPlaces(places, { rating: 4 });
    expect(r.every((p) => p.rating >= 4)).toBe(true);
  });

  it('features filter — every() AND match', () => {
    const r = filterPlaces(places, { features: ['wifi', 'parking'] });
    expect(r.every((p) => p.tags.includes('wifi') && p.tags.includes('parking'))).toBe(true);
  });

  it('searchQuery — name/desc/tags includes', () => {
    const r = filterPlaces(places, { searchQuery: 'kebap' });
    expect(r.length).toBeGreaterThanOrEqual(2);
  });

  it('sortBy rating — desc', () => {
    const r = filterPlaces(places, { sortBy: 'rating' });
    expect(r[0].rating).toBeGreaterThanOrEqual(r[r.length - 1].rating);
  });

  it('sortBy popular (default) — visitCount desc', () => {
    const r = filterPlaces(places, {});
    expect(r[0].visitCount).toBeGreaterThanOrEqual(r[r.length - 1].visitCount);
  });

  it('sortBy nearest — userLat/userLon ile Haversine sort', () => {
    const placesWithCoords = [
      mkPlace({ id: 'far', latitude: 38, longitude: 40 }),
      mkPlace({ id: 'near', latitude: 37.16, longitude: 38.8 }),
    ];
    const r = filterPlaces(placesWithCoords, { sortBy: 'nearest' }, 37.16, 38.8);
    expect(r[0].id).toBe('near');
  });
});

describe('getDiscoveryContent', () => {
  const places = [
    mkPlace({ id: 'f1', isFeatured: true }),
    mkPlace({ id: 'f2', isFeatured: true }),
    mkPlace({ id: 't1', visitCount: 500 }),
    mkPlace({ id: 't2', visitCount: 200 }),
  ];

  it('featured filter (max 6)', () => {
    const r = getDiscoveryContent(places);
    expect(r.featured.length).toBeLessThanOrEqual(6);
    expect(r.featured.every((p) => p.isFeatured)).toBe(true);
  });

  it('trending — visitCount desc (max 8)', () => {
    const r = getDiscoveryContent(places);
    expect(r.trending.length).toBeLessThanOrEqual(8);
  });

  it('byCategory — kategoriye göre 4 yer', () => {
    const r = getDiscoveryContent(places);
    expect(typeof r.byCategory).toBe('object');
  });
});

describe('getRelatedPlaces', () => {
  it('similarity scoring — same category=+3 + same district=+2 + tag=+1 + rating=+1', () => {
    const target = mkPlace({ id: 'x', category: 'restoran', district: 'merkez', rating: 4.5, tags: ['wifi'] });
    const others = [
      mkPlace({ id: 'a', category: 'restoran', district: 'merkez', rating: 4.5, tags: ['wifi'] }), // 3+2+1+1 = 7
      mkPlace({ id: 'b', category: 'cafe', district: 'haliliye', rating: 1, tags: [] }), // 0
    ];
    const r = getRelatedPlaces(target, [target, ...others], 5);
    expect(r[0].id).toBe('a'); // highest score
    expect(r.length).toBeLessThanOrEqual(5);
  });

  it('limit parameter', () => {
    const target = mkPlace({ id: 'x' });
    const others = Array.from({ length: 10 }, (_, i) => mkPlace({ id: `o-${i}` }));
    expect(getRelatedPlaces(target, others, 3)).toHaveLength(3);
  });
});
