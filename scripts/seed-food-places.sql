-- Yeme-İçme kategorisi genişletme — boş kategorilere Şanlıurfa mekanları
-- Category IDs: Lahmacuncular=5, Künefeciler=24, Kafeler=15, Pastaneler=21,
--               Katmerciler=25, Kahveciler=16, Et lokantaları=8, Dondurmacılar=26
-- District IDs: Eyyübiye=1, Haliliye=2, Karaköprü=3

INSERT INTO places (
  id, name, slug, description, category_id, district_id, status, is_featured,
  rating, rating_count, review_count, avg_rating,
  address, latitude, longitude, thumbnail_url, created_at, updated_at
) VALUES

-- ── LAHMACUNCUlar (cat=5) ────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Öz Urfa Lahmacuncusu',
  'oz-urfa-lahmacuncusu',
  'Şanlıurfa''nın en köklü lahmacun ustalarından biri. İnce hamur, bol domatesli ve maydanozlu Urfa usulü lahmacun için doğru adres. Fırından çıktığı sıcaklıkta servis edilen lahmacunlar, limon ve yeşillikle birleşince başka bir lezzete dönüşür. Her gün sabah erkenden başlayan üretim öğleden önce kapanır.',
  5, 1, 'active', false,
  4.7, 2, 2, 4.7,
  'Sarayönü Cad. No:18, Eyyübiye/Şanlıurfa', 37.1596, 38.7956,
  'https://images.pexels.com/photos/5779752/pexels-photo-5779752.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Hacı Mehmet Lahmacun',
  'haci-mehmet-lahmacun',
  'Üç nesil boyunca aynı taş fırında pişirilen Hacı Mehmet Lahmacun, Karaköprü''nün en tanınan lezzet duraklarından biridir. Kıymayı kendinizin çektiğine inandıracak doğal kıvamı ve taze malzemeleriyle şehrin en otantik lahmacun deneyimini sunar.',
  5, 3, 'active', false,
  4.5, 2, 2, 4.5,
  'Atatürk Bul. No:45, Karaköprü/Şanlıurfa', 37.1800, 38.7800,
  'https://images.pexels.com/photos/5779752/pexels-photo-5779752.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── KÜNEFECİLER (cat=24) ────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Selahattin Usta Künefe',
  'selahattin-usta-kunefe',
  'Şanlıurfa peyniriyle hazırlanan gerçek fırın künefesinin bu şehirde en iyi yapıldığı adreslerden biri. Kadayıf hamuru ve taze Urfa peyniri dengesi, üzerine dökülen şerbeti ve dövülmüş fıstığıyla mükemmel bir denge kuruyor. Hafif ısınmış tabak sunumu detayı bile gösteriyor ki ustanın işine saygısı var.',
  24, 2, 'active', true,
  4.9, 2, 2, 4.9,
  'Divanyolu Cad. No:7, Haliliye/Şanlıurfa', 37.1620, 38.7930,
  'https://images.pexels.com/photos/7144921/pexels-photo-7144921.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Balıklıgöl Künefecisi',
  'balikligol-kunefecisi',
  'Balıklıgöl''ün hemen karşısında, tarihi mekân atmosferinde gerçek Urfa künefesi. Turistlerin ve yerel halkın ortak favori noktası haline gelen bu köklü işletme, yıllarca değişmeyen tarifi ve kalitesiyle güven veriyor. Yanında bir bardak Türk çayıyla bu deneyim vazgeçilmez olur.',
  24, 2, 'active', false,
  4.8, 2, 2, 4.8,
  'Balıklıgöl Meydanı No:3, Haliliye/Şanlıurfa', 37.1630, 38.7940,
  'https://images.pexels.com/photos/7144921/pexels-photo-7144921.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── KAFELER (cat=15) ─────────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Harran Çay Bahçesi',
  'harran-cay-bahcesi',
  'Şehrin en işlek noktalarından birinde, tarihi çarşıya yakın konumuyla sabah erken saatlerden geç akşama kadar hizmet veren Harran Çay Bahçesi; çay, Mırra kahvesi ve yöresel ikramlarıyla Urfa''nın sosyal yaşamının tam kalbinde yer alıyor. Açık hava oturma alanları her mevsim tercih edilen bir buluşma noktası.',
  15, 1, 'active', false,
  4.4, 2, 2, 4.4,
  'Gölbaşı Cad. No:22, Eyyübiye/Şanlıurfa', 37.1615, 38.7945,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Göbeklitepe Cafe',
  'gobeklitepe-cafe',
  'Modern tasarımı ve Göbeklitepe''ye göndermeler yapan dekor konseptiyle şehrin genç kesimine hitap eden bu cafe; özenle hazırlanmış filtre kahveler, soğuk brew ve yerel reçellerle zenginleştirilmiş kahvaltı tabakları sunuyor. Kitap köşesi ve çalışma alanlarıyla yaratıcı insanların uğrak yeri haline geldi.',
  15, 2, 'active', false,
  4.5, 2, 2, 4.5,
  'Kültür Cad. No:14, Haliliye/Şanlıurfa', 37.1610, 38.7920,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── PASTANELer (cat=21) ──────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Urfa Pastanesi',
  'urfa-pastanesi',
  'Şanlıurfa''nın köklü tatlı geleneğini yaşatan Urfa Pastanesi, şıllık tatlısı, şerbetli baklava ve Urfa usulü katmer gibi yöresel lezzetleri modern bir ortamda sunuyor. Düğün, nişan ve özel günler için sipariş pasta üretimi de yapan işletme, şehrin pastalık ihtiyacını karşılayan güvenilir bir isim.',
  21, 1, 'active', false,
  4.3, 2, 2, 4.3,
  'İstasyon Cad. No:33, Eyyübiye/Şanlıurfa', 37.1605, 38.7970,
  'https://images.pexels.com/photos/3338681/pexels-photo-3338681.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── KATMERCİLER (cat=25) ────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Usta Katmercisi',
  'usta-katmercisi',
  'Sabahın ilk ışıklarıyla açılan Usta Katmercisi, gevrek yufka arasına peynir, maydanoz ve biber sürülmüş geleneksel Urfa katmerini taş fırında pişiriyor. Yörede "kahvaltının kraliçesi" olarak nitelendirilen katmer, burada şehrin en özgün yorumuyla servis ediliyor. Erken gelenler tükenmeden yetişir.',
  25, 2, 'active', true,
  4.8, 2, 2, 4.8,
  'Camii Kebir Mah. No:6, Haliliye/Şanlıurfa', 37.1640, 38.7935,
  'https://images.pexels.com/photos/4518673/pexels-photo-4518673.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),
(
  gen_random_uuid(),
  'Meşhur Urfa Katmeri',
  'meshur-urfa-katmeri',
  'Karaköprü''de yarım asrı aşkın süredir aynı noktada katmer pişiren bu ustanın sırrı: kaliteli kuzu yağı ve sabahın erken saatlerinde taze yoğrulan hamur. Müdavimlerinin her sabah kuyruğa girdiği bu mütevazı dükkan, şehrin gizli kalmış lezzet hazinelerinden biridir.',
  25, 3, 'active', false,
  4.7, 2, 2, 4.7,
  'Karaköprü Çarşısı No:12, Karaköprü/Şanlıurfa', 37.1820, 38.7820,
  'https://images.pexels.com/photos/4518673/pexels-photo-4518673.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── KAHVECİLER / MIRRA (cat=16) ─────────────────────────────────────────────
(
  gen_random_uuid(),
  'Mırra Evi',
  'mirra-evi',
  'Şanlıurfa''nın kendine özgü acı ve yoğun kahvesi Mırra''yı en geleneksel yöntemle sunan Mırra Evi, şehirdeki kahve kültürünün yaşayan temsilcisi haline geldi. Küçük fincan büyüklüğünde servis edilen Mırra, çerçevesiz camı ve sade mobilyalarıyla gerçek bir Urfa hanı atmosferinde içiliyor.',
  16, 2, 'active', true,
  4.9, 2, 2, 4.9,
  'Gümrük Han Sokağı No:4, Haliliye/Şanlıurfa', 37.1625, 38.7928,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── ET LOKANTALARI (cat=8) ─────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Dicle Et Lokantası',
  'dicle-et-lokantasi',
  'Günlük taze kesim kuzu ve dana etiyle hazırlanan ızgara çeşitleri, fırın kebabı ve tandır yemekleriyle Dicle Et Lokantası, Şanlıurfa''nın et severlerinin vazgeçemediği adreslerinden biri. Sabah erken açılıp akşama kadar kesintisiz hizmet veren lokanta, öğlen yoğun olduğundan rezervasyon tavsiye edilir.',
  8, 1, 'active', false,
  4.5, 2, 2, 4.5,
  'Sarayönü Bul. No:28, Eyyübiye/Şanlıurfa', 37.1590, 38.7960,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
),

-- ── DONDURMACIlar (cat=26) ──────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Antep Usulü Dondurma',
  'antep-usulu-dondurma',
  'Maraş dondurmasının kuzeni olan Antep usulü dondurma burada sahlep ve doğal pistachoyla hazırlanıyor. Uzayan ve çekilebilen kıvamıyla şov yapan dondurma ustası, hem çocuklara hem büyüklere eğlenceli bir deneyim yaşatıyor. Şanlıurfa''nın sıcak yaz günlerinde en çok aranan serinleme noktalarından.',
  26, 2, 'active', false,
  4.6, 2, 2, 4.6,
  'Balıklıgöl Cad. No:9, Haliliye/Şanlıurfa', 37.1635, 38.7942,
  'https://images.pexels.com/photos/1343504/pexels-photo-1343504.jpeg?auto=compress&cs=tinysrgb&w=800',
  NOW(), NOW()
)

ON CONFLICT (slug) DO NOTHING;

-- Yeni mekan sayısı doğrulama
SELECT COUNT(*) AS yeni_yeme_icme FROM places
WHERE slug IN (
  'oz-urfa-lahmacuncusu','haci-mehmet-lahmacun',
  'selahattin-usta-kunefe','balikligol-kunefecisi',
  'harran-cay-bahcesi','gobeklitepe-cafe',
  'urfa-pastanesi','usta-katmercisi','meshur-urfa-katmeri',
  'mirra-evi','dicle-et-lokantasi','antep-usulu-dondurma'
);
