/**
 * Place Categories System
 * Category management, filters, and discovery
 */

import { generateId } from '../utils';

// Category definition
export interface Category {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  placeCount: number;
  featured: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

// Subcategory
export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  icon: string;
}

// Category with subcategories
export interface CategoryWithSubs extends Category {
  subcategories: Subcategory[];
}

// Filter options
export interface PlaceFilters {
  category?: string;
  subcategory?: string;
  district?: string;
  priceRange?: string;
  features?: string[];
  rating?: number;
  openNow?: boolean;
  hasPhotos?: boolean;
  verified?: boolean;
  sortBy?: 'popular' | 'rating' | 'newest' | 'nearest' | 'name';
  searchQuery?: string;
}

// Discovery result
export interface DiscoveryResult {
  featured: PlaceSummary[];
  trending: PlaceSummary[];
  nearby: PlaceSummary[];
  newPlaces: PlaceSummary[];
  byCategory: Record<string, PlaceSummary[]>;
}

// Place summary for listings
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  shortDescription: string;
  thumbnail: string;
  rating: number;
  reviewCount: number;
  priceRange?: string;
  address: string;
  district: string;
  latitude?: number;
  longitude?: number;
  isOpen?: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  tags: string[];
  visitCount: number;
  saveCount: number;
}

// In-memory store
const categories: Map<string, Category> = new Map();
const subcategories: Map<string, Subcategory> = new Map();

// Default Şanlıurfa categories
const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'placeCount'>[] = [
  {
    slug: 'tarihi-yerler',
    name: 'Tarihi Yerler',
    nameEn: 'Historical Sites',
    description: 'Şanlıurfa\'nın zengin tarihine tanıklık eden antik kalıntılar, müzeler ve tarihi yapılar',
    icon: 'Landmark',
    color: '#8B4513',
    sortOrder: 1,
    isActive: true,
    featured: true,
    metaTitle: 'Şanlıurfa Tarihi Yerler | Göbeklitepe, Balıklıgöl',
    metaDescription: 'Şanlıurfa\'nın tarihi mekanlarını keşfedin. Göbeklitepe, Balıklıgöl, Harran ve daha fazlası.',
  },
  {
    slug: 'restoran',
    name: 'Restoranlar',
    nameEn: 'Restaurants',
    description: 'Şanlıurfa mutfağının en lezzetli örneklerini sunan restoranlar',
    icon: 'UtensilsCrossed',
    color: '#E63946',
    sortOrder: 2,
    isActive: true,
    featured: true,
    metaTitle: 'Şanlıurfa Restoranları | En İyi Urfa Kebapçıları',
    metaDescription: 'Şanlıurfa\'nın en iyi restoranları, kebapçıları ve geleneksel lezzet durakları.',
  },
  {
    slug: 'cafe',
    name: 'Kafeler',
    nameEn: 'Cafes',
    description: 'Kahve keyfi yapabileceğiniz, çalışabileceğiniz veya arkadaşlarınızla buluşabileceğiniz kafeler',
    icon: 'Coffee',
    color: '#6F4E37',
    sortOrder: 3,
    isActive: true,
    featured: false,
    metaTitle: 'Şanlıurfa Kafeleri | En İyi Kahve Mekanları',
    metaDescription: 'Şanlıurfa\'da kahve içebileceğiniz, çalışabileceğiniz en iyi kafeler.',
  },
  {
    slug: 'otel',
    name: 'Oteller',
    nameEn: 'Hotels',
    description: 'Şanlıurfa\'da konaklama seçenekleri: lüks otellerden butik pansiyonlara',
    icon: 'Hotel',
    color: '#1D3557',
    sortOrder: 4,
    isActive: true,
    featured: true,
    metaTitle: 'Şanlıurfa Otelleri | Konaklama Rehberi',
    metaDescription: 'Şanlıurfa\'nın en iyi otelleri, fiyatları ve konaklama önerileri.',
  },
  {
    slug: 'park',
    name: 'Parklar',
    nameEn: 'Parks',
    description: 'Doğa ile iç içe olabileceğiniz, yürüyüş yapabileceğiniz parklar ve bahçeler',
    icon: 'Trees',
    color: '#2A9D8F',
    sortOrder: 5,
    isActive: true,
    featured: false,
  },
  {
    slug: 'muze',
    name: 'Müzeler',
    nameEn: 'Museums',
    description: 'Şanlıurfa\'nın kültürel mirasını sergileyen müzeler',
    icon: 'Building2',
    color: '#9B2226',
    sortOrder: 6,
    isActive: true,
    featured: false,
  },
  {
    slug: 'alisveris',
    name: 'Alışveriş',
    nameEn: 'Shopping',
    description: 'Hediyelik eşya, el sanatları ve alışveriş merkezleri',
    icon: 'ShoppingBag',
    color: '#E9C46A',
    sortOrder: 7,
    isActive: true,
    featured: false,
  },
  {
    slug: 'eglence',
    name: 'Eğlence',
    nameEn: 'Entertainment',
    description: 'Sinema, oyun salonları ve eğlence merkezleri',
    icon: 'PartyPopper',
    color: '#F4A261',
    sortOrder: 8,
    isActive: true,
    featured: false,
  },
  {
    slug: 'spor',
    name: 'Spor',
    nameEn: 'Sports',
    description: 'Spor salonları, stadyumlar ve spor tesisleri',
    icon: 'Dumbbell',
    color: '#264653',
    sortOrder: 9,
    isActive: true,
    featured: false,
  },
  {
    slug: 'saglik',
    name: 'Sağlık',
    nameEn: 'Health',
    description: 'Hastaneler, klinikler ve sağlık merkezleri',
    icon: 'HeartPulse',
    color: '#E76F51',
    sortOrder: 10,
    isActive: true,
    featured: false,
  },
  {
    slug: 'egitim',
    name: 'Eğitim',
    nameEn: 'Education',
    description: 'Üniversiteler, okullar ve kütüphaneler',
    icon: 'GraduationCap',
    color: '#457B9D',
    sortOrder: 11,
    isActive: true,
    featured: false,
  },
  {
    slug: 'dini',
    name: 'Dini Mekanlar',
    nameEn: 'Religious Sites',
    description: 'Cami, türbe ve dini yapılar',
    icon: 'Mosque',
    color: '#1D3557',
    sortOrder: 12,
    isActive: true,
    featured: true,
  },
  {
    slug: 'dogal',
    name: 'Doğal Güzellikler',
    nameEn: 'Natural Wonders',
    description: 'Göller, mağaralar ve doğal oluşumlar',
    icon: 'Mountain',
    color: '#2A9D8F',
    sortOrder: 13,
    isActive: true,
    featured: true,
  },
  {
    slug: 'piknik',
    name: 'Piknik Alanları',
    nameEn: 'Picnic Areas',
    description: 'Ailecek piknik yapabileceğiniz alanlar',
    icon: 'Tent',
    color: '#A8DADC',
    sortOrder: 14,
    isActive: true,
    featured: false,
  },
  {
    slug: 'fuar',
    name: 'Fuar ve Etkinlik',
    nameEn: 'Events & Fairs',
    description: 'Fuar alanları ve etkinlik mekanları',
    icon: 'CalendarDays',
    color: '#F4A261',
    sortOrder: 15,
    isActive: true,
    featured: false,
  },
];

// Initialize default categories
DEFAULT_CATEGORIES.forEach(cat => {
  const id = generateId();
  categories.set(id, { ...cat, id, placeCount: 0 });
});

/**
 * Get all categories
 */
export function getCategories(onlyActive = true): Category[] {
  let result = Array.from(categories.values());
  if (onlyActive) {
    result = result.filter(c => c.isActive);
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get featured categories
 */
export function getFeaturedCategories(): Category[] {
  return getCategories().filter(c => c.featured);
}

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): Category | null {
  return Array.from(categories.values()).find(c => c.slug === slug) || null;
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): Category | null {
  return categories.get(id) || null;
}

/**
 * Create new category
 */
export function createCategory(data: Omit<Category, 'id' | 'placeCount'>): Category {
  const category: Category = {
    ...data,
    id: generateId(),
    placeCount: 0,
  };
  categories.set(category.id, category);
  return category;
}

/**
 * Update category
 */
export function updateCategory(id: string, updates: Partial<Category>): Category | null {
  const category = categories.get(id);
  if (!category) return null;

  Object.assign(category, updates);
  return category;
}

/**
 * Delete category
 */
export function deleteCategory(id: string): boolean {
  return categories.delete(id);
}

/**
 * Get subcategories for a category
 */
export function getSubcategories(categoryId: string): Subcategory[] {
  return Array.from(subcategories.values())
    .filter(s => s.categoryId === categoryId);
}

/**
 * Create subcategory
 */
export function createSubcategory(data: Omit<Subcategory, 'id'>): Subcategory {
  const sub: Subcategory = {
    ...data,
    id: generateId(),
  };
  subcategories.set(sub.id, sub);
  return sub;
}

/**
 * Get category tree
 */
export function getCategoryTree(): CategoryWithSubs[] {
  return getCategories().map(cat => ({
    ...cat,
    subcategories: getSubcategories(cat.id),
  }));
}

/**
 * Update place count for category
 */
export function updatePlaceCount(categoryId: string, delta: number): void {
  const category = categories.get(categoryId);
  if (category) {
    category.placeCount = Math.max(0, category.placeCount + delta);
  }
}

// Şanlıurfa districts
export const URFA_DISTRICTS = [
  { slug: 'merkez', name: 'Merkez', lat: 37.1592, lon: 38.7969 },
  { slug: 'akcakale', name: 'Akçakale', lat: 36.7111, lon: 38.9483 },
  { slug: 'birecik', name: 'Birecik', lat: 37.0228, lon: 37.9733 },
  { slug: 'bozova', name: 'Bozova', lat: 37.3625, lon: 38.5267 },
  { slug: 'ceylanpinar', name: 'Ceylanpınar', lat: 36.8472, lon: 40.0489 },
  { slug: 'halfeti', name: 'Halfeti', lat: 37.2453, lon: 37.8686 },
  { slug: 'harran', name: 'Harran', lat: 36.8600, lon: 39.0314 },
  { slug: 'hilvan', name: 'Hilvan', lat: 37.5869, lon: 38.9550 },
  { slug: 'siverek', name: 'Siverek', lat: 37.7550, lon: 39.3164 },
  { slug: 'suruc', name: 'Suruç', lat: 36.9761, lon: 38.4233 },
  { slug: 'viransehir', name: 'Viranşehir', lat: 37.2236, lon: 39.7550 },
] as const;

// Price ranges
export const PRICE_RANGES = [
  { value: 'free', label: 'Ücretsiz', symbol: '0' },
  { value: 'cheap', label: 'Uygun', symbol: '₺' },
  { value: 'moderate', label: 'Orta', symbol: '₺₺' },
  { value: 'expensive', label: 'Pahalı', symbol: '₺₺₺' },
  { value: 'luxury', label: 'Lüks', symbol: '₺₺₺₺' },
] as const;

// Sort options
export const SORT_OPTIONS = [
  { value: 'popular', label: 'En Popüler' },
  { value: 'rating', label: 'En Yüksek Puan' },
  { value: 'newest', label: 'En Yeni' },
  { value: 'nearest', label: 'En Yakın' },
  { value: 'name', label: 'İsim (A-Z)' },
] as const;

/**
 * Filter places based on criteria
 */
export function filterPlaces(
  places: PlaceSummary[],
  filters: PlaceFilters,
  userLat?: number,
  userLon?: number
): PlaceSummary[] {
  let result = [...places];

  // Category filter
  if (filters.category) {
    result = result.filter(p => p.category === filters.category);
  }

  // District filter
  if (filters.district) {
    result = result.filter(p => p.district === filters.district);
  }

  // Price range filter
  if (filters.priceRange) {
    result = result.filter(p => p.priceRange === filters.priceRange);
  }

  // Features filter (all must match)
  if (filters.features && filters.features.length > 0) {
    result = result.filter(p =>
      filters.features!.every(f => p.tags.includes(f))
    );
  }

  // Rating filter
  if (filters.rating) {
    result = result.filter(p => p.rating >= filters.rating!);
  }

  // Search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  // Sort
  switch (filters.sortBy) {
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      result.sort((a, b) => b.id.localeCompare(a.id)); // Assuming ID includes timestamp
      break;
    case 'nearest':
      if (userLat && userLon) {
        result.sort((a, b) => {
          const distA = a.latitude && a.longitude
            ? calculateDistance(userLat, userLon, a.latitude, a.longitude)
            : Infinity;
          const distB = b.latitude && b.longitude
            ? calculateDistance(userLat, userLon, b.latitude, b.longitude)
            : Infinity;
          return distA - distB;
        });
      }
      break;
    case 'name':
      result.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      break;
    case 'popular':
    default:
      result.sort((a, b) => b.visitCount - a.visitCount);
      break;
  }

  return result;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get discovery content for homepage
 */
export function getDiscoveryContent(places: PlaceSummary[]): DiscoveryResult {
  return {
    featured: places.filter(p => p.isFeatured).slice(0, 6),
    trending: [...places]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 8),
    nearby: [], // Will be populated with user location
    newPlaces: [...places]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 6),
    byCategory: getCategories().reduce((acc, cat) => {
      acc[cat.slug] = places
        .filter(p => p.category === cat.slug)
        .slice(0, 4);
      return acc;
    }, {} as Record<string, PlaceSummary[]>),
  };
}

/**
 * Get related places
 */
export function getRelatedPlaces(
  place: PlaceSummary,
  allPlaces: PlaceSummary[],
  limit: number = 6
): PlaceSummary[] {
  // Score each place based on similarity
  const scored = allPlaces
    .filter(p => p.id !== place.id)
    .map(p => {
      let score = 0;
      
      // Same category: +3
      if (p.category === place.category) score += 3;
      
      // Same district: +2
      if (p.district === place.district) score += 2;
      
      // Shared tags: +1 each
      const sharedTags = p.tags.filter(t => place.tags.includes(t));
      score += sharedTags.length;
      
      // Similar rating: +1
      if (Math.abs(p.rating - place.rating) < 0.5) score += 1;
      
      return { place: p, score };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.place);
}
