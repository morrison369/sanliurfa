export type CuratedPlace = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  address: string;
  images: string[];
  rating: number;
  review_count: number;
  price_range: number;
  tags: string[];
  is_featured: boolean;
  is_verified: boolean;
  status: 'active';
};

export const curatedPlaces: CuratedPlace[] = [
  {
    id: 'curated-gobeklitepe',
    slug: 'gobeklitepe',
    name: 'Göbeklitepe',
    description:
      'UNESCO Dünya Mirası listesindeki Göbeklitepe, Şanlıurfa gezisinin en güçlü tarih ve arkeoloji duraklarından biridir.',
    category: 'museum',
    address: 'Örencik, Haliliye / Şanlıurfa',
    images: ['/images/historical/gobeklitepe.jpg'],
    rating: 4.9,
    review_count: 128,
    price_range: 2,
    tags: ['Tarih', 'UNESCO'],
    is_featured: true,
    is_verified: true,
    status: 'active',
  },
  {
    id: 'curated-balikligol',
    slug: 'balikligol',
    name: 'Balıklıgöl',
    description:
      'Balıklıgöl, Şanlıurfa merkezde inanç turizmi, tarihi doku ve şehir gezisini aynı noktada buluşturan simge alandır.',
    category: 'park',
    address: 'Eyyübiye / Şanlıurfa',
    images: ['/images/historical/balikligol.jpg'],
    rating: 4.8,
    review_count: 214,
    price_range: 1,
    tags: ['İnanç', 'Merkez'],
    is_featured: true,
    is_verified: true,
    status: 'active',
  },
  {
    id: 'curated-urfa-kebabi',
    slug: 'urfa-kebabi',
    name: 'Urfa Kebabı Deneyimi',
    description:
      'Şanlıurfa mutfağının öne çıkan lezzetlerinden Urfa kebabı için restoran, sıra gecesi ve yöresel sofra önerileri.',
    category: 'restaurant',
    address: 'Şanlıurfa Merkez',
    images: ['/images/foods/urfa-kebabi.jpg'],
    rating: 4.7,
    review_count: 96,
    price_range: 3,
    tags: ['Gastronomi', 'Yöresel'],
    is_featured: true,
    is_verified: true,
    status: 'active',
  },
  {
    id: 'curated-cig-kofte',
    slug: 'cig-kofte',
    name: 'Şanlıurfa Çiğ Köfte',
    description:
      'İsot, bulgur ve yöresel lezzet kültürüyle hazırlanan Şanlıurfa çiğ köftesi için şehirdeki lezzet rotaları.',
    category: 'restaurant',
    address: 'Şanlıurfa Merkez',
    images: ['/images/foods/cig-kofte.jpg'],
    rating: 4.6,
    review_count: 74,
    price_range: 2,
    tags: ['İsot', 'Lezzet'],
    is_featured: true,
    is_verified: true,
    status: 'active',
  },
  {
    id: 'curated-isot',
    slug: 'isot',
    name: 'İsot ve Baharat Rotası',
    description:
      'Şanlıurfa isot kültürünü, baharatçıları ve yöresel ürün alışverişini keşfetmek isteyenler için pratik rota.',
    category: 'shopping',
    address: 'Tarihi Çarşılar Bölgesi / Şanlıurfa',
    images: ['/images/foods/isot.jpg'],
    rating: 4.5,
    review_count: 58,
    price_range: 2,
    tags: ['Baharat', 'Alışveriş'],
    is_featured: false,
    is_verified: true,
    status: 'active',
  },
  {
    id: 'curated-sillik-tatlisi',
    slug: 'sillik-tatlisi',
    name: 'Şıllık Tatlısı',
    description:
      'Şanlıurfa mutfağının sevilen tatlılarından şıllık tatlısı için geleneksel tatlıcı ve yöresel lezzet önerileri.',
    category: 'cafe',
    address: 'Şanlıurfa Merkez',
    images: ['/images/foods/sillik-tatlisi.jpg'],
    rating: 4.4,
    review_count: 42,
    price_range: 2,
    tags: ['Tatlı', 'Yöresel'],
    is_featured: false,
    is_verified: true,
    status: 'active',
  },
];

export function getCuratedPlaces(limit?: number): CuratedPlace[] {
  return typeof limit === 'number' ? curatedPlaces.slice(0, limit) : curatedPlaces;
}
