-- Yeme-İçme + Konaklama Mekanları + Karahantepe Yorumları

-- ===== 1. YEME-İÇME MEKANLARI =====

-- Ciğerciler (category_id=4)
INSERT INTO places (id, name, slug, description, short_description, meta_description, category, category_id, address, latitude, longitude, phone, status, image_url, thumbnail_url, avg_rating, review_count, rating_count, is_featured, is_verified, view_count, created_at, updated_at) VALUES
(gen_random_uuid(), 'Meşhur Hacı Ekber Ciğercisi', 'meshur-haci-ekber-cigercisi',
'Şanlıurfa''nın en köklü ciğer ustalarından. Tandır ciğeri ve kebap çeşitleri için sabahın erken saatlerinden itibaren kuyruk oluşur. 50 yıllık geleneksel tarif, odun ateşinde pişirme.',
'Şanlıurfa''nın en köklü tandır ciğeri ustası. 50 yıllık tarif, sabah erken açılır.',
'Şanlıurfa Meşhur Hacı Ekber Ciğercisi — tandır ciğer, kebap, yöresel lezzetler.',
'yeme', 4, 'Kapalı Çarşı Yakını, Eyyübiye, Şanlıurfa', 37.1579, 38.7963, '+90 414 215 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.7, 0, 0, true, false, 0, NOW(), NOW()),

(gen_random_uuid(), 'Ciğerci Mehmet Usta', 'cigerci-mehmet-usta',
'Harran yakınlarında gezginlerin uğrak noktası. Taze iç yağda pişirilen ciğer parçaları, isot ekmeği ve soğan ile servis edilir.',
'Harran yolu üzerinde, taze iç yağda pişen ciğer parçaları. Sade ama mükemmel.',
'Şanlıurfa Ciğerci Mehmet Usta — tandır ciğer ve yöresel lezzetler.',
'yeme', 4, 'Harran Caddesi, Eyyübiye, Şanlıurfa', 37.1545, 38.8041, '+90 414 313 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.5, 0, 0, false, false, 0, NOW(), NOW()),

-- Kebapçılar (category_id=3)
(gen_random_uuid(), 'Güneydoğu Kebap Salonu', 'guneydogu-kebap-salonu',
'Urfa kebabının yanı sıra Adıyaman ciğer köfte ve Gaziantep sarma baklava ile öne çıkan mekan. Aile ortamında geniş salon, özel oda imkânı.',
'Urfa kebabı, ciğer köfte ve sarma baklava. Geniş aile salonu, özel oda.',
'Şanlıurfa Güneydoğu Kebap Salonu — Urfa kebabı ve yöresel lezzetler.',
'yeme', 3, 'Devlet Hastanesi Karşısı, Haliliye, Şanlıurfa', 37.1625, 38.7890, '+90 414 217 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.4, 0, 0, false, false, 0, NOW(), NOW()),

(gen_random_uuid(), 'Urfa Sofrası Mangal & Kebap', 'urfa-sofrasi-mangal-kebap',
'Açık mangal sisteminde pişirilen çeşit Urfa kebapları. Sebzeli, kaşarlı ve klasik Urfa kebabı. Balıklıgöl''e 5 dakika yürüme mesafesinde.',
'Açık mangal Urfa kebabı — sebzeli, kaşarlı ve klasik çeşitler. Balıklıgöl yakını.',
'Şanlıurfa Urfa Sofrası — mangal kebap, Balıklıgöl yakını.',
'yeme', 3, 'Balıklıgöl Caddesi, Eyyübiye, Şanlıurfa', 37.1576, 38.7981, '+90 414 312 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.6, 0, 0, false, false, 0, NOW(), NOW()),

-- Kahvaltı mekanları (category_id=13)
(gen_random_uuid(), 'Balıklıgöl Kahvaltı Bahçesi', 'balikligol-kahvalti-bahcesi',
'Balıklıgöl''ün panoramik manzarasına karşı açık hava kahvaltı bahçesi. Yöresel kaymak, bal, tereyağı, kavut ve taze tandır ekmeği. Haftasonları yoğun; rezervasyon önerilir.',
'Balıklıgöl manzarasında açık hava kahvaltı — kaymak, bal, kavut, tandır ekmeği.',
'Şanlıurfa Balıklıgöl Kahvaltı Bahçesi — manzaralı kahvaltı, yöresel lezzetler.',
'yeme', 13, 'Balıklıgöl Parkı Yanı, Eyyübiye, Şanlıurfa', 37.1580, 38.7948, '+90 414 311 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.8, 0, 0, true, false, 0, NOW(), NOW()),

(gen_random_uuid(), 'Harran Ovası Sabah Sofrası', 'harran-ovasi-sabah-sofrasi',
'Harran yolu üzerinde yolculara yönelik kapsamlı kahvaltı durağı. 40 çeşit kahvaltı tabağı, taze sıkılmış nar suyu ve mırra ikramı ile. Terasta Harran ovası manzarası.',
'Harran yolu üzerinde 40 çeşit kahvaltı, nar suyu, mırra. Ova manzarası.',
'Şanlıurfa Harran yolu kahvaltı durağı — kapsamlı sofra, Harran Ovası manzarası.',
'yeme', 13, 'Harran Karayolu Üzeri, Şanlıurfa', 37.1320, 38.8215, '+90 414 318 XXXX',
'active', '/uploads/places/harran.jpg', '/uploads/places/harran.jpg',
4.5, 0, 0, false, false, 0, NOW(), NOW()),

-- Tatlıcılar/Baklavacılar (category_id=23)
(gen_random_uuid(), 'Urfa Tatlı Evi — Baklava & Kadayıf', 'urfa-tatli-evi-baklava-kadayif',
'Fıstıklı baklava, şöbiyet ve tel kadayıf için şehrin en gözde tatlıcılarından. Sabah erken saatlerde sıcak künefe de servis edilir. Hediyelik paket satışı mevcuttur.',
'Fıstıklı baklava, şöbiyet, tel kadayıf ve sıcak künefe. Hediyelik paket satışı var.',
'Şanlıurfa Urfa Tatlı Evi — baklava, kadayıf, künefe. Hediyelik Urfa tatlıları.',
'yeme', 23, 'Kapalı Çarşı İçi, Eyyübiye, Şanlıurfa', 37.1572, 38.7954, '+90 414 219 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.7, 0, 0, true, false, 0, NOW(), NOW()),

(gen_random_uuid(), 'Halfeti Tatlıcısı — Incir & Bal', 'halfeti-tatlicisi-incir-bal',
'Halfeti''nin özel siyah inciri ile yapılan tatlılar, bal ve kaymak ikramı. Tekne turu dönüşü için ideal tatlı molası. Fırat kıyısında açık terası var.',
'Halfeti siyah inciri ile yapılan özel tatlılar, bal, kaymak. Fırat kıyısı terası.',
'Halfeti Tatlıcısı — siyah incir tatlısı, bal ve kaymak. Tekne turu sonrası durak.',
'yeme', 23, 'Halfeti Köprüsü Yanı, Halfeti, Şanlıurfa', 37.2478, 37.8762, '+90 414 741 XXXX',
'active', '/uploads/places/halfeti.jpg', '/uploads/places/halfeti.jpg',
4.6, 0, 0, false, false, 0, NOW(), NOW()),

-- Kahveciler (mırra - category_id=16)
(gen_random_uuid(), 'Mırra & Kahve Evi Balıklıgöl', 'mirra-kahve-evi-balikligol',
'Geleneksel mırra sunumu, Türk kahvesi çeşitleri ve sütlü içecekler. Balıklıgöl''ün doğrudan manzarasına açılan ahşap dekoru ile şehrin en fotoğrafik kafelerinden biri.',
'Geleneksel mırra ve Türk kahvesi. Balıklıgöl manzaralı ahşap dekor, fotoğrafik.',
'Şanlıurfa Balıklıgöl manzaralı mırra evi — geleneksel kahve ritüeli, Urfa kültürü.',
'yeme', 16, 'Balıklıgöl Caddesi 12, Eyyübiye, Şanlıurfa', 37.1582, 38.7939, '+90 414 314 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.9, 0, 0, true, false, 0, NOW(), NOW()),

-- Balık restoranları (category_id=12)
(gen_random_uuid(), 'Fırat Balık Evi Halfeti', 'firat-balik-evi-halfeti',
'Halfeti''de Fırat Nehri''nden günlük avlanan sazan, levrek ve yayın balığı. Izgara, buğulama ve tava seçenekleri. Tekne turu tamamlandıktan sonra nehir kenarında öğle yemeği için ideal.',
'Halfeti''de Fırat''tan günlük taze balık — sazan, levrek, yayın. Nehir kenarı masa.',
'Halfeti Fırat Balık Evi — taze nehir balığı, ızgara ve tava, Fırat manzarası.',
'yeme', 12, 'Halfeti İskele Caddesi, Halfeti, Şanlıurfa', 37.2481, 37.8758, '+90 414 742 XXXX',
'active', '/uploads/places/halfeti.jpg', '/uploads/places/halfeti.jpg',
4.7, 0, 0, true, false, 0, NOW(), NOW()),

-- Yöresel ürün dükkanları (category_id=38)
(gen_random_uuid(), 'Urfa Baharat ve Yöresel Ürünler', 'urfa-baharat-yoresel-urunler',
'İsot, kirmızı pul biber, tahin, pekmez ve Şanlıurfa''ya özgü baharatlar. Kapalı Çarşı''nın kalbinde, turistlere ve yerel alıcılara yönelik geniş ürün yelpazesi. Hediyelik ambalajlar mevcuttur.',
'İsot, tahin, pekmez ve Urfa baharatları. Kapalı Çarşı''nda hediyelik ambalaj.',
'Şanlıurfa Urfa Baharat Dükkanı — isot, tahin, pekmez. Hediyelik Urfa ürünleri.',
'yeme', 38, 'Kapalı Çarşı, Eyyübiye, Şanlıurfa', 37.1569, 38.7958, '+90 414 221 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.6, 0, 0, false, false, 0, NOW(), NOW()),

-- Katmerciler (category_id=25)
(gen_random_uuid(), 'Tarihi Urfa Katmercisi', 'tarihi-urfa-katmercisi',
'Sabah 06:00''da açılan Şanlıurfa''nın en eski katmer ustalarından. Cevizli ve sade katmer, fıstıklı kaymak ile servis. Erken gelin; günlük hamur tükener.',
'Sabah 06:00''da açılan eski katmer ustası — cevizli, sade, fıstıklı kaymak ile.',
'Şanlıurfa Tarihi Urfa Katmercisi — geleneksel sabah katmeri, cevizli ve sade.',
'yeme', 25, 'Divan Caddesi, Eyyübiye, Şanlıurfa', 37.1575, 38.7962, '+90 414 222 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.8, 0, 0, true, false, 0, NOW(), NOW());

-- ===== 2. KONAKLAMA MEKANLARI =====

INSERT INTO places (id, name, slug, description, short_description, meta_description, category, category_id, address, latitude, longitude, phone, status, image_url, thumbnail_url, avg_rating, review_count, rating_count, is_featured, is_verified, view_count, created_at, updated_at) VALUES

-- Butik oteller (category_id=45)
(gen_random_uuid(), 'Balıklıgöl Taş Konak', 'balikligol-tas-konak',
'UNESCO listesine alınan Balıklıgöl''ün hemen karşısında, tarihi taş işçiliğiyle restore edilmiş butik konak. 12 oda, ahşap dekor, panoramik teras. Sabah kahvaltısı havuzlu bahçede.',
'Balıklıgöl karşısında tarihi taş konak — 12 oda, panoramik teras, bahçe kahvaltısı.',
'Şanlıurfa Balıklıgöl Taş Konak — butik otel, tarihi mimari, Balıklıgöl manzarası.',
'konaklama', 45, 'Balıklıgöl Yanı, Eyyübiye, Şanlıurfa', 37.1578, 38.7945, '+90 414 315 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.8, 0, 0, true, true, 0, NOW(), NOW()),

(gen_random_uuid(), 'Harran Kümbet Konak', 'harran-kumbet-konak',
'Harran''ın ikonik konik kümbet evlerinden ilham alınarak inşa edilmiş özgün konaklama deneyimi. 6 konik süit, doğal serinlik (yaz 35°C dışarıda, içeride 22°C), arkeoloji alanına 500m.',
'Harran konik kümbet evlerinden ilham alan özgün süit konaklama. Arkeoloji alanına 500m.',
'Harran Kümbet Konak — konik süit otel, doğal serinlik, arkeoloji alanı yakını.',
'konaklama', 45, 'Harran İlçe Merkezi, Harran, Şanlıurfa', 36.8651, 39.0285, '+90 414 441 XXXX',
'active', '/uploads/places/harran.jpg', '/uploads/places/harran.jpg',
4.9, 0, 0, true, true, 0, NOW(), NOW()),

-- 3 yıldızlı (category_id=44)
(gen_random_uuid(), 'Halfeti Garden Hotel', 'halfeti-garden-hotel',
'Halfeti''nin Fırat kıyısında, tekne iskelesi yakınında modern otel. 28 oda, balkonlu nehir manzarası odalar, yüzme havuzu, restoran. Tekne turu rezervasyonuna yardımcı olunur.',
'Halfeti Fırat kıyısı oteli — 28 oda, nehir manzarası, yüzme havuzu, tekne tur aracılık.',
'Halfeti Garden Hotel — Fırat kıyısı, nehir manzarası, havuz. Tekne turu yakını.',
'konaklama', 44, 'Halfeti Sahil Caddesi, Halfeti, Şanlıurfa', 37.2475, 37.8753, '+90 414 743 XXXX',
'active', '/uploads/places/halfeti.jpg', '/uploads/places/halfeti.jpg',
4.5, 0, 0, false, true, 0, NOW(), NOW()),

-- Apart oteller (category_id=46)
(gen_random_uuid(), 'Göbeklitepe Apart Residence', 'gobeklitepe-apart-residence',
'Göbeklitepe ziyaretçileri için ideal apart otel. Şehir merkezine 8 km. Tam donanımlı daireler (1+1, 2+1), mutfak imkânı, otopark. Uzun konaklamalar için uygun fiyatlı seçenek.',
'Göbeklitepe''ye 8km, tam mutfaklı daireler. 1+1 ve 2+1 seçenek, otopark ücretsiz.',
'Şanlıurfa Göbeklitepe yakını apart — 1+1 ve 2+1 daireler, mutfak, otopark.',
'konaklama', 46, 'Göbeklitepe Yolu Üzeri, Haliliye, Şanlıurfa', 37.1798, 38.7541, '+90 414 251 XXXX',
'active', '/uploads/places/gobeklitepe.jpg', '/uploads/places/gobeklitepe.jpg',
4.3, 0, 0, false, false, 0, NOW(), NOW()),

-- Pansiyon (category_id=47)
(gen_random_uuid(), 'Urfa Ev Pansiyonu', 'urfa-ev-pansiyonu',
'Yerel bir ailenin işlettiği ev pansiyonu. 5 oda, ev yapımı kahvaltı, aile sıcaklığında konaklama. Ev sahibi tur rehberliği yapabilir. Backpacker ve bütçe gezginleri için ideal.',
'Yerel aile işletmesi — 5 oda, ev kahvaltısı, rehberlik imkânı. Bütçe dostu.',
'Şanlıurfa Urfa Ev Pansiyonu — yerel aile, ev kahvaltısı, bütçe dostu konaklama.',
'konaklama', 47, 'Tarihi Çarşı Yakını, Eyyübiye, Şanlıurfa', 37.1570, 38.7970, '+90 414 223 XXXX',
'active', '/uploads/places/balikligol.jpg', '/uploads/places/balikligol.jpg',
4.6, 0, 0, false, false, 0, NOW(), NOW());

-- ===== 3. KARAHANTEPE YORUMLARI =====

INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, is_moderated, is_approved, visit_date, created_at, updated_at) VALUES

(gen_random_uuid(), 'a4faa0fc-0878-4285-acbf-c2c88696839c', '7a2816aa-d85a-481e-aa41-c89380f47d8f',
'Göbeklitepe''nin gölgesinde kalan bir şaheser',
'Karahantepe''yi Göbeklitepe''den bir gün sonra ziyaret ettim ve dürüst olmak gerekirse benzer derecede etkilenici buldum. T-sütunları daha güçlü görünüyor, insan figürleri şaşırtıcı detaylı. Rehber olmadan gitmemenizi öneririm — anlam bağlamı olmadan sadece taş görürsünüz.',
5, 'active', true, true, '2026-10-10', NOW(), NOW()),

(gen_random_uuid(), 'a4faa0fc-0878-4285-acbf-c2c88696839c', 'b3e82a97-c812-42a2-a02b-aaffe159fa5b',
'Arkeoloji tarihinin yeniden yazıldığı yer',
'Türk Arkeoloji Derneği''nin etkinliğiyle burayı ziyaret ettim. Karahantepe''nin %97''si henüz kazılmamış; önümüzdeki on yıllarda ne çıkacağını hayal etmek bile heyecan verici. Ulaşım biraz zor, kiralık araç şart.',
5, 'active', true, true, '2026-10-23', NOW(), NOW()),

(gen_random_uuid(), 'a4faa0fc-0878-4285-acbf-c2c88696839c', '6d913761-4af6-47a4-9877-646451546569',
'Kalabalıktan uzak, samimi bir arkeoloji deneyimi',
'Göbeklitepe''ye kıyasla ziyaretçi sayısı çok daha az, bu büyük bir avantaj. Arkeologlar zaman zaman sorularınızı yanıtlıyor. Gölgelik az, kışın gidin. Harran ile birleştirilebilir iyi bir güzergah.',
4, 'active', true, true, '2026-11-05', NOW(), NOW()),

(gen_random_uuid(), 'a4faa0fc-0878-4285-acbf-c2c88696839c', '12673736-1996-4fe3-b9e5-6b73b5da1a43',
'İnsan yüzü kabartmaları inanılmaz',
'Karahantepe''de beni en çok etkileyen şey insan yüzü kabartmalı sütunlar oldu. Göbeklitepe''de yok bu; burada insanlığın kendini ifade etme ihtiyacının çok erken bir kanıtı var. Mutlaka Şanlıurfa Müzesi ile birlikte ziyaret edin.',
5, 'active', true, true, '2026-11-10', NOW(), NOW()),

(gen_random_uuid(), 'a4faa0fc-0878-4285-acbf-c2c88696839c', '2ba2cc08-a0a9-480b-91df-5091707d4854',
'Ulaşım zor ama değer',
'Toplu ulaşım yok, bunu baştan bilin. Kiralık araçla 1.5 saatlik yol. Ama vardığınızda tamamen değiyor — yol çok az araç geçiyor, sessiz, Tektek Dağları manzarası muhteşem. Yeterli su ve atıştırmalık alın.',
4, 'active', true, true, '2026-12-08', NOW(), NOW());

-- Karahantepe review_count ve avg_rating güncelle
UPDATE places
SET review_count = 5,
    rating_count = 5,
    avg_rating = 4.6
WHERE slug = 'karahantepe-arkeoloji-alani';
