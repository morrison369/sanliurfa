/**
 * Sample Data Seeding Script
 * Populates database with sample content
 */

import { query } from '../src/lib/postgres';

const districts = ['Haliliye', 'Karaköprü', 'Eyyübiye', 'Birecik', 'Siverek', 'Viranşehir', 'Suruç', 'Harran'];

const categories = [
  { id: 'cat-001', name: 'Restoran', slug: 'restoran', icon: '🍽️' },
  { id: 'cat-002', name: 'Kafe', slug: 'kafe', icon: '☕' },
  { id: 'cat-003', name: 'Otel', slug: 'otel', icon: '🏨' },
  { id: 'cat-004', name: 'Alışveriş', slug: 'alisveris', icon: '🛍️' },
  { id: 'cat-005', name: 'Tarihi Yer', slug: 'tarihi-yer', icon: '🏛️' },
  { id: 'cat-006', name: 'Park', slug: 'park', icon: '🌳' },
  { id: 'cat-007', name: 'Spor Salonu', slug: 'spor-salonu', icon: '💪' },
  { id: 'cat-008', name: 'Eczane', slug: 'eczane', icon: '💊' },
];

const places = [
  {
    name: 'Ciğerci Aziz',
    category_id: 'cat-001',
    description: 'Şanlıurfa\'nın en meşhur ciğercisi. Geleneksel lezzetlerin adresi.',
    address: 'Yavuz Selim Mah. Ciğer Sok. No:5',
    district: 'Haliliye',
    phone: '+90 414 215 00 01',
    price_level: 2,
    rating: 4.8,
  },
  {
    name: 'Balıklıgöl',
    category_id: 'cat-005',
    description: 'Hz. İbrahim\'in atıldığı, kutsal sayılan balıkların yüzdüğü tarihi göl.',
    address: 'Balıklıgöl Mah.',
    district: 'Eyyübiye',
    phone: null,
    price_level: 1,
    rating: 4.9,
  },
  {
    name: 'Kahve Dünyası',
    category_id: 'cat-002',
    description: 'Modern dekorasyonlu, geniş kahve menülü kafe.',
    address: 'Atatürk Bulvarı No:123',
    district: 'Haliliye',
    phone: '+90 414 223 45 67',
    price_level: 2,
    rating: 4.3,
  },
  {
    name: 'Hilton Garden Inn',
    category_id: 'cat-003',
    description: '5 yıldızlı otel, spa ve kongre merkezi.',
    address: 'Gölbaşı Cad. No:45',
    district: 'Haliliye',
    phone: '+90 414 318 50 00',
    price_level: 4,
    rating: 4.6,
  },
  {
    name: 'Urfa Park AVM',
    category_id: 'cat-004',
    description: 'Modern alışveriş merkezi, sinema ve restoranlar.',
    address: 'Karaköprü Yolu 3. km',
    district: 'Karaköprü',
    phone: '+90 414 250 00 00',
    price_level: 3,
    rating: 4.2,
  },
  {
    name: 'Göbeklitepe',
    category_id: 'cat-005',
    description: 'Dünyanın en eski tapınağı, UNESCO Dünya Mirası.',
    address: 'Örencik Köyü',
    district: 'Haliliye',
    phone: '+90 414 318 80 00',
    price_level: 2,
    rating: 4.9,
  },
  {
    name: 'Cevahir City Hotel',
    category_id: 'cat-003',
    description: 'Merkezi konumlu, uygun fiyatlı otel.',
    address: 'Cumhuriyet Cad. No:78',
    district: 'Haliliye',
    phone: '+90 414 216 00 00',
    price_level: 2,
    rating: 4.1,
  },
  {
    name: 'Mardin Kahvesi',
    category_id: 'cat-002',
    description: 'Geleneksel menengiç kahvesi ve dibek kahvesi.',
    address: 'Çarşı içi No:12',
    district: 'Eyyübiye',
    phone: '+90 414 214 00 00',
    price_level: 1,
    rating: 4.7,
  },
  {
    name: 'Haşimi Et Lokantası',
    category_id: 'cat-001',
    description: 'Güneydoğu mutfağının en iyi örnekleri.',
    address: 'Sarayönü Cad. No:34',
    district: 'Haliliye',
    phone: '+90 414 215 55 55',
    price_level: 3,
    rating: 4.5,
  },
  {
    name: 'Eyyüp Nebi Camii',
    category_id: 'cat-005',
    description: 'Tarihi cami ve külliye, ziyaretçi akınına uğruyor.',
    address: 'Eyyüp Nebi Mah.',
    district: 'Eyyübiye',
    phone: null,
    price_level: 1,
    rating: 4.8,
  },
];

const blogPosts = [
  {
    title: 'Şanlıurfa\'da Mutlaka Denemeniz Gereken 10 Lezzet',
    slug: 'sanliurfada-mutlaka-denemeniz-gereken-10-lezzet',
    excerpt: 'Ciğerden çiğ köfteye, baklavadan şıranın en iyileri...',
    content: 'Şanlıurfa, Türkiye\'nin gastronomi başkentlerinden biri...',
    status: 'published',
  },
  {
    title: 'Göbeklitepe: Tarihin Sıfır Noktası',
    slug: 'gobeklitepe-tarihin-sifir-noktasi',
    excerpt: '12.000 yıllık geçmişiyle insanlık tarihini yeniden yazan keşif...',
    content: 'Göbeklitepe, 1994 yılında keşfedilen ve dünya tarihini değiştiren...',
    status: 'published',
  },
  {
    title: 'Balıklıgöl ve Hz. İbrahim Efsanesi',
    slug: 'balikligol-ve-hz-ibrahim-efsanesi',
    excerpt: 'Kutsal balıkların ve eşsiz mimarinin buluştuğu yer...',
    content: 'Balıklıgöl, Şanlıurfa\'nın en önemli sembollerinden biri...',
    status: 'published',
  },
];

/**
 * Seed categories
 */
async function seedCategories() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await query(
      `INSERT INTO categories (id, name, slug, icon, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET name = $2, slug = $3`,
      [cat.id, cat.name, cat.slug, cat.icon]
    );
  }
  console.log(`✓ ${categories.length} categories seeded`);
}

/**
 * Seed places
 */
async function seedPlaces() {
  console.log('Seeding places...');
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const lat = 37.1590 + (Math.random() - 0.5) * 0.1;
    const lng = 38.7969 + (Math.random() - 0.5) * 0.1;
    
    await query(
      `INSERT INTO places 
       (id, name, category_id, description, address, district, phone, 
        price_level, rating, latitude, longitude, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW())
       ON CONFLICT (id) DO UPDATE SET 
       name = $2, description = $4, address = $5, rating = $9`,
      [
        `place-${String(i + 1).padStart(3, '0')}`,
        place.name,
        place.category_id,
        place.description,
        place.address,
        place.district,
        place.phone,
        place.price_level,
        place.rating,
        lat,
        lng,
      ]
    );
  }
  console.log(`✓ ${places.length} places seeded`);
}

/**
 * Seed blog posts
 */
async function seedBlogPosts() {
  console.log('Seeding blog posts...');
  for (let i = 0; i < blogPosts.length; i++) {
    const post = blogPosts[i];
    await query(
      `INSERT INTO blog_posts 
       (id, title, slug, excerpt, content, status, created_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET 
       title = $2, excerpt = $4, content = $5`,
      [
        `blog-${String(i + 1).padStart(3, '0')}`,
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        post.status,
      ]
    );
  }
  console.log(`✓ ${blogPosts.length} blog posts seeded`);
}

/**
 * Run all seeders
 */
export async function runSeeders() {
  console.log('🌱 Starting data seeding...\n');
  
  try {
    await seedCategories();
    await seedPlaces();
    await seedBlogPosts();
    
    console.log('\n✅ All seeders completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runSeeders().then(() => process.exit(0));
}
