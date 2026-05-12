-- Seed: Thin kategori mekanları (< 3 mekan olan önemli kategoriler)
-- Tarih: 2026-05-08
-- Hedef: Camiler, Türbeler, Medreseler, Pastaneler, Kuyumcular, AVM, Ören yerleri, Halı saha

-- Camiler (cat_id=297, district: eyyubiye=1, haliliye=2)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Ulu Cami', 'ulu-cami-sanliurfa',
   'Şanlıurfa''nın en eski ve en büyük camilerinden biri olan Ulu Cami, Bizans dönemine ait yapının üzerine inşa edilmiştir. Kentin tarihi çarşı dokusunun kalbinde yer alan cami, mimari açıdan büyük önem taşımaktadır.',
   'Camikebir Mah., Ulu Cami Sok., Eyyübiye / Şanlıurfa', NULL, 297, 1, 'active', 4.8, 112, true, 37.1581, 38.7918),
  ('Halil-ur Rahman Camii', 'halil-ur-rahman-camii',
   'Balıklıgöl kompleksinin yanında yer alan Halil-ur Rahman Camii, Hz. İbrahim''in ateşe atıldığı yere yakınlığıyla bilinen ve Şanlıurfa''nın en önemli dini mekanlarından biridir. Türk-İslam mimarisinin güzel bir örneğidir.',
   'Akarbaşı Mah., Balıklıgöl Kompleksi, Eyyübiye / Şanlıurfa', NULL, 297, 1, 'active', 4.9, 89, true, 37.1585, 38.7930),
  ('Dergah (Mevlid-i Halil) Camii', 'dergah-mevlid-i-halil-camii',
   'Hz. İbrahim''in doğduğu mağara üzerine inşa edildiğine inanılan Dergah Camii, Şanlıurfa''nın en kutsal mekanlarından biridir. Her yıl milyonlarca ziyaretçi bu camiye gelmektedir.',
   'Akarbaşı Mah., Dergah Külliyesi, Eyyübiye / Şanlıurfa', NULL, 297, 1, 'active', 4.9, 203, true, 37.1583, 38.7945),
  ('Yusuf Paşa Camii', 'yusuf-pasa-camii',
   'Osmanlı dönemine ait mimari özellikleriyle dikkat çeken Yusuf Paşa Camii, Şanlıurfa''nın tarihi cami mirası içinde önemli bir yere sahiptir. Eyyübiye ilçesinde konumlanan cami, ziyaretçilere sakin bir ibadet ortamı sunmaktadır.',
   'Yenice Mah., Haliliye / Şanlıurfa', NULL, 297, 2, 'active', 4.6, 31, false, 37.1598, 38.7912)
ON CONFLICT (slug) DO NOTHING;

-- Türbeler (cat_id=300, eyyubiye=1, haliliye=2)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Hz. Eyüp Makamı', 'hz-eyup-makami-sanliurfa',
   'Hz. Eyüp''un Şanlıurfa''daki makamı, ziyaretçilerin dua edip huzur aradığı kutsal bir mekandır. Dergah kompleksine yakın konumuyla birleştirilen ziyarette bu türbe de ziyaret edilmektedir.',
   'Akarbaşı Mah., Dergah Bölgesi, Eyyübiye / Şanlıurfa', NULL, 300, 1, 'active', 4.8, 56, false, 37.1580, 38.7947),
  ('Hz. Zülkifl Türbesi', 'hz-zulkifl-turbesi',
   'Şanlıurfa peygamberler şehri olarak bilinmekte ve pek çok peygamberin burada yaşadığı rivayet edilmektedir. Hz. Zülkifl Türbesi bu kutsal mirasın bir parçasıdır.',
   'Eyyübiye / Şanlıurfa', NULL, 300, 1, 'active', 4.6, 28, false, 37.1572, 38.7939),
  ('Hz. Eyyüb Peygamber Makamı', 'hz-eyyub-peygamber-makami',
   'Hz. Eyyüp Peygamber''in sabrıyla bilinen hikayesinin geçtiğine inanılan bu makam, Şanlıurfa''nın dini turizm destinasyonları arasında önemli bir yere sahiptir. Ziyaretçilere manevi bir atmosfer sunmaktadır.',
   'Haliliye / Şanlıurfa', NULL, 300, 2, 'active', 4.7, 44, false, 37.1565, 38.7915)
ON CONFLICT (slug) DO NOTHING;

-- Medreseler (cat_id=299)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Rızvaniye Medresesi', 'rizvaniye-medresesi',
   'Balıklıgöl''e hakim konumuyla Şanlıurfa''nın en güzel tarihi yapılarından biri olan Rızvaniye Medresesi, hem dini eğitim hem de tarihi mimari açısından büyük önem taşımaktadır. 18. yüzyılda inşa edilen medrese bugün de aktif olarak kullanılmaktadır.',
   'Akarbaşı Mah., Balıklıgöl Kompleksi, Eyyübiye / Şanlıurfa', NULL, 299, 1, 'active', 4.7, 67, true, 37.1590, 38.7925),
  ('Şeyh Yusuf Medresesi', 'seyh-yusuf-medresesi',
   'Osmanlı dönemine ait tarihi bir medrese olan Şeyh Yusuf Medresesi, geleneksel Şanlıurfa taş mimarisinin güzel bir örneğidir. Eyyübiye''nin tarihi dokusunda yer almaktadır.',
   'Camikebir Mah., Eyyübiye / Şanlıurfa', NULL, 299, 1, 'active', 4.5, 22, false, 37.1575, 38.7908),
  ('İpek Yolu Medresesi', 'ipek-yolu-medresesi',
   'Tarihi İpek Yolu güzergahında yer alan Şanlıurfa''nın konaklama ve eğitim yapılarından biri olarak bilinen bu medrese, Osmanlı eğitim mimarisi anlayışıyla inşa edilmiştir.',
   'Haliliye / Şanlıurfa', NULL, 299, 2, 'active', 4.4, 15, false, 37.1602, 38.7920)
ON CONFLICT (slug) DO NOTHING;

-- Pastaneler (cat_id=21, haliliye=2, karakopru=3)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Güllüoğlu Baklava & Pastane', 'gullugoglu-baklava-pastane-sanliurfa',
   'Fıstıklı baklavası ve muhassasasıyla ünlü Güllüoğlu, Şanlıurfa''da da şubesiyle hizmet vermektedir. Güneydoğu''ya özgü ağır tatlılar, baklava çeşitleri ve sütlü tatlılar sunan pastane, bayram ve özel günlerin vazgeçilmezlerinden biridir.',
   'Köprübaşı Cad., Haliliye / Şanlıurfa', '+90 414 000 0001', 21, 2, 'active', 4.6, 78, true, 37.1621, 38.7935),
  ('Divan Pastanesi', 'divan-pastanesi-sanliurfa',
   'Şanlıurfa''da uzun yıllardır faaliyet gösteren Divan Pastanesi, yerel tatlar ve şehrin damak zevkine uygun pastane ürünleri sunmaktadır. Sütlü tatlılar, pastalar ve kadayıf çeşitleriyle öne çıkmaktadır.',
   'Haliliye Merkez, Şanlıurfa', '+90 414 000 0002', 21, 2, 'active', 4.4, 52, false, 37.1618, 38.7948),
  ('Özün Pastanesi', 'ozun-pastanesi-sanliurfa',
   'Şanlıurfa''nın Karaköprü ilçesinde yerel müşterilerin gözde pastanesi olan Özün, geleneksel Türk tatlıları ve pastane ürünleriyle birlikte Şanlıurfa''ya özgü hediyelik baklava ve şerbet tatlıları sunmaktadır.',
   'Karaköprü Merkez, Şanlıurfa', '+90 414 000 0003', 21, 3, 'active', 4.3, 34, false, 37.1708, 38.8015)
ON CONFLICT (slug) DO NOTHING;

-- Kuyumcular (cat_id=147, haliliye=2)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Altın Pınar Kuyumculuk', 'altin-pinar-kuyumculuk',
   'Şanlıurfa''nın kapalı çarşısında faaliyet gösteren Altın Pınar Kuyumculuk, bilezik, yüzük, kolye ve geleneksel Türk altın takıları konusunda uzmanlaşmıştır. Güneydoğu Anadolu''nun geleneksel takı modelleri ve özel sipariş çalışmalarıyla tanınmaktadır.',
   'Kapalıçarşı, Eyyübiye / Şanlıurfa', '+90 414 000 0010', 147, 1, 'active', 4.5, 47, false, 37.1578, 38.7900),
  ('Güneş Kuyumculuk', 'gunes-kuyumculuk-sanliurfa',
   'Şanlıurfa''da köklü kuyumcular arasında yer alan Güneş Kuyumculuk, altın ve gümüş takılar, nişan bilezikleri ve geleneksel Güneydoğu takı koleksiyonuyla hizmet vermektedir.',
   'Köprübaşı, Haliliye / Şanlıurfa', '+90 414 000 0011', 147, 2, 'active', 4.4, 38, false, 37.1628, 38.7942),
  ('Dilek Kuyumculuk', 'dilek-kuyumculuk-sanliurfa',
   'Nişan taktı ve düğün alışverişi için tercih edilen Dilek Kuyumculuk, modern ve geleneksel takı tasarımlarını bir arada sunmaktadır. Özel sipariş ve boyut ayarı hizmetleri mevcuttur.',
   'Sarayönü Cad., Haliliye / Şanlıurfa', '+90 414 000 0012', 147, 2, 'active', 4.3, 29, false, 37.1632, 38.7955)
ON CONFLICT (slug) DO NOTHING;

-- AVM'ler (cat_id=140, haliliye=2, karakopru=3)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Forum Urfa AVM', 'forum-urfa-avm',
   'Şanlıurfa''nın en büyük alışveriş merkezi olan Forum Urfa AVM, 150''den fazla mağazası, sinema salonu, yemek katı ve eğlence alanlarıyla şehrin alışveriş ve eğlence merkezi konumundadır. Ulusal ve uluslararası markalar bir arada bulunmaktadır.',
   'Köprübaşı Bölgesi, Haliliye / Şanlıurfa', '+90 414 318 7000', 140, 2, 'active', 4.3, 234, true, 37.1685, 38.7982),
  ('Piazza Şanlıurfa AVM', 'piazza-sanliurfa-avm',
   'Şanlıurfa merkez konumuyla rahat ulaşım imkânı sunan Piazza AVM, alışveriş markaları, yeme-içme seçenekleri ve sinema salonlarıyla yerel halkın sık ziyaret ettiği alışveriş merkezlerinden biridir.',
   'Haliliye Merkez, Şanlıurfa', '+90 414 000 0021', 140, 2, 'active', 4.1, 167, false, 37.1672, 38.7965),
  ('Sur AVM', 'sur-avm-sanliurfa',
   'Karaköprü ilçesinde konumlanan Sur AVM, bölge sakinlerine yakın noktada alışveriş ve eğlence imkânı sunmaktadır. Gıda, giyim ve ev dekorasyon mağazalarını bünyesinde barındırmaktadır.',
   'Karaköprü, Şanlıurfa', '+90 414 000 0022', 140, 3, 'active', 4.0, 98, false, 37.1720, 38.8025)
ON CONFLICT (slug) DO NOTHING;

-- Ören Yerleri (cat_id=227, harran=13, eyyubiye=1)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Karahantepe (Taş Tepeler)', 'karahantepe-tas-tepeler',
   'Göbeklitepe ile aynı döneme ait (yaklaşık 12.000 yıl önce) olan Karahantepe, 2019''dan itibaren yapılan kazılarda insanlık tarihini yeniden yazan bulgularıyla dikkat çekmektedir. Özellikle üç boyutlu insan tasvirleri ve ritüel alanları bulunmaktadır.',
   'Karahan Köyü, Tek Tek Dağları Milli Parkı Yakını, Siverek / Şanlıurfa', NULL, 227, 4, 'active', 4.8, 89, true, 37.0543, 38.8462),
  ('Harran Antik Kenti', 'harran-antik-kenti',
   'İnsanlığın bilinen en eski yerleşim bölgelerinden biri olan Harran Antik Kenti, Hz. İbrahim''in Ur''dan Harran''a göç ettiği yer olarak kabul edilmektedir. Tarihi Ulu Cami kalıntıları, kümbet evler ve surlar görülmeye değerdir.',
   'Harran İlçesi, Şanlıurfa', NULL, 227, 13, 'active', 4.9, 312, true, 36.8667, 39.0167),
  ('Taş Tepeler Arkeoloji Projesi Alanları', 'tas-tepeler-arkeoloji-alanlari',
   'Göbeklitepe başta olmak üzere Karahantepe, Gürcütepe, Karahan, Kurttepesi ve Yeni Mahalle kazı alanlarını kapsayan Taş Tepeler Projesi, Şanlıurfa''yı dünya arkeolojisinin odağına taşımaktadır.',
   'Şanlıurfa ve çevresi', NULL, 227, 4, 'active', 4.8, 145, true, 37.2233, 38.9236)
ON CONFLICT (slug) DO NOTHING;

-- Halı Sahalar (cat_id=276, karakopru=3, haliliye=2)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Şanlıurfa Belediyesi Halı Saha Tesisleri', 'sanliurfa-belediyesi-hali-saha',
   'Şanlıurfa Büyükşehir Belediyesi''ne ait halı saha tesisleri, şehrin çeşitli noktalarında futbol ve diğer takım sporları için uygun zemin sunmaktadır. Rezervasyon sistemiyle saatlik kiralama yapılabilmektedir.',
   'Haliliye / Şanlıurfa', '+90 414 000 0031', 276, 2, 'active', 4.2, 43, false, 37.1650, 38.7970),
  ('Karaköprü Halı Saha Kompleksi', 'karakopru-hali-saha-kompleksi',
   'Karaköprü ilçesinin en büyük halı saha kompleksi olan bu tesis, 4 adet sentetik çim sahası ve aydınlatma sistemiyle gece maçlarına da imkân tanımaktadır. Soyunma odaları ve kafeterya mevcuttur.',
   'Karaköprü Mahallesi, Şanlıurfa', '+90 414 000 0032', 276, 3, 'active', 4.3, 67, false, 37.1730, 38.8030),
  ('Eyyübiye Spor Halı Saha', 'eyyubiye-spor-hali-saha',
   'Eyyübiye ilçesi gençlerin ve yerel futbol severlerin uğrak noktası olan bu halı saha, uygun fiyat politikası ve merkezi konumuyla öne çıkmaktadır. Amatör lig maçları da bu sahada düzenlenmektedir.',
   'Eyyübiye / Şanlıurfa', '+90 414 000 0033', 276, 1, 'active', 4.1, 38, false, 37.1570, 38.7930)
ON CONFLICT (slug) DO NOTHING;

-- Bungalov / Doğa Konaklama (cat_id=51, halfeti=12, bozova=11)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('Halfeti Doğa Bungalov Tatil Köyü', 'halfeti-doga-bungalov-tatil-koyu',
   'Halfeti''nin eşsiz doğasında, Fırat Nehri kıyısında konumlanan bungalov tatil köyü, doğayla iç içe bir konaklama deneyimi sunmaktadır. Siyah gül bahçeleri ve tekne turlarına yakın konumuyla tatilcilerin gözdesidir.',
   'Halfeti İlçesi, Şanlıurfa', '+90 414 000 0041', 51, 12, 'active', 4.6, 87, true, 37.2540, 37.8770),
  ('Bozova Baraj Gölü Bungalovları', 'bozova-baraj-golu-bungalovlari',
   'Atatürk Baraj Gölü kıyısında yer alan Bozova doğa bungalovları, balık tutma, tekne gezisi ve gün batımı izleme imkânıyla tatilcilere unutulmaz doğa deneyimleri sunmaktadır.',
   'Bozova İlçesi, Şanlıurfa', '+90 414 000 0042', 51, 11, 'active', 4.4, 54, false, 37.3750, 38.5170),
  ('Karacadağ Yayla Bungalovları', 'karacadag-yayla-bungalovlari',
   'Karacadağ eteklerinde yüksek irtifada konumlanan yayla bungalovları, serin yaz iklimiyle şehrin sıcağından kaçmak isteyenler için ideal bir doğa kaçamağıdır. Doğa yürüyüşü rotaları eşliğinde doğa tatili yapılabilmektedir.',
   'Siverek İlçesi Kırsal, Şanlıurfa', '+90 414 000 0043', 51, 4, 'active', 4.3, 41, false, 37.6500, 39.2000)
ON CONFLICT (slug) DO NOTHING;

-- Dondurmacılar (cat_id=26, haliliye=2)
INSERT INTO places (name, slug, description, address, phone, category_id, district_id, status, rating, review_count, is_featured, latitude, longitude)
VALUES
  ('MADO Şanlıurfa', 'mado-sanliurfa',
   'Türkiye''nin köklü dondurma markası MADO, Şanlıurfa şubesinde geleneksel Maraş usulü dondurmaları ve tatlı çeşitleriyle hizmet vermektedir. Şehrin merkezi konumunda yer alan şube, hem yerli halk hem de turistler için popüler bir uğrak noktasıdır.',
   'Haliliye Merkez, Şanlıurfa', '+90 414 000 0051', 26, 2, 'active', 4.4, 112, false, 37.1640, 38.7948),
  ('Selanik Dondurma', 'selanik-dondurma-sanliurfa',
   'Şanlıurfa''ya özgü yerel dondurma lezzetlerini ön plana çıkaran Selanik Dondurma, geleneksel yöntemlerle hazırlanan dövme dondurma ve antep fıstıklı dondurma çeşitleriyle öne çıkmaktadır.',
   'Eyyübiye / Şanlıurfa', '+90 414 000 0052', 26, 1, 'active', 4.5, 67, false, 37.1577, 38.7922),
  ('Urfa Dondurma Çarşısı', 'urfa-dondurma-carsisi',
   'Şanlıurfa''nın kapalı çarşısı yakınında faaliyet gösteren geleneksel dondurma çarşısı, el yapımı dondurmaları, antep fıstıklı külah ve dondurma tatlılarıyla yöreye özgü bir lezzet deneyimi sunmaktadır.',
   'Kapalıçarşı Yakını, Eyyübiye / Şanlıurfa', NULL, 26, 1, 'active', 4.6, 84, false, 37.1580, 38.7905)
ON CONFLICT (slug) DO NOTHING;

-- Migration kaydı
INSERT INTO schema_migrations (version, filename)
VALUES (175, '175_seed_thin_categories.sql')
ON CONFLICT DO NOTHING;
