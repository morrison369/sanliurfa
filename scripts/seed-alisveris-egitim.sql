-- Alışveriş (7) + Eğitim (4) + Eğlence (4) + Spor (4)

-- ── Alışveriş ───────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Piazza Şanlıurfa AVM', 'piazza-sanliurfa-avm',
 'Şanlıurfa''nın en büyük alışveriş merkezi. 150''den fazla mağaza, sinema, yeme-içme katı ve çocuk oyun alanıyla ailelerin hafta sonu buluşma noktası. Otopark alanı geniş ve ücretsizdir.',
 'Bediüzzaman Bulvarı No:1, Haliliye, Şanlıurfa', '0414 318 9000',
 37.1650, 38.8005,
 (SELECT id FROM categories WHERE name='AVM''ler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/piazza-sanliurfa-avm.jpg', 4.3, 0),

(gen_random_uuid(), 'Şanlıurfa Kapalıçarşısı', 'sanliurfa-kapalicarsi',
 '500 yıllık tarihi geçmişiyle Şanlıurfa Kapalıçarşısı, bakır el sanatları, yöresel dokumalar, baharatlar ve hediyelik eşyalarla ziyaretçilerini geleneksel çarşı atmosferine taşır. UNESCO koruması altındaki tarihi yapı.',
 'Kapalıçarşı, Eski Şehir, Haliliye, Şanlıurfa', '',
 37.1570, 38.7900,
 (SELECT id FROM categories WHERE name='Hediyelik eşya' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-kapalicarsi.jpg', 4.6, 0),

(gen_random_uuid(), 'Bakırcılar Çarşısı', 'bakırcilar-carsisi-sanliurfa',
 'Geleneksel bakır işleme sanatının yaşatıldığı tarihi çarşı. Ustalar gözünüzün önünde bakır tası, ibriği ve tepsiye şekil veriyor. Şanlıurfa''nın en özgün hediyelik eşyaları burada bulunur.',
 'Kapalıçarşı İçi, Haliliye, Şanlıurfa', '',
 37.1568, 38.7898,
 (SELECT id FROM categories WHERE name='Hediyelik eşya' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/bakırcilar-carsisi-sanliurfa.jpg', 4.7, 0),

(gen_random_uuid(), 'Altın Çarşısı Şanlıurfa', 'altin-carsisi-sanliurfa',
 'Şanlıurfa''nın geleneksel kuyumcular çarşısı. Altın, gümüş ve filigran takılarla ünlü dükkânların bir arada bulunduğu tarihi pasaj. Nişan, düğün ve özel günler için tercih edilen adres.',
 'Kuyumcular Sokak, Haliliye, Şanlıurfa', '',
 37.1572, 38.7892,
 (SELECT id FROM categories WHERE name='Kuyumcular' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/altin-carsisi-sanliurfa.jpg', 4.5, 0),

(gen_random_uuid(), 'Urfa Hal (Sebze-Meyve Pazarı)', 'urfa-hal-sebze-meyve-pazari',
 'Her gün taze sebze ve meyvenin tazeliğiyle dolup taştığı Urfa Hal binası. Kasım-Mart döneminde yerel portakal, nar ve biberin bolluğu renkli bir tablo oluşturur. Aynı zamanda bakliyat ve kuruyemiş satıcıları da mevcuttur.',
 'Hal Caddesi, Eyyübiye, Şanlıurfa', '0414 313 4400',
 37.1720, 38.7970,
 (SELECT id FROM categories WHERE name='Hediyelik eşya' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-hal-sebze-meyve-pazari.jpg', 4.2, 0),

(gen_random_uuid(), 'Şanlıurfa Teknoloji Çarşısı', 'sanliurfa-teknoloji-carsisi',
 'Telefon, bilgisayar, tablet, aksesuar ve ikinci el elektronik ürünlerin bulunduğu teknoloji çarşısı. Şehrin en büyük telefon-elektronik kapalı pazarı olup onarım servisleri de hizmet vermektedir.',
 'Sarayönü Caddesi, Haliliye, Şanlıurfa', '0414 215 7700',
 37.1600, 38.7942,
 (SELECT id FROM categories WHERE name='Telefoncular' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-teknoloji-carsisi.jpg', 3.9, 0),

(gen_random_uuid(), 'Urfa Halı ve Kilim Çarşısı', 'urfa-hali-kilim-carsisi',
 'Güneydoğu Anadolu''nun geleneksel el dokumaları, kilimler ve yörük halılarının sergilendiği çarşı. Harran, Halfeti ve Siverek motifleriyle işlenmiş orijinal el dokuması eserleri bulunmaktadır.',
 'Halıcılar Sokak, Kapalıçarşı Çevresi, Haliliye, Şanlıurfa', '',
 37.1565, 38.7895,
 (SELECT id FROM categories WHERE name='Halıcılar' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-hali-kilim-carsisi.jpg', 4.4, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Eğitim ──────────────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Harran Üniversitesi', 'harran-universitesi',
 '1992 yılında kurulan Harran Üniversitesi, 40.000''i aşkın öğrencisi ve 80''den fazla bölümüyle Güneydoğu Anadolu''nun önemli akademik kurumlarından biridir. Tıp, Mühendislik ve Ziraat Fakülteleri başlıca bölümlerdir.',
 'Osmanbey Kampüsü, Haliliye, Şanlıurfa', '0414 318 3000',
 37.1660, 38.8070,
 (SELECT id FROM categories WHERE name='Üniversiteler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/harran-universitesi.jpg', 4.3, 0),

(gen_random_uuid(), 'Şanlıurfa İl Halk Kütüphanesi', 'sanliurfa-il-halk-kutuphanesi',
 'Türkiye''nin en büyük il halk kütüphanelerinden biri. 200.000''i aşkın kitap, dijital arşiv, çocuk okuma köşesi ve araştırma salonu ile öğrenci ve araştırmacılara hizmet vermektedir.',
 'Kültür Caddesi No:8, Haliliye, Şanlıurfa', '0414 215 3300',
 37.1638, 38.7965,
 (SELECT id FROM categories WHERE name='Kütüphaneler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-il-halk-kutuphanesi.jpg', 4.4, 0),

(gen_random_uuid(), 'Şanlıurfa Anadolu İmam Hatip Lisesi', 'sanliurfa-anadolu-imam-hatip-lisesi',
 'Şanlıurfa''nın en köklü eğitim kurumlarından biri. Güçlü akademik kadro ve yurt imkânıyla bölge genelinde öğrenci kabul etmektedir. Dini eğitim yanı sıra fen ve sosyal bilimlerde de başarılı sonuçlar elde etmektedir.',
 'Şehir Merkezi, Eyyübiye, Şanlıurfa', '0414 215 6800',
 37.1600, 38.8050,
 (SELECT id FROM categories WHERE name='Liseler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-anadolu-imam-hatip-lisesi.jpg', 4.2, 0),

(gen_random_uuid(), 'Harran İngilizce Dil Kursu', 'harran-ingilizce-dil-kursu',
 'Şanlıurfa''nın en köklü özel dil kursu. İngilizce, Arapça ve Almanca kursları; YDS, YÖKDİL ve IELTS hazırlık programları. Çevrimiçi ve yüz yüze eğitim seçenekleri mevcuttur.',
 'Yenişehir, Bediüzzaman Caddesi No:34, Şanlıurfa', '0414 316 4400',
 37.1648, 38.7975,
 (SELECT id FROM categories WHERE name='Dil kursları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/harran-ingilizce-dil-kursu.jpg', 4.3, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Eğlence ve Sosyal Yaşam ─────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Piazza Sinema (Şanlıurfa)', 'piazza-sinema-sanliurfa',
 'Piazza Şanlıurfa AVM içindeki 7 salonlu çok perdeli sinema. Dolby Surround ses sistemi ve geniş koltuklar. Yerli ve yabancı filmlerin aynı anda gösterimde olduğu şehrin en modern sinema kompleksi.',
 'Piazza AVM 3. Kat, Haliliye, Şanlıurfa', '0414 318 9080',
 37.1652, 38.8008,
 (SELECT id FROM categories WHERE name='Sinemalar' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/piazza-sinema-sanliurfa.jpg', 4.2, 0),

(gen_random_uuid(), 'Şanlıurfa Şehir Tiyatrosu', 'sanliurfa-sehir-tiyatrosu',
 'Şanlıurfa Büyükşehir Belediyesi Şehir Tiyatrosu; yerli oyunlar, çocuk tiyatrosu ve misafir topluluk gösterileriyle yıl boyunca aktif. Ekim-Mayıs sezonu boyunca haftalık program mevcuttur.',
 'Kültür Merkezi Yanı, Haliliye, Şanlıurfa', '0414 217 2210',
 37.1645, 38.7975,
 (SELECT id FROM categories WHERE name='Tiyatrolar' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-sehir-tiyatrosu.jpg', 4.4, 0),

(gen_random_uuid(), 'Atatürk Parkı ve Botanik Bahçesi', 'ataturk-parki-botanik-bahcesi',
 'Şehir merkezindeki geniş park, aileler için yürüyüş parkuru, çocuk oyun alanı, gölet ve botanik bahçesiyle şehrin yeşil nefes noktasıdır. Akşam saatlerinde canlı müzik etkinlikleri düzenlenmektedir.',
 'Atatürk Bulvarı Üzeri, Haliliye, Şanlıurfa', '',
 37.1620, 38.7960,
 (SELECT id FROM categories WHERE name='Çocuk oyun alanları' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/ataturk-parki-botanik-bahcesi.jpg', 4.5, 0),

(gen_random_uuid(), 'Sıra Gecesi Kültür Evi', 'sira-gecesi-kultur-evi',
 'Şanlıurfa''nın özgün müzik geleneği Sıra Gecesinin yaşatıldığı kültür evi. Her hafta canlı ud, kemençe ve tambur performansları, yöresel mezeler ve çay eşliğinde düzenleniyor. Kıyafet kodu yok, rezervasyon önerilir.',
 'Divane Mahallesi, Eski Şehir, Haliliye, Şanlıurfa', '0414 216 7700',
 37.1558, 38.7882,
 (SELECT id FROM categories WHERE name='Canlı müzik mekanları' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sira-gecesi-kultur-evi.jpg', 4.8, 0)

ON CONFLICT (slug) DO NOTHING;

-- ── Spor ve Fitness ─────────────────────────────────────────────────────
INSERT INTO places (id, name, slug, description, address, phone, latitude, longitude, category_id, status, is_featured, thumbnail_url, avg_rating, review_count) VALUES

(gen_random_uuid(), 'Şanlıurfa Olimpik Yüzme Havuzu', 'sanliurfa-olimpik-yuzme-havuzu',
 'Olimpik standartlarda 50 metrelik kapalı havuz. Yetişkin yüzme kursları, çocuk öğretimi ve serbest yüzme seansları mevcuttur. Su polo ve yüzme kulüplerinin antrenman mekânı.',
 'Spor Kompleksi, Eyyübiye, Şanlıurfa', '0414 313 5500',
 37.1680, 38.8050,
 (SELECT id FROM categories WHERE name='Yüzme havuzları' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-olimpik-yuzme-havuzu.jpg', 4.4, 0),

(gen_random_uuid(), 'Mega Fitness Şanlıurfa', 'mega-fitness-sanliurfa',
 'Modern alet parkuru, group fitness sınıfları, kişisel antrenör hizmeti ve beslenme danışmanlığıyla Şanlıurfa''nın en kapsamlı spor merkezi. Kadınlara özel bölüm mevcut.',
 'Yenişehir, Barış Caddesi No:55, Şanlıurfa', '0414 316 9800',
 37.1660, 38.7985,
 (SELECT id FROM categories WHERE name='Fitness merkezleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/mega-fitness-sanliurfa.jpg', 4.3, 0),

(gen_random_uuid(), 'Şanlıurfa Şehir Stadyumu', 'sanliurfa-sehir-stadyumu',
 '30.000 kişilik kapasitesiyle Şanlıurfa FK maçlarına ev sahipliği yapan stadyum. Çevre parkuru koşu ve bisiklet için de açık olup spor kompleksi içinde halı saha ve tenis kortları da mevcuttur.',
 'Stadyum Caddesi, Eyyübiye, Şanlıurfa', '0414 313 6600',
 37.1720, 38.8080,
 (SELECT id FROM categories WHERE name='Halı sahalar' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/sanliurfa-sehir-stadyumu.jpg', 4.1, 0),

(gen_random_uuid(), 'Dövüş Sporları Akademisi Şanlıurfa', 'dovus-sporlari-akademisi-sanliurfa',
 'Karate, judo, boks ve kick boks branşlarında lisanslı eğitim veren spor akademisi. Çocuk ve yetişkin programları, turnuvaya hazırlık ve öz savunma kursları mevcuttur.',
 'Spor Sokak No:7, Haliliye, Şanlıurfa', '0414 315 8800',
 37.1638, 38.7972,
 (SELECT id FROM categories WHERE name='Dövüş sporları salonları' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/dovus-sporlari-akademisi-sanliurfa.jpg', 4.2, 0)

ON CONFLICT (slug) DO NOTHING;

SELECT cp.name AS kategori, COUNT(p.id) AS cnt
FROM categories cp
LEFT JOIN categories c ON c.parent_id=cp.id
LEFT JOIN places p ON p.category_id=c.id AND p.status='active'
WHERE cp.name IN ('Alışveriş','Dini ve Kültürel Yerler','Eğitim','Eğlence ve Sosyal Yaşam','Spor ve Fitness')
GROUP BY cp.id, cp.name
ORDER BY cp.name;
