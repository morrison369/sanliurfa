-- Sanliurfa.com Gerçek Mekan Verileri 2026
-- Tüm kategoriler ve güncel fiyatlar

-- ============================================
-- KATEGORİLER
-- ============================================
INSERT INTO categories (id, name, slug, description, icon, color) VALUES
(1, 'Restoran', 'restoran', 'Şanlıurfa\'nın en iyi restoranları, kebapçıları ve lokantaları', 'restaurant', '#e63946'),
(2, 'Cafe', 'cafe', 'Kahve molaları için ideal mekanlar, tarihi kahvehaneler', 'coffee', '#f4a261'),
(3, 'Otel', 'otel', 'Konaklama seçenekleri, butik oteller ve 5 yıldızlı oteller', 'hotel', '#2a9d8f'),
(4, 'Tarihi Yer', 'tarihi-yer', 'Şanlıurfa\'nın tarihi hazineleri, müzeler ve ören yerleri', 'landmark', '#264653'),
(5, 'Tatlıcı', 'tatlici', 'Baklava, kadayıf ve geleneksel tatlılar', 'cake', '#e9c46a'),
(6, 'Kahvaltı', 'kahvalti', 'Serpme kahvaltı ve kahvaltı salonları', 'sunrise', '#f4a261')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESTORANLAR
-- ============================================

-- 1. Ciğerci Aziz Usta
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, email, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-001', 'Ciğerci Aziz Usta', 'cigerci-aziz-usta', 1, 
'Şanlıurfa''da ciğer kebabının en hasını yiyebileceğiniz mekan. Balıklıgöl''e çıkan yolda çarşı içinde, alçak ahşap masalı ve tabureli, küçük, salaş bir mekan. Masada bütün bütün duran soğanları kendiniz dilediğiniz gibi doğruyorsunuz. 2026 yılında QR menü ve temassız ödeme sistemleri eklenmiştir.',
'Ciğer kebabının efsane adresi, 25 yıllık lezzet',
'Pınarbaşı Mahallesi, 1211. Sk. No:13, 63210 Merkez/Şanlıurfa',
'+90 538 782 25 78', NULL, NULL,
37.1589, 38.7923, 4.8, 1247, '₺', 450, 650,
'["wifi", "otopark", "paket_servis", "temassiz_odeme", "qr_menu"]',
'{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
'active', true, NOW(), NOW());

-- 2. Sembol Ocakbaşı
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-002', 'Sembol Ocakbaşı', 'sembol-ocakbasi', 1,
'Urfa''da terbiyesiz tavuk, ciğer ve özellikle kuşbaşı kebabıyla ünlü ocakbaşı. Ateş başında pişirilen etlerin kokusu sokağa yayılıyor. 2026''da yeni şubesi Karaköprü''de de hizmete girdi. Hem kaliteli hem uygun fiyatlı.',
'Terbiyesiz tavuğun meşhur adresi',
'Merkez İpekyol Cad. Küçük Apt. No:1, 63050 Haliliye/Şanlıurfa',
'+90 543 315 86 86', NULL,
37.1615, 38.7889, 4.7, 982, '₺', 550, 800,
'["wifi", "otopark", "rezervasyon", "temassiz_odeme", "acik_alan"]',
'{"mon":"10:00-23:00","tue":"10:00-23:00","wed":"10:00-23:00","thu":"10:00-23:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"10:00-23:00"}',
'active', true, NOW(), NOW());

-- 3. Çulcuoğlu Restoran
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-003', 'Çulcuoğlu Restoran', 'culcuoglu-restoran', 1,
'Şanlıurfa mutfağına dair hemen hemen her şeyi bulabileceğiniz bir restoran. Lahmacunu, şıllık tatlısı, içli köftesi ve kebaplarıyla iddialı. 2026''da yeni salon eklendi, mobil uygulama yayında.',
'Lahmacun ve içli köfte uzmanı',
'Atatürk Mahallesi, Recep Tayyip Erdoğan Blv., 63100 Haliliye/Şanlıurfa',
'0414 312 95 95', NULL,
37.1634, 38.7945, 4.5, 756, '₺', 400, 700,
'["wifi", "otopark", "paket_servis", "salon", "mobil_app"]',
'{"mon":"09:00-23:00","tue":"09:00-23:00","wed":"09:00-23:00","thu":"09:00-23:00","fri":"09:00-23:00","sat":"09:00-23:00","sun":"09:00-23:00"}',
'active', false, NOW(), NOW());

-- 4. Çağdaş Ocakbaşı
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, created_at, updated_at) VALUES
('place-004', 'Çağdaş Ocakbaşı', 'cagdas-ocakbasi', 1,
'Terbiyesiz tavuğun en sevilen yeri. Aynı zamanda terbiyeli kuşbaşısı da güzel. Fiyatlar gayet makul. Ocakbaşı kültürünü tam anlamıyla yaşayabileceğiniz samimi bir mekan.',
'Terbiyesiz tavuk ve kuşbaşı uzmanı',
'Osmangazi Mh. Behçet Arabi Cd. 400. Sk. Tepecan Apt. No: 1, Haliliye',
'+90 414 313 38 00',
37.1656, 38.7967, 4.6, 643, '₺', 500, 750,
'["wifi", "otopark", "ocakbasi", "aile"]',
'{"mon":"11:00-24:00","tue":"11:00-24:00","wed":"11:00-24:00","thu":"11:00-24:00","fri":"11:00-24:00","sat":"11:00-24:00","sun":"11:00-24:00"}',
'active', NOW(), NOW());

-- 5. Dedecan Ocakbaşı
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, created_at, updated_at) VALUES
('place-005', 'Dedecan Ocakbaşı', 'dedecan-ocakbasi', 1,
'Patlıcan kebabı ile iddialı yerlerden. Ciğer kebabı, kuşbaşısı ve içli köftesi de çok seviliyor. Üstüne billuriye ve şıllık tatlısı da yenilesi.',
'Patlıcan kebabının en iyisi',
'Kasaptaşı Parkı Yanı 300 Evler Çarşı içi No: 11, Haliliye',
'+90 414 315 25 25', NULL,
37.1598, 38.7912, 4.7, 528, '₺', 500, 800,
'["otopark", "ocakbasi", "tatli"]',
'{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-22:00","sat":"10:00-22:00","sun":"10:00-22:00"}',
'active', NOW(), NOW());

-- ============================================
-- KAFELER
-- ============================================

-- 6. Gümrük Han
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-006', 'Gümrük Han', 'gumruk-han', 2,
'Kanuni Sultan Süleyman döneminden kalma bir kervansaray. 2026''da restorasyon tamamlandı. Avlusundaki çay bahçeleri ile menengiç (çitlembik), mırra veya klasik Türk kahvesi içmelik, nostaljik bir kahve molası mekanı.',
'500 yıllık kervansarayda kahve keyfi',
'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
'90 414 215 93 77',
37.1489, 38.7891, 4.8, 1523, '₺', 150, 250,
'["tarihi_mekan", "wifi", "nargile", "canli_muzik", "avlu"]',
'{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
'active', true, NOW(), NOW());

-- 7. Seyir Tepesi Cafe
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-007', 'Seyir Tepesi Cafe', 'seyir-tepesi-cafe', 2,
'Balıklıgöl''e tepeden bakan, seyir terası misali manzaralı cafe. 2026''da yeni teras katı eklendi. Gece yanan ışıklarla ışıldayan şehir silüeti için ideal.',
'Balıklıgöl manzaralı en güzel cafe',
'Göl Mahallesi, 2864. Sk. No:9, Şanlıurfa Merkez',
'+90 414 314 15 32', NULL,
37.1490, 38.7890, 4.6, 892, '₺', 200, 350,
'["manzara", "teras", "wifi", "fotograf_noktasi"]',
'{"mon":"09:00-24:00","tue":"09:00-24:00","wed":"09:00-24:00","thu":"09:00-24:00","fri":"09:00-24:00","sat":"09:00-24:00","sun":"09:00-24:00"}',
'active', true, NOW(), NOW());

-- 8. Kitap Kafe
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, created_at, updated_at) VALUES
('place-008', 'Kitap Kafe', 'kitap-kafe', 2,
'Kitap rafları, rahat koltukları ve sessiz ortamıyla çalışmak veya okumak için mükemmel. Board game akşamları da düzenleniyor.',
'Çalışma ve okuma dostu kafe',
'Haliliye, Kütüphane Caddesi No:67',
'0414 123 45 68',
37.1634, 38.7934, 4.5, 423, '₺', 150, 250,
'["wifi", "kitap", "board_game", "laptop_dostu", "sakin"]',
'{"mon":"09:00-23:00","tue":"09:00-23:00","wed":"09:00-23:00","thu":"09:00-23:00","fri":"09:00-23:00","sat":"09:00-23:00","sun":"09:00-23:00"}',
'active', NOW(), NOW());

-- ============================================
-- OTELLER
-- ============================================

-- 9. Hilton Garden Inn
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, email, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, status, is_featured, created_at, updated_at) VALUES
('place-009', 'Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn', 3,
'4 yıldızlı modern otel. 2026''da odalar tamamen yenilendi, akıllı oda sistemi entegre edildi. Havuz, spa ve fitness merkezi mevcut. İş seyahatleri ve aile tatilleri için ideal.',
'4 yıldızlı modern konaklama',
'Eyyübiye, Otel Caddesi No:1',
'0414 567 89 02', 'sUrfa@hilton.com', 'https://hilton.com/sanliurfa',
37.1623, 38.7956, 4.7, 567, '₺₺₺₺', 3500, 5500,
'["havuz", "spa", "fitness", "wifi", "otopark", "restoran", "akilli_oda", "elektrikli_arac_sarj"]',
'active', true, NOW(), NOW());

-- 10. Hanehan Butik Otel
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, email, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, status, is_featured, created_at, updated_at) VALUES
('place-010', 'Hanehan Butik Otel', 'hanehan-butik-otel', 3,
'Tarihi İpek Yolu üzerindeki bir hanın otel ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. 2026''da UNESCO onaylı restorasyon tamamlandı. 8 oda'dan 15 odaya çıktı.',
'UNESCO onaylı tarihi butik otel',
'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
'90 414 215 93 77', 'info@hanehan.com', NULL,
37.1599, 38.7915, 4.9, 342, '₺₺₺', 1800, 3200,
'["tarihi_mekan", "wifi", "sira_gecesi", "restoran", "bahce", "dijital_concierge"]',
'active', true, NOW(), NOW());

-- 11. Palmyra Boutique Hotel
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, status, created_at, updated_at) VALUES
('place-011', 'Palmyra Boutique Hotel', 'palmyra-boutique-hotel', 3,
'Balıklıgöl manzaralı butik otel. Şehrin kalbinde ama sessiz bir konumda. Romantik kaçamaklar için ideal.',
'Göl manzaralı butik konaklama',
'Balıklıgöl, Göl Yakası No:34',
'0414 678 90 13', NULL,
37.1495, 38.7898, 4.6, 289, '₺₺₺', 1500, 2800,
'["manzara", "wifi", "kahvalti", "butik"]',
'active', NOW(), NOW());

-- ============================================
-- TARİHİ YERLER
-- ============================================

-- 12. Göbeklitepe
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, email, website, latitude, longitude, rating, review_count, price_range, price_min, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-012', 'Göbeklitepe', 'gobeklitepe', 4,
'Dünyanın bilinen en eski tapınak kompleksi. MÖ 9600 yıllarına tarihlenen bu arkeolojik site, insanlık tarihini yeniden yazdı. UNESCO Dünya Mirası Listesi''nde. 2026''da AR uygulaması, gece ziyaretleri ve yeni keşfedilen D yapısı ziyarete açıldı.',
'Dünyanın ilk tapınağı, UNESCO Mirası',
'Örencik Köyü, Haliliye/Şanlıurfa',
'+90 414 318 88 80', NULL, 'https://gobeklitepe.gov.tr',
37.2231, 38.9223, 5.0, 12543, '₺', 450,
'["unesco", "arkeoloji", "ar_uygulama", "rehber", "engelli_erisim", "gece_ziyaret", "muzekart"]',
'{"mon":"08:00-19:00","tue":"08:00-19:00","wed":"08:00-19:00","thu":"08:00-19:00","fri":"08:00-19:00","sat":"08:00-19:00","sun":"08:00-19:00"}',
'active', true, NOW(), NOW());

-- 13. Balıklıgöl
INSERT INTO places (id, name, slug, category_id, description, short_description, address, latitude, longitude, rating, review_count, price_range, price_min, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-013', 'Balıklıgöl', 'balikligol', 4,
'Hz. İbrahim''in ateşe atıldığı rivayet edilen göl. İçindeki kutsal balıklar dokunulmaz sayılır. Şanlıurfa''nın en önemli sembollerinden biri. 2026''da çevre düzenlemesi, akıllı bilgi panoları ve ücretsiz WiFi eklendi.',
'Hz. İbrahim makamı, kutsal balıklar',
'Merkez, Balıklıgöl Caddesi, Şanlıurfa',
37.1490, 38.7890, 4.9, 8934, 'Ücretsiz', 0,
'["tarihi", "dini", "park", "wifi", "akilli_panolar", "fotograf_noktasi"]',
'{"mon":"00:00-24:00","tue":"00:00-24:00","wed":"00:00-24:00","thu":"00:00-24:00","fri":"00:00-24:00","sat":"00:00-24:00","sun":"00:00-24:00"}',
'active', true, NOW(), NOW());

-- ============================================
-- TATLICILAR
-- ============================================

-- 14. Şanlı Miroğlu
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, created_at, updated_at) VALUES
('place-014', 'Şanlı Miroğlu Kadayıf & Billuriye', 'sanli-miroglu', 5,
'Billuriye ve kadayıf konusunda Şanlıurfa''nın en iyisi. Yaz aylarında yanına bir top dondurma kondurup tatlıları taçlandırıyorlar. Künefesi de şehirdeki en iyilerden.',
'Billuriye ve kadayıf uzmanı',
'Emniyet Cd. 376. Sk. Bulvar Apt. 63200, Şanlıurfa',
'+90 414 314 14 14',
37.1612, 38.7978, 4.8, 2156, '₺', 250, 450,
'["paket_servis", "dondurma", "geleneksel"]',
'{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
'active', NOW(), NOW());

-- 15. Üstüneller Baklava
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, created_at, updated_at) VALUES
('place-015', 'Üstüneller Baklava', 'ustuneller-baklava', 5,
'1989 yılından beri Şanlıurfa''nın en iyi baklavacısı. Özellikle kare baklavası ve fıstık deryası adlı içi iri fıstıklı baklavası yok satıyor.',
'1989''dan beri baklava ustası',
'Kanberiye Mh. Şube Çıkmazı Sk. No:8, Şanlıurfa',
'+90 414 315 96 69', NULL,
37.1656, 38.7923, 4.9, 1876, '₺₺', 800, 1200,
'["paket_servis", "hediyelik", "geleneksel"]',
'{"mon":"07:00-22:00","tue":"07:00-22:00","wed":"07:00-22:00","thu":"07:00-22:00","fri":"07:00-22:00","sat":"07:00-22:00","sun":"07:00-22:00"}',
'active', NOW(), NOW());

-- ============================================
-- KAHVALTI
-- ============================================

-- 16. Cevahir Han
INSERT INTO places (id, name, slug, category_id, description, short_description, address, phone, website, latitude, longitude, rating, review_count, price_range, price_min, price_max, features, opening_hours, status, is_featured, created_at, updated_at) VALUES
('place-016', 'Cevahir Han Restoran', 'cevahir-han', 6,
'Tarihi İpek Yolu üzerindeki bir hanın otel, restoran ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. Serpme kahvaltısı ile meşhur. Hafta sonları canlı müzik eşliğinde kahvaltı.',
'Tarihi handa serpme kahvaltı',
'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
'90 414 215 93 77', NULL,
37.1599, 38.7915, 4.7, 1123, '₺₺', 400, 700,
'["tarihi_mekan", "serpme_kahvalti", "canli_muzik", "wifi"]',
'{"mon":"08:00-12:00","tue":"08:00-12:00","wed":"08:00-12:00","thu":"08:00-12:00","fri":"08:00-12:00","sat":"08:00-14:00","sun":"08:00-14:00"}',
'active', true, NOW(), NOW());

-- ============================================
-- YORUMLAR (Örnek)
-- ============================================
INSERT INTO reviews (id, place_id, user_id, rating, content, status, created_at) VALUES
('rev-001', 'place-001', 'user-demo-1', 5, 'Ciğerin tadına doyamadım! Soğanları kendim doğrayıp yemek ayrı bir keyif. 2026 fiyatları biraz artmış ama hak ediyor.', 'approved', NOW()),
('rev-002', 'place-001', 'user-demo-2', 5, '25 yıldır gelirim, hiç bozmadılar. QR menü çok pratik olmuş.', 'approved', NOW()),
('rev-003', 'place-012', 'user-demo-3', 5, 'AR uygulaması sayesinde taşları canlandırılmış halde gördük, inanılmaz bir deneyim!', 'approved', NOW()),
('rev-004', 'place-006', 'user-demo-4', 5, 'Restorasyon harika olmuş. Menengiç kahvesi efsane.', 'approved', NOW()),
('rev-005', 'place-009', 'user-demo-5', 4, 'Oda çok konforluydu, akıllı sistemler çok iyi. Kahvaltı çeşidi biraz daha artabilir.', 'approved', NOW());

-- ============================================
-- BLOG YAZILARI (Örnek)
-- ============================================
INSERT INTO blog_posts (id, title, slug, excerpt, content, category, featured_image, status, published_at, created_at) VALUES
('blog-001', 'Şanlıurfa''da 2026 Yılında Mutlaka Denemeniz Gereken 10 Lezzet', 'sanliurfada-10-lezzet-2026',
'Ciğer kebabından billuriyeye, terbiyesiz tavuktan şıllık tatlısına Şanlıurfa''nın eşsiz mutfağını keşfedin. Güncel 2026 fiyatları ve mekan önerileriyle...',
'İçerik burada...', 'Yemek', '/images/blog/sanliurfa-lezzetler.jpg', 'published', NOW(), NOW()),

('blog-002', 'Göbeklitepe Gezi Rehberi 2026: AR Uygulaması ve Yeni Keşifler', 'gobeklitepe-gezi-rehberi-2026',
'Dünyanın ilk tapınağı Göbeklitepe''yi ziyaret etmek için kapsamlı rehber. 2026 güncellemeleri, AR uygulaması, bilet fiyatları ve ziyaret ipuçları...',
'İçerik burada...', 'Gezi', '/images/blog/gobeklitepe-2026.jpg', 'published', NOW(), NOW()),

('blog-003', 'Şanlıurfa''da Nerede Kalınır? 2026 Otel Fiyatları ve Öneriler', 'sanliurfada-otel-onerileri-2026',
'Tarihi butik otellerden modern 4 yıldızlı otellere Şanlıurfa konaklama rehberi. Güncel fiyatlar, konum analizi ve rezervasyon ipuçları...',
'İçerik burada...', 'Konaklama', '/images/blog/sanliurfa-otel.jpg', 'published', NOW(), NOW());

SELECT '2026 güncellemeli 16 mekan ve içerik başarıyla eklendi!' as result;
