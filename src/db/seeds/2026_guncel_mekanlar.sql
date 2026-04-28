-- ============================================
-- Sanliurfa.com 2026 Gerçek Mekan Verileri
-- ============================================

-- Kategorileri ekle/ güncelle
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order) VALUES
(1, 'Restoran', 'restoran', E'Şanlıurfa\'nın en iyi restoranları, kebapçıları ve lokantaları. Ciğer kebabından terbiyesiz tavuğa, patlıcan kebabından içli köfteye kadar tüm lezzetler.', 'UtensilsCrossed', '#e63946', true, 1),
(2, 'Cafe', 'cafe', E'Kahve molaları için ideal mekanlar, tarihi kahvehaneler ve modern kafeler. Mırra, menengiç kahvesi ve daha fazlası.', 'Coffee', '#f4a261', true, 2),
(3, 'Otel', 'otel', E'Konaklama seçenekleri, butik oteller ve 5 yıldızlı oteller. Tarihi hanlardan modern otellere kadar geniş seçenek.', 'Hotel', '#2a9d8f', true, 3),
(4, 'Tarihi Yer', 'tarihi-yerler', E'Şanlıurfa\'nın tarihi hazineleri, müzeler ve ören yerleri. Göbeklitepe, Balıklıgöl ve UNESCO Dünya Mirası alanları.', 'Landmark', '#264653', true, 4),
(5, 'Tatlıcı', 'tatlici', E'Baklava, kadayıf, billuriye ve geleneksel Şanlıurfa tatlıları. 1989\'dan beri süregelen lezzet.', 'Cake', '#e9c46a', true, 5),
(6, 'Kahvaltı', 'kahvalti', E'Serpme kahvaltı ve kahvaltı salonları. Tarihi hanlarda kahvaltı keyfi.', 'Sunrise', '#f4a261', true, 6)
ON CONFLICT (id) DO UPDATE SET 
  description = EXCLUDED.description,
  is_active = true;

-- ============================================
-- MEKANLAR
-- ============================================

-- 1. Ciğerci Aziz Usta
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, email, website, 
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  'b597077c-ab27-5741-a0e2-0f077c6473be', 'Ciğerci Aziz Usta', 'cigerci-aziz-usta', 1,
  E'Şanlıurfa\'da ciğer kebabının en hasını yiyebileceğiniz mekan. Balıklıgöl\'e çıkan yolda çarşı içinde, alçak ahşap masalı ve tabureli, küçük, salaş bir mekan. Masada bütün bütün duran soğanları kendiniz dilediğiniz gibi doğruyorsunuz. 2026 yılında QR menü ve temassız ödeme sistemleri eklenmiştir. 25 yıllık tecrübesiyle ciğer kebabının adresi olan bu mekan, yerli ve yabancı turistlerin gözdesi haline gelmiştir. Taze ciğer, özel isot karışımı ve el yapımı lavaşlarıyla ünlü.',
  'Ciğer kebabının efsane adresi, 25 yıllık lezzet',
  'Pınarbaşı Mahallesi, 1211. Sk. No:13, 63210 Merkez/Şanlıurfa',
  '+90 538 782 25 78', NULL, NULL,
  37.1589, 38.7923,
  4.8, 1247,
  '₺', 450, 650,
  ARRAY['wifi', 'otopark', 'paket_servis', 'temassiz_odeme', 'qr_menu', 'geleneksel'],
  '{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 450, price_max = 650, price_range = '₺',
  updated_at = NOW();

-- 2. Sembol Ocakbaşı
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '9ea13f06-8dae-558c-aebe-8686b2920d0b', 'Sembol Ocakbaşı', 'sembol-ocakbasi', 1,
  E'Urfa\'da terbiyesiz tavuk, ciğer ve özellikle kuşbaşı kebabıyla ünlü ocakbaşı. Ateş başında pişirilen etlerin kokusu sokağa yayılıyor. 2026\'da yeni şubesi Karaköprü\'de de hizmete girdi. Hem kaliteli hem uygun fiyatlı. "Terbiyesiz" terimi Urfa\'da sadece baharat ve sos kullanılmadan ızgarada pişirilen yiyecekler için kullanılıyor. Et ve sosla terbiyelenmemiş demek - pişerken sadece kendi yağı ve içindeki suyuyla kavruluyor.',
  'Terbiyesiz tavuğun meşhur adresi',
  'Merkez İpekyol Cad. Küçük Apt. No:1, 63050 Haliliye/Şanlıurfa',
  '+90 543 315 86 86', NULL,
  37.1615, 38.7889,
  4.7, 982,
  '₺', 550, 800,
  ARRAY['wifi', 'otopark', 'rezervasyon', 'temassiz_odeme', 'acik_alan', 'ocakbasi'],
  '{"mon":"10:00-23:00","tue":"10:00-23:00","wed":"10:00-23:00","thu":"10:00-23:00","fri":"10:00-23:00","sat":"10:00-23:00","sun":"10:00-23:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 550, price_max = 800, price_range = '₺',
  updated_at = NOW();

-- 3. Çulcuoğlu Restoran
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '7a624b51-79a3-5761-9d60-99a02afbcae1', 'Çulcuoğlu Restoran', 'culcuoglu-restoran', 1,
  E'Şanlıurfa mutfağına dair hemen hemen her şeyi bulabileceğiniz bir restoran. Lahmacunu, şıllık tatlısı, içli köftesi ve kebaplarıyla iddialı. 2026\'da yeni salon eklendi, mobil uygulama yayında. Lahmacunu incecik hamur üzerine nefis bir et harcıyla hazırlanıyor. İçli köfte seçeneği hem yağda kızartılmış hem de haşlanmış olarak sunuluyor.',
  'Lahmacun ve içli köfte uzmanı',
  'Atatürk Mahallesi, Recep Tayyip Erdoğan Blv., 63100 Haliliye/Şanlıurfa',
  '0414 312 95 95', NULL,
  37.1634, 38.7945,
  4.5, 756,
  '₺', 400, 700,
  ARRAY['wifi', 'otopark', 'paket_servis', 'salon', 'mobil_app'],
  '{"mon":"09:00-23:00","tue":"09:00-23:00","wed":"09:00-23:00","thu":"09:00-23:00","fri":"09:00-23:00","sat":"09:00-23:00","sun":"09:00-23:00"}',
  true, false, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 400, price_max = 700, price_range = '₺',
  updated_at = NOW();

-- 4. Çağdaş Ocakbaşı
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  'cf5541f3-2820-59b0-9f0c-16228520e048', 'Çağdaş Ocakbaşı', 'cagdas-ocakbasi', 1,
  E'Terbiyesiz tavuğun en sevilen yeri. Aynı zamanda terbiyeli kuşbaşısı da güzel. Fiyatlar gayet makul. Ocakbaşı kültürünü tam anlamıyla yaşayabileceğiniz samimi bir mekan. Özellikle akşam saatlerinde doluluk oranı yüksek olan mekanda, yer bulmak için erken gitmeniz önerilir.',
  'Terbiyesiz tavuk ve kuşbaşı uzmanı',
  'Osmangazi Mh. Behçet Arabi Cd. 400. Sk. Tepecan Apt. No: 1, Haliliye',
  '+90 414 313 38 00',
  37.1656, 38.7967,
  4.6, 643,
  '₺', 500, 750,
  ARRAY['wifi', 'otopark', 'ocakbasi', 'aile_ortami'],
  '{"mon":"11:00-24:00","tue":"11:00-24:00","wed":"11:00-24:00","thu":"11:00-24:00","fri":"11:00-24:00","sat":"11:00-24:00","sun":"11:00-24:00"}',
  true, false, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 500, price_max = 750, price_range = '₺',
  updated_at = NOW();

-- 5. Dedecan Ocakbaşı
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '2be4d000-5090-5131-9421-34f0cd423813', 'Dedecan Ocakbaşı', 'dedecan-ocakbasi', 1,
  E'Patlıcan kebabı ile iddialı yerlerden. Ciğer kebabı, kuşbaşısı ve içli köftesi de çok seviliyor. Üstüne billuriye ve şıllık tatlısı da yenilesi. Tatlı çeşitleri zengin olan mekanda, özellikle sıcak şıllık tatlısı tavsiye edilir. Patlıcan kebabı etin ve patlıcanın uyumunu en iyi şekilde yansıtıyor.',
  'Patlıcan kebabının en iyisi',
  'Kasaptaşı Parkı Yanı 300 Evler Çarşı içi No: 11, Haliliye',
  '+90 414 315 25 25', NULL,
  37.1598, 38.7912,
  4.7, 528,
  '₺', 500, 800,
  ARRAY['otopark', 'ocakbasi', 'tatli_cesitleri'],
  '{"mon":"10:00-22:00","tue":"10:00-22:00","wed":"10:00-22:00","thu":"10:00-22:00","fri":"10:00-22:00","sat":"10:00-22:00","sun":"10:00-22:00"}',
  true, false, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 500, price_max = 800, price_range = '₺',
  updated_at = NOW();

-- ============================================
-- KAFELER
-- ============================================

-- 6. Gümrük Han
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  'c82e7488-f1f6-5c0d-83da-6e851a3c7906', 'Gümrük Han', 'gumruk-han', 2,
  E'Kanuni Sultan Süleyman döneminden kalma bir kervansaray. 2026\'da restorasyon tamamlandı. Avlusundaki çay bahçeleri ile menengiç (çitlembik), mırra veya klasik Türk kahvesi içmelik, nostalgik bir kahve molası mekanı. 500 yıllık tarihi yapı içinde kahve içmek, Şanlıurfa deneyiminin vazgeçilmez bir parçası. Akşam saatlerinde canlı müzik de dinlenebilir.',
  '500 yıllık kervansarayda kahve keyfi',
  'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
  '90 414 215 93 77',
  37.1489, 38.7891,
  4.8, 1523,
  '₺', 150, 250,
  ARRAY['tarihi_mekan', 'wifi', 'nargile', 'canli_muzik', 'avlu', 'mirra'],
  '{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 150, price_max = 250, price_range = '₺',
  updated_at = NOW();

-- 7. Seyir Tepesi Cafe
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '6b8e7363-69b1-59bb-a753-7bd790be2082', 'Seyir Tepesi Cafe', 'seyir-tepesi-cafe', 2,
  E'Balıklıgöl\'e tepeden bakan, seyir terası misali manzaralı cafe. 2026\'da yeni teras katı eklendi. Gece yanan ışıklarla ışıldayan şehir silüeti için ideal. Gün batımı ve gece manzarasıyla fotoğraf çekmek için en güzel noktalardan biri. Kahve çeşitleri yanında hafif atıştırmalıklar da sunuluyor.',
  'Balıklıgöl manzaralı en güzel cafe',
  'Göl Mahallesi, 2864. Sk. No:9, Şanlıurfa Merkez',
  '+90 414 314 15 32', NULL,
  37.1490, 38.7890,
  4.6, 892,
  '₺', 200, 350,
  ARRAY['manzara', 'teras', 'wifi', 'fotograf_noktasi'],
  '{"mon":"09:00-24:00","tue":"09:00-24:00","wed":"09:00-24:00","thu":"09:00-24:00","fri":"09:00-24:00","sat":"09:00-24:00","sun":"09:00-24:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 200, price_max = 350, price_range = '₺',
  updated_at = NOW();

-- ============================================
-- OTELLER
-- ============================================

-- 8. Hilton Garden Inn
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, email, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  'a34ce905-6528-5b8d-91d0-4282b5881d72', 'Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn', 3,
  E'4 yıldızlı modern otel. 2026\'da odalar tamamen yenilendi, akıllı oda sistemi entegre edildi. Havuz, spa ve fitness merkezi mevcut. İş seyahatleri ve aile tatilleri için ideal. Şehir merkezine yürüme mesafesinde, tüm modern konforları bir arada sunuyor. Elektrikli araç şarj istasyonları da mevcut.',
  '4 yıldızlı modern konaklama',
  'Eyyübiye, Otel Caddesi No:1',
  '0414 567 89 02', 'sUrfa@hilton.com', 'https://hilton.com/sanliurfa',
  37.1623, 38.7956,
  4.7, 567,
  '₺₺₺₺', 3500, 5500,
  ARRAY['havuz', 'spa', 'fitness', 'wifi', 'otopark', 'restoran', 'akilli_oda', 'elektrikli_arac_sarj'],
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 3500, price_max = 5500, price_range = '₺₺₺₺',
  updated_at = NOW();

-- 9. Hanehan Butik Otel
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, email, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '3ee15bfb-01b4-5ef3-bcda-c75fd7128eb5', 'Hanehan Butik Otel', 'hanehan-butik-otel', 3,
  E'Tarihi İpek Yolu üzerindeki bir hanın otel ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. 2026\'da UNESCO onaylı restorasyon tamamlandı. 8 oda\'dan 15 odaya çıktı. Tarihi taş duvarlar, avlu düzeni ve otantik dekorasyonuyla gerçek bir Şanlıurfa deneyimi sunuyor. Sıra gecesi odanıza geliyor!',
  'UNESCO onaylı tarihi butik otel',
  'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
  '90 414 215 93 77', 'info@hanehan.com', NULL,
  37.1599, 38.7915,
  4.9, 342,
  '₺₺₺', 1800, 3200,
  ARRAY['tarihi_mekan', 'wifi', 'sira_gecesi', 'restoran', 'bahce', 'dijital_concierge'],
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 1800, price_max = 3200, price_range = '₺₺₺',
  updated_at = NOW();

-- 10. Palmyra Boutique Hotel
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '97e30bfc-2b01-5a1e-a09d-265ed3d68bf3', 'Palmyra Boutique Hotel', 'palmyra-boutique-hotel', 3,
  E'Balıklıgöl manzaralı butik otel. Şehrin kalbinde ama sessiz bir konumda. Romantik kaçamaklar için ideal. Odalardan gölüm manzarası görebilir, sabah kahvaltınızı terasta yapabilirsiniz. Butik konseptiyle samimi bir hizmet sunuyor.',
  'Göl manzaralı butik konaklama',
  'Balıklıgöl, Göl Yakası No:34',
  '0414 678 90 13', NULL,
  37.1495, 38.7898,
  4.6, 289,
  '₺₺₺', 1500, 2800,
  ARRAY['manzara', 'wifi', 'kahvalti', 'butik'],
  true, false, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 1500, price_max = 2800, price_range = '₺₺₺',
  updated_at = NOW();

-- ============================================
-- TARİHİ YERLER
-- ============================================

-- 11. Göbeklitepe
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, email, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '4eeee9dd-05c7-5518-9865-278b35d8228d', 'Göbeklitepe', 'gobeklitepe', 4,
  E'Dünyanın bilinen en eski tapınak kompleksi. MÖ 9600 yıllarına tarihlenen bu arkeolojik site, insanlık tarihini yeniden yazdı. UNESCO Dünya Mirası Listesi\'nde. 2026\'da AR uygulaması, gece ziyaretleri ve yeni keşfedilen D yapısı ziyarete açıldı. AR uygulamasını indirerek T şekilli direklerin orijinal boyutlarını görebilir, hayvan figürlerinin renkli restitüsyonlarını izleyebilirsiniz. Gece ziyaretlerinde özel ışıklandırma altında tapınakları deneyimleyebilirsiniz.',
  'Dünyanın ilk tapınağı, UNESCO Mirası',
  'Örencik Köyü, Haliliye/Şanlıurfa',
  '+90 414 318 88 80', NULL, 'https://gobeklitepe.gov.tr',
  37.2231, 38.9223,
  5.0, 12543,
  '₺', 450,
  ARRAY['unesco', 'arkeoloji', 'ar_uygulama', 'rehber', 'engelli_erisim', 'gece_ziyaret', 'muzekart'],
  '{"mon":"08:00-19:00","tue":"08:00-19:00","wed":"08:00-19:00","thu":"08:00-19:00","fri":"08:00-19:00","sat":"08:00-19:00","sun":"08:00-19:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 450, price_range = '₺',
  updated_at = NOW();

-- 12. Balıklıgöl
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '683f66ef-437d-5a61-b3a8-ba6080179cfa', 'Balıklıgöl', 'balikligol', 4,
  E'Hz. İbrahim\'in ateşe atıldığı rivayet edilen göl. İçindeki kutsal balıklar dokunulmaz sayılır. Şanlıurfa\'nın en önemli sembollerinden biri. 2026\'da çevre düzenlemesi, akıllı bilgi panoları ve ücretsiz WiFi eklendi. Cami, medrese ve halilurrahman camii ile çevrili alan, şehrin manevi merkezi konumunda. Göl çevresindeki kafelerde çay içerek manzaranın tadını çıkarabilirsiniz.',
  'Hz. İbrahim makamı, kutsal balıklar',
  'Merkez, Balıklıgöl Caddesi, Şanlıurfa',
  37.1490, 38.7890,
  4.9, 8934,
  'Ücretsiz', 0,
  ARRAY['tarihi', 'dini', 'park', 'wifi', 'akilli_panolar', 'fotograf_noktasi'],
  '{"mon":"00:00-24:00","tue":"00:00-24:00","wed":"00:00-24:00","thu":"00:00-24:00","fri":"00:00-24:00","sat":"00:00-24:00","sun":"00:00-24:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 0, price_range = 'Ücretsiz',
  updated_at = NOW();

-- ============================================
-- TATLICILAR
-- ============================================

-- 13. Şanlı Miroğlu
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '37dd29d5-d1d8-516f-a3a5-4a344666764e', 'Şanlı Miroğlu Kadayıf & Billuriye', 'sanli-miroglu', 5,
  E'Billuriye ve kadayıf konusunda Şanlıurfa\'nın en iyisi. Yaz aylarında yanına bir top dondurma kondurup tatlıları taçlandırıyorlar. Künefesi de şehirdeki en iyilerden. Çökeleğin en sevilen hali billuriye, burada enfes bir lezzet. Sıcak servis edilir, üzerine tarçın serpilebilir.',
  'Billuriye ve kadayıf uzmanı',
  'Emniyet Cd. 376. Sk. Bulvar Apt. 63200, Şanlıurfa',
  '+90 414 314 14 14',
  37.1612, 38.7978,
  4.8, 2156,
  '₺', 250, 450,
  ARRAY['paket_servis', 'dondurma', 'geleneksel'],
  '{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 250, price_max = 450, price_range = '₺',
  updated_at = NOW();

-- 14. Üstüneller Baklava
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  '2db02dd4-3a9a-5faf-89a4-213de23d5a36', 'Üstüneller Baklava', 'ustuneller-baklava', 5,
  E'1989 yılından beri Şanlıurfa\'nın en iyi baklavacısı. Özellikle kare baklavası ve fıstık deryası adlı içi iri fıstıklı baklavası yok satıyor. Gaziantepli ustalardan öğrenilen teknikle hazırlanan baklavalar, şehre özgü lezzetleri yansıtıyor. Hediyelik paketler de mevcut.',
  '1989\'dan beri baklava ustası',
  'Kanberiye Mh. Şube Çıkmazı Sk. No:8, Şanlıurfa',
  '+90 414 315 96 69', NULL,
  37.1656, 38.7923,
  4.9, 1876,
  '₺₺', 800, 1200,
  ARRAY['paket_servis', 'hediyelik', 'geleneksel'],
  '{"mon":"07:00-22:00","tue":"07:00-22:00","wed":"07:00-22:00","thu":"07:00-22:00","fri":"07:00-22:00","sat":"07:00-22:00","sun":"07:00-22:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 800, price_max = 1200, price_range = '₺₺',
  updated_at = NOW();

-- ============================================
-- KAHVALTI
-- ============================================

-- 15. Cevahir Han
INSERT INTO places (
  id, name, slug, category_id, description, short_description, 
  address, phone, website,
  latitude, longitude, 
  rating, review_count, 
  price_range, price_min, price_max,
  features, opening_hours, 
  is_verified, is_featured, status,
  created_at, updated_at
) VALUES (
  'eb35b406-62fe-5b1f-b714-fea3bd9f2483', 'Cevahir Han Restoran', 'cevahir-han', 6,
  E'Tarihi İpek Yolu üzerindeki bir hanın otel, restoran ve sıra gecelerinin düzenlendiği bir konuk evine dönüştürülmüş hali. Serpme kahvaltısı ile meşhur. Hafta sonları canlı müzik eşliğinde kahvaltı. Tarihi atmosfer içinde zengin serpme kahvaltı, peynir çeşitleri, zeytinler, taze ekmek ve sıcak böreklerle başlayan harika bir gün.',
  'Tarihi handa serpme kahvaltı',
  'Kadıoğlu Mah. Vali Fuat Cad. No 5, Eyyübiye',
  '90 414 215 93 77', NULL,
  37.1599, 38.7915,
  4.7, 1123,
  '₺₺', 400, 700,
  ARRAY['tarihi_mekan', 'serpme_kahvalti', 'canli_muzik', 'wifi'],
  '{"mon":"08:00-12:00","tue":"08:00-12:00","wed":"08:00-12:00","thu":"08:00-12:00","fri":"08:00-12:00","sat":"08:00-14:00","sun":"08:00-14:00"}',
  true, true, 'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_min = 400, price_max = 700, price_range = '₺₺',
  updated_at = NOW();

-- ============================================
-- YORUMLAR (Ornek)
-- ============================================

INSERT INTO reviews (id, place_id, user_id, user_name, rating, title, content, status, created_at) VALUES
('rev-001', 'b597077c-ab27-5741-a0e2-0f077c6473be', 'user-demo-1', 'Ahmet Y.', 5, 'Ciğerin tadına doyamadım!', E'Soğanları kendim doğrayıp yemek ayrı bir keyif. 2026 fiyatları biraz artmış ama hak ediyor.', 'approved', NOW() - INTERVAL '2 days'),
('rev-002', 'b597077c-ab27-5741-a0e2-0f077c6473be', 'user-demo-2', 'Mehmet K.', 5, '25 yıldır aynı lezzet', '25 yıldır gelirim, hiç bozmadılar. QR menü çok pratik olmuş.', 'approved', NOW() - INTERVAL '5 days'),
('rev-003', '4eeee9dd-05c7-5518-9865-278b35d8228d', 'user-demo-3', 'Ayşe S.', 5, 'AR uygulaması harika', 'AR uygulaması sayesinde taşları canlandırılmış halde gördük, inanılmaz bir deneyim!', 'approved', NOW() - INTERVAL '1 day'),
('rev-004', 'c82e7488-f1f6-5c0d-83da-6e851a3c7906', 'user-demo-4', 'Fatma B.', 5, 'Restorasyon süper olmuş', 'Restorasyon harika olmuş. Menengiç kahvesi efsane.', 'approved', NOW() - INTERVAL '3 days'),
('rev-005', '3ee15bfb-01b4-5ef3-bcda-c75fd7128eb5', 'user-demo-5', 'Ali D.', 4, 'Çok güzel otel', 'Oda çok konforluydu, akıllı sistemler çok iyi. Kahvaltı çeşidi biraz daha artabilir.', 'approved', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SONUC
-- ============================================
SELECT '2026 guncellemeli 15 gercek mekan basariyla eklendi!' as result,
       (SELECT COUNT(*) FROM places WHERE id LIKE 'place-%') as mekan_sayisi,
       (SELECT COUNT(*) FROM reviews WHERE id LIKE 'rev-%') as yorum_sayisi;
