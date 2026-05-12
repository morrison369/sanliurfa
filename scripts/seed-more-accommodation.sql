-- Konaklama Mekanları — Ek Seed
-- Mevcut: 4 mekan. Eklenecek: 10 yeni mekan (çeşitli alt kategoriler)

INSERT INTO places (
  id, name, slug, description, address, phone,
  latitude, longitude, category_id, status, is_featured,
  thumbnail_url, avg_rating, review_count
) VALUES

-- 5 yıldızlı
(gen_random_uuid(),
 'Grand Urfa Hotel',
 'grand-urfa-hotel',
 'Şanlıurfa şehir merkezinde 5 yıldızlı konforuyla öne çıkan Grand Urfa Hotel, geniş oda seçenekleri, kapalı yüzme havuzu, spa merkezi ve panoramik restoran ile misafirlerine unutulmaz konaklama deneyimi sunuyor.',
 'Yenişehir Mahallesi, Atatürk Bulvarı No:42, Şanlıurfa', '0414 215 0000',
 37.1590, 38.7950,
 (SELECT id FROM categories WHERE name='5 yıldızlı' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/grand-urfa-hotel.jpg', 4.6, 0),

(gen_random_uuid(),
 'Ramotel Şanlıurfa',
 'ramotel-sanliurfa',
 'Modern mimarisi ve üst düzey hizmet anlayışıyla Ramotel, iş ve tatil amaçlı seyahatlerin tercihi. Fitness merkezi, toplantı salonları ve şehir manzaralı terastan Şanlıurfa''nın silueti izlenebilir.',
 'Köprübaşı Mahallesi, Sarayönü Caddesi No:18, Şanlıurfa', '0414 314 2000',
 37.1610, 38.7920,
 (SELECT id FROM categories WHERE name='5 yıldızlı' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/ramotel-sanliurfa.jpg', 4.4, 0),

-- 4 yıldızlı
(gen_random_uuid(),
 'Abide Hotel Şanlıurfa',
 'abide-hotel-sanliurfa',
 'Tarihi surların hemen yanında konumlanan Abide Hotel, Şanlıurfa''nın kalbinde 4 yıldızlı hizmet sunuyor. Geleneksel Urfa mimarisinden ilham alan dekorasyonuyla otantik bir atmosfer yaratıyor.',
 'Camikebir Mahallesi, Sarayardı Sokak No:7, Şanlıurfa', '0414 312 3400',
 37.1575, 38.7890,
 (SELECT id FROM categories WHERE name='4 yıldızlı' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/abide-hotel-sanliurfa.jpg', 4.3, 0),

(gen_random_uuid(),
 'Balıklıgöl Hotel',
 'balikligol-hotel',
 'Göl manzaralı odaları ve tarihi konumuyla eşsiz bir konaklama deneyimi. Balıklıgöl ve Halilürrahman Camii''ne yürüyüş mesafesinde olan otel, şehrin kültürel merkezinde rahatlık sunuyor.',
 'Akarbaşı Mahallesi, Göl Caddesi No:12, Şanlıurfa', '0414 215 7800',
 37.1555, 38.7860,
 (SELECT id FROM categories WHERE name='4 yıldızlı' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/balikligol-hotel.jpg', 4.5, 0),

-- 3 yıldızlı
(gen_random_uuid(),
 'Urfa Büyük Otel',
 'urfa-buyuk-otel',
 'Uygun fiyat, merkezi konum ve temiz odalarıyla Urfa Büyük Otel, bütçesini düşünen gezginlerin tercihi. Şehir merkezine ve otogar bağlantısına yakınlığı ile pratik konaklama seçeneği.',
 'İstasyon Caddesi No:56, Şanlıurfa', '0414 215 1100',
 37.1630, 38.8010,
 (SELECT id FROM categories WHERE name='3 yıldızlı' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-buyuk-otel.jpg', 3.9, 0),

-- Butik oteller
(gen_random_uuid(),
 'Edessa Butik Otel',
 'edessa-butik-otel',
 'Taş işçiliğiyle bezeli tarihi bir Urfa konutundan dönüştürülen Edessa Butik Otel, 12 özel oda, avlulu bahçe ve sabah kahvaltısıyla özgün bir deneyim sunuyor. Mimari ve tarihe değer veren gezginler için ideal.',
 'Divane Mahallesi, Kuyumcular Sokak No:4, Şanlıurfa', '0414 216 8800',
 37.1568, 38.7878,
 (SELECT id FROM categories WHERE name='Butik oteller' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/edessa-butik-otel.jpg', 4.7, 0),

(gen_random_uuid(),
 'Taş Han Butik Otel',
 'tas-han-butik-otel',
 'Osmanlı dönemi hanından restore edilen Taş Han Butik Otel, avlu etrafında dizilmiş 8 süiti ve restoranıyla eko-kültür turizm anlayışını benimsiyor. Tarihin içinde modern konfor.',
 'Şaban Mahallesi, Köprü Altı No:2, Şanlıurfa', '0414 313 5500',
 37.1560, 38.7870,
 (SELECT id FROM categories WHERE name='Butik oteller' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/tas-han-butik-otel.jpg', 4.8, 0),

-- Pansiyonlar
(gen_random_uuid(),
 'Zeugma Pansiyon',
 'zeugma-pansiyon',
 'Aile işletmesi Zeugma Pansiyon, sıcak misafirperverliği ve ev yemekleriyle bütçe gezginlerine kapılarını açıyor. Bahçeli terastan Şanlıurfa''nın damları izlenebilir. Kahvaltı dahil seçenekler mevcut.',
 'Üniversite Yolu, Pınar Sokak No:9, Şanlıurfa', '0414 318 2200',
 37.1700, 38.8050,
 (SELECT id FROM categories WHERE name='Pansiyonlar' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/zeugma-pansiyon.jpg', 4.1, 0),

-- Apart oteller
(gen_random_uuid(),
 'Urfa Apart Otel',
 'urfa-apart-otel',
 'Uzun süreli konaklamalar için tam donanımlı daireler. Mini mutfak, çamaşır makinesi ve oturma odası ile evinizin konforunu şehrin kalbinde yaşayın. Haftalık ve aylık fiyat seçenekleri mevcuttur.',
 'Yenişehir, Barış Bulvarı No:78, Şanlıurfa', '0414 314 9900',
 37.1640, 38.7970,
 (SELECT id FROM categories WHERE name='Apart oteller' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/urfa-apart-otel.jpg', 4.0, 0),

-- Bungalov / doğa konaklama
(gen_random_uuid(),
 'Göbeklitepe Panorama Bungalov',
 'gobeklitepe-panorama-bungalov',
 'Göbeklitepe''ye sadece 3 km uzaklıkta doğanın içinde ahşap bungalov konaklama. Arkeolojik keşif için ideal üs. Gece gökyüzü gözlemi, sabah yürüyüşü ve organik kahvaltı paketleri sunulmaktadır.',
 'Örencik Köyü, Karadag Mevkii, Şanlıurfa', '0414 316 7700',
 37.2230, 38.9220,
 (SELECT id FROM categories WHERE name='Bungalov / doğa konaklama' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/gobeklitepe-panorama-bungalov.jpg', 4.6, 0)

ON CONFLICT (slug) DO NOTHING;

SELECT COUNT(*) AS konaklama_total
FROM places p
JOIN categories c ON p.category_id = c.id
JOIN categories cp ON c.parent_id = cp.id
WHERE cp.name = 'Konaklama' AND p.status = 'active';
