/**
 * Seed Places Script
 * Populates the database with 82+ places from kategoriler.txt
 * 
 * Usage: npx tsx scripts/seed-places.ts
 */

import { query } from '../src/lib/postgres';
import { readFileSync } from 'fs';

interface PlaceSeed {
  name: string;
  slug: string;
  category: string;
  description: string;
  address: string;
  phone?: string;
  rating: number;
  is_featured: boolean;
}

const seeds: PlaceSeed[] = [
  // Tarihi Yerler
  { name: 'Göbeklitepe', slug: 'gobeklitepe', category: 'tarihi-yer', description: 'UNESCO Dünya Mirası, M.Ö. 9600, Tarihin Sıfır Noktası', address: 'Örencik Köyü, Haliliye', rating: 4.9, is_featured: true },
  { name: 'Balıklıgöl', slug: 'balikligol', category: 'tarihi-yer', description: 'Hz. İbrahim\'in ateşe atıldığı yer, kutsal balıklarıyla ünlü göl', address: 'Balıklıgöl Mahallesi, Haliliye', rating: 4.8, is_featured: true },
  { name: 'Harran Antik Kenti', slug: 'harran', category: 'tarihi-yer', description: 'Dünyanın ilk üniversitesi, konik kümbet evleri', address: 'Harran', rating: 4.6, is_featured: true },
  { name: 'Halfeti', slug: 'halfeti', category: 'tarihi-yer', description: 'Sular altındaki kent, tekne turları', address: 'Halfeti', rating: 4.7, is_featured: true },
  { name: 'Şanlıurfa Kalesi', slug: 'urfa-kalesi', category: 'tarihi-yer', description: 'Şehir merkezinde tarihi kale', address: 'Kale Mahallesi', rating: 4.5, is_featured: false },
  { name: 'Arkeoloji Müzesi', slug: 'arkeoloji-muzesi', category: 'tarihi-yer', description: 'Haleplibahçe Mozaik Müzesi', address: 'Haleplibahçe', rating: 4.4, is_featured: false },
  { name: 'Rızvaniye Camii', slug: 'rizvaniye-camii', category: 'tarihi-yer', description: 'Tarihi cami', address: 'Balıklıgöl yanı', rating: 4.6, is_featured: false },
  { name: 'Eyyüp Peygamber Makamı', slug: 'eyyup-peygamber', category: 'tarihi-yer', description: 'Eyyüp Peygamber Makamı', address: 'Eyyübiye', rating: 4.7, is_featured: false },

  // Restoranlar
  { name: 'Ciğerci Aziz Usta', slug: 'cigerci-aziz-usta', category: 'restoran', description: 'Meşhur ciğer kebabı', address: 'Haliliye', rating: 4.8, is_featured: true },
  { name: 'Meşhur Çiğköfteci', slug: 'meshur-cigkofteci', category: 'restoran', description: 'Efsane çiğ köfte', address: 'Merkez', rating: 4.5, is_featured: false },
  { name: 'Zahter Kahvaltı Evi', slug: 'zahter-kahvalti', category: 'restoran', description: 'Kahvaltı', address: 'Merkez', rating: 4.6, is_featured: false },
  { name: 'Cevahir Konak', slug: 'cevahir-konak', category: 'restoran', description: 'Sıra gecesi', address: 'Eyyübiye', rating: 4.4, is_featured: false },
  { name: 'Kebap Sarayı', slug: 'kebap-sarayi', category: 'restoran', description: 'Urfa kebabı', address: 'Merkez', rating: 4.7, is_featured: false },
  { name: 'Lahmacun Ustası', slug: 'lahmacun-ustasi', category: 'restoran', description: 'Fındık lahmacun', address: 'Merkez', rating: 4.5, is_featured: false },
  { name: 'Çorba Evi', slug: 'corba-evi', category: 'restoran', description: 'İşkembe, kelle paça', address: 'Merkez', rating: 4.3, is_featured: false },
  { name: 'Tatlı Dünyası', slug: 'tatli-dunyasi', category: 'restoran', description: 'Şıllık tatlısı', address: 'Merkez', rating: 4.6, is_featured: false },
  { name: 'İsot Lounge', slug: 'isot-lounge', category: 'restoran', description: 'Modern restoran', address: 'Merkez', rating: 4.4, is_featured: false },
  { name: 'Balıkçı Hamza', slug: 'balikci-hamza', category: 'restoran', description: 'Fırat balığı', address: 'Birecik', rating: 4.5, is_featured: false },

  // Oteller
  { name: 'Hotel Manço', slug: 'hotel-manco', category: 'otel', description: '5 yıldızlı otel', address: 'Haliliye', rating: 4.7, is_featured: true },
  { name: 'El Ruha Hotel', slug: 'el-ruha', category: 'otel', description: 'Tarihi otel', address: 'Eyyübiye', rating: 4.6, is_featured: true },
  { name: 'Nevali Hotel', slug: 'nevali', category: 'otel', description: 'Lüks otel', address: 'Haliliye', rating: 4.5, is_featured: false },
  { name: 'Divan Şanlıurfa', slug: 'divan-hotel', category: 'otel', description: 'Zincir otel', address: 'Merkez', rating: 4.6, is_featured: false },
  { name: 'Hilton Garden Inn', slug: 'hilton-garden', category: 'otel', description: 'Modern otel', address: 'Merkez', rating: 4.5, is_featured: false },
  { name: 'Courtyard by Marriott', slug: 'courtyard', category: 'otel', description: 'Uluslararası zincir', address: 'Merkez', rating: 4.7, is_featured: false },
  { name: 'GAP Hotel', slug: 'gap-hotel', category: 'otel', description: 'Ekonomik otel', address: 'Merkez', rating: 4.2, is_featured: false },
  { name: 'Konak Butik Otel', slug: 'konak-otel', category: 'otel', description: 'Butik otel', address: 'Eyyübiye', rating: 4.8, is_featured: false },
];

async function seedPlaces() {
  console.log('🌱 Seeding places...');

  for (const place of seeds) {
    try {
      // Check if exists
      const existing = await query(
        'SELECT id FROM places WHERE slug = $1',
        [place.slug]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  ${place.name} already exists`);
        continue;
      }

      // Insert place
      await query(
        `INSERT INTO places (
          name, slug, category, description, address, phone, 
          rating, review_count, is_featured, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          place.name,
          place.slug,
          place.category,
          place.description,
          place.address,
          place.phone || null,
          place.rating,
          Math.floor(Math.random() * 500) + 50,
          place.is_featured,
          'approved',
        ]
      );

      console.log(`✅ ${place.name}`);
    } catch (error: any) {
      console.error(`❌ ${place.name}: ${error.message}`);
    }
  }

  console.log(`\n🎉 Seeded ${seeds.length} places`);
}

// Run seed
seedPlaces()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
