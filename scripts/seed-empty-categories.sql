-- Boş kategoriler seed: Sağlık, Aile ve Çocuk, Hizmetler, Ulaşım

-- ── Sağlık ──────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Eğitim ve Araştırma Hastanesi', 'sanliurfa-egitim-arastirma-hastanesi',
 'Şanlıurfa''nın en büyük devlet hastanesi. 750 yatak kapasitesi, 40+ klinik ve 7/24 acil servisi ile bölgenin sağlık merkezi konumundadır.',
 'Yenice Mahallesi, Akabe Caddesi No:1, Şanlıurfa', '0414 313 9900',
 37.1700, 38.8100,
 (SELECT id FROM categories WHERE name='Hastaneler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-egitim-arastirma-hastanesi.jpg', 4.0, 0),

(gen_random_uuid(), 'Harran Üniversitesi Tıp Fakültesi Hastanesi', 'harran-universitesi-tip-hastanesi',
 'Harran Üniversitesi bünyesindeki tıp fakültesi hastanesi; onkoloji, kardiyoloji ve ortopedi alanlarında uzman kadroya sahip.',
 'Osmanbey Kampüsü, Akabe Kavşağı, Şanlıurfa', '0414 318 3000',
 37.1660, 38.8060,
 (SELECT id FROM categories WHERE name='Hastaneler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/harran-universitesi-tip-hastanesi.jpg', 4.2, 0),

(gen_random_uuid(), 'Özel Şanlıurfa Medikal Park', 'ozel-sanliurfa-medikal-park',
 'JCI akreditasyonuna sahip özel hastane. 24 saat acil, laparoskopik cerrahi ve modern görüntüleme sistemleri mevcut. Hasta hakları ve konfor ön planda tutulmaktadır.',
 'Bediüzzaman Caddesi No:88, Şanlıurfa', '0414 215 4444',
 37.1620, 38.7980,
 (SELECT id FROM categories WHERE name='Özel klinikler ve poliklinikler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/ozel-sanliurfa-medikal-park.jpg', 4.4, 0),

(gen_random_uuid(), 'Hilvan İlçe Devlet Hastanesi', 'hilvan-ilce-devlet-hastanesi',
 'Hilvan ilçe merkezine hizmet veren devlet hastanesi. Genel dahiliye, çocuk hastalıkları ve diş tedavi hizmetleri sunulmaktadır.',
 'Hilvan İlçe Merkezi, Şanlıurfa', '0414 611 2500',
 37.4800, 38.9600,
 (SELECT id FROM categories WHERE name='Hastaneler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/hilvan-ilce-devlet-hastanesi.jpg', 3.8, 0),

(gen_random_uuid(), 'Birecik Devlet Hastanesi', 'birecik-devlet-hastanesi',
 'Fırat Nehri kıyısındaki Birecik ilçesine hizmet veren devlet hastanesi. Acil, dahiliye ve obstetri birimleri 24 saat aktif.',
 'Atatürk Mahallesi, Birecik, Şanlıurfa', '0414 651 2000',
 37.0243, 37.9920,
 (SELECT id FROM categories WHERE name='Hastaneler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/birecik-devlet-hastanesi.jpg', 3.9, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Aile ve Çocuk ────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Hayvanat Bahçesi', 'sanliurfa-hayvanat-bahcesi',
 'Şehir içi yeşil alanda konumlanan hayvanat bahçesi; aslan, zebra ve onlarca yerli hayvan türüne ev sahipliği yapıyor. Çocuklar için eğitici anlatım tabelaları ve piknik alanları mevcut.',
 'Şehitkamil Mahallesi, Park Caddesi, Şanlıurfa', '0414 215 0011',
 37.1550, 38.7920,
 (SELECT id FROM categories WHERE name='Çocuk parkları ve oyun alanları' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-hayvanat-bahcesi.jpg', 4.3, 0),

(gen_random_uuid(), 'Urfa Çocuk Bilim Müzesi', 'urfa-cocuk-bilim-muzesi',
 'İnteraktif deneyler, planetaryum gösterisi ve robot atölyeleriyle çocukların bilime merak geliştirmesini hedefleyen eğitim merkezi. 6-14 yaş grubuna yönelik etkinlikler hafta sonu yapılmaktadır.',
 'Yenişehir Mahallesi, Kültür Caddesi No:5, Şanlıurfa', '0414 315 6600',
 37.1650, 38.7990,
 (SELECT id FROM categories WHERE name='Çocuk aktivite merkezleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/urfa-cocuk-bilim-muzesi.jpg', 4.5, 0),

(gen_random_uuid(), 'Balıklıgöl Mini Golf ve Eğlence Parkı', 'balikligol-mini-golf-eglence-parki',
 'Balıklıgöl yakınındaki eğlence parkında mini golf, lunapark alanları ve yiyecek standları. Aileler için hafta sonu gezisi için ideal; giriş ücreti sembolik.',
 'Gölbaşı Parkı Yanı, Haliliye, Şanlıurfa', '0414 216 9900',
 37.1540, 38.7855,
 (SELECT id FROM categories WHERE name='Çocuk parkları ve oyun alanları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/balikligol-mini-golf-eglence-parki.jpg', 4.0, 0),

(gen_random_uuid(), 'Harran Çocuk Kültür Merkezi', 'harran-cocuk-kultur-merkezi',
 'Harran''ın tarihi dokusundan ilham alarak tasarlanan çocuk kültür merkezinde drama, resim ve geleneksel el sanatları kursları veriliyor. Konik ev temalı interaktif sergi alanı içinde.',
 'Harran İlçe Merkezi, Şanlıurfa', '0414 441 1100',
 36.8630, 39.0280,
 (SELECT id FROM categories WHERE name='Çocuk aktivite merkezleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/harran-cocuk-kultur-merkezi.jpg', 4.2, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Hizmetler ────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa PTT Başmüdürlüğü', 'sanliurfa-ptt-basmudurluğu',
 'Şanlıurfa merkez PTT şubesi; kargo, posta, vergi ödeme ve pasaport hizmetleri sunmaktadır. Online takip ve SMS bildirim sistemi aktif.',
 'Sarayönü Caddesi No:1, Haliliye, Şanlıurfa', '0414 215 0070',
 37.1600, 38.7940,
 (SELECT id FROM categories WHERE name='Posta ve kargo hizmetleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-ptt-basmudurluğu.jpg', 3.8, 0),

(gen_random_uuid(), 'Şanlıurfa Büyükşehir Belediyesi Hizmet Binası', 'sanliurfa-buyuksehir-belediyesi-hizmet-binasi',
 'İmar, su aboneliği, çevre temizlik vergisi ve vatandaş hizmetleri. Online randevu sistemi ile bekleme sürelerini kısaltabilirsiniz.',
 'Kamberiye Mahallesi, Belediye Caddesi No:1, Şanlıurfa', '0414 217 1000',
 37.1580, 38.8050,
 (SELECT id FROM categories WHERE name='Belediye ve resmi hizmetler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-buyuksehir-belediyesi-hizmet-binasi.jpg', 3.7, 0),

(gen_random_uuid(), 'Şanlıurfa TÜRSAB Bölge Temsil Kurulu', 'sanliurfa-tursab-btu',
 'Seyahat acentesi, tur rehberi ve turizm danışmanlığı için başvuru noktası. Şanlıurfa''ya özel tur paketleri ve rehber listeleri burada mevcuttur.',
 'Yenişehir Mahallesi, Turizm Caddesi No:12, Şanlıurfa', '0414 314 8800',
 37.1640, 38.7960,
 (SELECT id FROM categories WHERE name='Turizm ve seyahat acenteleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-tursab-btu.jpg', 4.1, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Ulaşım — ek mekanlar ─────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Şehirlerarası Otobüs Terminali', 'sanliurfa-sehirlerarasi-otobus-terminali',
 'Modern yapısı ve tüm büyük şehirlere günlük seferlerle Şanlıurfa Otobüs Terminali; yolcu bekleme salonları, kafeterya ve emanet bagaj hizmetiyle konforlu bir yolculuk başlangıcı sunar.',
 'Terminal Caddesi No:1, Eyyübiye, Şanlıurfa', '0414 313 0001',
 37.1780, 38.7900,
 (SELECT id FROM categories WHERE name='Otobüs terminalleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-sehirlerarasi-otobus-terminali.jpg', 4.0, 0),

(gen_random_uuid(), 'GAP Havalimanı (Şanlıurfa)', 'gap-havalimani-sanliurfa',
 'IATA kodu GNY olan GAP Havalimanı; İstanbul, Ankara ve İzmir''e direkt sefer yapan THY, Pegasus ve AnadoluJet uçuşlarına hizmet veriyor. Şehir merkezine yaklaşık 20 km, günlük 15+ iniş kalkış.',
 'Orhanlı Köyü, Karaköprü, Şanlıurfa', '0414 316 9001',
 37.1950, 38.8430,
 (SELECT id FROM categories WHERE name='Havalimanları' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/gap-havalimani-sanliurfa.jpg', 4.2, 0),

(gen_random_uuid(), 'Şanlıurfa TCDD Garı', 'sanliurfa-tcdd-gari',
 'Şanlıurfa - Gaziantep demiryolu hattındaki tren garı. Bölgesel yolcu seferleri ve şehirler arası bağlantı. Çevresindeki aktarma noktalarına servis imkânı mevcuttur.',
 'Gar Mahallesi, İstasyon Caddesi No:1, Eyyübiye, Şanlıurfa', '0414 215 6600',
 37.1750, 38.8200,
 (SELECT id FROM categories WHERE name='Tren istasyonları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-tcdd-gari.jpg', 3.9, 0)

ON CONFLICT (slug) DO NOTHING;

-- Özet
SELECT cp.name AS kategori, COUNT(p.id) AS mekan_sayisi
FROM categories cp
LEFT JOIN categories c ON c.parent_id = cp.id
LEFT JOIN places p ON p.category_id = c.id AND p.status='active'
WHERE cp.parent_id IS NULL
  AND cp.name IN ('Sağlık', 'Aile ve Çocuk', 'Hizmetler', 'Ulaşım')
GROUP BY cp.id, cp.name
ORDER BY cp.name;
