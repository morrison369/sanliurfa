-- ============================================
-- Genişletilmiş Kategoriler, İlçeler, SEO Sayfaları
-- ============================================

-- ANA KATEGORİLER (parent_id NULL = ana kategori)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, meta_title, meta_description) VALUES
(10, 'Mekanlar', 'mekanlar', 'Şanlıurfa''daki tüm mekanlar ve yerel lezzetler', 'Store', '#e63946', true, 1, 'Şanlıurfa Mekanlar Rehberi | En İyi Mekanlar ve Yerel Lezzetler', 'Şanlıurfa''nın en popüler mekanları. Kebapçılar, ciğerciler, kafeler ve daha fazlası.'),
(11, 'Yeme İçme', 'yeme-icme', 'Şanlıurfa yeme içme rehberi', 'UtensilsCrossed', '#f4a261', true, 2, 'Şanlıurfa Yeme İçme Rehberi | Kebap, Ciğer, Tatlı ve Yöresel Lezzetler', 'Kahvaltıdan gece mekanlarına, paket servisten aile mekanlarına Şanlıurfa lezzetleri.'),
(12, 'Gezilecek Yerler', 'gezilecek-yerler', 'Şanlıurfa tarihi ve turistik noktalar', 'Landmark', '#264653', true, 3, 'Şanlıurfa Gezilecek Yerler | Tarihi ve Turistik Noktalar', 'Göbeklitepe, Balıklıgöl, Harran ve diğer turistik yerler.'),
(13, 'Etkinlikler', 'etkinlikler', 'Konser, festival ve güncel etkinlikler', 'Calendar', '#2a9d8f', true, 4, 'Şanlıurfa Etkinlikler | Konser, Festival ve Güncel Etkinlikler', NULL),
(14, 'Sağlık', 'saglik', 'Hastaneler, eczaneler ve sağlık hizmetleri', 'Heart', '#e76f51', true, 5, 'Şanlıurfa Hastaneler ve Sağlık Rehberi', NULL),
(15, 'Eğitim', 'egitim', 'Okullar, üniversiteler ve kurslar', 'GraduationCap', '#6a4c93', true, 6, 'Şanlıurfa Eğitim Rehberi | Okullar ve Kurslar', NULL),
(16, 'Ulaşım', 'ulasim', 'Otogar, havalimanı ve ulaşım bilgileri', 'Bus', '#1982c4', true, 7, 'Şanlıurfa Ulaşım Rehberi | Otogar, Havalimanı ve Ulaşım', NULL),
(17, 'Alışveriş', 'alisveris', 'Çarşılar, AVM''ler ve mağazalar', 'ShoppingBag', '#ff595e', true, 8, 'Şanlıurfa Alışveriş Rehberi | Çarşılar ve Mağazalar', NULL),
(18, 'Hizmetler', 'hizmetler', 'Kuaför, temizlik, teknik servis', 'Wrench', '#8ac926', true, 9, 'Şanlıurfa Hizmetler Rehberi', NULL),
(19, 'Emlak', 'emlak', 'Satılık ve kiralık daireler', 'Home', '#ffca3a', true, 10, 'Şanlıurfa Emlak Rehberi | Satılık ve Kiralık Daireler', NULL),
(20, 'Konaklama', 'konaklama', 'Oteller, pansiyonlar ve butik oteller', 'Hotel', '#2a9d8f', true, 11, 'Şanlıurfa Oteller ve Konaklama Rehberi', NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description, meta_title = EXCLUDED.meta_title;

-- ALT KATEGORİLER: Mekanlar (parent_id = 10)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, parent_id, meta_title) VALUES
(101, 'Kebapçılar', 'kebapcilar', 'Şanlıurfa''nın en iyi kebap mekanları', 'Flame', '#e63946', true, 1, 10, 'Şanlıurfa Kebapçılar | En İyi Kebap Mekanları'),
(102, 'Ciğerciler', 'cigerciler', 'Şanlıurfa''nın meşhur ciğer mekanları', 'Beef', '#c1121f', true, 2, 10, 'Şanlıurfa Ciğerciler | En Meşhur Ciğer Mekanları'),
(103, 'Lahmacuncular', 'lahmacuncular', 'En lezzetli lahmacun adresleri', 'Pizza', '#e85d04', true, 3, 10, 'Şanlıurfa Lahmacuncular | En İyi Lahmacun'),
(104, 'Pideciler', 'pideciler', 'Pide ve pideli mekanlar', 'Pizza', '#f48c06', true, 4, 10, NULL),
(105, 'Çiğ Köfteciler', 'cig-kofteciler', 'Geleneksel çiğ köfte ustaları', 'Leaf', '#606c38', true, 5, 10, 'Şanlıurfa Çiğ Köfteciler | En İyi Çiğ Köfte'),
(106, 'Yöresel Yemekler', 'yoresel-yemekler', 'Urfa mutfağının özgün lezzetleri', 'ChefHat', '#bc6c25', true, 6, 10, NULL),
(107, 'Kahvaltı Mekanları', 'kahvalti-mekanlari', 'Serpme kahvaltı ve kahvaltı salonları', 'Sunrise', '#f4a261', true, 7, 10, 'Şanlıurfa Kahvaltı Mekanları | En İyi Kahvaltı'),
(108, 'Tatlıcılar', 'tatlicilar', 'Baklava, kadayıf ve geleneksel tatlılar', 'Cake', '#e9c46a', true, 8, 10, NULL),
(109, 'Fırınlar', 'firinlar', 'Ekmek fırınları ve börekçiler', 'Croissant', '#dda15e', true, 9, 10, NULL),
(110, 'Pastaneler', 'pastaneler', 'Pasta ve tatlı mekanları', 'CakeSlice', '#ffc8dd', true, 10, 10, NULL),
(111, 'Kafeler', 'kafeler', 'Kahve molaları ve modern kafeler', 'Coffee', '#a2d2ff', true, 11, 10, NULL),
(112, 'Çay Bahçeleri', 'cay-bahceleri', 'Geleneksel çay bahçeleri', 'TreePine', '#588157', true, 12, 10, NULL),
(113, 'Balık Restoranları', 'balik-restoranlari', 'Balık ve deniz ürünleri', 'Fish', '#0077b6', true, 13, 10, NULL)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;

-- ALT KATEGORİLER: Yeme İçme (parent_id = 11)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, parent_id) VALUES
(201, 'Kahvaltı', 'kahvalti', 'Kahvaltı mekanları', 'Sunrise', '#f4a261', true, 1, 11),
(202, 'Brunch', 'brunch', 'Brunch mekanları', 'Coffee', '#a2d2ff', true, 2, 11),
(203, 'Gece Açık Mekanlar', 'gece-acik-mekanlar', 'Geç saatlere kadar açık mekanlar', 'Moon', '#264653', true, 3, 11),
(204, 'Paket Servis', 'paket-servis', 'Eve sipariş verilebilen mekanlar', 'Package', '#e76f51', true, 4, 11),
(205, 'Aile Mekanları', 'aile-mekanlari', 'Aile dostu mekanlar', 'Users', '#2a9d8f', true, 5, 11),
(206, 'Uygun Fiyatlı', 'uygun-fiyatli-mekanlar', 'Bütçe dostu lezzetler', 'DollarSign', '#8ac926', true, 6, 11)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;

-- ALT KATEGORİLER: Gezilecek Yerler (parent_id = 12)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, parent_id) VALUES
(301, 'Balıklıgöl', 'balikligol', 'Balıklıgöl ve çevresi', 'Droplets', '#0077b6', true, 1, 12),
(302, 'Göbeklitepe', 'gobeklitepe', 'Dünyanın ilk tapınağı', 'Landmark', '#264653', true, 2, 12),
(303, 'Harran', 'harran', 'Harran kümbet evleri ve üniversitesi', 'Building', '#bc6c25', true, 3, 12),
(304, 'Halfeti', 'halfeti', 'Batık şehir ve siyah güller', 'Flower', '#023047', true, 4, 12),
(305, 'Urfa Kalesi', 'urfa-kalesi', 'Şanlıurfa Kalesi ve çevresi', 'Castle', '#6a4c93', true, 5, 12),
(306, 'Çarşılar', 'carsiler', 'Kapalı çarşı, Ayna çarşı, Bakırcılar', 'Store', '#e63946', true, 6, 12),
(307, 'Müzeler', 'muzeler', 'Arkeoloji ve şehir müzeleri', 'Building2', '#1982c4', true, 7, 12),
(308, 'Tarihi Yerler', 'tarihi-mekanlar', 'Diğer tarihi mekanlar', 'Clock', '#264653', true, 8, 12),
(309, 'Mesire Alanları', 'mesire-alanlari', 'Piknik ve mesire alanları', 'Trees', '#588157', true, 9, 12)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;

-- ALT KATEGORİLER: Sağlık (parent_id = 14)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, parent_id) VALUES
(401, 'Devlet Hastaneleri', 'devlet-hastaneleri', NULL, 'Hospital', '#e76f51', true, 1, 14),
(402, 'Özel Hastaneler', 'ozel-hastaneler', NULL, 'Hospital', '#e76f51', true, 2, 14),
(403, 'Diş Klinikleri', 'dis-klinikleri', NULL, 'Smile', '#e76f51', true, 3, 14),
(404, 'Eczaneler', 'eczaneler', NULL, 'Pill', '#e76f51', true, 4, 14),
(405, 'Nöbetçi Eczaneler', 'nobetci-eczaneler', NULL, 'AlertCircle', '#ff0000', true, 5, 14),
(406, 'Veterinerler', 'veterinerler', NULL, 'Dog', '#8ac926', true, 6, 14)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;

-- ALT KATEGORİLER: Konaklama (parent_id = 20)
INSERT INTO categories (id, name, slug, description, icon, color, is_active, sort_order, parent_id) VALUES
(501, 'Oteller', 'oteller', 'Şanlıurfa otelleri', 'Hotel', '#2a9d8f', true, 1, 20),
(502, 'Butik Oteller', 'butik-oteller', 'Tarihi han otelleri ve butik konaklama', 'Gem', '#6a4c93', true, 2, 20),
(503, 'Pansiyonlar', 'pansiyonlar', 'Uygun fiyatlı konaklama', 'Home', '#8ac926', true, 3, 20)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, parent_id = EXCLUDED.parent_id;

-- ============================================
-- İLÇELER (13 İlçe)
-- ============================================
INSERT INTO districts (id, name, slug, description, latitude, longitude, is_central, sort_order, meta_title, meta_description) VALUES
(1, 'Eyyübiye', 'eyyubiye', 'Şanlıurfa''nın tarihi merkezi. Balıklıgöl, Dergah ve tarihi çarşılar bu ilçede yer alır.', 37.1591, 38.7969, true, 1, 'Eyyübiye Rehberi | Mekanlar, Eczaneler, Hastaneler ve Yaşam', 'Eyyübiye ilçesindeki mekanlar, eczaneler, okullar ve yaşam rehberi.'),
(2, 'Haliliye', 'haliliye', 'Şanlıurfa''nın en kalabalık ilçesi. Modern yerleşim alanları ve ticaret merkezleri.', 37.1700, 38.8100, true, 2, 'Haliliye Rehberi | Mekanlar, Eczaneler ve Yaşam', NULL),
(3, 'Karaköprü', 'karakopru', 'Şanlıurfa''nın en hızlı büyüyen ilçesi. Yeni yerleşim alanları ve modern yaşam.', 37.1900, 38.7800, true, 3, 'Karaköprü Rehberi | Mekanlar, Eczaneler, Hastaneler ve Yaşam', NULL),
(4, 'Siverek', 'siverek', 'Şanlıurfa''nın en büyük ilçesi. Tarım ve hayvancılık merkezi.', 37.7552, 39.3171, false, 4, 'Siverek Rehberi', NULL),
(5, 'Viranşehir', 'viransehir', 'Tarihi İrem Bahçeleri ile ünlü ilçe.', 37.2355, 39.7633, false, 5, 'Viranşehir Rehberi', NULL),
(6, 'Suruç', 'suruc', 'Sınır ilçesi, tarihi ve kültürel zenginlikleriyle bilinir.', 36.9746, 38.4233, false, 6, 'Suruç Rehberi', NULL),
(7, 'Birecik', 'birecik', 'Kelaynak kuşları ve Fırat Nehri kıyısında tarihi ilçe.', 37.0230, 37.9769, false, 7, 'Birecik Rehberi', NULL),
(8, 'Akçakale', 'akcakale', 'Sınır ilçesi, tarım alanlarıyla ünlü.', 36.7107, 38.9490, false, 8, 'Akçakale Rehberi', NULL),
(9, 'Ceylanpınar', 'ceylanpinar', 'Devlet üretme çiftliği ve tarım merkezi.', 36.8445, 40.0475, false, 9, 'Ceylanpınar Rehberi', NULL),
(10, 'Hilvan', 'hilvan', 'Karacadağ eteklerinde şirin ilçe.', 37.5825, 38.9547, false, 10, 'Hilvan Rehberi', NULL),
(11, 'Bozova', 'bozova', 'Atatürk Barajı kıyısında ilçe.', 37.3700, 38.5200, false, 11, 'Bozova Rehberi', NULL),
(12, 'Halfeti', 'halfeti', 'Batık şehir Savaşan ve siyah güller. UNESCO Cittaslow şehri.', 37.2488, 37.8675, false, 12, 'Halfeti Rehberi | Batık Şehir, Siyah Güller ve Fırat Kenarı', 'Halfeti gezisi rehberi. Batık şehir Savaşan, siyah güller, tekne turu ve konaklama.'),
(13, 'Harran', 'harran', 'Dünyanın ilk üniversitesi ve kümbet evleriyle ünlü.', 36.8637, 39.0302, false, 13, 'Harran Rehberi | Kümbet Evleri, Harran Üniversitesi ve Tarih', 'Harran gezisi rehberi. Kümbet evleri, dünyanın ilk üniversitesi ve tarihi kalıntılar.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description, meta_title = EXCLUDED.meta_title;

-- ============================================
-- SEO LANDING PAGES
-- ============================================
INSERT INTO seo_pages (slug, title, meta_title, meta_description, heading, intro_text, category_filter, sort_by, limit_count) VALUES
('en-iyi-kebapcilar', 'En İyi Kebapçılar', 'Şanlıurfa En İyi Kebapçılar 2026 | Urfa Kebap Rehberi', 'Şanlıurfa''nın en iyi kebapçıları. Fiyatlar, yorumlar ve adreslerle güncel 2026 kebap rehberi.', 'Şanlıurfa''nın En İyi Kebapçıları', 'Ciğer kebabından Urfa kebabına, terbiyesiz tavuktan patlıcan kebabına Şanlıurfa''nın efsane kebapçıları. 2026 güncel fiyatları ve mekan bilgileriyle hazırladığımız rehber.', 'kebapcilar', 'rating', 20),
('en-iyi-cigerciler', 'En İyi Ciğerciler', 'Şanlıurfa En İyi Ciğerciler 2026 | Ciğer Kebabı Nerede Yenir', 'Şanlıurfa''da ciğer kebabı nerede yenir? En meşhur ciğerciler, fiyatlar ve adresleriyle rehber.', 'Şanlıurfa''nın En Meşhur Ciğercileri', 'Ciğer kebabı denince akla gelen ilk şehir Şanlıurfa. İşte en sevilen ciğer mekanları.', 'cigerciler', 'rating', 20),
('sanliurfa-kahvalti-mekanlari', 'Kahvaltı Mekanları', 'Şanlıurfa Kahvaltı Mekanları 2026 | En İyi Kahvaltı Nerede Yapılır', 'Şanlıurfa''nın en iyi kahvaltı mekanları. Serpme kahvaltı, tarihi hanlarda kahvaltı ve daha fazlası.', 'Şanlıurfa''nın En İyi Kahvaltı Mekanları', 'Tarihi hanlarda serpme kahvaltıdan modern mekanlara, Şanlıurfa''da kahvaltı keyfi.', 'kahvalti-mekanlari', 'rating', 20),
('sanliurfa-sira-gecesi-mekanlari', 'Sıra Gecesi Mekanları', 'Şanlıurfa Sıra Gecesi Mekanları | Geleneksel Sıra Gecesi Nerede Yapılır', 'Şanlıurfa''da sıra gecesi yapabileceğiniz en iyi mekanlar ve geleneksel müzik mekanları.', 'Sıra Gecesi Mekanları', 'Urfa sıra geceleri, yüzyıllardır süregelen bir geleneğin modern yansıması.', 'yoresel-yemekler', 'rating', 20),
('sanliurfa-gece-acik-mekanlar', 'Gece Açık Mekanlar', 'Şanlıurfa Gece Açık Mekanlar | Geç Saatlere Kadar Açık', 'Şanlıurfa''da gece geç saatlere kadar açık olan mekanlar.', 'Gece Açık Mekanlar', NULL, 'gece-acik-mekanlar', 'rating', 20),
('sanliurfada-ne-yenir', 'Şanlıurfa''da Ne Yenir', 'Şanlıurfa''da Ne Yenir? | 2026 Lezzet Rehberi', 'Şanlıurfa''da mutlaka yenmesi gereken lezzetler. Ciğer, kebap, çiğ köfte, lahmacun ve daha fazlası.', 'Şanlıurfa''da Ne Yenir? Tam Rehber', 'Medeniyetlerin beşiği Şanlıurfa, aynı zamanda gastronomi başkenti. İşte denemeniz gereken lezzetler.', NULL, 'rating', 30),
('bugun-sanliurfada-ne-yapilir', 'Bugün Ne Yapılır', 'Bugün Şanlıurfa''da Ne Yapılır? | Günlük Rehber', 'Şanlıurfa''da bugün yapılacak aktiviteler, etkinlikler ve gezilecek yerler.', 'Bugün Şanlıurfa''da Ne Yapılır?', NULL, NULL, 'newest', 20)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description;
