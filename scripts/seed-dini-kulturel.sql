-- Dini ve Kültürel Yerler — 9 yeni mekan
-- Camiler, Türbeler, Medreseler, Sanat merkezleri

INSERT INTO places (
  id, name, slug, description, address, phone,
  latitude, longitude, category_id, status, is_featured,
  thumbnail_url, avg_rating, review_count
) VALUES

-- Camiler
(gen_random_uuid(), 'Ulu Cami (Rızvaniye)', 'ulu-cami-rizvaniye',
 'Şanlıurfa''nın en büyük ve en önemli camilerinden biri olan Rızvaniye Camii, 18. yüzyılda yapılmış ve Balıklıgöl''ün hemen yanında konumlanan tarihi bir ibadethanedir. Taş işçiliği ve geniş avlusuyla ziyaretçilerin ilgisini çeker.',
 'Akarbaşı Mahallesi, Balıklıgöl Yanı, Haliliye, Şanlıurfa', '',
 37.1556, 38.7860,
 (SELECT id FROM categories WHERE name='Camiler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/ulu-cami-rizvaniye.jpg', 4.8, 0),

(gen_random_uuid(), 'Halilürrahman Camii', 'halilurrahman-camii',
 'Hz. İbrahim''in ateşe atılmasına sahne olan mekânın hemen yanı başında yer alan Halilürrahman Camii, Orta Doğu''nun en eski mescitlerinden biri olarak kabul edilmektedir. Balıklıgöl ile iç içe geçmiş manevi atmosferi ile her yıl binlerce ziyaretçi çekmektedir.',
 'Akarbaşı Mahallesi, Balıklıgöl Çevresi, Haliliye, Şanlıurfa', '',
 37.1549, 38.7856,
 (SELECT id FROM categories WHERE name='Camiler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/halilurrahman-camii.jpg', 4.9, 0),

(gen_random_uuid(), 'Mevlid-i Halil Camii', 'mevlid-i-halil-camii',
 'Geleneksel inanışa göre Hz. İbrahim''in doğduğu mağaranın üzerine inşa edilen cami. İçindeki kutsal mağara her gün binlerce hacı ve ziyaretçi tarafından ziyaret edilmektedir. Şanlıurfa''nın en kutsal noktalarından biri.',
 'Mevlid Bahçesi Sokak, Haliliye, Şanlıurfa', '0414 215 0001',
 37.1562, 38.7838,
 (SELECT id FROM categories WHERE name='Camiler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/mevlid-i-halil-camii.jpg', 4.9, 0),

(gen_random_uuid(), 'Eyüp Sultan Camii Şanlıurfa', 'eyup-sultan-camii-sanliurfa',
 'İstanbul''daki Eyüp Sultan''ın manevi kardeşi olarak kabul edilen bu tarihi cami, Şanlıurfa''nın dini mirasının önemli parçalarından biridir. Cuma namazlarında büyük cemaat toplar.',
 'Şanlıurfa Merkez', '',
 37.1590, 38.7920,
 (SELECT id FROM categories WHERE name='Camiler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/eyup-sultan-camii-sanliurfa.jpg', 4.7, 0),

-- Türbeler
(gen_random_uuid(), 'Hz. İbrahim Makamı', 'hz-ibrahim-makam-sanliurfa',
 'Hz. İbrahim Peygamber''in Nemrut tarafından mancınıkla fırlatılarak ateşe atıldığı yer olarak kabul edilen tarihî mekân. Kutsal gül bahçesi ve iç havuzu ile Şanlıurfa''nın en önemli hac ve ziyaret noktasıdır.',
 'Balıklıgöl Çevresi, Haliliye, Şanlıurfa', '',
 37.1551, 38.7859,
 (SELECT id FROM categories WHERE name='Türbeler' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/hz-ibrahim-makam-sanliurfa.jpg', 4.9, 0),

(gen_random_uuid(), 'Şeyh Ömer Türbesi', 'seyh-omer-turbesi',
 'Şanlıurfa''nın manevi rehberlerinden sayılan Şeyh Ömer''e ait türbe, tarihi konut dokusuyla çevrili sessiz bir sokakta yer almaktadır. Halk arasında "dua makamı" olarak bilinmektedir.',
 'Şehir Merkezi, Haliliye, Şanlıurfa', '',
 37.1570, 38.7900,
 (SELECT id FROM categories WHERE name='Türbeler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/seyh-omer-turbesi.jpg', 4.5, 0),

-- Medreseler
(gen_random_uuid(), 'Mehmet Arap Medresesi', 'mehmet-arap-medresesi',
 '18. yüzyılda inşa edilmiş bu tarihi medrese, Osmanlı döneminden kalma taş yapı ve geleneksel eğitim anlayışını yansıtmaktadır. Günümüzde Kur''an kursu olarak aktif biçimde kullanılmaya devam etmektedir.',
 'Kazzaz Mahallesi, Şanlıurfa', '',
 37.1575, 38.7880,
 (SELECT id FROM categories WHERE name='Medreseler' AND parent_id IS NOT NULL LIMIT 1),
 'active', false, '/uploads/places/mehmet-arap-medresesi.jpg', 4.4, 0),

-- Sanat merkezleri
(gen_random_uuid(), 'Şanlıurfa Kültür ve Sanat Merkezi', 'sanliurfa-kultur-sanat-merkezi',
 'Şanlıurfa Büyükşehir Belediyesi''ne bağlı kültür merkezi; tiyatro, konser, sergi ve kültürel etkinliklere ev sahipliği yapmaktadır. 600 kişilik ana salon, atölye ve sergi alanları mevcuttur.',
 'Yenişehir Mahallesi, Kültür Caddesi, Haliliye, Şanlıurfa', '0414 217 2200',
 37.1648, 38.7978,
 (SELECT id FROM categories WHERE name='Sanat merkezleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/sanliurfa-kultur-sanat-merkezi.jpg', 4.5, 0),

-- Kültür evleri
(gen_random_uuid(), 'Urfa Evi Kültür Mekânı', 'urfa-evi-kultur-mekani',
 'Geleneksel Urfa avlulu konutundan dönüştürülmüş kültür mekânı. El sanatları atölyeleri, sıra gecesi dinletileri ve yöresel lezzetler sunan bu mekân, Urfa''nın yaşayan kültürünü deneyimlemek için ideal bir adres.',
 'Divane Mahallesi, Eski Şehir, Haliliye, Şanlıurfa', '0414 216 5500',
 37.1560, 38.7885,
 (SELECT id FROM categories WHERE name='Kültür evleri' AND parent_id IS NOT NULL LIMIT 1),
 'active', true, '/uploads/places/urfa-evi-kultur-mekani.jpg', 4.7, 0)

ON CONFLICT (slug) DO NOTHING;

SELECT COUNT(*) AS dini_kulturel FROM places p
JOIN categories c ON p.category_id=c.id
JOIN categories cp ON c.parent_id=cp.id
WHERE cp.name='Dini ve Kültürel Yerler' AND p.status='active';
