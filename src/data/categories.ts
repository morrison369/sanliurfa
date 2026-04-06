// Site Kategorileri ve Yapılandırması

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
}

// Mekan Kategorileri
export const placeCategories: Category[] = [
  { id: 'restaurant', name: 'Restoran', slug: 'restoran', description: 'Yerel ve uluslararası mutfaklar', icon: 'utensils', color: '#EF4444', sortOrder: 1, isActive: true },
  { id: 'cafe', name: 'Kafe', slug: 'kafe', description: 'Kahve ve tatlı mekanları', icon: 'coffee', color: '#F59E0B', sortOrder: 2, isActive: true },
  { id: 'hotel', name: 'Otel', slug: 'otel', description: 'Konaklama ve oteller', icon: 'bed', color: '#3B82F6', sortOrder: 3, isActive: true },
  { id: 'museum', name: 'Müze', slug: 'muze', description: 'Tarihi ve kültürel müzeler', icon: 'landmark', color: '#8B5CF6', sortOrder: 4, isActive: true },
  { id: 'park', name: 'Park', slug: 'park', description: 'Park ve mesire alanları', icon: 'tree-pine', color: '#10B981', sortOrder: 5, isActive: true },
  { id: 'shopping', name: 'Alışveriş', slug: 'alisveris', description: 'Alışveriş merkezleri ve çarşılar', icon: 'shopping-bag', color: '#EC4899', sortOrder: 6, isActive: true },
  { id: 'entertainment', name: 'Eğlence', slug: 'eglence', description: 'Eğlence ve aktivite mekanları', icon: 'party-popper', color: '#F97316', sortOrder: 7, isActive: true },
  { id: 'other', name: 'Diğer', slug: 'diger', description: 'Diğer mekanlar', icon: 'more-horizontal', color: '#6B7280', sortOrder: 8, isActive: true },
];

// Blog Kategorileri
export const blogCategories: Category[] = [
  { id: 'genel', name: 'Genel', slug: 'genel', description: 'Genel konular', icon: 'file-text', color: '#6B7280', sortOrder: 1, isActive: true },
  { id: 'kultur-sanat', name: 'Kültür & Sanat', slug: 'kultur-sanat', type: 'blog', description: 'Kültürel ve sanatsal içerikler', icon: 'palette', color: '#8B5CF6', sortOrder: 2, isActive: true },
  { id: 'gastronomi', name: 'Gastronomi', slug: 'gastronomi', type: 'blog', description: 'Yemek ve lezzet kültürü', icon: 'utensils', color: '#F59E0B', sortOrder: 3, isActive: true },
  { id: 'tarih', name: 'Tarih', slug: 'tarih', type: 'blog', description: 'Tarihi yazılar ve araştırmalar', icon: 'scroll', color: '#78350F', sortOrder: 4, isActive: true },
  { id: 'gezi-rehberi', name: 'Gezi Rehberi', slug: 'gezi-rehberi', type: 'blog', description: 'Gezi ve seyahat rehberleri', icon: 'map', color: '#10B981', sortOrder: 5, isActive: true },
  { id: 'etkinlik', name: 'Etkinlik', slug: 'etkinlik', type: 'blog', description: 'Etkinlik duyuruları', icon: 'calendar', color: '#3B82F6', sortOrder: 6, isActive: true },
  { id: 'haber', name: 'Haber', slug: 'haber', type: 'blog', description: 'Şanlıurfa haberleri', icon: 'newspaper', color: '#EF4444', sortOrder: 7, isActive: true },
];

// Etkinlik Kategorileri
export const eventCategories = [
  { id: 'kultur-sanat', name: 'Kültür & Sanat', slug: 'kultur-sanat', description: 'Kültürel ve sanatsal etkinlikler', icon: 'palette', color: '#8B5CF6', sortOrder: 1, isActive: true },
  { id: 'gastronomi', name: 'Gastronomi', slug: 'gastronomi', description: 'Yemek festivalleri ve tadım etkinlikleri', icon: 'utensils', color: '#F59E0B', sortOrder: 2, isActive: true },
  { id: 'tarih', name: 'Tarih', slug: 'tarih', description: 'Tarihi etkinlikler ve sempozyumlar', icon: 'scroll', color: '#78350F', sortOrder: 3, isActive: true },
  { id: 'muzik', name: 'Müzik', slug: 'muzik', description: 'Konser ve müzik etkinlikleri', icon: 'music', color: '#EC4899', sortOrder: 4, isActive: true },
  { id: 'spor', name: 'Spor', slug: 'spor', description: 'Spor müsabakaları ve etkinlikleri', icon: 'trophy', color: '#10B981', sortOrder: 5, isActive: true },
  { id: 'egitim', name: 'Eğitim', slug: 'egitim', description: 'Seminer ve eğitim etkinlikleri', icon: 'graduation-cap', color: '#3B82F6', sortOrder: 6, isActive: true },
  { id: 'diger', name: 'Diğer', slug: 'diger', description: 'Diğer etkinlikler', icon: 'more-horizontal', color: '#6B7280', sortOrder: 7, isActive: true },
];

// Tarihi Dönemler
export const historicalPeriods = [
  { id: 'tunc-cagi', name: 'Tunç Çağı', label: 'MÖ 3000-1200' },
  { id: 'hitit', name: 'Hitit Dönemi', label: 'MÖ 1600-1200' },
  { id: 'asur', name: 'Asur Dönemi', label: 'MÖ 2000-600' },
  { id: 'pers', name: 'Pers Dönemi', label: 'MÖ 550-330' },
  { id: 'hellenistik', name: 'Hellenistik Dönem', label: 'MÖ 330-129' },
  { id: 'roma', name: 'Roma Dönemi', label: 'MÖ 129 - MS 395' },
  { id: 'bizans', name: 'Bizans Dönemi', label: 'MS 395-638' },
  { id: 'islami', name: 'İslami Dönem', label: 'MS 638-1098' },
  { id: 'osmanli', name: 'Osmanlı Dönemi', label: 'MS 1517-1918' },
  { id: 'cumhuriyet', name: 'Cumhuriyet Dönemi', label: 'MS 1923-günümüz' },
];

// Yardımcı fonksiyonlar
export function getCategoryBySlug(slug: string, type: 'place' | 'blog' | 'event' = 'place'): Category | undefined {
  const categories = type === 'place' ? placeCategories : type === 'blog' ? blogCategories : eventCategories;
  return categories.find(c => c.slug === slug);
}

export function getCategoryName(slug: string, type: 'place' | 'blog' | 'event' = 'place'): string {
  const category = getCategoryBySlug(slug, type);
  return category?.name || slug;
}

export function getAllCategories(type: 'place' | 'blog' | 'event' = 'place'): Category[] {
  const categories = type === 'place' ? placeCategories : type === 'blog' ? blogCategories : eventCategories;
  return categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}
