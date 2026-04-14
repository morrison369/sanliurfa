-- ============================================
-- Genişletilmiş Mekan Verileri
-- Farklı kategoriler ve ilçelere dağılmış
-- ============================================

-- Mevcut 15 mekanı ilçe ve alt kategoriye bağla
UPDATE places SET category_id = 101, district_id = 1 WHERE slug = 'cigerci-aziz-usta';
UPDATE places SET category_id = 101, district_id = 1 WHERE slug = 'sembol-ocakbasi';
UPDATE places SET category_id = 103, district_id = 1 WHERE slug = 'culcuoglu-restoran';
UPDATE places SET category_id = 101, district_id = 2 WHERE slug = 'cagdas-ocakbasi';
UPDATE places SET category_id = 101, district_id = 2 WHERE slug = 'dedecan-ocakbasi';

-- ============================================
-- CİĞERCİLER (category_id = 102)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, price_min, price_max, features, status, is_verified, is_featured) VALUES
('Ciğerci Bahçe', 'cigerci-bahce', 102, 1, 'Bahçe ortamında ciğer kebabı keyfi', 'Balıklıgöl Caddesi, Eyyübiye', '+90 414 215 3344', 4.6, 342, '₺', 350, 550, ARRAY['bahce','otopark'], 'active', true, false),
('Meşhur Urfa Ciğercisi', 'meshur-urfa-cigercisi', 102, 2, 'Haliliye''nin en bilinen ciğercisi', 'Atatürk Bulvarı No:45, Haliliye', '+90 414 313 2211', 4.5, 289, '₺', 400, 600, ARRAY['paket_servis','temassiz_odeme'], 'active', true, false),
('Ciğerci Ömer Usta', 'cigerci-omer-usta', 102, 3, 'Karaköprü''de ciğer kebabının adresi', 'Karaköprü Merkez, Yeni Çarşı', '+90 414 444 5566', 4.4, 178, '₺', 350, 500, ARRAY['otopark','wifi'], 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, district_id = EXCLUDED.district_id;

-- ============================================
-- ÇİĞ KÖFTECİLER (category_id = 105)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, price_min, price_max, status, is_verified) VALUES
('Kısmet Çiğ Köfte', 'kismet-cig-kofte', 105, 1, 'El yapımı acılı çiğ köfte, isot ezmesi', 'Dergah Yolu, Eyyübiye', '+90 414 215 7788', 4.7, 456, '₺', 200, 350, 'active', true),
('Meşhur Urfa Çiğ Köftecisi', 'meshur-urfa-cig-koftecisi', 105, 2, 'Geleneksel karataş çiğ köftesi', 'Paşabağı Mah., Haliliye', '+90 414 312 9900', 4.5, 312, '₺', 180, 300, 'active', true),
('Zafer Çiğ Köfte', 'zafer-cig-kofte', 105, 3, 'Acısız ve acılı çiğ köfte', 'Karaköprü AVM yanı', '+90 414 444 1122', 4.3, 234, '₺', 150, 250, 'active', true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- LAHMACUNCULAR (category_id = 103)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, status, is_verified) VALUES
('Meşhur Haliliye Lahmacuncu', 'meshur-haliliye-lahmacuncu', 103, 2, 'İnce hamur, bol malzemeli lahmacun', 'Haliliye Merkez', '+90 414 313 4455', 4.6, 567, '₺', 'active', true),
('Urfa Lahmacun Evi', 'urfa-lahmacun-evi', 103, 1, 'Taş fırında geleneksel lahmacun', 'Kapalıçarşı yakını, Eyyübiye', '+90 414 215 6677', 4.4, 345, '₺', 'active', true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- KAHVALTI MEKANLARI (category_id = 107)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, price_min, price_max, features, status, is_verified, is_featured) VALUES
('Gümrük Hanı Kahvaltı', 'gumruk-hani-kahvalti', 107, 1, 'Tarihi handa serpme kahvaltı keyfi', 'Gümrük Hanı, Eyyübiye', '+90 414 215 1100', 4.8, 678, '₺₺', 600, 900, ARRAY['tarihi_mekan','manzara','serpme_kahvalti'], 'active', true, true),
('Beyaz Köşk Kahvaltı', 'beyaz-kosk-kahvalti', 107, 3, 'Karaköprü''nün en güzel kahvaltı mekanı', 'Karaköprü Bulvarı No:78', '+90 414 444 3344', 4.6, 423, '₺₺', 500, 800, ARRAY['bahce','cocuk_oyun_alani','otopark'], 'active', true, false),
('Dergah Kahvaltı Salonu', 'dergah-kahvalti-salonu', 107, 1, 'Balıklıgöl manzaralı kahvaltı', 'Dergah Caddesi, Eyyübiye', '+90 414 215 2233', 4.7, 534, '₺₺', 550, 850, ARRAY['manzara','serpme_kahvalti'], 'active', true, true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, district_id = EXCLUDED.district_id;

-- ============================================
-- TATLICILAR (category_id = 108)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, status, is_verified) VALUES
('Meşhur Urfa Tatlıcısı', 'meshur-urfa-tatlicisi', 108, 1, 'Kadayıf, baklava, billuriye ve şıllık', 'Sarayönü Cad., Eyyübiye', '+90 414 215 8899', 4.7, 456, '₺', 'active', true),
('Hacı Baba Tatlıcısı', 'haci-baba-tatlicisi', 108, 2, 'Geleneksel Urfa kadayıfı ve baklavası', 'Haliliye Merkez', '+90 414 313 5566', 4.5, 312, '₺', 'active', true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- KAFELER (category_id = 111)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, features, status, is_verified) VALUES
('Mırra Kahvesi', 'mirra-kahvesi', 111, 1, 'Geleneksel mırra ve menengiç kahvesi', 'Gümrük Hanı, Eyyübiye', '+90 414 215 4455', 4.8, 567, '₺', ARRAY['tarihi_mekan','wifi','geleneksel'], 'active', true),
('Seyir Tepesi Cafe', 'seyir-tepesi-cafe-merkez', 111, 1, 'Urfa Kalesi manzaralı modern kafe', 'Kale Yolu, Eyyübiye', '+90 414 215 6789', 4.6, 423, '₺₺', ARRAY['manzara','wifi','dessert'], 'active', true),
('Coffee House Karaköprü', 'coffee-house-karakopru', 111, 3, 'Modern specialty coffee mekanı', 'Karaköprü Bulvarı', '+90 414 444 7788', 4.4, 234, '₺₺', ARRAY['wifi','otopark','calisma_alani'], 'active', true)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- OTELLER / KONAKLAMA (category_id = 501)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, price_range, price_min, price_max, features, status, is_verified, is_featured) VALUES
('Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn-sanliurfa', 501, 2, 'Şehir merkezinde 5 yıldızlı otel', 'Haliliye Merkez', '+90 414 999 1111', 4.5, 789, '₺₺₺', 2500, 5000, ARRAY['havuz','spa','restoran','otopark','wifi'], 'active', true, true),
('Hanehan Butik Otel', 'hanehan-butik-otel', 501, 1, 'Tarihi handa butik konaklama deneyimi', 'Dergah yakını, Eyyübiye', '+90 414 215 0000', 4.7, 456, '₺₺', 1500, 3000, ARRAY['tarihi_mekan','restoran','wifi','manzara'], 'active', true, true),
('Manici Hotel', 'manici-hotel', 501, 1, 'Balıklıgöl yakınında şirin otel', 'Balıklıgöl Cad., Eyyübiye', '+90 414 215 3300', 4.4, 312, '₺₺', 1200, 2500, ARRAY['wifi','restoran','otopark'], 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, district_id = EXCLUDED.district_id;

-- ============================================
-- SIRA GECESİ / YÖRESEL (category_id = 106)
-- ============================================
INSERT INTO places (name, slug, category_id, district_id, short_description, address, phone, rating, review_count, features, status, is_verified, is_featured) VALUES
('Gümrük Hanı Sıra Gecesi', 'gumruk-hani-sira-gecesi', 106, 1, 'Tarihi handa geleneksel sıra gecesi deneyimi', 'Gümrük Hanı, Eyyübiye', '+90 414 215 1234', 4.9, 678, ARRAY['canli_muzik','geleneksel','tarihi_mekan'], 'active', true, true),
('Harran Kültür Evi', 'harran-kultur-evi', 106, 13, 'Kümbet evlerinde yöresel yemek ve müzik', 'Harran İlçe Merkezi', '+90 414 441 5566', 4.6, 234, ARRAY['canli_muzik','yoresel','bahce'], 'active', true, false)
ON CONFLICT (slug) DO UPDATE SET category_id = EXCLUDED.category_id, district_id = EXCLUDED.district_id;

-- ============================================
-- GEZİLECEK YERLER: Historical Sites
-- ============================================
INSERT INTO historical_sites (name, slug, description, short_description, location, latitude, longitude, visiting_hours, entrance_fee, status, is_featured) VALUES
('Göbeklitepe', 'gobeklitepe', 'MÖ 9600 yılına tarihlenen dünyanın bilinen en eski tapınak kompleksi. UNESCO Dünya Mirası.', 'Dünyanın en eski tapınağı - UNESCO Dünya Mirası', 'Örencik Köyü, Şanlıurfa Merkez', 37.2233, 38.9224, 'Yaz: 08:00-19:00 / Kış: 08:00-17:00', 'Müzekart geçerli', 'active', true),
('Balıklıgöl', 'balikligol', 'Hz. İbrahim''in ateşe atıldığı ve ateşin göle dönüştüğü efsanesiyle bilinen kutsal mekan. Halil-ür Rahman Gölü ve Ayn-ı Zeliha Gölü.', 'Hz. İbrahim efsanesi ve kutsal balıklar', 'Dergah Bölgesi, Eyyübiye', 37.1519, 38.7893, '7/24 açık', 'Ücretsiz', 'active', true),
('Harran Kümbet Evleri', 'harran-kumbet-evleri', 'Dünyanın ilk üniversitesinin bulunduğu antik şehir. Karakteristik kubbe şeklindeki evleriyle ünlü.', 'Kümbet evleri ve dünyanın ilk üniversitesi', 'Harran İlçesi', 36.8637, 39.0302, '08:00-18:00', '₺50', 'active', true),
('Halfeti Batık Şehir', 'halfeti-batik-sehir', 'Birecik Barajı''nın suları altında kalan eski Halfeti. Fırat Nehri''nde tekne turu ile ziyaret edilir. Siyah gülleriyle ünlü UNESCO Cittaslow şehri.', 'Batık şehir, siyah güller ve Fırat tekne turu', 'Halfeti İlçesi', 37.2488, 37.8675, 'Tekne turları: 09:00-18:00', 'Tekne turu: ₺200-400', 'active', true),
('Urfa Kalesi', 'urfa-kalesi', 'Şehrin en yüksek noktasında bulunan tarihi kale. İki Korint sütunu ve panoramik şehir manzarası. Hz. İbrahim Mağarası kalenin eteklerinde.', 'Panoramik manzara ve Hz. İbrahim Mağarası', 'Kale Tepesi, Eyyübiye', 37.1539, 38.7877, '08:00-19:00', 'Müzekart geçerli', 'active', true),
('Şanlıurfa Arkeoloji Müzesi', 'sanliurfa-arkeoloji-muzesi', 'Göbeklitepe buluntuları, Urfa Adamı (dünyanın en eski insan heykeli) ve binlerce yıllık eserlere ev sahipliği yapan modern müze.', 'Göbeklitepe eserleri ve Urfa Adamı', 'Haleplibahçe, Eyyübiye', 37.1556, 38.7845, '08:30-17:30 (Pazartesi kapalı)', 'Müzekart geçerli', 'active', true)
ON CONFLICT (slug) DO UPDATE SET description = EXCLUDED.description, short_description = EXCLUDED.short_description, status = 'active';
