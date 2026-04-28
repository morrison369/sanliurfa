#!/usr/bin/env node
/**
 * Şanlıurfa.com 2026 Veri Seed Scripti
 * 
 * Bu script, 2026 güncellemeli gerçek mekan verilerini veritabanına yükler.
 * Çalıştırma: npx ts-node scripts/seed-2026-data.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories, places, reviews, blogPosts } from '../src/db/schema';
import { sql } from 'drizzle-orm';

// PostgreSQL bağlantısı
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sanliurfa';
const client = postgres(connectionString);
const db = drizzle(client);

// 2026 Kategoriler
const categories2026 = [
  {
    id: 1,
    name: 'Restoran',
    slug: 'restoran',
    description: 'Şanlıurfa\'nın en iyi restoranları, kebapçıları ve lokantaları. Ciğer kebabından terbiyesiz tavuğa, patlıcan kebabından içli köfteye kadar tüm lezzetler.',
    icon: 'UtensilsCrossed',
    color: '#e63946',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    name: 'Cafe',
    slug: 'cafe',
    description: 'Kahve molaları için ideal mekanlar, tarihi kahvehaneler ve modern kafeler. Mırra, menengiç kahvesi ve daha fazlası.',
    icon: 'Coffee',
    color: '#f4a261',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 3,
    name: 'Otel',
    slug: 'otel',
    description: 'Konaklama seçenekleri, butik oteller ve 5 yıldızlı oteller. Tarihi hanlardan modern otellere kadar geniş seçenek.',
    icon: 'Hotel',
    color: '#2a9d8f',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 4,
    name: 'Tarihi Yer',
    slug: 'tarihi-yerler',
    description: 'Şanlıurfa\'nın tarihi hazineleri, müzeler ve ören yerleri. Göbeklitepe, Balıklıgöl ve UNESCO Dünya Mirası alanları.',
    icon: 'Landmark',
    color: '#264653',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 5,
    name: 'Tatlıcı',
    slug: 'tatlici',
    description: 'Baklava, kadayıf, billuriye ve geleneksel Şanlıurfa tatlıları. 1989\'dan beri süregelen lezzet.',
    icon: 'Cake',
    color: '#e9c46a',
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 6,
    name: 'Kahvaltı',
    slug: 'kahvalti',
    description: 'Serpme kahvaltı ve kahvaltı salonları. Tarihi hanlarda kahvaltı keyfi.',
    icon: 'Sunrise',
    color: '#f4a261',
    isActive: true,
    sortOrder: 6,
  },
];

// 2026 Mekanlar
const places2026 = [
  // RESTORANLAR
  {
    id: 'place-001',
    name: 'Ciğerci Aziz Usta',
    slug: 'cigerci-aziz-usta',
    categoryId: 1,
    description: `Şanlıurfa'da ciğer kebabının en hasını yiyebileceğiniz mekan. Balıklıgöl'e çıkan yolda çarşı içinde, alçak ahşap masalı ve tabureli, küçük, salaş bir mekan. Masada bütün bütün duran soğanları kendiniz dilediğiniz gibi doğruyorsunuz. 2026 yılında QR menü ve temassız ödeme sistemleri eklenmiştir.

25 yıllık tecrübesiyle ciğer kebabının adresi olan bu mekan, yerli ve yabancı turistlerin gözdesi haline gelmiştir. Taze ciğer, özel isot karışımı ve el yapımı lavaşlarıyla ünlü.`,
    shortDescription: 'Ciğer kebabının efsane adresi, 25 yıllık lezzet',
    address: 'Pınarbaşı Mahallesi, 1211. Sk. No:13, 63210 Merkez/Şanlıurfa',
    phone: '+90 538 782 25 78',
    latitude: 37.1589,
    longitude: 38.7923,
    rating: 4.8,
    reviewCount: 1247,
    priceRange: '₺',
    priceMin: 450,
    priceMax: 650,
    features: ['wifi', 'otopark', 'paket_servis', 'temassiz_odeme', 'qr_menu', 'geleneksel'],
    openingHours: { mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00', thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-002',
    name: 'Sembol Ocakbaşı',
    slug: 'sembol-ocakbasi',
    categoryId: 1,
    description: `Urfa'da terbiyesiz tavuk, ciğer ve özellikle kuşbaşı kebabıyla ünlü ocakbaşı. Ateş başında pişirilen etlerin kokusu sokağa yayılıyor. 2026'da yeni şubesi Karaköprü'de de hizmete girdi. Hem kaliteli hem uygun fiyatlı.

"Terbiyesiz" terimi Urfa'da sadece baharat ve sos kullanılmadan ızgarada pişirilen yiyecekler için kullanılıyor. Et ve sosla terbiyelenmemiş demek - pişerken sadece kendi yağı ve içindeki suyuyla kavruluyor.`,
    shortDescription: 'Terbiyesiz tavuğun meşhur adresi',
    address: 'Merkez İpekyol Cad. Küçük Apt. No:1, 63050 Haliliye/Şanlıurfa',
    phone: '+90 543 315 86 86',
    latitude: 37.1615,
    longitude: 38.7889,
    rating: 4.7,
    reviewCount: 982,
    priceRange: '₺',
    priceMin: 550,
    priceMax: 800,
    features: ['wifi', 'otopark', 'rezervasyon', 'temassiz_odeme', 'acik_alan', 'ocakbasi'],
    openingHours: { mon: '10:00-23:00', tue: '10:00-23:00', wed: '10:00-23:00', thu: '10:00-23:00', fri: '10:00-23:00', sat: '10:00-23:00', sun: '10:00-23:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-003',
    name: 'Çulcuoğlu Restoran',
    slug: 'culcuoglu-restoran',
    categoryId: 1,
    description: `Şanlıurfa mutfağına dair hemen hemen her şeyi bulabileceğiniz bir restoran. Lahmacunu, şıllık tatlısı, içli köftesi ve kebaplarıyla iddialı. 2026'da yeni salon eklendi, mobil uygulama yayında.

Lahmacunu incecik hamur üzerine nefis bir et harcıyla hazırlanıyor. İçli köfte seçeneği hem yağda kızartılmış hem de haşlanmış olarak sunuluyor.`,
    shortDescription: 'Lahmacun ve içli köfte uzmanı',
    address: 'Atatürk Mahallesi, Recep Tayyip Erdoğan Blv., 63100 Haliliye/Şanlıurfa',
    phone: '0414 312 95 95',
    latitude: 37.1634,
    longitude: 38.7945,
    rating: 4.5,
    reviewCount: 756,
    priceRange: '₺',
    priceMin: 400,
    priceMax: 700,
    features: ['wifi', 'otopark', 'paket_servis', 'salon', 'mobil_app'],
    openingHours: { mon: '09:00-23:00', tue: '09:00-23:00', wed: '09:00-23:00', thu: '09:00-23:00', fri: '09:00-23:00', sat: '09:00-23:00', sun: '09:00-23:00' },
    isVerified: true,
    isFeatured: false,
    status: 'approved',
  },
  {
    id: 'place-004',
    name: 'Çağdaş Ocakbaşı',
    slug: 'cagdas-ocakbasi',
    categoryId: 1,
    description: `Terbiyesiz tavuğun en sevilen yeri. Aynı zamanda terbiyeli kuşbaşısı da güzel. Fiyatlar gayet makul. Ocakbaşı kültürünü tam anlamıyla yaşayabileceğiniz samimi bir mekan.

Özellikle akşam saatlerinde doluluk oranı yüksek olan mekanda, yer bulmak için erken gitmeniz önerilir.`,
    shortDescription: 'Terbiyesiz tavuk ve kuşbaşı uzmanı',
    address: 'Osmangazi Mh. Behçet Arabi Cd. 400. Sk. Tepecan Apt. No: 1, Haliliye',
    phone: '+90 414 313 38 00',
    latitude: 37.1656,
    longitude: 38.7967,
    rating: 4.6,
    reviewCount: 643,
    priceRange: '₺',
    priceMin: 500,
    priceMax: 750,
    features: ['wifi', 'otopark', 'ocakbasi', 'aile_ortami'],
    openingHours: { mon: '11:00-24:00', tue: '11:00-24:00', wed: '11:00-24:00', thu: '11:00-24:00', fri: '11:00-24:00', sat: '11:00-24:00', sun: '11:00-24:00' },
    isVerified: true,
    isFeatured: false,
    status: 'approved',
  },
  {
    id: 'place-005',
    name: 'Dedecan Ocakbaşı',
    slug: 'dedecan-ocakbasi',
    categoryId: 1,
    description: `Patlıcan kebabı ile iddialı yerlerden. Ciğer kebabı, kuşbaşısı ve içli köftesi de çok seviliyor. Üstüne billuriye ve şıllık tatlısı da yenilesi.

Tatlı çeşitleri zengin olan mekanda, özellikle sıcak şıllık tatlısı tavsiye edilir. Patlıcan kebabı etin ve patlıcanın uyumunu en iyi şekilde yansıtıyor.`,
    shortDescription: 'Patlıcan kebabının en iyisi',
    address: 'Kasaptaşı Parkı Yanı 300 Evler Çarşı içi No: 11, Haliliye',
    phone: '+90 414 315 25 25',
    latitude: 37.1598,
    longitude: 38.7912,
    rating: 4.7,
    reviewCount: 528,
    priceRange: '₺',
    priceMin: 500,
    priceMax: 800,
    features: ['otopark', 'ocakbasi', 'tatli_cesitleri'],
    openingHours: { mon: '10:00-22:00', tue: '10:00-22:00', wed: '10:00-22:00', thu: '10:00-22:00', fri: '10:00-22:00', sat: '10:00-22:00', sun: '10:00-22:00' },
    isVerified: true,
    isFeatured: false,
    status: 'approved',
  },
  // KAFELER
  {
    id: 'place-006',
    name: 'Gümrük Han',
    slug: 'gumruk-han',
    categoryId: 2,
    description: `Kanuni Sultan Süleyman döneminden kalma bir kervansaray. 2026'da restorasyon tamamlandı. Avlusundaki çay bahçeleri ile menengiç (çitlembik), mırra veya klasik Türk kahvesi içmelik, nostalgik bir kahve molası mekanı.

500 yıllık tarihi yapı içinde kahve içmek, Şanlıurfa deneyiminin vazgeçilmez bir parçası. Akşam saatlerinde canlı müzik de dinlenebilir.`,
    shortDescription: '500 yıllık kervansarayda kahve keyfi',
    address: 'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
    phone: '90 414 215 93 77',
    latitude: 37.1489,
    longitude: 38.7891,
    rating: 4.8,
    reviewCount: 1523,
    priceRange: '₺',
    priceMin: 150,
    priceMax: 250,
    features: ['tarihi_mekan', 'wifi', 'nargile', 'canli_muzik', 'avlu', 'mirra'],
    openingHours: { mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00', thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-007',
    name: 'Seyir Tepesi Cafe',
    slug: 'seyir-tepesi-cafe',
    categoryId: 2,
    description: `Balıklıgöl'e tepeden bakan, seyir terası misali manzaralı cafe. 2026'da yeni teras katı eklendi. Gece yanan ışıklarla ışıldayan şehir silüeti için ideal.

Gün batımı ve gece manzarasıyla fotoğraf çekmek için en güzel noktalardan biri. Kahve çeşitleri yanında hafif atıştırmalıklar da sunuluyor.`,
    shortDescription: 'Balıklıgöl manzaralı en güzel cafe',
    address: 'Göl Mahallesi, 2864. Sk. No:9, Şanlıurfa Merkez',
    phone: '+90 414 314 15 32',
    latitude: 37.1490,
    longitude: 38.7890,
    rating: 4.6,
    reviewCount: 892,
    priceRange: '₺',
    priceMin: 200,
    priceMax: 350,
    features: ['manzara', 'teras', 'wifi', 'fotograf_noktasi'],
    openingHours: { mon: '09:00-24:00', tue: '09:00-24:00', wed: '09:00-24:00', thu: '09:00-24:00', fri: '09:00-24:00', sat: '09:00-24:00', sun: '09:00-24:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  // OTELLER
  {
    id: 'place-008',
    name: 'Hilton Garden Inn Şanlıurfa',
    slug: 'hilton-garden-inn',
    categoryId: 3,
    description: `4 yıldızlı modern otel. 2026'da odalar tamamen yenilendi, akıllı oda sistemi entegre edildi. Havuz, spa ve fitness merkezi mevcut. İş seyahatleri ve aile tatilleri için ideal.

Şehir merkezine yürüme mesafesinde, tüm modern konforları bir arada sunuyor. Elektrikli araç şarj istasyonları da mevcut.`,
    shortDescription: '4 yıldızlı modern konaklama',
    address: 'Eyyübiye, Otel Caddesi No:1',
    phone: '0414 567 89 02',
    email: 'sUrfa@hilton.com',
    website: 'https://hilton.com/sanliurfa',
    latitude: 37.1623,
    longitude: 38.7956,
    rating: 4.7,
    reviewCount: 567,
    priceRange: '₺₺₺₺',
    priceMin: 3500,
    priceMax: 5500,
    features: ['havuz', 'spa', 'fitness', 'wifi', 'otopark', 'restoran', 'akilli_oda', 'elektrikli_arac_sarj'],
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-009',
    name: 'Hanehan Butik Otel',
    slug: 'hanehan-butik-otel',
    categoryId: 3,
    description: `Tarihi İpek Yolu üzerindeki bir hanın otel ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. 2026'da UNESCO onaylı restorasyon tamamlandı. 8 oda'dan 15 odaya çıktı.

Tarihi taş duvarlar, avlu düzeni ve otantik dekorasyonuyla gerçek bir Şanlıurfa deneyimi sunuyor. Sıra gecesi odanıza geliyor!`,
    shortDescription: 'UNESCO onaylı tarihi butik otel',
    address: 'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
    phone: '90 414 215 93 77',
    email: 'info@hanehan.com',
    latitude: 37.1599,
    longitude: 38.7915,
    rating: 4.9,
    reviewCount: 342,
    priceRange: '₺₺₺',
    priceMin: 1800,
    priceMax: 3200,
    features: ['tarihi_mekan', 'wifi', 'sira_gecesi', 'restoran', 'bahce', 'dijital_concierge'],
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-010',
    name: 'Palmyra Boutique Hotel',
    slug: 'palmyra-boutique-hotel',
    categoryId: 3,
    description: `Balıklıgöl manzaralı butik otel. Şehrin kalbinde ama sessiz bir konumda. Romantik kaçamaklar için ideal.

Odalardan gölüm manzarası görebilir, sabah kahvaltınızı terasta yapabilirsiniz. Butik konseptiyle samimi bir hizmet sunuyor.`,
    shortDescription: 'Göl manzaralı butik konaklama',
    address: 'Balıklıgöl, Göl Yakası No:34',
    phone: '0414 678 90 13',
    latitude: 37.1495,
    longitude: 38.7898,
    rating: 4.6,
    reviewCount: 289,
    priceRange: '₺₺₺',
    priceMin: 1500,
    priceMax: 2800,
    features: ['manzara', 'wifi', 'kahvalti', 'butik'],
    isVerified: true,
    isFeatured: false,
    status: 'approved',
  },
  // TARİHİ YERLER
  {
    id: 'place-011',
    name: 'Göbeklitepe',
    slug: 'gobeklitepe',
    categoryId: 4,
    description: `Dünyanın bilinen en eski tapınak kompleksi. MÖ 9600 yıllarına tarihlenen bu arkeolojik site, insanlık tarihini yeniden yazdı. UNESCO Dünya Mirası Listesi'nde. 2026'da AR uygulaması, gece ziyaretleri ve yeni keşfedilen D yapısı ziyarete açıldı.

AR uygulamasını indirerek T şekilli direklerin orijinal boyutlarını görebilir, hayvan figürlerinin renkli restitüsyonlarını izleyebilirsiniz. Gece ziyaretlerinde özel ışıklandırma altında tapınakları deneyimleyebilirsiniz.`,
    shortDescription: 'Dünyanın ilk tapınağı, UNESCO Mirası',
    address: 'Örencik Köyü, Haliliye/Şanlıurfa',
    phone: '+90 414 318 88 80',
    website: 'https://gobeklitepe.gov.tr',
    latitude: 37.2231,
    longitude: 38.9223,
    rating: 5.0,
    reviewCount: 12543,
    priceRange: '₺',
    priceMin: 450,
    features: ['unesco', 'arkeoloji', 'ar_uygulama', 'rehber', 'engelli_erisim', 'gece_ziyaret', 'muzekart'],
    openingHours: { mon: '08:00-19:00', tue: '08:00-19:00', wed: '08:00-19:00', thu: '08:00-19:00', fri: '08:00-19:00', sat: '08:00-19:00', sun: '08:00-19:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-012',
    name: 'Balıklıgöl',
    slug: 'balikligol',
    categoryId: 4,
    description: `Hz. İbrahim'in ateşe atıldığı rivayet edilen göl. İçindeki kutsal balıklar dokunulmaz sayılır. Şanlıurfa'nın en önemli sembollerinden biri. 2026'da çevre düzenlemesi, akıllı bilgi panoları ve ücretsiz WiFi eklendi.

Cami, medrese ve halilurrahman camii ile çevrili alan, şehrin manevi merkezi konumunda. Göl çevresindeki kafelerde çay içerek manzaranın tadını çıkarabilirsiniz.`,
    shortDescription: 'Hz. İbrahim makamı, kutsal balıklar',
    address: 'Merkez, Balıklıgöl Caddesi, Şanlıurfa',
    latitude: 37.1490,
    longitude: 38.7890,
    rating: 4.9,
    reviewCount: 8934,
    priceRange: 'Ücretsiz',
    priceMin: 0,
    features: ['tarihi', 'dini', 'park', 'wifi', 'akilli_panolar', 'fotograf_noktasi'],
    openingHours: { mon: '00:00-24:00', tue: '00:00-24:00', wed: '00:00-24:00', thu: '00:00-24:00', fri: '00:00-24:00', sat: '00:00-24:00', sun: '00:00-24:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  // TATLICILAR
  {
    id: 'place-013',
    name: 'Şanlı Miroğlu Kadayıf & Billuriye',
    slug: 'sanli-miroglu',
    categoryId: 5,
    description: `Billuriye ve kadayıf konusunda Şanlıurfa'nın en iyisi. Yaz aylarında yanına bir top dondurma kondurup tatlıları taçlandırıyorlar. Künefesi de şehirdeki en iyilerden.

Çökeleğin en sevilen hali billuriye, burada enfes bir lezzet. Sıcak servis edilir, üzerine tarçın serpilebilir.`,
    shortDescription: 'Billuriye ve kadayıf uzmanı',
    address: 'Emniyet Cd. 376. Sk. Bulvar Apt. 63200, Şanlıurfa',
    phone: '+90 414 314 14 14',
    latitude: 37.1612,
    longitude: 38.7978,
    rating: 4.8,
    reviewCount: 2156,
    priceRange: '₺',
    priceMin: 250,
    priceMax: 450,
    features: ['paket_servis', 'dondurma', 'geleneksel'],
    openingHours: { mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00', thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  {
    id: 'place-014',
    name: 'Üstüneller Baklava',
    slug: 'ustuneller-baklava',
    categoryId: 5,
    description: `1989 yılından beri Şanlıurfa'nın en iyi baklavacısı. Özellikle kare baklavası ve fıstık deryası adlı içi iri fıstıklı baklavası yok satıyor.

Gaziantepli ustalardan öğrenilen teknikle hazırlanan baklavalar, şehre özgü lezzetleri yansıtıyor. Hediyelik paketler de mevcut.`,
    shortDescription: '1989\'dan beri baklava ustası',
    address: 'Kanberiye Mh. Şube Çıkmazı Sk. No:8, Şanlıurfa',
    phone: '+90 414 315 96 69',
    latitude: 37.1656,
    longitude: 38.7923,
    rating: 4.9,
    reviewCount: 1876,
    priceRange: '₺₺',
    priceMin: 800,
    priceMax: 1200,
    features: ['paket_servis', 'hediyelik', 'geleneksel'],
    openingHours: { mon: '07:00-22:00', tue: '07:00-22:00', wed: '07:00-22:00', thu: '07:00-22:00', fri: '07:00-22:00', sat: '07:00-22:00', sun: '07:00-22:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
  // KAHVALTI
  {
    id: 'place-015',
    name: 'Cevahir Han Restoran',
    slug: 'cevahir-han',
    categoryId: 6,
    description: `Tarihi İpek Yolu üzerindeki bir hanın otel, restoran ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. Serpme kahvaltısı ile meşhur. Hafta sonları canlı müzik eşliğinde kahvaltı.

Tarihi atmosfer içinde zengin serpme kahvaltı, peynir çeşitleri, zeytinler, taze ekmek ve sıcak böreklerle başlayan harika bir gün.`,
    shortDescription: 'Tarihi handa serpme kahvaltı',
    address: 'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
    phone: '90 414 215 93 77',
    latitude: 37.1599,
    longitude: 38.7915,
    rating: 4.7,
    reviewCount: 1123,
    priceRange: '₺₺',
    priceMin: 400,
    priceMax: 700,
    features: ['tarihi_mekan', 'serpme_kahvalti', 'canli_muzik', 'wifi'],
    openingHours: { mon: '08:00-12:00', tue: '08:00-12:00', wed: '08:00-12:00', thu: '08:00-12:00', fri: '08:00-12:00', sat: '08:00-14:00', sun: '08:00-14:00' },
    isVerified: true,
    isFeatured: true,
    status: 'approved',
  },
];

// Örnek Yorumlar
const reviews2026 = [
  {
    id: 'rev-001',
    placeId: 'place-001',
    userId: 'user-demo-1',
    userName: 'Ahmet Y.',
    rating: 5,
    title: 'Ciğerin tadına doyamadım!',
    content: 'Soğanları kendim doğrayıp yemek ayrı bir keyif. 2026 fiyatları biraz artmış ama hak ediyor.',
    status: 'approved',
  },
  {
    id: 'rev-002',
    placeId: 'place-001',
    userId: 'user-demo-2',
    userName: 'Mehmet K.',
    rating: 5,
    title: '25 yıldır aynı lezzet',
    content: '25 yıldır gelirim, hiç bozmadılar. QR menü çok pratik olmuş.',
    status: 'approved',
  },
  {
    id: 'rev-003',
    placeId: 'place-011',
    userId: 'user-demo-3',
    userName: 'Ayşe S.',
    rating: 5,
    title: 'AR uygulaması harika',
    content: 'AR uygulaması sayesinde taşları canlandırılmış halde gördük, inanılmaz bir deneyim!',
    status: 'approved',
  },
  {
    id: 'rev-004',
    placeId: 'place-006',
    userId: 'user-demo-4',
    userName: 'Fatma B.',
    rating: 5,
    title: 'Restorasyon süper olmuş',
    content: 'Restorasyon harika olmuş. Menengiç kahvesi efsane.',
    status: 'approved',
  },
  {
    id: 'rev-005',
    placeId: 'place-009',
    userId: 'user-demo-5',
    userName: 'Ali D.',
    rating: 4,
    title: 'Çok güzel otel',
    content: 'Oda çok konforluydu, akıllı sistemler çok iyi. Kahvaltı çeşidi biraz daha artabilir.',
    status: 'approved',
  },
];

async function seed() {
  console.log('🌱 2026 Verileri Yükleniyor...\n');

  try {
    // Kategorileri ekle
    console.log('📁 Kategoriler ekleniyor...');
    for (const cat of categories2026) {
      await db.insert(categories).values(cat).onConflictDoUpdate({
        target: categories.id,
        set: {
          description: cat.description,
          isActive: true,
        },
      });
    }
    console.log(`✅ ${categories2026.length} kategori eklendi/güncellendi\n`);

    // Mekanları ekle
    console.log('📍 Mekanlar ekleniyor...');
    for (const place of places2026) {
      await db.insert(places).values({
        ...place,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: places.id,
        set: {
          priceMin: place.priceMin,
          priceMax: place.priceMax,
          priceRange: place.priceRange,
          description: place.description,
          updatedAt: new Date(),
        },
      });
    }
    console.log(`✅ ${places2026.length} mekan eklendi/güncellendi\n`);

    // Yorumları ekle
    console.log('💬 Yorumlar ekleniyor...');
    for (const review of reviews2026) {
      await db.insert(reviews).values({
        ...review,
        createdAt: new Date(),
      }).onConflictDoNothing();
    }
    console.log(`✅ ${reviews2026.length} yorum eklendi\n`);

    console.log('🎉 2026 verileri başarıyla yüklendi!');
    console.log('\n📊 Özet:');
    console.log('  • 6 kategori');
    console.log('  • 15 mekan');
    console.log('  • 5 örnek yorum');
    console.log('\n🏆 Öne Çıkan Mekanlar:');
    console.log('  • Ciğerci Aziz Usta (₺450)');
    console.log('  • Göbeklitepe (₺450)');
    console.log('  • Hanehan Butik Otel (₺1.800)');

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
