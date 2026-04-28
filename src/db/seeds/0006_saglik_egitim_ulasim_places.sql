-- ============================================
-- Sağlık, Eğitim, Ulaşım, Alışveriş, Hizmetler
-- Gerçekçi mekan verileri
-- ============================================

-- ============================================
-- PHARMACIES (Eczaneler)
-- ============================================
INSERT INTO pharmacies (name, slug, address, phone, district_id, is_on_duty, duty_date, latitude, longitude) VALUES
('Dergah Eczanesi', 'dergah-eczanesi', 'Dergah Caddesi No:12, Eyyübiye', '+90 414 215 1001', 1, true, CURRENT_DATE, 37.1524, 38.7885),
('Balıklıgöl Eczanesi', 'balikligol-eczanesi', 'Balıklıgöl Mah., Eyyübiye', '+90 414 215 1002', 1, true, CURRENT_DATE, 37.1521, 38.7893),
('Haliliye Merkez Eczanesi', 'haliliye-merkez-eczanesi', 'Atatürk Bulvarı No:34, Haliliye', '+90 414 313 2001', 2, true, CURRENT_DATE, 37.1620, 38.7956),
('Karaköprü Eczanesi', 'karakopru-eczanesi', 'Karaköprü Merkez, Karaköprü', '+90 414 444 3001', 3, false, CURRENT_DATE, 37.1950, 38.8120),
('Yenişehir Eczanesi', 'yenisehir-eczanesi', 'Yenişehir Mah., Haliliye', '+90 414 313 4001', 2, false, CURRENT_DATE, 37.1680, 38.7999),
('Mevlana Eczanesi', 'mevlana-eczanesi', 'Mevlana Caddesi, Eyyübiye', '+90 414 215 5001', 1, false, CURRENT_DATE, 37.1533, 38.7901),
('Güneykent Eczanesi', 'guneykent-eczanesi', 'Güneykent Bul., Karaköprü', '+90 414 444 6001', 3, true, CURRENT_DATE, 37.1988, 38.8201),
('Siverek Merkez Eczanesi', 'siverek-merkez-eczanesi', 'İstasyon Cad., Siverek', '+90 414 711 7001', 4, true, CURRENT_DATE, 37.7545, 39.3192),
('Viranşehir Eczanesi', 'viransehir-eczanesi', 'Cumhuriyet Mah., Viranşehir', '+90 414 611 8001', 5, false, CURRENT_DATE, 37.2323, 39.7649),
('Bozova Eczanesi', 'bozova-eczanesi', 'Bozova Merkez', '+90 414 711 9001', 11, false, CURRENT_DATE, 37.3756, 38.5213),
('Halfeti Eczanesi', 'halfeti-eczanesi', 'Halfeti Merkez', '+90 414 851 1001', 12, true, CURRENT_DATE, 37.2488, 37.8675),
('Harran Eczanesi', 'harran-eczanesi', 'Harran İlçe Merkezi', '+90 414 441 2001', 13, false, CURRENT_DATE, 36.8637, 39.0302)
ON CONFLICT (slug) DO UPDATE SET is_on_duty = EXCLUDED.is_on_duty, duty_date = EXCLUDED.duty_date;

-- ============================================
-- DEVLET HASTANELERİ
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, is_featured, latitude, longitude) VALUES
('Şanlıurfa Eğitim ve Araştırma Hastanesi', 'sanliurfa-egitim-arastirma-hastanesi',
 (SELECT id FROM categories WHERE slug = 'devlet-hastaneleri'), 2,
 'Şanlıurfa''nın en büyük devlet hastanesi. Acil, yoğun bakım ve tüm klinikler.',
 'Haliliye, Şanlıurfa', '+90 414 318 3000', 'active', true, true, 37.1645, 38.8011),
('Mehmet Akif İnan Eğitim Araştırma Hastanesi', 'mehmet-akif-inan-hastanesi',
 (SELECT id FROM categories WHERE slug = 'devlet-hastaneleri'), 1,
 'Şanlıurfa merkezdeki büyük devlet hastanesi. Tüm branşlarda uzman kadro.',
 'Eyyübiye, Şanlıurfa', '+90 414 312 9595', 'active', true, true, 37.1590, 38.7935),
('Siverek Devlet Hastanesi', 'siverek-devlet-hastanesi',
 (SELECT id FROM categories WHERE slug = 'devlet-hastaneleri'), 4,
 'Siverek ilçesinin merkez devlet hastanesi.',
 'İstasyon Cad., Siverek', '+90 414 711 1099', 'active', true, false, 37.7545, 39.3192),
('Viranşehir Devlet Hastanesi', 'viransehir-devlet-hastanesi',
 (SELECT id FROM categories WHERE slug = 'devlet-hastaneleri'), 5,
 'Viranşehir ilçe devlet hastanesi.',
 'Cumhuriyet Mah., Viranşehir', '+90 414 611 1155', 'active', true, false, 37.2323, 39.7649)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- ÖZEL HASTANELERİ
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, status, is_verified, is_featured) VALUES
('Özel Şanlıurfa Hastanesi', 'ozel-sanliurfa-hastanesi',
 (SELECT id FROM categories WHERE slug = 'ozel-hastaneler'), 2,
 'Modern tıbbi altyapıyla hizmet veren özel hastane.',
 'Haliliye Mah., Haliliye', '+90 414 313 1234', 4.3, 128, 'active', true, true),
('Özel Diyatem Hastanesi', 'ozel-diyatem-hastanesi',
 (SELECT id FROM categories WHERE slug = 'ozel-hastaneler'), 1,
 'Karaciğer, sindirim ve onkoloji alanında uzmanlaşmış özel klinik.',
 'Eyyübiye Merkez', '+90 414 215 6789', 4.1, 89, 'active', true, false),
('Medikalpark Şanlıurfa', 'medikalpark-sanliurfa',
 (SELECT id FROM categories WHERE slug = 'ozel-hastaneler'), 2,
 'Tam donanımlı özel hastane — poliklinik, laboratuvar, görüntüleme.',
 'Haliliye Bulvarı', '+90 414 999 2222', 4.4, 215, 'active', true, true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- ÜNIVERSITELER
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, is_featured) VALUES
('Harran Üniversitesi', 'harran-universitesi',
 (SELECT id FROM categories WHERE slug = 'universiteler'), 2,
 '1992 yılında kurulan Harran Üniversitesi — Şanlıurfa''nın köklü devlet üniversitesi. 20+ fakülte.',
 'Osmanbey Yerleşkesi, Haliliye', '+90 414 318 3000', 'active', true, true),
('Harran Üniversitesi Tıp Fakültesi', 'harran-universitesi-tip-fakultesi',
 (SELECT id FROM categories WHERE slug = 'universiteler'), 2,
 'Harran Üniversitesi Tıp Fakültesi — Uygulama hastanesi ile birlikte.',
 'Haliliye, Şanlıurfa', '+90 414 318 3211', 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- OKULLAR (İlkokul, Ortaokul, Lise)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified) VALUES
('Şanlıurfa Fen Lisesi', 'sanliurfa-fen-lisesi',
 (SELECT id FROM categories WHERE slug = 'okullar'), 2,
 'Türkiye''nin sayılı fen liselerinden biri — akademik başarı merkezi.',
 'Haliliye, Şanlıurfa', '+90 414 312 1111', 'active', true),
('Şanlıurfa Anadolu Lisesi', 'sanliurfa-anadolu-lisesi',
 (SELECT id FROM categories WHERE slug = 'okullar'), 1,
 'Şanlıurfa merkezde köklü Anadolu Lisesi.',
 'Eyyübiye, Şanlıurfa', '+90 414 215 2222', 'active', true),
('İMKB Ortaokulu', 'imkb-ortaokulu',
 (SELECT id FROM categories WHERE slug = 'okullar'), 3,
 'Karaköprü''nün önde gelen ortaokulu.',
 'Karaköprü, Şanlıurfa', '+90 414 444 3333', 'active', true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- ULAŞIM
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, status, is_verified, is_featured, latitude, longitude) VALUES
('GAP Şanlıurfa Havalimanı', 'gap-havalimani',
 (SELECT id FROM categories WHERE slug = 'havalimani'), 2,
 'Şanlıurfa GAP Havalimanı — İstanbul, Ankara ve diğer şehirlere direkt uçuşlar. Şehir merkezine ~40 km.',
 'GAP Havalimanı, Şanlıurfa', '+90 414 318 8877', 'active', true, true, 37.0946, 38.8432),
('Şanlıurfa Şehirlerarası Otobüs Terminali (GAP Otogar)', 'gap-otogar',
 (SELECT id FROM categories WHERE slug = 'otogar'), 2,
 'Türkiye geneline tüm otobüs firmaları. Metro, Flixbus, Kamil Koç ve daha fazlası.',
 'Bülent Ecevit Bulvarı, Haliliye', '+90 414 313 8899', 'active', true, true, 37.1423, 38.8063),
('Şanlıurfa Garı (TCDD)', 'sanliurfa-tren-gari',
 (SELECT id FROM categories WHERE slug = 'otogar'), 2,
 'Şanlıurfa tren garı — GAP tren hattı, Adana ve Gaziantep bağlantısı.',
 'Haliliye, Şanlıurfa', '+90 414 313 7788', 'active', true, false, 37.1456, 38.8089)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- ALIŞVERİŞ MERKEZLERİ
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, status, is_verified, is_featured) VALUES
('Kapalıçarşı & Gümrük Hanı', 'kapalicarsi-gumruk-hani',
 (SELECT id FROM categories WHERE slug = 'avmler'), 1,
 'Şanlıurfa''nın tarihi alışveriş merkezi. Bakır eşyalar, isot, yöresel ürünler ve el sanatları.',
 'Gümrük Hanı, Eyyübiye', NULL, 4.7, 892, 'active', true, true),
('Urfa Park AVM', 'urfa-park-avm',
 (SELECT id FROM categories WHERE slug = 'avmler'), 2,
 'Şanlıurfa''nın modern alışveriş merkezi. Mağazalar, sinema ve yemek katı.',
 'Haliliye Bulvarı, Haliliye', '+90 414 999 5555', 4.2, 567, 'active', true, true),
('UrfaCity AVM', 'urfacity-avm',
 (SELECT id FROM categories WHERE slug = 'avmler'), 3,
 'Karaköprü''nün büyük alışveriş merkezi.',
 'Karaköprü Bulvarı', '+90 414 444 6666', 4.0, 312, 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- YÖREsEL ÜRÜNLER (Hediyelik)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, status, is_verified, is_featured) VALUES
('İsot Pazarı', 'isot-pazari',
 (SELECT id FROM categories WHERE slug = 'yoresel-urunler'), 1,
 'Şanlıurfa''nın meşhur kırmızı biberi isotun satıldığı tarihi pazar.',
 'Kapalıçarşı, Eyyübiye', NULL, 4.8, 445, 'active', true, true),
('Bakırcılar Çarşısı', 'bakırcilar-carsisi',
 (SELECT id FROM categories WHERE slug = 'yoresel-urunler'), 1,
 'El yapımı bakır eşyalar, sini, mangal ve süs eşyaları.',
 'Gümrük Hanı yakını, Eyyübiye', NULL, 4.6, 334, 'active', true, true),
('Urfa Boncuğu Atölyesi', 'urfa-boncugu-atolyesi',
 (SELECT id FROM categories WHERE slug = 'hediyelik-esya'), 1,
 'Nazarlık, Urfa boncuğu ve geleneksel takılar.',
 'Dergah yakını, Eyyübiye', '+90 414 215 7788', 4.5, 223, 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;
