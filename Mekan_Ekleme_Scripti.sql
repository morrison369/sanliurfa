-- Şanlıurfa.com Örnek Mekan Verileri
-- Bu SQL'i çalıştırarak 20 örnek mekan ekleyebilirsiniz

-- Önce kategorileri ekle
INSERT INTO categories (id, name, slug, description, icon) VALUES
(1, 'Restoran', 'restoran', 'Şanlıurfa\'nın en iyi restoranları', 'restaurant'),
(2, 'Cafe', 'cafe', 'Kahve molaları için ideal mekanlar', 'coffee'),
(3, 'Otel', 'otel', 'Konaklama seçenekleri', 'hotel'),
(4, 'Tarihi Yer', 'tarihi-yer', 'Şanlıurfa\'nın tarihi hazineleri', 'landmark');

-- Restoranlar
INSERT INTO places (id, name, slug, category_id, description, address, phone, email, website, latitude, longitude, rating, price_range, features, status, created_at) VALUES
(1, 'Civan Lahmacun', 'civan-lahmacun', 1, 'Eyyübiye semtinde 25 yıllık bir lahmacun efsanesi. Odun fırınında pişen incecik hamur ve özel kıymalı harcı ile meşhur. Yanında ayran ve salata ile servis edilir.', 'Eyyübiye, Atatürk Bulvarı No:45', '+90 414 123 45 67', 'info@civanlahmacun.com', 'https://civanlahmacun.com', 37.1592, 38.7964, 4.7, '₺', '["wifi", "otopark", "paket_servis", "acik_mutfak"]', 'active', NOW()),

(2, 'Kervan Kebap', 'kervan-kebap', 1, 'Ciğer kebabının adresi. Güneydoğu mutfağının en özel lezzetlerini sunan Kervan, geleneksel yöntemlerle hazırlanan kebaplarıyla ünlü. Özellikle kuzu şiş ve ciğer tavsiye edilir.', 'Haliliye, Cumhuriyet Caddesi No:120', '+90 414 234 56 78', NULL, NULL, 37.1615, 38.7892, 4.5, '₺₺', '["wifi", "otopark", "rezervasyon", "aile"]', 'active', NOW()),

(3, 'Zahter Cafe & Restaurant', 'zahter-cafe', 1, 'Modern tasarımı ve geleneksel lezzetleri bir araya getiren Zahter, kahvaltıdan akşam yemeğine kadar hizmet veriyor. Serpme kahvaltısı ve öğle menüleri çok popüler.', 'Karaköprü, GAP Bulvarı No:88', '+90 414 345 67 89', 'zahter@example.com', NULL, 37.1834, 38.8123, 4.3, '₺₺', '["wifi", "otopark", "teras", "engelli_erisim"]', 'active', NOW()),

(4, 'Hanımın Mutfağı', 'hanimin-mutfagi', 1, 'Ev yemekleri arayanlar için ideal. Günlük değişen menüsüyle taze ve lezzetli yemekler sunan bu mekan, özellikle öğle yemekleri için tercih ediliyor.', 'Merkez, Sarayönü Caddesi No:34', '+90 414 456 78 90', NULL, NULL, 37.1589, 38.7923, 4.4, '₺', '["paket_servis", "hizli_servis"]', 'active', NOW()),

(5, 'Balıklıgöl Lokantası', 'balikligol-lokantasi', 1, 'Balıklıgöl manzaralı bu restoran, geleneksel Şanlıurfa mutfağının en seçkin örneklerini sunar. Göl kenarında yemek yeme keyfi için biçilmiş kaftan.', 'Balıklıgöl, Dergah Caddesi No:12', '+90 414 567 89 01', 'info@balikligollokantasi.com', 'https://balikligollokantasi.com', 37.1489, 38.7891, 4.6, '₺₺₺', '["wifi", "manzara", "rezervasyon", "aile"]', 'active', NOW()),

(6, 'Ciğerci Ahmet', 'cigerci-ahmet', 1, 'Sadece ciğer üzerine uzmanlaşmış bu küçük mekan, Şanlıurfa\'nın en iyi ciğerini sunar. Taze ve özel baharatlarla marine edilmiş ciğer mutlaka denenmeli.', 'Eyyübiye, Çiğerciler Sokağı No:3', '+90 414 678 90 12', NULL, NULL, 37.1601, 38.7945, 4.8, '₺', '["paket_servis", "hizli_servis"]', 'active', NOW()),

(7, 'Şanlıurfa Sofrası', 'sanliurfa-sofrasi', 1, 'Serpme kahvaltısı ile meşhur olan bu mekan, aynı zamanda akşam yemekleri için de geniş bir menü sunuyor. Geleneksel dekorasyonu ile nostaljik bir atmosfer.', 'Haliliye, Paşabağı Caddesi No:56', '+90 414 789 01 23', NULL, NULL, 37.1623, 38.7889, 4.2, '₺₺', '["wifi", "otopark", "aile", "kahvalti"]', 'active', NOW()),

(8, 'Güneydoğu Lezzetleri', 'guneydogu-lezzetleri', 1, 'Antep ve Şanlıurfa mutfağının birleşimi. Baklavası ve kebapları ile tanınan bu restoran, özel günler için ideal.', 'Karaköprü, Yenişehir Bulvarı No:77', '+90 414 890 12 34', 'info@gdnlezzetleri.com', NULL, 37.1856, 38.8156, 4.5, '₺₺', '["wifi", "otopark", "rezervasyon", "teras"]', 'active', NOW());

-- Kafeler
INSERT INTO places (id, name, slug, category_id, description, address, phone, email, website, latitude, longitude, rating, price_range, features, status, created_at) VALUES
(9, 'Gümrük Hanı Cafe', 'gumruk-hani-cafe', 2, 'Tarihi Gümrük Hanı içinde yer alan bu kafe, 500 yıllık tarihi atmosferde kahve keyfi sunar. Nargile ve Türk kahvesi ile birlikte tadılmalı.', 'Merkez, Gümrük Hanı No:4', '+90 414 901 23 45', NULL, NULL, 37.1598, 38.7912, 4.6, '₺', '["wifi", "tarihi_mekan", "nargile"]', 'active', NOW()),

(10, 'Balkon Cafe', 'balkon-cafe', 2, 'Balıklıgöl manzaralı terası ile huzurlu bir ortam sunar. Kitap okumak veya arkadaşlarla sohbet etmek için ideal.', 'Balıklıgöl, Göl Kenarı No:23', '+90 414 012 34 56', 'balkoncafe@example.com', NULL, 37.1492, 38.7895, 4.4, '₺', '["wifi", "manzara", "sakin"]', 'active', NOW()),

(11, 'Kitap Kafe', 'kitap-kafe', 2, 'Kitap rafları, rahat koltukları ve sessiz ortamıyla çalışmak veya okumak için mükemmel. Board game akşamları da düzenleniyor.', 'Haliliye, Kütüphane Caddesi No:67', '+90 414 123 45 68', NULL, NULL, 37.1634, 38.7934, 4.7, '₺', '["wifi", "kitap", "board_game", "laptop_dostu"]', 'active', NOW()),

(12, 'Work Coffee', 'work-coffee', 2, 'Freelancer ve uzaktan çalışanlar için tasarlanmış. Hızlı wifi, prizler ve sessiz çalışma alanları mevcut.', 'Eyyübiye, İş Merkezi No:89', '+90 414 234 56 79', 'work@coffee.com', 'https://workcoffee.com', 37.1612, 38.7978, 4.3, '₺₺', '["wifi", "laptop_dostu", "toplanti_odasi"]', 'active', NOW()),

(13, 'Tarihi Çarşı Kahvesi', 'tarihi-carsi-kahvesi', 2, 'Telvesi meşhur olan bu eski kahvehane, Şanlıurfa\'nın otantik atmosferini yaşamak isteyenler için. Tavla ve dama keyfi.', 'Merkez, Kınacı Bedesteni No:12', '+90 414 345 67 90', NULL, NULL, 37.1587, 38.7921, 4.5, '₺', '["tarihi_mekan", "tavla", "geleneksel"]', 'active', NOW()),

(14, 'Rooftop Cafe', 'rooftop-cafe', 2, 'Şehir manzaralı çatı katı kafe. Gün batımında kahve içmek için en iyi adres. Akşamları canlı müzik oluyor.', 'Karaköprü, Plaza No:45 Kat:5', '+90 414 456 78 91', NULL, NULL, 37.1845, 38.8145, 4.4, '₺₺', '["wifi", "manzara", "canli_muzik", "teras"]', 'active', NOW());

-- Oteller
INSERT INTO places (id, name, slug, category_id, description, address, phone, email, website, latitude, longitude, rating, price_range, features, status, created_at) VALUES
(15, 'Hilton Garden Inn Şanlıurfa', 'hilton-garden-inn', 3, '4 yıldızlı modern otel. Havuz, spa ve fitness merkezi mevcut. İş seyahatleri ve aile tatilleri için ideal.', 'Eyyübiye, Otel Caddesi No:1', '+90 414 567 89 02', 'sUrfa@hilton.com', 'https://hilton.com/sanliurfa', 37.1623, 38.7956, 4.6, '₺₺₺', '["havuz", "spa", "fitness", "wifi", "otopark"]', 'active', NOW()),

(16, 'Manzara Otel', 'manzara-otel', 3, 'Butik otel konseptiyle hizmet veren Manzara, Balıklıgöl manzaralı odalarıyla romantik bir kaçamak için mükemmel.', 'Balıklıgöl, Göl Yakası No:34', '+90 414 678 90 13', 'info@manzaraotel.com', 'https://manzaraotel.com', 37.1495, 38.7898, 4.5, '₺₺', '["manzara", "butik", "wifi", "kahvalti"]', 'active', NOW()),

(17, 'Şanlıurfa Palace', 'sanliurfa-palace', 3, 'Lüks konaklama arayanlar için. Spa merkezi, kapalı havuz ve şehrin en iyi restoranına sahip.', 'Haliliye, Lüks Caddesi No:56', '+90 414 789 01 24', 'info@sanliurfapalace.com', 'https://sanliurfapalace.com', 37.1656, 38.7923, 4.8, '₺₺₺₺', '["spa", "havuz", "restoran", "wifi", "otopark", "concierge"]', 'active', NOW()),

(18, 'Boutique Han Otel', 'boutique-han-otel', 3, 'Tarihi bir han restore edilerek butik otele dönüştürülmüş. Orijinal taş duvarlar ve avlusu ile eşsiz bir deneyim.', 'Merkez, Tarihi Han No:8', '+90 414 890 12 35', 'info@boutiquehan.com', 'https://boutiquehan.com', 37.1599, 38.7915, 4.7, '₺₺', '["tarihi_mekan", "butik", "wifi", "avlu"]', 'active', NOW());

-- Tarihi Yerler
INSERT INTO places (id, name, slug, category_id, description, address, phone, email, website, latitude, longitude, rating, price_range, features, status, created_at) VALUES
(19, 'Göbeklitepe', 'gobeklitepe', 4, 'Dünyanın bilinen en eski tapınak kompleksi. MÖ 9600 yıllarına tarihlenen bu arkeolojik site, insanlık tarihini yeniden yazdı. UNESCO Dünya Mirası Listesi\'nde.', 'Örencik Köyü, Haliliye', '+90 414 318 88 80', 'gobeklitepe@kultur.gov.tr', 'https://gobeklitepe.gov.tr', 37.2231, 38.9223, 5.0, '₺', '["unesco", "arkeoloji", "rehber", "engelli_erisim"]', 'active', NOW()),

(20, 'Balıklıgöl', 'balikligol', 4, 'Hz. İbrahim\'in ateşe atıldığı rivayet edilen göl. İçindeki kutsal balıklar dokunulmaz sayılır. Şanlıurfa\'nın en önemli sembollerinden biri.', 'Merkez, Balıklıgöl Caddesi', NULL, NULL, NULL, 37.1490, 38.7890, 4.9, 'Ücretsiz', '["tarihi", "dini", "park", "hazir_cami"]', 'active', NOW());

-- Örnek yorumlar ekle
INSERT INTO reviews (id, place_id, user_id, rating, content, status, created_at) VALUES
(1, 1, 'demo-user-1', 5, 'Şehrin en iyi lahmacunu! Hamur incecik, malzeme taze. Mutlaka deneyin.', 'approved', NOW()),
(2, 1, 'demo-user-2', 5, '25 yıldır aynı kalite. Tebrikler Civan Usta!', 'approved', NOW()),
(3, 19, 'demo-user-3', 5, 'İnsanlık tarihinin başlangıcı. Rehberli tur almanızı tavsiye ederim.', 'approved', NOW()),
(4, 6, 'demo-user-4', 5, 'Ciğerin böylesi! Sadece ciğer yiyorsunuz ama efsane oluyor.', 'approved', NOW());

-- Blog yazıları için örnek kategoriler
INSERT INTO blog_categories (id, name, slug, description) VALUES
(1, 'Yöresel Lezzetler', 'yoresel-lezzetler', 'Şanlıurfa mutfağının eşsiz tatları'),
(2, 'Gezi Rehberi', 'gezi-rehberi', 'Şanlıurfa\'da gezilecek yerler'),
(3, 'Tarih ve Kültür', 'tarih-kultur', 'Şanlıurfa\'nın zengin tarihi'),
(4, 'Mekan İncelemeleri', 'mekan-incelemeleri', 'Restoran ve kafe değerlendirmeleri');

SELECT '20 örnek mekan başarıyla eklendi!' as result;
