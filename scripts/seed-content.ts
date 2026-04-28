/**
 * Şanlıurfa.com - İçerik Seed Script'i
 * 
 * Bu script veritabanına örnek veri ekler:
 * - 82 mekan (places)
 * - 15 kategori
 * - 10 blog yazısı
 * - 5 etkinlik
 * - 5 test kullanıcısı
 * - 20 örnek yorum
 * 
 * Kullanım: npx tsx scripts/seed-content.ts
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Veritabanı Bağlantısı
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('HATA: DATABASE_URL ortam değişkeni tanımlanmamış!');
  console.error('Kullanım: DATABASE_URL=postgresql://user:pass@localhost:5432/db npx tsx scripts/seed-content.ts');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// ---------------------------------------------------------------------------
// Yardımcı Fonksiyonlar
// ---------------------------------------------------------------------------

/** UUID üretici (PostgreSQL gen_random_uuid() yoksa fallback) */
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Tarih formatlayıcı */
function now(): string {
  return new Date().toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Tablo Oluşturma
// ---------------------------------------------------------------------------

async function createTables(): Promise<void> {
  console.log('\n📋 Tablolar oluşturuluyor...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$dummyhashfortesting',
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ users');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      icon VARCHAR(50),
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ categories');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL,
      address VARCHAR(500) NOT NULL DEFAULT '',
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      phone VARCHAR(20) DEFAULT '',
      email VARCHAR(255) DEFAULT '',
      website VARCHAR(500) DEFAULT '',
      opening_hours TEXT DEFAULT '',
      rating DECIMAL(3, 2) DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ places');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT DEFAULT '',
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      featured_image VARCHAR(500) DEFAULT '',
      thumbnail VARCHAR(500) DEFAULT '',
      status VARCHAR(50) DEFAULT 'published',
      is_featured BOOLEAN DEFAULT false,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      read_time_minutes INTEGER DEFAULT 5,
      seo_title VARCHAR(255) DEFAULT '',
      seo_description VARCHAR(500) DEFAULT '',
      seo_keywords VARCHAR(255) DEFAULT '',
      published_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ blog_posts');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) UNIQUE NOT NULL,
      description TEXT NOT NULL,
      place_id UUID REFERENCES places(id) ON DELETE SET NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP,
      location VARCHAR(500) DEFAULT '',
      organizer VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ events');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) DEFAULT '',
      content TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      helpful_count INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✓ reviews');

  console.log('✅ Tüm tablolar hazır!\n');
}

// ---------------------------------------------------------------------------
// Kategori Verileri (15 adet)
// ---------------------------------------------------------------------------

const categories = [
  { name: 'Tarihi Yerler', slug: 'tarihi-yerler', description: 'Şanlıurfa\'nın eşsiz tarihi mekanları', icon: 'landmark', order_index: 1 },
  { name: 'Restoranlar', slug: 'restoranlar', description: 'Urfa mutfağının en lezzetli adresleri', icon: 'utensils', order_index: 2 },
  { name: 'Oteller', slug: 'oteller', description: 'Şanlıurfa\'da konaklama seçenekleri', icon: 'bed', order_index: 3 },
  { name: 'Kafeler', slug: 'kafeler', description: 'En güzel kafe ve kahvehaneler', icon: 'coffee', order_index: 4 },
  { name: 'Kafe & Restoran', slug: 'kafe-restoran', description: 'Hem kafe hem restoran konsepti', icon: 'coffee', order_index: 5 },
  { name: 'Tatlıcılar', slug: 'tatlicilar', description: 'Urfa tatlıları ve lezzet durakları', icon: 'cake', order_index: 6 },
  { name: 'Alışveriş', slug: 'alisveris', description: 'AVM ve alışveriş merkezleri', icon: 'shopping-bag', order_index: 7 },
  { name: 'Çarşılar', slug: 'carsilar', description: 'Geleneksel çarşı ve pazarlar', icon: 'store', order_index: 8 },
  { name: 'SPA & Wellness', slug: 'spa-wellness', description: 'Hamam, kaplıca ve wellness merkezleri', icon: 'sparkles', order_index: 9 },
  { name: 'Eğlence', slug: 'eglence', description: 'Sinema, bowling ve eğlence mekanları', icon: 'gamepad-2', order_index: 10 },
  { name: 'Doğa & Parklar', slug: 'doga-parklar', description: 'Parklar ve doğal güzellikler', icon: 'trees', order_index: 11 },
  { name: 'Dini Yerler', slug: 'dini-yerler', description: 'Cami, türbe ve kutsal mekanlar', icon: 'church', order_index: 12 },
  { name: 'Müzeler', slug: 'muzeler', description: 'Arkeoloji ve mozaik müzeleri', icon: 'museum', order_index: 13 },
  { name: 'Gezilecek Yerler', slug: 'gezilecek-yerler', description: 'Turistik noktalar ve görülecek yerler', icon: 'map-pin', order_index: 14 },
  { name: 'Etkinlikler', slug: 'etkinlikler', description: 'Festival ve etkinlik alanları', icon: 'calendar', order_index: 15 },
];

async function seedCategories(): Promise<void> {
  console.log('🏷️  Kategoriler ekleniyor...');

  let count = 0;
  for (const cat of categories) {
    await pool.query(
      `INSERT INTO categories (name, slug, description, icon, order_index)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO NOTHING`,
      [cat.name, cat.slug, cat.description, cat.icon, cat.order_index]
    );
    count++;
  }

  console.log(`✅ ${count} kategori eklendi\n`);
}

// ---------------------------------------------------------------------------
// Kategori ID eşleştirme
// ---------------------------------------------------------------------------

async function getCategorySlugToId(): Promise<Map<string, string>> {
  const result = await pool.query('SELECT id, slug FROM categories');
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.slug, row.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Mekan Verileri (82 adet)
// ---------------------------------------------------------------------------

interface PlaceData {
  slug: string;
  name: string;
  category: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  opening_hours?: string;
}

const places: PlaceData[] = [
  // --- Tarihi Yerler (8) ---
  { slug: 'gobeklitepe', name: 'Göbeklitepe', category: 'tarihi-yerler', description: 'Dünyanın bilinen en eski tapınak kompleksi. M.Ö. 9600 yılına tarihlenen Göbeklitepe, insanlık tarihinin dönüm noktasıdır. UNESCO Dünya Mirası Listesi\'nde yer alan bu eşsiz arkeolojik alan, Şanlıurfa şehir merkezine 18 km uzaklıktadır. T şeklinde düzenlenmiş 20'den fazla dairesal yapı, üzerlerinde hayvan figürleri bulunan devasa taş sütunlarla inşa edilmiştir.', address: 'Örencik Köyü, Şanlıurfa Merkez', latitude: 37.2231, longitude: 38.9225, opening_hours: '08:00-19:00' },
  { slug: 'balikligol', name: 'Balıklıgöl (Hz. İbrahim Camii)', category: 'tarihi-yerler', description: 'Hz. İbrahim\'in ateşe atıldığı ve ateşin suya, odunların balığa dönüştüğü kutsal mekan. Rivayete göre bu göldeki balıklar kutsal sayılır ve avlanmaz. Şanlıurfa\'nın en çok ziyaret edilen yerlerinden biridir. Göl etrafında yürüyüş alanları, çay bahçeleri ve tarihi dokular bulunur.', address: 'Eyyübiye, Şanlıurfa Merkez', latitude: 37.1594, longitude: 38.7903, opening_hours: '09:00-22:00' },
  { slug: 'harran', name: 'Harran Antik Kenti', category: 'tarihi-yerler', description: 'İlk İslam üniversitesinin kurulduğu, konik Harran evleriyle meşhur antik yerleşim. 5000 yılı aşkın geçmişiyle dünyanın en eski sürekli yerleşim yerlerinden biridir. UNESCO Geçici Miras Listesi\'ndeki Harran, tarihin sıfır noktası olarak anılır.', address: 'Harran, Şanlıurfa', latitude: 36.8710, longitude: 39.0250, opening_hours: '09:00-18:00' },
  { slug: 'halfeti', name: 'Halfeti', category: 'tarihi-yerler', description: 'Birecik Barajı suları altında kalan evleri ve "kara gül"üyle ünlü sakin kasaba. Tekne turlarıyla su altı şehri gezilebilir. Siyah gülüyle dünya çapında ün salmış, doğa ve tarihin iç içe geçtiği eşsiz bir destinasyondur.', address: 'Halfeti, Şanlıurfa', latitude: 37.2539, longitude: 37.8969, opening_hours: 'Açık alan, 7/24' },
  { slug: 'urfa-kalesi', name: 'Şanlıurfa Kalesi', category: 'tarihi-yerler', description: 'Şehrin ortasında yükselen tarihi kale, Roma ve Bizans döneminden kalma surlara sahiptir. Kale etrafından şehir manzarası seyredilebilir. Günümüzde kale surları restore edilmiş ve çevresi düzenlenmiştir.', address: 'Kale, Eyyübiye, Şanlıurfa', latitude: 37.1600, longitude: 38.7880, opening_hours: '09:00-18:00' },
  { slug: 'arkeoloji-muzesi', name: 'Şanlıurfa Arkeoloji Müzesi', category: 'tarihi-yerler', description: 'Bölgenin en zengin müzelerinden biri. Göbeklitepe buluntuları, mozaikler ve antik eserler sergilenmektedir. Modern mimarisiyle de dikkat çeken müze, Şanlıurfa\'nın 12.000 yıllık tarihine ışık tutar.', address: 'Yenişehir, Şanlıurfa Merkez', latitude: 37.1700, longitude: 38.7900, opening_hours: '08:30-17:30', website: 'https://kulturturizm.gov.tr' },
  { slug: 'rizvaniye-camii', name: 'Rızvaniye Camii', category: 'tarihi-yerler', description: 'Balıklıgöl kenarında yer alan tarihi cami, Osmanlı dönemine ait mimarisiyle dikkat çeker. Balıklıgöl ile birlikte ziyaret edilen önemli bir dini yapıdır.', address: 'Eyyübiye, Şanlıurfa Merkez', latitude: 37.1590, longitude: 38.7910, opening_hours: 'Namaz vakitleri' },
  { slug: 'eyyup-peygamber', name: 'Hz. Eyyüb Peygamber Makamı', category: 'tarihi-yerler', description: 'Sabır Peygamberi Hz. Eyyüb\'ün makamı olduğu rivayet edilen kutsal yer. Ziyaretçiler burada dua eder ve şifa arar. Şanlıurfa merkezde bulunan makam, şehir içi ulaşım ile kolayca ulaşılabilir.', address: 'Eyyübiye, Şanlıurfa', latitude: 37.1650, longitude: 38.7950, opening_hours: '08:00-22:00' },

  // --- Restoranlar (12) ---
  { slug: 'cigerci-aziz-usta', name: 'Ciğerci Aziz Usta', category: 'restoranlar', description: 'Şanlıurfa\'nın en meşhur ciğer salonlarından biri. İnce ince dilimlenmiş kuzu ciğeri, Urfa\'ya özgü baharatlarla servis edilir. Yerel halkın ve turistlerin uğrak noktasıdır.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 212 3456' },
  { slug: 'meshur-cigkofteci', name: 'Meşhur Çiğköfteci', category: 'restoranlar', description: 'Urfa çiğköftesinin en özgün lezzetini sunan restoran. Acılı ezme, nar ekşisi ve taze yeşilliklerle servis edilen çiğköfte, Şanlıurfa\'nın vazgeçilmez lezzetlerindendir.', address: 'Gülpınar Mah., Haliliye, Şanlıurfa', phone: '+90 414 215 6789' },
  { slug: 'zahter-kahvalti', name: 'Zahter Kahvaltı Evi', category: 'restoranlar', description: 'Geleneksel Urfa kahvaltısının en güzel adresi. Zahter, taze peynir, bal, kaymak ve yöresel lezzetlerle donatılmış serpme kahvaltı sunumu ile güne harika başlarsınız.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 213 1111' },
  { slug: 'cevahir-konak', name: 'Cevahir Konak', category: 'restoranlar', description: 'Tarihi bir konakta Urfa mutfağının en seçkin örneklerini sunan restoran. Kebap çeşitleri, içli köfte ve baklava ile ünlü. Konak mimarisi ambiyansı özel kılar.', address: 'Kale Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 214 2222', website: 'https://cevahir-konak.com' },
  { slug: 'kebap-sarayi', name: 'Kebap Sarayı', category: 'restoranlar', description: 'Urfa kebabının en iyi yapıldığı restoranlardan biri. Kuzu eti, özel baharatlar ve geleneksel pişirme teknikleriyle hazırlanan kebaplar, lahmacun ve pide eşliğinde servis edilir.', address: 'Dergah Mah., Haliliye, Şanlıurfa', phone: '+90 414 216 3333' },
  { slug: 'lahmacun-ustasi', name: 'Lahmacun Ustası', category: 'restoranlar', description: 'Şanlıurfa usulü ince ve çıtır lahmacunlarıyla tanınan mekan. Kıymalı, baharatlı harçla hazırlanan lahmacun, taze limon ve maydanoz ile servis edilir.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 217 4444' },
  { slug: 'corba-evi', name: 'Çorba Evi', category: 'restoranlar', description: 'Urfa\'nın geleneksel çorbalarıyla ünlü restoran. Bumbar çorbası, mercimek çorbası ve keledoş gibi yöresel lezzetler bulunur. Özellikle kış aylarında yoğun ilgi görür.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 218 5555' },
  { slug: 'tatli-dunyasi', name: 'Tatlı Dünyası', category: 'restoranlar', description: 'Urfa\'nın meşhur tatlılarını sunan restoran. Sillik, künefe ve baklava çeşitleri ile tatlı tutkunlarına hitap eder. Doğal malzemelerle günlük üretim yapılır.', address: 'Gülpınar Mah., Haliliye, Şanlıurfa', phone: '+90 414 219 6666' },
  { slug: 'isot-lounge', name: 'İsot Lounge', category: 'restoranlar', description: 'Urfa\'nın meşhur isot baharatının en iyi kullanıldığı restoran. Isotlu köfte, isotlu ezme ve tüm yemeklerde özel baharat karışımları kullanılır. Modern ambiyans ve geleneksel lezzet bir arada.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 220 7777', website: 'https://isot-lounge.com' },
  { slug: 'balikci-hamza', name: 'Balıkçı Hamza', category: 'restoranlar', description: 'Fırat Nehri balıklarıyla ünlü restoran. Taze sazan, turna ve diğer nehir balıkları ızgara veya tava olarak servis edilir. Halfeti balık ekmek konsepti de mevcuttur.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 221 8888' },
  { slug: 'bolu-mengen', name: 'Bolu Mengen', category: 'restoranlar', description: 'Anadolu mutfağının en seçkin lezzetlerini Şanlıurfa\'ya taşıyan restoran. Kebap çeşitleri, ev yemekleri ve özel menüleri ile geniş kitlelere hitap eder.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 222 9999' },
  { slug: 'pilav-ustasi', name: 'Pilav Ustası', category: 'restoranlar', description: 'Urfa usulü nohutlu pilav ve üstü etli pilav çeşitleriyle tanınan mekan. Hızlı, lezzetli ve ekonomik yemek arayanların tercihi.', address: 'Dergah Mah., Haliliye, Şanlıurfa', phone: '+90 414 223 1010' },

  // --- Oteller (8) ---
  { slug: 'hotel-manco', name: 'Hotel Manço', category: 'oteller', description: 'Taş odaları ve geleneksel Urfa mimarisi ile öne çıkan butik otel. Tarihi bir konakta hizmet veren otel, sıcak hizmet anlayışı ve merkezi konumuyla tercih edilen bir konaklama seçeneğidir.', address: 'Kale Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 312 0000', website: 'https://hotelmanco.com' },
  { slug: 'el-ruha', name: 'El-Ruha Hotel', category: 'oteller', description: 'Şanlıurfa\'nın lüks otellerinden biri. Balıklıgöl manzaralı odaları, restoranı ve SPA hizmetleriyle öne çıkar. Şehir merkezinde, tarihi mekanlara yürüme mesafesindedir.', address: 'Eyyübiye, Şanlıurfa Merkez', phone: '+90 414 313 0000', website: 'https://elruha.com' },
  { slug: 'nevali', name: 'Nevali Hotel', category: 'oteller', description: 'Modern tasarımı ve uygun fiyatlarıyla tercih edilen otel. Göbeklitepe turları için ideal konumda olan tesis, konforlu odalar ve kahvaltı hizmeti sunar.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 314 0000' },
  { slug: 'divan-hotel', name: 'Divan Şanlıurfa', category: 'oteller', description: 'Uluslararası standartlarda hizmet sunan Divan oteller zincirinin Şanlıurfa şubesi. Konferans salonları, restoran ve SPA hizmetleriyle iş ve tatil amaçlı konaklamalara uygundur.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 315 0000', website: 'https://divan.com' },
  { slug: 'hilton-garden', name: 'Hilton Garden Inn', category: 'oteller', description: 'Hilton kalitesini Şanlıurfa\'da yaşatan otel. Geniş odaları, fitness merkezi ve uluslararası mutfağıyla öne çıkar. İş seyahatleri için ideal altyapıya sahiptir.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 316 0000', website: 'https://hilton.com' },
  { slug: 'courtyard', name: 'Courtyard by Marriott', category: 'oteller', description: 'Marriott zincirinin Şanlıurfa\'daki temsilcisi. Modern odalar, havuz, restoran ve toplantı salonlarıyla tam donanımlı bir konaklama deneyimi sunar.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 317 0000', website: 'https://marriott.com' },
  { slug: 'gap-hotel', name: 'GAP Hotel', category: 'oteller', description: 'GAP Bölge Kalkınma İdaresi tarafından işletilen otel. Güneydoğu Anadolu\'nun en iyi tesislerinden biri olan otel, konferans ve turistik konaklamalar için idealdir.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 318 0000' },
  { slug: 'konak-otel', name: 'Konak Otel', category: 'oteller', description: 'Geleneksel Urfa konak mimarisinde restore edilmiş butik otel. Avlusu, taş odaları ve sıcak hizmeti ile misafirlerine unutulmaz bir deneyim sunar.', address: 'Kale Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 319 0000' },

  // --- Kafeler (10) ---
  { slug: 'gumrukhan-cafe', name: 'Gümrükhan Cafe', category: 'kafeler', description: 'Tarihi Gümrük Han\'da hizmet veren kafe. Otantik atmosferde Türk kahvesi ve çay eşliğinde Şanlıurfa\'nın tarihini hissedin. Geleneksel han mimarisi korunmuştur.', address: 'Gümrük Hanı, Eyyübiye, Şanlıurfa', opening_hours: '08:00-23:00' },
  { slug: 'nargile-cafe', name: 'Nargile Cafe', category: 'kafeler', description: 'Şanlıurfa\'nın en popüler nargile mekanlarından biri. Geniş nargile çeşitleri, çay ve kahve seçenekleri ile gençlerin uğrak noktası. Akşamları canlı müzik etkinlikleri de düzenlenir.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', opening_hours: '14:00-02:00' },
  { slug: 'kahve-dunyasi', name: 'Kahve Dünyası', category: 'kafeler', description: 'Türkiye genelinde bilinen Kahve Dünyası zincirinin Şanlıurfa şubesi. Geniş kahve menüsü, tatlılar ve atıştırmalıklar ile her zevke hitap eder.', address: 'Yenişehir, Şanlıurfa Merkez', opening_hours: '07:00-00:00', website: 'https://kahvedunyasi.com' },
  { slug: 'starbucks', name: 'Starbucks Şanlıurfa', category: 'kafeler', description: 'Uluslararası kahve devi Starbucks\'ın Şanlıurfa şubesi. Standart Starbucks deneyimi ile şehir merkezinde hizmet verir.', address: 'GAP Mall, Şanlıurfa', opening_hours: '07:00-23:00', website: 'https://starbucks.com.tr' },
  { slug: 'espresso-lab', name: 'EspressoLab', category: 'kafeler', description: 'Özel kahve çekirdekleri ve third-wave kahve konseptiyle hizmet veren kafe. Barista eğitimi alan ekibiyle kaliteli kahve deneyimi sunar.', address: 'Yenişehir, Şanlıurfa Merkez', opening_hours: '07:30-23:00', website: 'https://espressolab.com' },
  { slug: 'kocatepe', name: 'Kocatepe Kahve Evi', category: 'kafeler', description: 'Geleneksel Türk kahvesi ve çay kültürünü yaşatan kafe. Taze demlenmiş çaylar, el yapımı Türk kahvesi ve yöresel atıştırmalıklar bulunur.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', opening_hours: '08:00-23:00' },
  { slug: 'coffy', name: 'Coffy Coffee', category: 'kafeler', description: 'Modern tasarımı ve geniş kahve menüsü ile gençlere hitap eden kafe. Soğuk kahve seçenekleri, cheesecake ve waffle çeşitleri ile öne çıkar.', address: 'İpekyolu, Şanlıurfa Merkez', opening_hours: '08:00-00:00' },
  { slug: 'books-cafe', name: 'Books & Coffee', category: 'kafeler', description: 'Kitap okuma kültürü ile kahve kültürünü birleştiren konsept kafe. Kitap okuyabileceğiniz rahat köşeler, etkinlikler ve imza günleri düzenlenir.', address: 'Yenişehir, Şanlıurfa Merkez', opening_hours: '09:00-23:00' },
  { slug: 'rota-cafe', name: 'Rota Cafe', category: 'kafeler', description: 'Şehir merkezinde uygun fiyatlı kahve ve atıştırmalık sunan kafe. Öğrencilerin ve gençlerin sıkça tercih ettiği bir buluşma noktasıdır.', address: 'Haliliye, Şanlıurfa', opening_hours: '08:00-23:00' },
  { slug: 'kumsal-cafe', name: 'Kumsal Cafe', category: 'kafeler', description: 'Balıklıgöl manzaralı terası ile öne çıkan kafe. Manzara eşliğinde çay, kahve ve geleneksel Türk tatlıları sunulan mekan, turistlerin de ilgisini çeker.', address: 'Eyyübiye, Şanlıurfa Merkez', opening_hours: '09:00-00:00' },

  // --- Kafe & Restoran (6) ---
  { slug: 'isot-park', name: 'İsot Park Kafe & Restoran', category: 'kafe-restoran', description: 'İsot baharatının tüm lezzetlerini bulabileceğiniz kafe ve restoran. Öğle ve akşam yemeğinde Urfa mutfağı, gündüz kahve ve atıştırmalık seçenekleri mevcuttur.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 230 1111', opening_hours: '08:00-23:00' },
  { slug: 'gobeklitepe-kafe', name: 'Göbeklitepe Kafe & Restoran', category: 'kafe-restoran', description: 'Göbeklitepe temalı dekorasyonu ile dikkat çeken mekan. Urfa mutfağından seçkin lezzetler ve geniş içecek menüsü ile hizmet verir.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 231 2222', opening_hours: '09:00-00:00' },
  { slug: 'balikli-konak', name: 'Balıklı Konak', category: 'kafe-restoran', description: 'Balıklıgöl yakınında tarihi konakta hizmet veren kafe & restoran. Geleneksel Urfa yemekleri ve modern kafe konsepti bir arada.', address: 'Eyyübiye, Şanlıurfa Merkez', phone: '+90 414 232 3333', opening_hours: '09:00-23:00' },
  { slug: 'sirin-bahce', name: 'Şirin Bahçe', category: 'kafe-restoran', description: 'Bahçe içinde keyifli vakit geçirebileceğiniz aile dostu mekan. Izgara çeşitleri, salatalar ve çocuk menüleri ile aileler için ideal.', address: 'Haliliye, Şanlıurfa', phone: '+90 414 233 4444', opening_hours: '10:00-00:00' },
  { slug: 'tas-ev', name: 'Taş Ev Kafe & Restoran', category: 'kafe-restoran', description: 'Geleneksel taş ev mimarisinde restore edilmiş mekan. Otantik ambiyansta Urfa kebabı, çiğköfte ve geleneksel lezzetler sunulur.', address: 'Kale Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 234 5555', opening_hours: '10:00-23:00' },
  { slug: 'ocakbasi', name: 'Ocakbaşı Kafe & Restoran', category: 'kafe-restoran', description: 'Urfa ocakbaşı kültürünü yaşatan mekan. Kömür ateşinde pişen kebaplar, meze çeşitleri ve canlı müzik eşliğinde keyifli akşamlar.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 235 6666', opening_hours: '12:00-02:00' },

  // --- Tatlıcılar (6) ---
  { slug: 'sillik-ustasi', name: 'Sillik Ustası', category: 'tatlicilar', description: 'Urfa\'nın meşhur sillik tatlısının en iyi yapıldığı yer. İrmik, şeker ve tereyağı ile hazırlanan bu geleneksel tatlı, Şanlıurfa\'ya özgü bir lezzettir.', address: 'Eyyübiye, Şanlıurfa Merkez', phone: '+90 414 240 1111', opening_hours: '08:00-22:00' },
  { slug: 'kunefe-sarayi', name: 'Künefe Sarayı', category: 'tatlicilar', description: 'Hatay usulü künefenin Şanlıurfa\'daki en iyi adresi. İnce tel kadayıf, peynir ve şerbet ile hazırlanan künefe, Antep fıstığı ile servis edilir.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 241 2222', opening_hours: '10:00-00:00' },
  { slug: 'baklava-dunyasi', name: 'Baklava Dünyası', category: 'tatlicilar', description: 'Gaziantep usulü baklavanın Şanlıurfa\'daki temsilcisi. Fıstıklı, cevizli ve kuru baklava çeşitleri ile tatlı severlere hitap eder.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 242 3333', opening_hours: '08:00-22:00', website: 'https://baklavadunyasi.com' },
  { slug: 'pastane-1920', name: 'Pastane 1920', category: 'tatlicilar', description: 'Şanlıurfa\'nın en eski pastanelerinden biri. 1920\'den beri hizmet veren pastane, geleneksel tariflerle pasta, börek ve tatlı çeşitleri sunar.', address: 'Kurtuluş Mah., Eyyübiye, Şanlıurfa', phone: '+90 414 243 4444', opening_hours: '07:00-22:00' },
  { slug: 'dondurma-carsisi', name: 'Dondurma Çarşısı', category: 'tatlicilar', description: 'Maraş dondurmasının Şanlıurfa\'daki en büyük satıcısı. Farklı aromalarda geleneksel dondurma çeşitleri ve özel porsiyonlar bulunur.', address: 'Haliliye, Şanlıurfa', phone: '+90 414 244 5555', opening_hours: '10:00-23:00' },
  { slug: 'waffle-station', name: 'Waffle Station', category: 'tatlicilar', description: 'Gençlerin ve ailelerin favori tatlı mekanı. Belçika usulü waffle, çikolata sosları ve meyve çeşitleri ile geniş menü sunar.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 245 6666', opening_hours: '10:00-00:00' },

  // --- Alışveriş (4) ---
  { slug: 'gap-mall', name: 'GAP Mall', category: 'alisveris', description: 'Şanlıurfa\'nın en büyük alışveriş merkezi. 150+ mağaza, sinema salonları, restoranlar ve eğlence alanları ile tam bir AVM deneyimi sunar.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 250 0000', website: 'https://gapmall.com', opening_hours: '10:00-22:00' },
  { slug: 'elele-park', name: 'Elele Park AVM', category: 'alisveris', description: 'Şanlıurfa\'nın modern alışveriş merkezlerinden biri. Mağazalar, kafeler ve restoranlar ile geniş bir hizmet yelpazesi sunar.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 251 0000', opening_hours: '10:00-22:00' },
  { slug: 'saraykent-avm', name: 'Saraykent AVM', category: 'alisveris', description: 'Şanlıurfa\'nın yerel alışveriş merkezi. Uygun fiyatlı mağazalar, süpermarket ve hizmet işletmeleri ile günlük ihtiyaçlara cevap verir.', address: 'Haliliye, Şanlıurfa', phone: '+90 414 252 0000', opening_hours: '09:00-21:00' },
  { slug: 'kipa', name: 'Kipa AVM', category: 'alisveris', description: 'Uluslararası standartlarda hizmet veren Kipa AVM. Süpermarket, giyim, elektronik ve ev ihtiyaçları için tek noktada alışveriş imkanı.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 253 0000', opening_hours: '09:00-22:00' },

  // --- Çarşılar (5) ---
  { slug: 'bakircilar-carsisi', name: 'Bakırcılar Çarşısı', category: 'carsilar', description: 'Geleneksel bakır işçiliğinin en güzel örneklerini bulabileceğiniz tarihi çarşı. El yapımı bakır ürünler, hediyelik eşyalar ve geleneksel sanat eserleri satılır.', address: 'Eyyübiye, Şanlıurfa Merkez', opening_hours: '09:00-19:00' },
  { slug: 'kazaz-pazari', name: 'Kazaz Pazarı', category: 'carsilar', description: 'Şanlıurfa\'nın geleneksel kazaz (telkari) sanatının sergilendiği pazar. Altın ve gümüş telkari işçiliği ile hazırlanan takılar ve süs eşyaları bulunur.', address: 'Kale Mah., Eyyübiye, Şanlıurfa', opening_hours: '09:00-19:00' },
  { slug: 'balikli-gol-carsisi', name: 'Balıklıgöl Çarşısı', category: 'carsilar', description: 'Balıklıgöl etrafında yer alan hediyelik eşya ve geleneksel ürünler çarşısı. Turistlerin uğrak noktası olan çarşıda Urfa\'ya özgü ürünler satılır.', address: 'Eyyübiye, Şanlıurfa Merkez', opening_hours: '09:00-22:00' },
  { slug: 'persembe-pazari', name: 'Perşembe Pazarı', category: 'carsilar', description: 'Şanlıurfa\'nın en büyük haftalık açık hava pazarı. Meyve, sebze, giyim, ev eşyası ve daha birçok ürün uygun fiyatlarla satılır.', address: 'Haliliye, Şanlıurfa', opening_hours: 'Perşembe 06:00-18:00' },
  { slug: 'ulu-cami-carsisi', name: 'Ulu Cami Çarşısı', category: 'carsilar', description: 'Şanlıurfa Ulu Camii etrafındaki tarihi çarşı. Baharat, kuruyemiş, tekstil ve geleneksel ürünler satılan dükkanlar bulunur.', address: 'Eyyübiye, Şanlıurfa Merkez', opening_hours: '09:00-19:00' },

  // --- SPA & Wellness (4) ---
  { slug: 'sira-hamami', name: 'Sıra Hamamı', category: 'spa-wellness', description: 'Şanlıurfa\'nın tarihi hamamlarından biri. Geleneksel Türk hamamı deneyimi sunan Sıra Hamamı, kurna ve göbektaşı ile otantik bir atmosferde hizmet verir.', address: 'Eyyübiye, Şanlıurfa Merkez', phone: '+90 414 260 1111', opening_hours: '06:00-22:00' },
  { slug: 'kaplica-tesisleri', name: 'Şanlıurfa Kaplıca Tesisleri', category: 'spa-wellness', description: 'Şifalı sularıyla ünlü kaplıca tesisi. Romatizma, cilt hastalıkları ve stres gibi rahatsızlıklara iyi gelen termal sular ile sağlık turizmi merkezidir.', address: 'Şanlıurfa Merkez', phone: '+90 414 261 2222', opening_hours: '08:00-22:00' },
  { slug: 'fitness-center', name: 'Fitness Center Şanlıurfa', category: 'spa-wellness', description: 'Modern ekipmanları ve profesyonel eğitmenleriyle hizmet veren fitness merkezi. Grup dersleri, kişisel antrenör ve beslenme danışmanlığı hizmetleri sunar.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 262 3333', opening_hours: '06:00-23:00' },
  { slug: 'yoga-studio', name: 'Yoga Studio Şanlıurfa', category: 'spa-wellness', description: 'Şanlıurfa\'da huzur ve denge arayanlar için yoga stüdyosu. Hatha, vinyasa ve meditasyon dersleri ile beden ve zihin bütünlüğüne ulaşın.', address: 'İpekyolu, Şanlıurfa Merkez', phone: '+90 414 263 4444', opening_hours: '07:00-21:00' },

  // --- Eğlence (4) ---
  { slug: 'sinema-palas', name: 'Sinema Palas', category: 'eglence', description: 'Şanlıurfa\'nın en büyük sinema salonu. Vizyondaki yerli ve yabancı filmleri en kaliteli ses ve görüntü sistemiyle izleyebilirsiniz.', address: 'GAP Mall, Şanlıurfa', phone: '+90 414 270 1111', opening_hours: '10:00-00:00' },
  { slug: 'bowling-salonu', name: 'Bowling Salonu', category: 'eglence', description: 'Aileler ve gençler için eğlenceli vakit geçirilebilecek bowling salonu. 6 pisti bulunan salon, cafe ve oyun alanlarıyla hizmet verir.', address: 'GAP Mall, Şanlıurfa', phone: '+90 414 271 2222', opening_hours: '10:00-00:00' },
  { slug: 'bilardo-kulubu', name: 'Bilardo Kulübü', category: 'eglence', description: 'Şanlıurfa\'da bilardo oynamak isteyenler için profesyonel salon. 10 masası bulunan kulüpte snooker ve Amerikan bilardosu oynanabilir.', address: 'Yenişehir, Şanlıurfa Merkez', phone: '+90 414 272 3333', opening_hours: '12:00-02:00' },
  { slug: 'playstation-cafe', name: 'PlayStation Cafe', category: 'eglence', description: 'Video oyun tutkunları için PlayStation deneyimi sunan kafe. PS5 konsollar, geniş oyun kütüphanesi ve atıştırmalık menüsü ile eğlenceli vakit geçirebilirsiniz.', address: 'Haliliye, Şanlıurfa', phone: '+90 414 273 4444', opening_hours: '12:00-02:00' },

  // --- Doğa & Parklar (4) ---
  { slug: 'golbasi-parki', name: 'Gölbaşı Parkı', category: 'doga-parklar', description: 'Şanlıurfa merkezde büyük bir göl etrafında düzenlenmiş park alanı. Yürüyüş yolları, oturma alanları ve çocuk parkları ile aileler için ideal bir dinlenme noktası.', address: 'Eyyübiye, Şanlıurfa', opening_hours: '06:00-00:00' },
  { slug: 'kara-koyun', name: 'Kara Koyun Mesire Alanı', category: 'doga-parklar', description: 'Şanlıurfa\'nın en popüler mesire alanı. Piknik alanları, mangal yerleri ve doğal güzellikler ile hafta sonu kaçış noktası. Doğa yürüyüşü ve kuş gözlemi yapılabilir.', address: 'Şanlıurfa Merkez', opening_hours: '07:00-22:00' },
  { slug: 'firat-kiyisi', name: 'Fırat Kıyısı', category: 'doga-parklar', description: 'Fırat Nehri kıyısında doğal güzellik. Balık tutma, piknik ve doğa yürüyüşü aktiviteleri yapılabilir. Özellikle gün batımında muhteşem manzara sunar.', address: 'Birecik, Şanlıurfa', opening_hours: 'Açık alan, 7/24' },
  { slug: 'yesilalan', name: 'Yeşilalan Parkı', category: 'doga-parklar', description: 'Şanlıurfa merkezde yeşil alanların en yoğun olduğu park. Çocuk oyun alanları, spor aletleri ve piknik masaları ile ailelerin tercihi.', address: 'Yenişehir, Şanlıurfa Merkez', opening_hours: '06:00-00:00' },

  // --- Dini Yerler (2) ---
  { slug: 'mevlid-halil', name: 'Hz. İbrahim Mevlid-i Halil Mağarası', category: 'dini-yerler', description: 'Hz. İbrahim\'in doğduğu kabul edilen kutsal mağara. Ziyaretçiler burada dua eder ve manevi huzur bulur. Balıklıgöl yakınında yer alan mağara, önemli bir dini turizm noktasıdır.', address: 'Eyyübiye, Şanlıurfa Merkez', latitude: 37.1595, longitude: 38.7905, opening_hours: '08:00-22:00' },
  { slug: 'halil-urrahman', name: 'Halil-ür Rahman Camii', category: 'dini-yerler', description: 'Balıklıgöl kenarında yer alan tarihi cami. Hz. İbrahim ile ilişkilendirilen cami, Osmanlı mimarisi özellikleri taşır. Şanlıurfa\'nın en önemli ibadet yerlerinden biridir.', address: 'Eyyübiye, Şanlıurfa Merkez', latitude: 37.1592, longitude: 38.7908, opening_hours: 'Namaz vakitleri' },
];

async function seedPlaces(): Promise<void> {
  console.log('🏛️  Mekanlar ekleniyor...');

  let count = 0;
  for (const place of places) {
    await pool.query(
      `INSERT INTO places (id, name, slug, description, category, address, latitude, longitude, phone, email, website, opening_hours, rating, rating_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         website = EXCLUDED.website,
         opening_hours = EXCLUDED.opening_hours,
         updated_at = NOW()`,
      [
        uuid(),
        place.name,
        place.slug,
        place.description,
        place.category,
        place.address,
        place.latitude || null,
        place.longitude || null,
        place.phone || '',
        '',
        place.website || '',
        place.opening_hours || '',
        (Math.random() * 1.5 + 3.5).toFixed(2),
        Math.floor(Math.random() * 200 + 10),
      ]
    );
    count++;
    if (count % 20 === 0) {
      console.log(`   ... ${count} mekan eklendi`);
    }
  }

  console.log(`✅ ${count} mekan eklendi\n`);
}

// ---------------------------------------------------------------------------
// Blog Yazıları (10 adet)
// ---------------------------------------------------------------------------

const blogPosts = [
  {
    title: 'Göbeklitepe Gezi Rehberi 2026',
    slug: 'gobeklitepe-gezi-rehberi-2026',
    excerpt: 'Dünyanın en eski tapınağı Göbeklitepe\'yi ziyaret etmek için bilmeniz gereken her şey.',
    content: `Göbeklitepe, insanlık tarihinin en önemli arkeolojik keşiflerinden biridir. M.Ö. 9600 yılına tarihlenen bu tapınak kompleksi, tarım ve yerleşik düzene geçilmeden önce inşa edilmiştir. Bu durum, insanlık tarihinin sandığımızdan çok daha karmaşık bir sosyal yapıya sahip olduğunu gösterir.

**Göbeklitepe'ye Nasıl Gidilir?**
Şanlıurfa şehir merkezine 18 km uzaklıktaki Örencik Köyü'nde yer alan Göbeklitepe'ye toplu taşıma veya özel araçla ulaşabilirsiniz. Şanlıurfa Müzesi önünden kalkan servis araçları da mevcuttur.

**Ziyaret Bilgileri**
Göbeklitepe her gün 08:00-19:00 saatleri arasında ziyarete açıktır. Giriş ücreti MüzeKart ile ücretsizdir. Ziyaret süresi ortalama 1-2 saat sürer.

**Neler Göreceksiniz?**
- T şeklinde düzenlenmiş devasa taş sütunlar
- Hayvan figürleri ile süslenmiş dikilitaşlar
- Arkeopark ve ziyaretçi merkezi
- Yeni keşfedilen yapılar ve kalıntılar

**İpuçları**
- Sabah erken saatlerde gitmek kalabalıktan kaçınmanızı sağlar
- Yaz aylarında şapka ve su almayı unutmayın
- Rehberli turlar deneyiminizi zenginleştirir
- Yakındaki Karahan Tepesi'ni de ziyaret edin

Göbeklitepe, UNESCO Dünya Mirası Listesi'nde yer almakta olup, her yıl yüz binlerce ziyaretçi ağırlamaktadır. Şanlıurfa'ya geldiğinizde mutlaka görmeniz gereken bu eşsiz mekanı listenize ekleyin.`,
    status: 'published',
    is_featured: true,
    read_time_minutes: 8,
  },
  {
    title: 'Şanlıurfa\'da Nerede Ne Yenir?',
    slug: 'sanliurfada-nerede-ne-yenir',
    excerpt: 'Urfa mutfağının en lezzetli durakları ve denenmesi gereken yemekler rehberi.',
    content: `Şanlıurfa, Türkiye'nin en zengin mutfak kültürlerinden birine sahiptir. Baharatlı yemekleri, et yemekleri ve geleneksel tatlılarıyla ünlü olan Urfa mutfağı, ziyaretçilerine unutulmaz lezzetler sunar.

**Mutlaka Denenmesi Gerekenler**

1. **Urfa Kebabı** - Acılı ezme ve lavaş ile servis edilen geleneksel kebap
2. **Çiğ Köfte** - Urfa usulü, isot baharatıyla hazırlanan çiğ köfte
3. **Bumbar Çorbası** - Kuzu bağırsağı ile yapılan geleneksel çorba
4. **İsotlu Çiğ Köfte** - Acılı, baharatlı Urfa çiğ köftesi
5. **Sillik** - İrmikten yapılan geleneksel Urfa tatlısı
6. **Künefe** - Tel kadayıf ve peynir ile yapılan sıcak tatlı
7. **Lahmacun** - İnce hamur üzerine kıyma harçlı geleneksel lezzet
8. **Keledoş** - Buğday ve et ile yapılan geleneksel yemek

**En İyi Restoranlar**
- Ciğerci Aziz Usta: En iyi ciğer salonu
- Cevahir Konak: Tarihi konakta Urfa mutfağı
- Kebap Sarayı: Geleneksel kebaplar
- Zahter Kahvaltı Evi: Serpme Urfa kahvaltısı

**Baharat Kültürü**
Urfa mutfağının en önemli unsuru isot baharatıdır. Karabiber benzeri bu baharat, birçok yemeğe karakteristik lezzetini verir. Ayrıca sumak, kimyon ve nane de sıkça kullanılır.`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 7,
  },
  {
    title: 'Halfeti Tekne Turu Deneyimi',
    slug: 'halfeti-tekne-turu-deneyimi',
    excerpt: 'Sular altında kalan şehri keşfetmek için unutulmaz bir tekne turu.',
    content: `Halfeti, Şanlıurfa'nın en büyüleyici ilçelerinden biridir. Birecik Barajı'nın yapılmasıyla sular altında kalan kasaba, "kara gül"ü ve tekne turlarıyla ünlüdür.

**Tekne Turu Hakkında**
Tekne turları Halfeti merkezden kalkmaktadır. Tur süresi yaklaşık 1-2 saat sürer. Rumkale, batık köyler ve Fırat Nehri'nin muhteşem manzaraları tur kapsamında ziyaret edilir.

**Görülmesi Gereken Yerler**
- **Rumkale**: Fırat Nehri üzerindeki tarihi kale
- **Batık Köyler**: Sular altında kalan evler ve yapılar
- **Kara Gül**: Dünyada sadece Halfeti'de yetişen siyah gül
- **Savaşan Köyü**: Tekne ile ulaşılan batık köy

**Ne Zaman Gidilmeli?**
İlkbahar ve sonbahar ayları en uygun dönemdir. Yaz ayları çok sıcak olabilir. Nisan-Mayıs ve Eylül-Ekim ayları idealdir.

**Ulaşım**
Şanlıurfa merkezden Halfeti'ne araçla yaklaşık 1 saat sürer. Toplu taşıma seçenekleri de mevcuttur. Halfeti'ye vardığınızda iskelede tekne turları için bekleyen tekneler bulunmaktadır.

**Konaklama**
Halfeti'de butik oteller ve pansiyonlar bulunmaktadır. Şanlıurfa merkezden günlük gezi olarak da ziyaret edebilirsiniz.`,
    status: 'published',
    is_featured: true,
    read_time_minutes: 6,
  },
  {
    title: 'Harran\'ın Eşsiz Tarihi',
    slug: 'harranin-esiz-tarihi',
    excerpt: 'İlk İslam üniversitesinin kurulduğu, konik evleriyle ünlü antik kent.',
    content: `Harran, Şanlıurfa'nın 44 km güneyinde yer alan ve 5000 yılı aşkın geçmişe sahip antik bir yerleşimdir. Konik Harran evleri, dünyanın en eski üniversitesi ve zengin tarihi ile Harran, mutlaka ziyaret edilmesi gereken bir destinasyondur.

**Tarihi Önemi**
Harran, ilk İslam üniversitesinin kurulduğu yer olarak bilinir. Aynı zamanda Hz. İbrahim'in de Harran'da yaşadığı rivayet edilir. Mezopotamya medeniyetlerinin kesişim noktasında yer alan Harran, Asur, Roma ve İslam medeniyetlerine ev sahipliği yapmıştır.

**Konik Harran Evleri**
Harran'ın en belirgin özelliği konik şeklindeki evleridir. Bu evler, çamur ve taş kullanılarak inşa edilmiştir. İç mekanları yazın serin, kışın sıcak tutar. Günümüzde restore edilen evler ziyaret edilebilmektedir.

**Gezilecek Yerler**
- **Harran Höyüğü**: Antik yerleşim kalıntıları
- **Harran Kalesi**: Tarihi kale kalıntıları
- **Ulu Cami**: Anadolu'nun en eski camilerinden
- **Konik Evler**: Geleneksel Harran mimarisi
- **El-Batran Külliyesi**: Tarihi İslam yapıları

**Ziyaret Bilgileri**
Harran'a Şanlıurfa merkezden 45 dakikada ulaşabilirsiniz. Giriş ücretsizdir. Ziyaret süresi 2-3 saat civarındadır. Yaz aylarında sıcak hava nedeniyle sabah erken saatlerde ziyaret önerilir.`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 6,
  },
  {
    title: 'Şanlıurfa\'da 2 Günlük Gezi Planı',
    slug: 'sanliurfada-2-gunluk-gezi-plani',
    excerpt: 'Şanlıurfa\'yı 2 günde keşfetmek için ideal gezi rotası.',
    content: `Şanlıurfa'yı 2 günde verimli bir şekilde keşfetmek istiyorsanız, işte size önerilen gezi planı:

**1. Gün: Tarihi ve Dini Yerler**

*Sabah:*
- Göbeklitepe (08:00-10:00)
- Karahan Tepesi (10:30-12:00)

*Öğle:*
- Şehir merkezinde öğle yemeği (Urfa kebabı)

*Öğleden Sonra:*
- Şanlıurfa Kalesi (14:00-15:00)
- Balıklıgöl (15:30-17:00)
- Hz. İbrahim Mevlid-i Halil Mağarası (17:00-17:30)
- Rızvaniye Camii (17:30-18:00)

*Akşam:*
- Akşam yemeği (Ciğerci Aziz Usta)
- Gümrükhan'da çay keyfi

**2. Gün: Kültür ve Doğa**

*Sabah:*
- Harran Antik Kenti (08:30-11:30)
- Konik Harran Evleri (11:30-12:00)

*Öğle:*
- Harran'da yerel yemekler

*Öğleden Sonra:*
- Şanlıurfa Arkeoloji Müzesi (14:00-15:30)
- Bakırcılar Çarşısı (16:00-17:30)

*Akşam:*
- Balıklıgöl kenarında akşam yemeği
- Gece Balıklıgöl manzarası

**Konaklama Önerileri**
- El-Ruha Hotel (Balıklıgöl manzaralı)
- Hotel Manço (Butik otel)
- Nevali Hotel (Ekonomik seçenek)

**Ulaşım İpuçları**
- Şehir içi ulaşım için taksi veya dolmuş kullanabilirsiniz
- Göbeklitepe ve Harran için araç kiralamanız önerilir
- MüzeKart edinmeyi unutmayın`,
    status: 'published',
    is_featured: true,
    read_time_minutes: 7,
  },
  {
    title: 'Urfa Kebabı Nerede Yenir?',
    slug: 'urfa-kebabı-nerede-yenir',
    excerpt: 'En iyi Urfa kebabı yapan restoranlar ve lezzet rehberi.',
    content: `Urfa kebabı, Şanlıurfa'nın en meşhur yemeklerinden biridir. Kuzu etinin özel baharatlarla marine edilip şişte pişirilmesiyle hazırlanır. Yanında acılı ezme, lavaş ve közlenmiş sebzeler ile servis edilir.

**En İyi Urfa Kebabı Restoranları**

1. **Kebap Sarayı**
   Geleneksel Urfa kebabının en iyi adresi. Kömür ateşinde pişirilen kebaplar, özel baharat karışımlarıyla hazırlanır.
   Adres: Dergah Mah., Haliliye

2. **Cevahir Konak**
   Tarihi bir konakta sunulan Urfa kebabı. Otantik ambiyans ve kaliteli lezzet.
   Adres: Kale Mah., Eyyübiye

3. **Ocakbaşı Kafe & Restoran**
   Urfa ocakbaşı kültürünü yaşatan mekan. Kömür ateşinde pişen kebaplar.
   Adres: Kurtuluş Mah., Eyyübiye

4. **İsot Park Kafe & Restoran**
   İsot baharatının en iyi kullanıldığı restoran. Özel baharat karışımlı kebaplar.
   Adres: Yenişehir, Şanlıurfa Merkez

**Urfa Kebabının Özellikleri**
- Kuzu etinden yapılır
- İsot baharatı ile tatlandırılır
- Şişte kömür ateşinde pişirilir
- Acılı ezme ve lavaş ile servis edilir
- Yanında közlenmiş domates ve biber bulunur

**Fiyat Aralığı**
Urfa kebabı porsiyon fiyatları ortalama 150-250 TL arasındadır. Restoranın kalitesine ve konumuna göre değişiklik gösterebilir.`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 5,
  },
  {
    title: 'Balıklıgöl Ziyaret Rehberi',
    slug: 'balikligol-ziyaret-rehberi',
    excerpt: 'Şanlıurfa\'nın en kutsal mekanını ziyaret etmek için bilmeniz gerekenler.',
    content: `Balıklıgöl, Şanlıurfa'nın en kutsal ve en çok ziyaret edilen mekanlarından biridir. Hz. İbrahim'in ateşe atıldığı ve ateşin suya, odunların balığa dönüştüğü rivayet edilir.

**Tarihi ve Dini Önemi**
Rivayete göre Nemrut, Hz. İbrahim'i ateşe attırır. Ancak Allah'ın emriyle ateş suya, odunlar da balığa dönüşür. Bu mucize nedeniyle göldeki balıklar kutsal sayılır ve avlanmaz.

**Görülmesi Gereken Yerler**
- **Balıklıgöl**: Kutsal göl ve balıklar
- **Hz. İbrahim Camii**: Göl kenarındaki cami
- **Rızvaniye Camii**: Tarihi Osmanlı camii
- **Mevlid-i Halil Mağarası**: Hz. İbrahim'in doğduğu mağara
- **Halil-ür Rahman Camii**: Balıklıgöl kenarındaki tarihi cami

**Ziyaret Bilgileri**
- **Giriş**: Ücretsiz
- **Ziyaret Saati**: 09:00-22:00
- **Ziyaret Süresi**: 1-2 saat
- **En Uygun Zaman**: İlkbahar ve sonbahar

**Çevredeki Tesisler**
Göl etrafında çay bahçeleri, restoranlar ve hediyelik eşya dükkanları bulunmaktadır. Balıklıgöl Çarşısı'nda Urfa'ya özgü ürünler satın alabilirsiniz.

**İpuçları**
- Akşam saatlerinde göl manzarası çok güzeldir
- Balıkları beslemek yasaktır, lütfen beslemeyin
- Fotoğraf çekimi serbesttir
- Yanınızda su ve şapka bulundurun`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 5,
  },
  {
    title: 'Şanlıurfa Müzeleri Rehberi',
    slug: 'sanliurfa-muzeleri-rehberi',
    excerpt: 'Şanlıurfa\'daki müzeler ve arkeolojik alanlar hakkında kapsamlı rehber.',
    content: `Şanlıurfa, zengin tarihi geçmişiyle birçok önemli müzeye ev sahipliği yapmaktadır. Göbeklitepe buluntularından Mozaik Müzesi'ne kadar birçok önemli müzeyi keşfedin.

**Şanlıurfa Arkeoloji Müzesi**
Bölgenin en zengin müzelerinden biridir. Göbeklitepe buluntuları, antik heykeller, mozaikler ve arkeolojik eserler sergilenmektedir. Modern mimarisiyle de dikkat çeken müze, 2015 yılında yenilenmiştir.

**Mozaik Müzesi (Haleplibahçe)**
Şanlıurfa'daki en önemli mozaik koleksiyonlarından birine sahiptir. Roma ve Bizans dönemine ait mozaikler sergilenmektedir. Haleplibahçe Mozaik Müzesi olarak da bilinir.

**Göbeklitepe Arkeopark**
Açık hava müzesi olarak hizmet veren Göbeklitepe, dünyanın en eski tapınak kompleksidir. Ziyaretçi merkezi, restoran ve tuvalet gibi imkanlar mevcuttur.

**Müze Bilgileri**

| Müze | Giriş | Saat | Süre |
|------|-------|------|------|
| Arkeoloji Müzesi | MüzeKart ücretsiz | 08:30-17:30 | 1-2 saat |
| Mozaik Müzesi | MüzeKart ücretsiz | 08:30-17:30 | 1 saat |
| Göbeklitepe | MüzeKart ücretsiz | 08:00-19:00 | 1-2 saat |
| Harran Höyüğü | Ücretsiz | 09:00-18:00 | 1 saat |

**MüzeKart**
MüzeKart, Türkiye genelindeki devlet müzelerine ücretsiz giriş imkanı sunar. Fiyatı uygun olup, bir yıl geçerlidir. Şanlıurfa'daki tüm müzelere MüzeKart ile ücretsiz girebilirsiniz.`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 6,
  },
  {
    title: 'Şanlıurfa\'da Konaklama Rehberi',
    slug: 'sanliurfada-konaklama-rehberi',
    excerpt: 'Şanlıurfa\'da her bütçeye uygun otel ve konaklama seçenekleri.',
    content: `Şanlıurfa, artan turizm hareketliliğiyle birlikte geniş bir konaklama yelpazesine sahiptir. Butik otellerden uluslararası zincir otellere kadar birçok seçenek mevcuttur.

**Lüks Oteller**

1. **Hilton Garden Inn**
   Uluslararası standartlarda hizmet. Geniş odalar, fitness merkezi ve restoran.
   Fiyat: 1500-2500 TL/gece

2. **Courtyard by Marriott**
   Marriott kalitesi. Modern odalar, havuz ve toplantı salonları.
   Fiyat: 1500-2500 TL/gece

3. **Divan Şanlıurfa**
   Konferans salonları, SPA ve restoran hizmetleri.
   Fiyat: 1200-2000 TL/gece

**Butik Oteller**

1. **Hotel Manço**
   Tarihi konakta butik otel. Taş odalar ve geleneksel mimari.
   Fiyat: 500-900 TL/gece

2. **El-Ruha Hotel**
   Balıklıgöl manzaralı odalar. SPA ve restoran.
   Fiyat: 800-1500 TL/gece

3. **Konak Otel**
   Geleneksel Urfa konağı. Avlu ve taş odalar.
   Fiyat: 400-800 TL/gece

**Ekonomik Seçenekler**

1. **Nevali Hotel**
   Modern ve uygun fiyatlı. Kahvaltı dahil.
   Fiyat: 300-500 TL/gece

2. **GAP Hotel**
   Konferans ve turistik konaklamalar için ideal.
   Fiyat: 400-700 TL/gece

**Konaklama İpuçları**
- Yaz sezonunda erken rezervasyon yapın
- Balıklıgöl çevresi en turistik bölgedir
- Göbeklitepe turları için şehir merkezinde kalmak avantajlıdır
- Ramazan ve bayram dönemlerinde fiyatlar artabilir`,
    status: 'published',
    is_featured: false,
    read_time_minutes: 6,
  },
  {
    title: 'Göbeklitepe\'nin Gizemi',
    slug: 'gobekliptenin-gizemi',
    excerpt: 'İnsanlık tarihinin en büyük gizemlerinden biri: Göbeklitepe nasıl inşa edildi?',
    content: `Göbeklitepe, modern tarih anlayışımızı tamamen değiştiren bir keşiftir. M.Ö. 9600 yılında, yani tarım ve yerleşik düzen başlamadan önce inşa edilmiş olması, bilim insanlarını şaşırtmaya devam ediyor.

**Göbeklitepe'yi Özel Kılan Nedir?**

1. **Tarih**: 12.000 yıldan daha eski olması
2. **Mimari**: T şeklinde devasa taş sütunlar (6-7 metre, 10-20 ton)
3. **Sanat**: Hayvan figürleri ile süslenmiş dikilitaşlar
4. **Organizasyon**: Avcı-toplayıcı toplumun bu kadar büyük bir proje organize etmesi

**Kimler İnşa Etti?**
Göbeklitepe'yi inşa eden insanlar, avcı-toplayıcı bir topluluktu. Bu, yerleşik düzene ve tarıma geçmeden önce yaşayan insanlardır. Bu topluluğun bu kadar karmaşık bir yapı inşa etmesi, sosyal organizasyon ve inanç sistemlerinin sandığımızdan çok daha gelişmiş olduğunu gösterir.

**Neden İnşa Edildi?**
Göbeklitepe'nin bir tapınak kompleksi olduğu düşünülmektedir. Ritüel amaçlarla kullanıldığı ve bölgedeki avcı-toplayıcı grupların buluşma noktası olduğu tahmin edilmektedir.

**Keşif Tarihi**
Göbeklitepe, 1963 yılında bir Türk ve Amerikalı araştırmacı tarafından fark edilmiş, ancak asıl kazılar 1995 yılında Alman arkeolog Klaus Schmidt tarafından başlatılmıştır.

**Bugünkü Durum**
Şu ana kadar 20'den fazla dairesel yapı keşfedilmiş olup, kazılar devam etmektedir. Sadece küçük bir bölümü ziyarete açılmıştır. Yakınlardaki Karahan Tepesi gibi yeni keşifler, Göbeklitepe'nin daha büyük bir yerleşimin parçası olduğunu göstermektedir.

**Sonuç**
Göbeklitepe, insanlık tarihinin en büyük gizemlerinden biri olmaya devam ediyor. Her yıl yapılan yeni keşifler, bu eşsiz arkeolojik alanın sırlarını aydınlatmaya devam ediyor.`,
    status: 'published',
    is_featured: true,
    read_time_minutes: 8,
  },
];

async function seedBlogPosts(authorId: string): Promise<void> {
  console.log('📝 Blog yazıları ekleniyor...');

  // Kategori ID'lerini al
  const catResult = await pool.query('SELECT id FROM categories WHERE slug = $1', ['kultur-tarih']);
  const categoryId = catResult.rows[0]?.id || null;

  let count = 0;
  for (const post of blogPosts) {
    await pool.query(
      `INSERT INTO blog_posts (id, title, slug, content, excerpt, author_id, category_id, status, is_featured, read_time_minutes, published_at, seo_title, seo_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         excerpt = EXCLUDED.excerpt,
         updated_at = NOW()`,
      [
        uuid(),
        post.title,
        post.slug,
        post.content,
        post.excerpt,
        authorId,
        categoryId,
        post.status,
        post.is_featured,
        post.read_time_minutes,
        daysAgo(Math.floor(Math.random() * 90 + 1)),
        post.title,
        post.excerpt,
      ]
    );
    count++;
  }

  console.log(`✅ ${count} blog yazısı eklendi\n`);
}

// ---------------------------------------------------------------------------
// Etkinlikler (5 adet)
// ---------------------------------------------------------------------------

const events = [
  {
    title: 'Göbeklitepe Kültür Festivali 2026',
    slug: 'gobeklitepe-kultur-festivali-2026',
    description: 'Göbeklitepe\'nin UNESCO Dünya Mirası Listesi\'ne girişi kutlanıyor. 3 gün sürecek festivalde konserler, sergiler, geleneksel yemekler ve atölyeler yer alıyor. Yerli ve yabancı sanatçıların katılımıyla gerçekleşecek festival, Şanlıurfa\'nın en büyük kültür etkinliğidir.',
    start_date: daysFromNow(30),
    end_date: daysFromNow(32),
    location: 'Göbeklitepe Ziyaretçi Merkezi, Örencik Köyü',
    organizer: 'Şanlıurfa Kültür ve Turizm İl Müdürlüğü',
  },
  {
    title: 'Halfeti Kara Gül Festivali',
    slug: 'halfeti-kara-gul-festivali',
    description: 'Dünyada sadece Halfeti\'de yetişen siyah gülün kutlandığı yıllık festival. Çiçek sergileri, tekne turları, fotoğraf yarışması ve yerel lezzetler festivali. Doğaseverler ve fotoğraf tutkunları için kaçırılmayacak bir etkinlik.',
    start_date: daysFromNow(60),
    end_date: daysFromNow(61),
    location: 'Halfeti Merkez, Şanlıurfa',
    organizer: 'Halfeti Belediyesi',
  },
  {
    title: 'Urfa Mutfağı Gastronomi Festivali',
    slug: 'urfa-mutfagi-gastronomi-festivali',
    description: 'Şanlıurfa\'nın eşsiz mutfağının kutlandığı gastronomi festivali. Urfa kebabı, çiğköfte, sillik, künefe ve daha birçok lezzetin tadılabileceği festivalde, canlı yemek gösterileri ve yarışmalar da düzenlenmektedir.',
    start_date: daysFromNow(45),
    end_date: daysFromNow(47),
    location: 'Gölbaşı Parkı, Şanlıurfa',
    organizer: 'Şanlıurfa Gastronomi Derneği',
  },
  {
    title: 'Harran Tarihi ve Kültür Günleri',
    slug: 'harran-tarih-kultur-gunleri',
    description: 'Harran\'ın 5000 yıllık tarihinin kutlandığı etkinlik. Konik evlerde geleneksel yaşam deneyimi, tarihi rehberli turlar, müzik gösterileri ve geleneksel el sanatları atölyeleri. Tarih ve kültür meraklıları için ideal bir etkinlik.',
    start_date: daysFromNow(75),
    end_date: daysFromNow(76),
    location: 'Harran Antik Kenti, Şanlıurfa',
    organizer: 'Harran Belediyesi',
  },
  {
    title: 'Balıklıgöl Işık ve Ses Gösterisi',
    slug: 'balikligol-isik-ses-gosterisi',
    description: 'Balıklıgöl\'de düzenlenen muhteşem ışık ve ses gösterisi. Hz. İbrahim hikayesinin anlatıldığı gösteri, lazer, su efektleri ve müzik eşliğinde sunulmaktadır. Her akşam düzenlenen gösteri ücretsizdir.',
    start_date: daysFromNow(1),
    end_date: daysFromNow(1),
    location: 'Balıklıgöl, Eyyübiye, Şanlıurfa',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
  },
];

async function seedEvents(): Promise<void> {
  console.log('🎉 Etkinlikler ekleniyor...');

  // Bir mekan ID'si al (gobeklitepe)
  const placeResult = await pool.query('SELECT id FROM places WHERE slug = $1', ['gobeklitepe']);
  const placeId = placeResult.rows[0]?.id || null;

  let count = 0;
  for (const event of events) {
    await pool.query(
      `INSERT INTO events (id, title, slug, description, place_id, start_date, end_date, location, organizer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         location = EXCLUDED.location,
         updated_at = NOW()`,
      [
        uuid(),
        event.title,
        event.slug,
        event.description,
        placeId,
        event.start_date,
        event.end_date,
        event.location,
        event.organizer,
      ]
    );
    count++;
  }

  console.log(`✅ ${count} etkinlik eklendi\n`);
}

// ---------------------------------------------------------------------------
// Test Kullanıcıları (5 adet)
// ---------------------------------------------------------------------------

const testUsers = [
  { email: 'test@sanliurfa.com', full_name: 'Test Kullanıcı', role: 'user' },
  { email: 'admin@sanliurfa.com', full_name: 'Ahmet Yılmaz', role: 'admin' },
  { email: 'editor@sanliurfa.com', full_name: 'Fatma Demir', role: 'editor' },
  { email: 'mehmet@test.com', full_name: 'Mehmet Kaya', role: 'user' },
  { email: 'zeynep@test.com', full_name: 'Zeynep Çelik', role: 'user' },
];

async function seedUsers(): Promise<Map<string, string>> {
  console.log('👥 Test kullanıcıları ekleniyor...');

  const emailToId = new Map<string, string>();

  for (const user of testUsers) {
    const id = uuid();
    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES ($1, $2, '$2a$10$dummyhashfortesting', $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role`,
      [id, user.email, user.full_name, user.role]
    );
    emailToId.set(user.email, id);
  }

  console.log(`✅ ${testUsers.length} kullanıcı eklendi\n`);
  return emailToId;
}

// ---------------------------------------------------------------------------
// Yorumlar (20 adet)
// ---------------------------------------------------------------------------

interface ReviewData {
  placeSlug: string;
  userEmail: string;
  rating: number;
  title: string;
  content: string;
}

const reviews: ReviewData[] = [
  { placeSlug: 'gobeklitepe', userEmail: 'mehmet@test.com', rating: 5, title: 'İnanılmaz bir deneyim', content: 'Göbeklitepe gerçekten dünyanın en önemli arkeolojik alanlarından biri. Rehberli turla gitmenizi öneririm. İnsanlık tarihinin başlangıcını hissediyorsunuz.' },
  { placeSlug: 'gobeklitepe', userEmail: 'zeynep@test.com', rating: 5, title: 'Mutlaka görülmeli', content: 'Şanlıurfa\'ya geldiğinizde kesinlikle Göbeklitepe\'yi ziyaret edin. Tarih öncesi dönem hakkında çok şey öğretiyor. Arkeopark çok güzel düzenlenmiş.' },
  { placeSlug: 'balikligol', userEmail: 'test@sanliurfa.com', rating: 5, title: 'Manevi huzur', content: 'Balıklıgöl gerçekten çok güzel ve huzur verici bir yer. Akşam saatlerinde ışıklandırma muhteşem oluyor. Çay bahçelerinde oturup manzarayı izlemek harika.' },
  { placeSlug: 'balikligol', userEmail: 'mehmet@test.com', rating: 4, title: 'Güzel ama kalabalık', content: 'Balıklıgöl çok güzel ama özellikle hafta sonları çok kalabalık. Sabah erken saatte gitmek daha iyi. Balıklar gerçekten çok büyük ve ilginç.' },
  { placeSlug: 'harran', userEmail: 'zeynep@test.com', rating: 5, title: 'Konik evler harika', content: 'Harran\'ın konik evleri görülmeye değer. Tarihi atmosfer çok etkileyici. Restore edilen evleri gezebiliyorsunuz. Ulu Cami de çok güzel.' },
  { placeSlug: 'halfeti', userEmail: 'admin@sanliurfa.com', rating: 5, title: 'Tekne turu muhteşem', content: 'Halfeti tekne turu kesinlikle deneyimlenmeli. Batık köyler ve Rumkale çok etkileyici. Kara gülü görebilmek de büyük şans.' },
  { placeSlug: 'cigerci-aziz-usta', userEmail: 'test@sanliurfa.com', rating: 5, title: 'En iyi ciğer', content: 'Şanlıurfa\'da yediğim en iyi ciğer. Porsiyonlar büyük, lezzet mükemmel. Fiyatlar da gayet uygun. Mutlaka deneyin.' },
  { placeSlug: 'cigerci-aziz-usta', userEmail: 'mehmet@test.com', rating: 4, title: 'Lezzetli ama sıra bekleyin', content: 'Ciğer gerçekten çok lezzetli ama özellikle akşam saatlerinde sıra olabiliyor. Buna değer ama sabırlı olun.' },
  { placeSlug: 'cevahir-konak', userEmail: 'zeynep@test.com', rating: 5, title: 'Tarihi konakta yemek', content: 'Tarihi bir konakta Urfa mutfağı yemek harika bir deneyim. Kebaplar mükemmel, servis çok iyi. Ambiyans da çok güzel.' },
  { placeSlug: 'hotel-manco', userEmail: 'admin@sanliurfa.com', rating: 4, title: 'Güzel butik otel', content: 'Hotel Manço güzel bir butik otel. Taş odalar çok otantik. Kahvaltı güzel. Konum olarak merkezi, yürüyerek birçok yere gidebilirsiniz.' },
  { placeSlug: 'el-ruha', userEmail: 'editor@sanliurfa.com', rating: 5, title: 'Balıklıgöl manzarası', content: 'El-Ruha\'nın Balıklıgöl manzaralı odaları gerçekten harika. Sabah uyanıp gölü görmek paha biçilemez. Servis ve temizlik de çok iyi.' },
  { placeSlug: 'gumrukhan-cafe', userEmail: 'test@sanliurfa.com', rating: 4, title: 'Tarihi handa çay', content: 'Gümrük Han\'da çay içmek çok keyifli. Otantik atmosfer çok güzel. Fiyatlar biraz yüksek ama deneyim buna değer.' },
  { placeSlug: 'sillik-ustasi', userEmail: 'zeynep@test.com', rating: 5, title: 'Sillik mükemmel', content: 'Urfa\'nın meşhur sillik tatlısını burada yemelisiniz. Gerçekten çok lezzetli ve özgün. Sıcak servis edilmesi de çok iyi.' },
  { placeSlug: 'bakircilar-carsisi', userEmail: 'mehmet@test.com', rating: 4, title: 'Geleneksel sanat', content: 'Bakırcılar Çarşısı\'nda el yapımı bakır ürünler bulabilirsiniz. Fiyatlar biraz yüksek ama kalite gerçekten çok iyi. Hediyelik eşya için ideal.' },
  { placeSlug: 'sira-hamami', userEmail: 'admin@sanliurfa.com', rating: 4, title: 'Geleneksel hamam', content: 'Sıra Hamamı geleneksel Türk hamamı deneyimi için güzel. Temiz ve bakımlı. Hafta sonları kalabalık olabilir, hafta içi daha rahat.' },
  { placeSlug: 'golbasi-parki', userEmail: 'editor@sanliurfa.com', rating: 4, title: 'Güzel park', content: 'Gölbaşı Parkı aileler için güzel bir dinlenme alanı. Çocuk parkları ve yürüyüş yolları var. Akşam saatlerinde çok güzel oluyor.' },
  { placeSlug: 'kebap-sarayi', userEmail: 'test@sanliurfa.com', rating: 5, title: 'En iyi Urfa kebabı', content: 'Kebap Sarayı\'nda yediğim Urfa kebabı hayatımda yediğim en iyi kebaplardan biriydi. Acılı ezme ve lavaş ile mükemmel uyum.' },
  { placeSlug: 'arkeoloji-muzesi', userEmail: 'zeynep@test.com', rating: 5, title: 'Çok zengin müze', content: 'Şanlıurfa Arkeoloji Müzesi gerçekten çok zengin. Göbeklitepe buluntuları muhteşem. Modern mimarisi de çok güzel. En az 2 saat ayırın.' },
  { placeSlug: 'divan-hotel', userEmail: 'mehmet@test.com', rating: 4, title: 'Kaliteli otel', content: 'Divan otel standart kalitede hizmet sunuyor. Odalar temiz ve konforlu. Restoran güzel. İş seyahati için ideal.' },
  { placeSlug: 'urfa-kalesi', userEmail: 'editor@sanliurfa.com', rating: 4, title: 'Tarihi kale', content: 'Urfa Kalesi tarihi bir yapı. Kale surları restore edilmiş. Şehir manzarası güzel. Balıklıgöl ile birlikte ziyaret edilebilir.' },
];

async function seedReviews(placeSlugToId: Map<string, string>, emailToId: Map<string, string>): Promise<void> {
  console.log('💬 Yorumlar ekleniyor...');

  let count = 0;
  for (const review of reviews) {
    const placeId = placeSlugToId.get(review.placeSlug);
    const userId = emailToId.get(review.userEmail);

    if (!placeId || !userId) {
      console.warn(`⚠️  Yorum atlanıyor: place=${review.placeSlug}, user=${review.userEmail}`);
      continue;
    }

    await pool.query(
      `INSERT INTO reviews (id, place_id, user_id, title, content, rating, helpful_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        uuid(),
        placeId,
        userId,
        review.title,
        review.content,
        review.rating,
        Math.floor(Math.random() * 50),
      ]
    );
    count++;
  }

  console.log(`✅ ${count} yorum eklendi\n`);
}

// ---------------------------------------------------------------------------
// Ana Fonksiyon
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('🚀 Şanlıurfa.com İçerik Seed Script\'i Başlatılıyor...\n');
  console.log('='.repeat(50));

  try {
    // 1. Tabloları oluştur
    await createTables();

    // 2. Kategorileri ekle
    await seedCategories();

    // 3. Mekanları ekle
    await seedPlaces();

    // 4. Kullanıcıları ekle
    const emailToId = await seedUsers();

    // 5. Blog yazılarını ekle
    const authorId = emailToId.get('admin@sanliurfa.com') || '';
    if (authorId) {
      await seedBlogPosts(authorId);
    }

    // 6. Etkinlikleri ekle
    await seedEvents();

    // 7. Yorumları ekle
    const catResult = await pool.query('SELECT slug FROM categories');
    const placeResult = await pool.query('SELECT slug, id FROM places');
    const placeSlugToId = new Map<string, string>();
    for (const row of placeResult.rows) {
      placeSlugToId.set(row.slug, row.id);
    }
    await seedReviews(placeSlugToId, emailToId);

    // Özet
    console.log('='.repeat(50));
    console.log('\n✅ Seed işlemi başarıyla tamamlandı!\n');
    console.log('📊 Özet:');
    console.log(`   - ${categories.length} kategori`);
    console.log(`   - ${places.length} mekan`);
    console.log(`   - ${testUsers.length} kullanıcı`);
    console.log(`   - ${blogPosts.length} blog yazısı`);
    console.log(`   - ${events.length} etkinlik`);
    console.log(`   - ${reviews.length} yorum`);
    console.log('\n🎉 Şanlıurfa.com içerik seed işlemi tamamlandı!\n');

  } catch (error) {
    console.error('\n❌ Seed işlemi sırasında hata oluştu:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
