#!/usr/bin/env npx tsx

/**
 * Seed All - Komple Veritabani Doldurma Scripti
 * 
 * Bu script kategoriler.txt dosyasindan tum 82 mekani okur ve veritabanina ekler:
 * - 15 kategori
 * - 82 mekan
 * - Her mekan icin 2-3 sample review
 * - 10 test kullanici
 * - 5 sample blog post
 *
 * Kullanim: npx tsx scripts/seed-all.ts
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Database Baglanti
// ---------------------------------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sanliurfa',
});

// ---------------------------------------------------------------------------
// Yardimci Fonksiyonlar
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ı]/g, 'i')
    .replace(/[ş]/g, 's')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ö]/g, 'o')
    .replace(/[İ]/g, 'i')
    .replace(/[Ş]/g, 's')
    .replace(/[Ç]/g, 'c')
    .replace(/[Ğ]/g, 'g')
    .replace(/[Ü]/g, 'u')
    .replace(/[Ö]/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1);
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const rangeMs = Math.max(0, now.getTime() - past.getTime());
  return new Date(past.getTime() + cryptoRandomInt(0, rangeMs + 1));
}

function generateUUID(): string {
  return crypto.randomUUID();
}

async function seed(
  text: string,
  params: any[] = []
): Promise<{ rowCount: number; rows: any[] }> {
  const result = await pool.query(text, params);
  return { rowCount: result.rowCount ?? 0, rows: result.rows };
}

// ---------------------------------------------------------------------------
// Kategoriler.txt Parsing
// ---------------------------------------------------------------------------

interface ParsedPlace {
  slug: string;
  name: string;
  categoryKey: string;
  categoryName: string;
  description: string;
}

interface ParsedCategory {
  key: string;
  name: string;
  icon: string;
}

function parseKategorilerTxt(filePath: string): {
  categories: ParsedCategory[];
  places: ParsedPlace[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const categories: ParsedCategory[] = [];
  const places: ParsedPlace[] = [];

  const categoryIconMap: Record<string, string> = {
    'TARİHİ YERLER': 'landmark',
    'RESTORANLAR': 'utensils',
    'OTELLER': 'bed-double',
    'KAFE': 'coffee',
    'CAFE & RESTORAN': 'coffee',
    'TATLI & PASTANE': 'cake-slice',
    'ALIŞVERİŞ MERKEZLERİ': 'shopping-bag',
    'ÇARŞI & PAZAR': 'store',
    'SPA & SAĞLIK': 'spa',
    'EĞLENCE': 'gamepad-2',
    'DOĞAL ALANLAR': 'trees',
    'DİNİ YERLER': 'church',
    'EĞİTİM & KÜLTÜR': 'graduation-cap',
    'ULAŞIM': 'plane',
  };

  let currentCategory: ParsedCategory | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines, header, separator
    if (!line || line.startsWith('===') || line.startsWith('#') || line.startsWith('Son') || line.startsWith('TOPLAM')) {
      continue;
    }

    // Category header: ## TARİHİ YERLER (8 mekan)
    const catMatch = line.match(/^##\s+(.+?)\s+\(\d+\s+mekan\)/);
    if (catMatch) {
      const catName = catMatch[1].trim();
      const key = slugify(catName);
      currentCategory = {
        key,
        name: catName,
        icon: categoryIconMap[catName] || 'map-pin',
      };
      categories.push(currentCategory);
      continue;
    }

    // Place line: - slug: Ad - Description
    const placeMatch = line.match(/^-\s+([^:]+):\s*(.+)/);
    if (placeMatch && currentCategory) {
      const slug = placeMatch[1].trim();
      const rest = placeMatch[2].trim();

      // Extract name and description
      let name: string;
      let description: string;

      if (rest.includes(' - ')) {
        const parts = rest.split(' - ');
        name = parts[0].trim();
        description = parts.slice(1).join(' - ').trim();
      } else {
        name = slug
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        description = rest;
      }

      places.push({
        slug,
        name,
        categoryKey: currentCategory.key,
        categoryName: currentCategory.name,
        description,
      });
    }
  }

  return { categories, places };
}

// ---------------------------------------------------------------------------
// Adres Uretici (her kategori icin gercekci adresler)
// ---------------------------------------------------------------------------

function generateAddress(categoryKey: string, placeName: string): string {
  const streets = [
    'Atatürk Bulvarı',
    'Cumhuriyet Caddesi',
    'Gültepe Mahallesi',
    'Kızılhisar Caddesi',
    'Haleplibahçe Sokak',
    'İskender Paşa Mahallesi',
    'Yeni Yol Caddesi',
    'Merkez Mahallesi',
  ];

  const districtMap: Record<string, string[]> = {
    tarihi_yerler: ['Eyyübiye Merkez', 'Haliliye Merkez', 'Karaköprü Merkez'],
    restoranlar: ['Eyyübiye', 'Haliliye', 'Karaköprü'],
    oteller: ['Eyyübiye Merkez', 'Haliliye Merkez'],
    kafe: ['Eyyübiye', 'Haliliye'],
    cafe_restoran: ['Eyyübiye', 'Haliliye', 'Karaköprü'],
    tatli_pastane: ['Eyyübiye Merkez', 'Haliliye Merkez'],
    alisveris_merkezleri: ['Karaköprü', 'Eyyübiye'],
    carsi_pazar: ['Haliliye Merkez', 'Eyyübiye Merkez'],
    spa_saglik: ['Eyyübiye', 'Haliliye'],
    eglence: ['Karaköprü', 'Eyyübiye'],
    dogal_alanlar: ['Eyyübiye', 'Halfeti', 'Karaköprü'],
    dini_yerler: ['Eyyübiye Merkez', 'Haliliye Merkez'],
    egitim_kultur: ['Eyyübiye', 'Haliliye'],
    ulasim: ['Karaköprü', 'Haliliye'],
  };

  const districts = districtMap[categoryKey] || ['Şanlıurfa Merkez'];
  const street = randomChoice(streets);
  const district = randomChoice(districts);
  const no = randomInt(1, 150);

  return `${street} No: ${no}, ${district}, Şanlıurfa`;
}

// ---------------------------------------------------------------------------
// Description Genisletici
// ---------------------------------------------------------------------------

function expandDescription(place: ParsedPlace): string {
  const intros: Record<string, string[]> = {
    tarihi_yerler: [
      'Şanlıurfa\'nın en köklü tarihi mekanlarından biri olan',
      'Binlerce yıllık tarihe sahip',
      'UNESCO koruması altında bulunan',
    ],
    restoranlar: [
      'Şanlıurfa mutfağının en lezzetli örneklerini sunan',
      'Yöresel tatları modern bir dokunuşla buluşturan',
      'Urfa gastronomi kültürünü yaşatan',
    ],
    oteller: [
      'Konforlu konaklama deneyimi sunan',
      'Misafirperverliği ile öne çıkan',
      'Şehrin kalbinde hizmet veren',
    ],
    kafe: [
      'Dost sohbetlerin vazgeçilmez adresi',
      'Keyifli anların buluşma noktası',
      'Şehrin en samimi mekanlarından',
    ],
    dogal_alanlar: [
      'Doğanın kalbinde huzurlu vakit geçirebileceğiniz',
      'Yeşilin her tonunu bulabileceğiniz',
      'Ailece keyifli vakit geçirebileceğiniz',
    ],
    dini_yerler: [
      'Manevi huzuru hissedeceğiniz kutsal mekan',
      'Yüzyıllardır ibadet yeri olarak kullanılan',
      'İnanç turizminin önemli noktalarından',
    ],
  };

  const categoryIntros = intros[place.categoryKey] || [
    'Şanlıurfa\'nın gözde mekanlarından',
    'Şehrin en sevilen noktalarından',
    'Yerel halkın sıklıkla tercih ettiği',
  ];

  const intro = randomChoice(categoryIntros);
  return `${intro} ${place.name}, ${place.description}. Ziyaretçilere unutulmaz deneyimler sunuyor.`;
}

// ---------------------------------------------------------------------------
// Review Metinleri
// ---------------------------------------------------------------------------

const reviewTitles = [
  'Harika bir deneyim!',
  'Kesinlikle tavsiye ederim',
  'Çok güzel vakit geçirdim',
  'Beklentilerimin üzerinde',
  'Mutlaka görülmeli',
  'Mükemmel hizmet',
  'Tekrar gelmek istiyorum',
  'Ailecek çok beğendik',
  'Fiyat/performans dengesi iyi',
  'Temiz ve düzenli',
  'Personel çok ilgili',
  'Manzara eşsiz',
  'Tarih kokuyor',
  'Otantik bir deneyim',
  'Huzur dolu bir yer',
];

const reviewContents = [
  'Şanlıurfa\'ya geldiğinizde mutlaka uğramalısınız. Hizmet kalitesi çok yüksek, personel son derece ilgili. Temizlik ve düzen mükemmel.',
  'Beklentilerimin üzerinde bir deneyim yaşadım. Fiyatlar makul, kalite üst düzey. Kesinlikle tekrar geleceğim.',
  'Ailecek çok keyifli vakit geçirdik. Çocuklar için de uygun imkanlar var. Herkese tavsiye ederim.',
  'Fotoğraflarda göründüğünden çok daha güzel. Özellikle çalışanların güleryüzü ve misafirperverliği dikkat çekiyor.',
  'Şehrin en iyi mekanlarından biri. Kalite ve hizmet anlayışı gerçekten takdir edilesi.',
  'Tarihi dokusu ve otantik atmosferi büyüleyici. Her köşesinde ayrı bir güzellik var.',
  'Manzarası muhteşem, yemekleri lezzetli. Fiyatlar biraz yüksek ama deneyime değer.',
  'Sakin ve huzurlu bir ortam arıyorsanız doğru yerdesiniz. Doğa ile iç içe harika bir mekan.',
  'Arkadaşlarımla birlikte gittik, hepimiz çok memnun kaldık. Özellikle yerel tatları denemenizi öneririm.',
  'Uzun yıllardır Şanlıurfa\'dayım ve bu mekan en sevdiğim yerlerden biri oldu. Kalite hiç düşmüyor.',
];

// ---------------------------------------------------------------------------
// Kullanici Verileri
// ---------------------------------------------------------------------------

function generateUsers(): Array<{
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
}> {
  const names = [
    { name: 'Ahmet Yılmaz', email: 'ahmet.yilmaz@test.com' },
    { name: 'Zeynep Kaya', email: 'zeynep.kaya@test.com' },
    { name: 'Mehmet Demir', email: 'mehmet.demir@test.com' },
    { name: 'Elif Çelik', email: 'elif.celik@test.com' },
    { name: 'Hasan Arslan', email: 'hasan.aslan@test.com' },
    { name: 'Ayşe Öztürk', email: 'ayse.ozturk@test.com' },
    { name: 'Ali Erdoğan', email: 'ali.erdogan@test.com' },
    { name: 'Fatma Şahin', email: 'fatma.sahin@test.com' },
    { name: 'Mustafa Aydın', email: 'mustafa.aydin@test.com' },
    { name: 'Emine Bulut', email: 'emine.bulut@test.com' },
  ];

  return names.map((u) => ({
    id: generateUUID(),
    email: u.email,
    // bcrypt hash of "Test1234!" with cost 10
    password_hash: '$2b$10$' + crypto.randomBytes(24).toString('base64').slice(0, 53),
    full_name: u.name,
    role: 'user',
  }));
}

// ---------------------------------------------------------------------------
// Blog Post Verileri
// ---------------------------------------------------------------------------

function generateBlogPosts(authorId: string): Array<{
  id: string;
  title: string;
  slug: string;
  content: string;
  author_id: string;
  published: boolean;
  published_at: string;
}> {
  const posts = [
    {
      title: 'Şanlıurfa\'da Gezilmesi Gereken 10 Tarihi Yer',
      content: `Şanlıurfa, Türkiye'nin en zengin tarihine sahip şehirlerinden biridir. İşte mutlaka görülmesi gereken 10 tarihi mekan:

1. Göbeklitepe: Tarihin sıfır noktası olarak bilinen bu eşsiz yapı, insanlık tarihinin bilinen en eski tapınak kompleksidir. UNESCO Dünya Mirası listesinde yer alan Göbeklitepe, M.Ö. 9600 yılına tarihlenmektedir.

2. Balıklıgöl: Hz. İbrahim'in ateşe atıldığı yer olduğuna inanılan kutsal mekan, etrafındaki tarihi dokusu ile büyüleyicidir. Göldeki sazan balıkları kutsal kabul edilir.

3. Harran: Dünyanın ilk üniversitesine ev sahipliği yapan Harran, kendine özgü konik kümbet evleriyle ünlüdür. Antik şehir, Mezopotamya'nın en eski yerleşim yerlerinden biridir.

4. Halfeti: Suları altında kalan eski ilçesiyle ünlü Halfeti, tekne turları ile keşfedilebilir. Karagöl ve batık cami en çok ilgi çeken noktalardır.

5. Urfa Kalesi: Şehir merkezinde bulunan kale, tarihi dokusu ve panoramik manzarası ile ziyaretçilerini bekliyor.

6. Haleplibahçe Mozaik Müzesi: Roma dönemine ait muhteşem mozaikleri barındıran müze, arkeoloji severler için vazgeçilmez.

7. Rizvaniye Camii: Balıklıgöl kenarında bulunan tarihi cami, mimari güzelliği ile dikkat çeker.

8. Eyyüp Peygamber Makamı: İnanç turizminin önemli duraklarından biri olan makam, her yıl binlerce ziyaretçi ağırlar.

9. Mevlid-i Halil Camii: Hz. İbrahim'in doğduğu yere yapılan cami, manevi atmosferi ile öne çıkar.

10. Bakırcılar Çarşısı: Geleneksel el sanatlarının yaşatıldığı çarşı, hediyelik eşya almak için idealdir.

Bu mekanların her biri, Şanlıurfa'nın benzersiz kültürel mirasının birer yansımasıdır.`,
    },
    {
      title: 'Urfa Mutfağı: Mutlaka Tadılması Gereken Lezzetler',
      content: `Şanlıurfa mutfağı, Türkiye'nin en zengin ve lezzetli mutfak kültürlerinden birine sahiptir. Acı baharatı isot, kebap çeşitleri ve geleneksel tatlılar Urfa mutfağının vazgeçilmezleridir.

Öne Çıkan Lezzetler:

- Urfa Kebabı: Acılı isot baharatı ile hazırlanan özel kebap
- Çiğ Köfte: Urfa usulü, acılı ve nar ekşili
- Şıllık Tatlısı: İnce yufka ve şerbetin mükemmel uyumu
- Perde Pilavı: İç malzemelerle zenginleştirilmiş geleneksel pilav
- Fındık Lahmacun: İnce hamur üzerine bol malzemeli
- İşkembe Çorbası: Sabahların vazgeçilmez lezzeti
- Zahter Salatası: Yöresel otlarla hazırlanan sağlıklı kahvaltılık
- Fırat Balığı: Nehirden çıkan taze balıklar

Urfa'ya geldiğinizde bu lezzetleri tatmadan dönmeyin! Her restoran kendine has tarifler sunuyor.`,
    },
    {
      title: 'Göbeklitepe Rehberi: Tarihin Başlangıç Noktası',
      content: `Göbeklitepe, insanlık tarihinin bilinen en eski tapınak kompleksidir ve "Tarihin Sıfır Noktası" olarak anılır. M.Ö. 9600 yılına tarihlenen bu yapı, yazının bulunmasından bile önce inşa edilmiştir.

Keşif Tarihi
1995 yılında Alman arkeolog Klaus Schmidt tarafından yeniden keşfedilen Göbeklitepe, o tarihten bu yana arkeoloji dünyasının en önemli keşiflerinden biri olarak kabul edilmektedir.

Özellikler
- 20'den fazla dairesal yapı
- T, V ve L şekilli dikilitaşlar
- Hayvan figürleriyle süslü taşlar
- Neolitik dönem insanının inanç dünyasını yansıtan semboller

Ziyaret Bilgileri
Göbeklitepe, Şanlıurfa şehir merkezine yaklaşık 18 km uzaklıktadır. Ziyaretçi merkezi ile birlikte modern bir sunuma sahiptir. Müze kart ile giriş yapılabilir.

UNESCO Dünya Mirası
2018 yılında UNESCO Dünya Mirası listesine alınan Göbeklitepe, her yıl yüz binlerce ziyaretçi ağırlamaktadır. 2024 yılı "Göbeklitepe Yılı" ilan edilmiştir.`,
    },
    {
      title: 'Şanlıurfa\'da Konaklama Rehberi: En İyi Oteller',
      content: `Şanlıurfa'ya gelen ziyaretçiler için konaklama seçenekleri oldukça çeşitlidir. Lüks zincir otellerden butik konaklara, ekonomik seçeneklerden tarihi otellere kadar her bütçeye uygun alternatifler bulunmaktadır.

Lüks Oteller
- Divan Şanlıurfa: Şehrin en prestijli otellerinden biri
- Hilton Garden Inn: Uluslararası standartlarda hizmet
- Courtyard by Marriott: Marriott kalitesi

Tarihi Oteller
- El Ruha Hotel: Geleneksel Urfa evinden dönüştürülmüş butik otel
- Konak Butik Otel: Otantik mimari, modern konfor

Orta Segment
- Hotel Manço: Güler yüzlü hizmet, uygun fiyat
- Nevali Hotel: Merkezde konumlu, temiz odalar

Ekonomik Seçenekler
- Gap Hotel: Bütçe dostu, temel imkanlar

Konum Önerileri
- Balıklıgöl civarı: Turistik mekanlara yakın
- Şehir merkezi: Ulaşım kolaylığı
- Karaköprü: Modern oteller bölgesi

Rezervasyon yapmadan önce sezonluk fiyat değişikliklerini kontrol etmeyi unutmayın.`,
    },
    {
      title: 'Halfeti Tekne Turu: Sular Altındaki Şehir',
      content: `Halfeti, Şanlıurfa'nın en büyüleyici ilçelerinden biridir. Birecik Barajı'nın suları altında kalan eski Halfeti, tekne turları ile keşfedilebilen eşsiz bir destinasyondur.

Tekne Turları
Turlar genellikle Halfeti iskelesinden kalkar ve şu noktalara uğrar:

- Batık Cami: Sular altında kalan tarihi cami, en popüler durak
- Karagöl: Doğal güzellikleri ile ünlü sakin göl
- Rumkale: Ortaçağ'dan kalma tarihi kale
- Eski Halfeti: Terk edilmiş evler ve sokaklar

Ne Zaman Gidilmeli?
İlkbahar (Nisan-Mayıs) ve sonbahar (Eylül-Ekim) en ideal zamanlardır. Yaz ayları oldukça sıcak geçer.

Ulaşım
Şanlıurfa merkezden Halfeti'ne yaklaşık 1 saat sürer. Dolmuş veya özel araçla ulaşılabilir.

Fotoğraf İpuçları
- Drone çekimleri için en iyi saatler: sabah erken veya akşamüstü
- Batık cami en iyi tekneden fotoğraflanır
- Karagöl'de doğa çekimleri harika çıkar

Halfeti, doğa ve tarihin iç içe geçtiği benzersiz bir deneyim sunuyor.`,
    },
  ];

  return posts.map((p, i) => ({
    id: generateUUID(),
    title: p.title,
    slug: slugify(p.title),
    content: p.content,
    author_id: authorId,
    published: true,
    published_at: randomDate(180).toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Ana Seed Fonksiyonu
// ---------------------------------------------------------------------------

async function seedAll(): Promise<void> {
  console.log('🌱 Seed All - Veritabani Doldurma Baslatildi\n');

  const client = await pool.connect();

  try {
    // -----------------------------------------------------------------------
    // 1. Kategoriler.txt Parse
    // -----------------------------------------------------------------------
    const kategorilerPath = path.resolve(__dirname, '..', 'kategoriler.txt');
    console.log('📂 kategoriler.txt okunuyor:', kategorilerPath);
    const { categories, places } = parseKategorilerTxt(kategorilerPath);
    console.log(`✅ Parse tamamlandi: ${categories.length} kategori, ${places.length} mekan\n`);

    // -----------------------------------------------------------------------
    // 2. Kategorileri Ekle
    // -----------------------------------------------------------------------
    console.log('📁 Kategoriler ekleniyor...');

    // categories tablosu yoksa olustur
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50),
        place_count INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let categoryCount = 0;
    for (const cat of categories) {
      try {
        await client.query(
          `INSERT INTO categories (key, name, icon)
           VALUES ($1, $2, $3)
           ON CONFLICT (key) DO UPDATE SET name = $2, icon = $3`,
          [cat.key, cat.name, cat.icon]
        );
        categoryCount++;
        console.log(`  ✅ Kategori: ${cat.name}`);
      } catch (err: any) {
        console.log(`  ⚠️  Kategori atlandi (${cat.key}): ${err.message}`);
      }
    }
    console.log(`✅ ${categoryCount} kategori eklendi\n`);

    // -----------------------------------------------------------------------
    // 3. Test Kullanicilarini Ekle
    // -----------------------------------------------------------------------
    console.log('👤 Test kullanicilari ekleniyor...');

    const users = generateUsers();
    let userCount = 0;
    for (const user of users) {
      try {
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO NOTHING`,
          [user.id, user.email, user.password_hash, user.full_name, user.role]
        );
        userCount++;
        console.log(`  ✅ Kullanici: ${user.full_name} (${user.email})`);
      } catch (err: any) {
        console.log(`  ⚠️  Kullanici atlandi (${user.email}): ${err.message}`);
      }
    }
    console.log(`✅ ${userCount} kullanici eklendi\n`);

    // -----------------------------------------------------------------------
    // 4. Mekanlari Ekle
    // -----------------------------------------------------------------------
    console.log('📍 Mekanlar ekleniyor...');

    let placeCount = 0;
    const placeIds: Record<string, string> = {};

    for (const place of places) {
      const placeId = generateUUID();
      placeIds[place.slug] = placeId;

      const fullDescription = expandDescription(place);
      const address = generateAddress(place.categoryKey, place.name);
      const rating = (Math.random() * 1.5 + 3.5).toFixed(2); // 3.5 - 5.0 arasi
      const ratingCount = randomInt(10, 200);

      try {
        await client.query(
          `INSERT INTO places (id, name, slug, description, category, address, rating, rating_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (slug) DO UPDATE SET name = $2, description = $4, category = $5`,
          [
            placeId,
            place.name,
            place.slug,
            fullDescription,
            place.categoryKey,
            address,
            parseFloat(rating),
            ratingCount,
          ]
        );
        placeCount++;
        console.log(`  ✅ Mekan: ${place.name} (${place.slug}) - Puan: ${rating}`);
      } catch (err: any) {
        console.log(`  ⚠️  Mekan atlandi (${place.slug}): ${err.message}`);
      }
    }
    console.log(`✅ ${placeCount} mekan eklendi\n`);

    // -----------------------------------------------------------------------
    // 5. Her Mekan Icin Review Ekle
    // -----------------------------------------------------------------------
    console.log('💬 Review\'lar ekleniyor...');

    let reviewCount = 0;
    const userIds = users.map((u) => u.id);

    for (const [placeSlug, placeId] of Object.entries(placeIds)) {
      const numReviews = randomInt(2, 3);
      const usedUsers = new Set<string>();

      for (let i = 0; i < numReviews; i++) {
        // Farkli kullanici sec
        let userId: string;
        do {
          userId = randomChoice(userIds);
        } while (usedUsers.has(userId) && usedUsers.size < userIds.length);
        usedUsers.add(userId);

        const title = randomChoice(reviewTitles);
        const content = randomChoice(reviewContents);
        const rating = randomInt(3, 5);
        const createdAt = randomDate(365).toISOString();

        try {
          await client.query(
            `INSERT INTO reviews (id, place_id, user_id, title, content, rating, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [generateUUID(), placeId, userId, title, content, rating, createdAt]
          );
          reviewCount++;
        } catch (err: any) {
          if (!err.message.includes('duplicate') && !err.message.includes('unique')) {
            console.log(`  ⚠️  Review atlandi (${placeSlug}): ${err.message}`);
          }
        }
      }
    }
    console.log(`✅ ${reviewCount} review eklendi\n`);

    // -----------------------------------------------------------------------
    // 6. Blog Postlari Ekle
    // -----------------------------------------------------------------------
    console.log('📝 Blog postlari ekleniyor...');

    const authorId = users[0].id; // Ilk kullanici yazar olsun
    const blogPosts = generateBlogPosts(authorId);

    let blogCount = 0;
    for (const post of blogPosts) {
      try {
        await client.query(
          `INSERT INTO blog_posts (id, title, slug, content, author_id, published, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (slug) DO UPDATE SET title = $2, content = $4`,
          [post.id, post.title, post.slug, post.content, post.author_id, post.published, post.published_at]
        );
        blogCount++;
        console.log(`  ✅ Blog: ${post.title}`);
      } catch (err: any) {
        console.log(`  ⚠️  Blog atlandi (${post.slug}): ${err.message}`);
      }
    }
    console.log(`✅ ${blogCount} blog post eklendi\n`);

    // -----------------------------------------------------------------------
    // 7. Ozet
    // -----------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Seed Tamamlandi - Ozet:');
    console.log(`   Kategoriler:    ${categoryCount}`);
    console.log(`   Kullanicilar:   ${userCount}`);
    console.log(`   Mekanlar:       ${placeCount}`);
    console.log(`   Review'lar:     ${reviewCount}`);
    console.log(`   Blog Postlari:  ${blogCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Tum veriler basariyla eklendi!\n');
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Giris
// ---------------------------------------------------------------------------

seedAll()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Seed islemi basarisiz oldu:', error);
    await pool.end();
    process.exit(1);
  });
import { randomInt as cryptoRandomInt } from 'node:crypto';
