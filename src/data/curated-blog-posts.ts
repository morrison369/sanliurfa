export type CuratedBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  cover_image: string;
  categoryName: string;
  category: string;
  authorName: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  readTimeMinutes: number;
  viewCount: number;
  tags: string[];
  isFeatured: boolean;
  is_featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

const now = new Date('2026-04-22T00:00:00.000Z');

export const curatedBlogPosts: CuratedBlogPost[] = [
  {
    id: 'blog-sanliurfa-gezi-rehberi',
    slug: 'sanliurfa-gezi-rehberi',
    title: 'Şanlıurfa Gezi Rehberi: İlk Kez Gelenler İçin Rota',
    excerpt:
      'Göbeklitepe, Balıklıgöl, Harran ve tarihi çarşıları kapsayan pratik Şanlıurfa gezi planı.',
    content:
      'Şanlıurfa gezisine şehir merkezinden başlamak, Balıklıgöl ve tarihi çarşıları aynı gün içinde görmek için doğru bir başlangıçtır. İkinci gün Göbeklitepe ve Harran rotası planlanabilir. Gastronomi için Urfa kebabı, çiğ köfte, isot ve şıllık tatlısı mutlaka denenmelidir.',
    featuredImage: '/images/og-home.jpg',
    cover_image: '/images/og-home.jpg',
    categoryName: 'Gezi Rehberi',
    category: 'gezi-rehberi',
    authorName: 'sanliurfa.com editörü',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    readTimeMinutes: 4,
    viewCount: 0,
    tags: ['Şanlıurfa', 'gezi rehberi', 'Göbeklitepe'],
    isFeatured: true,
    is_featured: true,
    seoTitle: 'Şanlıurfa Gezi Rehberi',
    seoDescription: 'Şanlıurfa gezisi için Göbeklitepe, Balıklıgöl, Harran ve gastronomi rotası.',
  },
  {
    id: 'blog-sanliurfa-gastronomi',
    slug: 'sanliurfa-gastronomi-rehberi',
    title: 'Şanlıurfa Gastronomi Rehberi: Ne Yenir?',
    excerpt:
      'Urfa kebabı, çiğ köfte, isot ve şıllık tatlısı başta olmak üzere Şanlıurfa mutfağının öne çıkanları.',
    content:
      'Şanlıurfa mutfağı, et yemekleri, isot kullanımı, yöresel tatlılar ve sofra kültürüyle güçlü bir kimliğe sahiptir. Urfa kebabı ve çiğ köfte en bilinen lezzetlerdir; isot ise bu mutfağın karakterini belirler.',
    featuredImage: '/images/foods/urfa-kebabi.jpg',
    cover_image: '/images/foods/urfa-kebabi.jpg',
    categoryName: 'Gastronomi',
    category: 'gastronomi',
    authorName: 'sanliurfa.com editörü',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    readTimeMinutes: 3,
    viewCount: 0,
    tags: ['Şanlıurfa', 'gastronomi', 'Urfa kebabı'],
    isFeatured: false,
    is_featured: false,
  },
  {
    id: 'blog-tarihi-yerler',
    slug: 'sanliurfa-tarihi-yerler',
    title: 'Şanlıurfa Tarihi Yerler: Göbeklitepe’den Balıklıgöl’e',
    excerpt:
      'Şanlıurfa’nın en önemli tarihi duraklarını ve bu rotaları nasıl planlayacağınızı anlatan kısa rehber.',
    content:
      'Şanlıurfa tarihi yerler açısından Türkiye’nin en güçlü şehirlerinden biridir. Göbeklitepe, Balıklıgöl ve Harran farklı dönemleri ve kültürel katmanları bir arada sunar.',
    featuredImage: '/images/historical/gobeklitepe.jpg',
    cover_image: '/images/historical/gobeklitepe.jpg',
    categoryName: 'Tarih',
    category: 'tarih',
    authorName: 'sanliurfa.com editörü',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    readTimeMinutes: 3,
    viewCount: 0,
    tags: ['Şanlıurfa', 'tarih', 'Balıklıgöl'],
    isFeatured: false,
    is_featured: false,
  },
];

export const curatedBlogCategories = [
  { id: 1, slug: 'gezi-rehberi', name: 'Gezi Rehberi', description: 'Şanlıurfa gezi rotaları', postCount: 1 },
  { id: 2, slug: 'gastronomi', name: 'Gastronomi', description: 'Şanlıurfa mutfağı', postCount: 1 },
  { id: 3, slug: 'tarih', name: 'Tarih', description: 'Şanlıurfa tarihi yerleri', postCount: 1 },
];

export function getCuratedBlogPosts(categorySlug?: string | null): CuratedBlogPost[] {
  return categorySlug ? curatedBlogPosts.filter((post) => post.category === categorySlug) : curatedBlogPosts;
}

export function getCuratedBlogPostBySlug(slug: string | undefined): CuratedBlogPost | null {
  if (!slug) return null;
  return curatedBlogPosts.find((post) => post.slug === slug) || null;
}
