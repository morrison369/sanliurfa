-- Boş ilçeler için mekan seed — 20 yeni mekan
-- District IDs: Birecik=7, Bozova=11, Ceylanpınar=9, Hilvan=10, Suruç=6, Viranşehir=5, Halfeti=12, Harran=13
-- Category IDs: Tarihi yerler=225, Camiler=228, Müzeler=226, Ören yerleri=227, Kümbetler=230
--               Restoranlar=2, Kebapçılar=3, Oteller=41, Yöresel yemek=14, Kafeler=15
--               Manzaralı kafeler=20, Kahvaltı=13, Eğlence=242

INSERT INTO places (
  id, name, slug, description, category_id, district_id, status, is_featured,
  rating, rating_count, review_count, avg_rating,
  address, latitude, longitude, created_at, updated_at
) VALUES

-- ── BİRECİK (district_id=7) ──────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Birecik Kalesi',
  'birecik-kalesi',
  'Fırat Nehri kıyısında yükselen Birecik Kalesi, Orta Doğu''nun en stratejik Roma ve Bizans kalelerinden biridir. Kalesinin tepesinden Fırat manzarası ve karşı yakadaki Suriye toprakları görülebilir. Her yıl Birecik Kelaynak kuşlarına ev sahipliği yapan kaya yarıkları, kalenin eteklerinde yer almaktadır.',
  225, 7, 'active', true,
  4.6, 2, 2, 4.6,
  'Kale Mah., Birecik/Şanlıurfa', 37.0297, 37.9672, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Birecik Kelaynak Gözlem Alanı',
  'birecik-kelaynak-gozlem-alani',
  'Dünyanın nadir kuşlarından kelaynak (Geronticus eremita) Birecik''te koruma altındadır. Her yıl Nisan-Temmuz arasında üreyen kelaynak sürülerini yakından gözlemleyebileceğiniz özel gözlem alanı, tüm doğaseverlerin mutlaka ziyaret etmesi gereken eşsiz bir noktadır.',
  225, 7, 'active', true,
  4.8, 2, 2, 4.8,
  'Kelaynak Yolu, Birecik/Şanlıurfa', 37.0340, 37.9641, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Fırat Kıyısı Lokantası',
  'firat-kiyisi-lokantasi-birecik',
  'Fırat Nehri''nin hemen kıyısında, açık havada yemek yeme keyfi sunan geleneksel bir Şanlıurfa lokantası. Taze balık, yöresel kebaplar ve meze tabakları sunuluyor. Nehir manzarası eşliğinde verilen hizmet ve samimi ortamıyla birçok ziyaretçinin favorisi.',
  14, 7, 'active', false,
  4.4, 2, 2, 4.4,
  'Fırat Cad. No:12, Birecik/Şanlıurfa', 37.0301, 37.9658, NOW(), NOW()
),

-- ── BOZOVA (district_id=11) ─────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Bozova Kalesi',
  'bozova-kalesi',
  'Bozova ilçe merkezine hâkim bir tepe üzerinde yer alan tarihi kale, bölgenin Orta Çağ''daki savunma hatlarının önemli bir parçasıdır. Kaleden Atatürk Barajı Havzası''nın nefes kesen manzarası izlenebilir. Fotoğraf tutkunlarının gözdesine dönüşmüş eşsiz bir vantaj noktası.',
  225, 11, 'active', false,
  4.3, 2, 2, 4.3,
  'Kale Tepesi, Bozova/Şanlıurfa', 37.3558, 38.5145, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Atatürk Barajı Seyir Noktası',
  'ataturk-baraji-seyir-noktasi',
  'Türkiye''nin en büyük barajlarından olan Atatürk Barajı''nın muhteşem manzarasını en iyi konumdan izleyebileceğiniz seyir noktası Bozova sınırları içindedir. Güneş batarken oluşan altın yansımalar ve geniş havza manzarası benzersiz bir deneyim sunar. Piknik alanları da mevcuttur.',
  20, 11, 'active', false,
  4.5, 2, 2, 4.5,
  'Baraj Yolu, Bozova/Şanlıurfa', 37.4100, 38.3200, NOW(), NOW()
),

-- ── CEYLANPINAR (district_id=9) ──────────────────────────────────────────────
(
  gen_random_uuid(),
  'Ceylanpınar Tarım İşletmesi',
  'ceylanpinar-tarim-isletmesi',
  'Türkiye''nin en büyük tarım işletmelerinden biri olan Ceylanpınar TİGEM, binlerce dönüm arazide tahıl tarımı ve hayvancılık faaliyetleri yürütmektedir. Çiftlik gezileri kapsamında at yetiştiriciliği tesisleri, tahıl depoları ve modern sulama sistemleri incelenebilir. Tarım turizmi açısından bölgede öncü bir deneyim sunar.',
  225, 9, 'active', false,
  4.2, 2, 2, 4.2,
  'TİGEM Caddesi, Ceylanpınar/Şanlıurfa', 36.8453, 40.0444, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Ceylanpınar Şehir Parkı',
  'ceylanpinar-sehir-parki',
  'Ceylanpınar şehir merkezinde yeşil bir soluklanma alanı sunan şehir parkı; yürüyüş yolları, çeşitli ağaç türleri ve çocuk oyun alanlarıyla yerel halkın en sevdiği buluşma noktasıdır. Akşam saatlerinde canlanan park, sıcak yaz günlerinde de gölgeli dinlenme alanları sunar.',
  242, 9, 'active', false,
  4.0, 2, 2, 4.0,
  'Atatürk Bul. No:1, Ceylanpınar/Şanlıurfa', 36.8480, 40.0470, NOW(), NOW()
),

-- ── HİLVAN (district_id=10) ──────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Hilvan Kaplıcaları',
  'hilvan-kapLIcalari',
  'Şanlıurfa''nın termal turizm merkezlerinden biri olan Hilvan Kaplıcaları, yüksek mineralli sıcak su kaynakları ile tanınır. Romatizma, eklem ve deri rahatsızlıklarına faydalı olduğu bilinen sular, yıl boyunca ziyaretçi ağırlamaktadır. Konaklama tesisleri ve açık havuz alanıyla tam bir termal tatil deneyimi sunar.',
  225, 10, 'active', true,
  4.4, 2, 2, 4.4,
  'Kaplıca Mah., Hilvan/Şanlıurfa', 37.5781, 38.9669, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Hilvan Merkez Camii',
  'hilvan-merkez-camii',
  'İlçe merkezinde konumlanan Hilvan Merkez Camii, geleneksel Osmanlı mimarisinin güçlü etkilerini yansıtan zarif minareleri ve süslemeli avlusuyla dikkat çekmektedir. Cuma namazı vakitlerinde ilçenin dört bir yanından gelen cemaatle dolup taşan cami, aynı zamanda önemli bir sosyal buluşma noktasıdır.',
  228, 10, 'active', false,
  4.3, 2, 2, 4.3,
  'Merkez Mah. No:1, Hilvan/Şanlıurfa', 37.5800, 38.9700, NOW(), NOW()
),

-- ── SURUÇ (district_id=6) ────────────────────────────────────────────────────
(
  gen_random_uuid(),
  'Suruç Kalesi',
  'suruc-kalesi',
  'Suruç ovasına hâkim konumuyla stratejik önemi yüzyıllar boyu süren Suruç Kalesi, antik Osroene Krallığı dönemine uzanan tarihi geçmişiyle öne çıkar. Kalıntılar üzerine yapılan arkeolojik araştırmalar bölgenin çok katmanlı tarihini aydınlatmaktadır. Güneş doğarken ya da batarken manzara eşsizdir.',
  225, 6, 'active', false,
  4.3, 2, 2, 4.3,
  'Kale Mah., Suruç/Şanlıurfa', 36.9803, 38.5227, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Suruç Eyüp Sultan Camii',
  'suruc-eyup-sultan-camii',
  'Suruç''un en önemli dini mekânlarından biri olan Eyüp Sultan Camii, tarih boyunca pek çok onarım görmüş ve her dönemde halkın manevi merkezine dönüşmüştür. Sade ve otantik mimarisi, içindeki ahşap işlemeli mihrabı ve sakin avlusuyla ziyaretçilere huzur dolu bir an yaşatır.',
  228, 6, 'active', false,
  4.2, 2, 2, 4.2,
  'Eyüp Sultan Mah., Suruç/Şanlıurfa', 36.9820, 38.5240, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Suruç Şehir Lokantası',
  'suruc-sehir-lokantasi',
  'Suruç''un köklü lezzetlerini sürdüren bu geleneksel lokanta; ev yapımı yöresel çorbalar, güveç yemekleri ve taze pide ile ziyaretçilere otantik bir sofra deneyimi yaşatır. Yöre halkının en sık tercih ettiği mekanlardan biri olup misafirperver hizmet anlayışıyla öne çıkar.',
  14, 6, 'active', false,
  4.1, 2, 2, 4.1,
  'Çarşı Mah. No:5, Suruç/Şanlıurfa', 36.9810, 38.5230, NOW(), NOW()
),

-- ── VİRANŞEHİR (district_id=5) ──────────────────────────────────────────────
(
  gen_random_uuid(),
  'Viranşehir Antik Kenti (Constantina)',
  'viransehir-antik-kenti',
  'Roma döneminde Constantina adıyla bilinen Viranşehir, bölgenin önemli antik kentlerinden biridir. İmparator Constantius tarafından kurulan bu tarihi şehrin kalıntıları, günümüzde Viranşehir ilçe merkezi altında kısmen görünür haldedir. Kazı çalışmaları ile gün yüzüne çıkan eserler yerel müzede sergilenmektedir.',
  225, 5, 'active', true,
  4.5, 2, 2, 4.5,
  'Tarihi Kent Merkezi, Viranşehir/Şanlıurfa', 37.2328, 39.7610, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Hz. Zülküf Peygamber Türbesi',
  'hz-zulkuf-turbesi-viransehir',
  'İslam inancında önemli peygamberlerden Hz. Zülküf''e atfedilen türbe, Viranşehir''in önemli dini ziyaret mekânlarından biridir. Asırlık çınar ağaçlarıyla çevrili avlusu ve tarihi çeşmesiyle ziyaretçilere manevi bir atmosfer sunar. Her yıl binlerce kişi türbeyi ziyaret eder.',
  230, 5, 'active', true,
  4.6, 2, 2, 4.6,
  'Peygamber Mah., Viranşehir/Şanlıurfa', 37.2350, 39.7630, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Serinnaz Havuzu ve Eğlence Parkı',
  'serinnaz-havuzu-viransehir',
  'Viranşehir''in en popüler sosyal mekanlarından biri olan Serinnaz Havuzu, sıcak yaz aylarında hem yetişkinler hem de çocuklar için mükemmel bir serinleme ve eğlence noktasına dönüşmektedir. Kaydıraklar, yüzme havuzları, kafeteryası ve yeşil piknik alanlarıyla tam gün vakit geçirilebilecek bir kompleks.',
  242, 5, 'active', false,
  4.2, 2, 2, 4.2,
  'Havuz Mah., Viranşehir/Şanlıurfa', 37.2300, 39.7590, NOW(), NOW()
),

-- ── HALFETİ EK MEKANLAR (district_id=12) ────────────────────────────────────
(
  gen_random_uuid(),
  'Rumkale',
  'rumkale-halfeti',
  'Fırat Nehri''nin kollarından Merzimen Çayı kıyısında yükselen Rumkale, dünyanın en etkileyici kaya kalelerinden biridir. Orta Çağ boyunca Ermeni, Haçlı ve Memlük hâkimiyetinde kalan kale, günümüzde yarısı sular altında kalsa da tekneyle ulaşılabilen büyüleyici bir tarihi mekândır.',
  225, 12, 'active', true,
  4.9, 2, 2, 4.9,
  'Rumkale Köyü, Halfeti/Şanlıurfa', 37.2800, 37.8900, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Halfeti Tekne Turu',
  'halfeti-tekne-turu',
  'Baraj gölünde sular altında kalan tarihi köyleri, Rum Kalesi''ni ve siyah güllerin bahçelerini tekneyle keşfedebileceğiniz eşsiz bir tur deneyimi. Rehber eşliğinde yapılan turlar, Halfeti''nin efsanevi sular altı köylerini ve bölgenin doğal güzelliklerini yakından görme imkânı sunar.',
  225, 12, 'active', true,
  4.8, 2, 2, 4.8,
  'İskele Meydanı, Halfeti/Şanlıurfa', 37.2564, 37.8641, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Halfeti Misafirhanesi',
  'halfeti-misafirhanesi',
  'Fırat''a bakan teraslı odaları ve siyah güllerin açtığı bahçesiyle ünlü Halfeti Misafirhanesi, ziyaretçilere eşsiz bir butik konaklama deneyimi sunar. Sabah kahvaltısı için yerel ürünler, akşamları nehir üzerinde batan güneşi izleme imkânı. Halfeti''yi tam anlamıyla hissetmek isteyenler için vazgeçilmez bir adres.',
  41, 12, 'active', false,
  4.7, 2, 2, 4.7,
  'Merkez Mah., Halfeti/Şanlıurfa', 37.2570, 37.8650, NOW(), NOW()
),

-- ── HARRAN EK MEKANLAR (district_id=13) ─────────────────────────────────────
(
  gen_random_uuid(),
  'Harran Konik Evleri Müzesi',
  'harran-konik-evleri-muzesi',
  'Harran''ı dünyaca ünlü kılan petek şekilli konik evler, 6.000 yıllık bir geleneğin yaşayan tanıklarıdır. Resmi müze statüsündeki bu alanda etno-arkeoloji uzmanları tarafından hazırlanan rehberli turlarla geleneksel yaşam pratikleri, iç mekân düzenlemeleri ve inşaat teknikleri ayrıntılı biçimde açıklanmaktadır.',
  226, 13, 'active', true,
  4.8, 2, 2, 4.8,
  'Harran Tarihi Kent, Harran/Şanlıurfa', 36.8640, 39.0297, NOW(), NOW()
),
(
  gen_random_uuid(),
  'Harran Han Restoran',
  'harran-han-restoran',
  'Tarihi Harran''ı ziyaret edenlerin uğrak yeri olan Harran Han, geleneksel kervan hanı mimarisini modern bir restoran anlayışıyla birleştirmektedir. Şanlıurfa''nın yöresel lezzetleri tepsi kebabı, çiğ köfte ve muhammara başarıyla sunuluyor. Geniş avlulu oturma alanı ve tarihi taş duvarlar eşsiz bir atmosfer yaratıyor.',
  14, 13, 'active', false,
  4.5, 2, 2, 4.5,
  'Harran Meydanı No:3, Harran/Şanlıurfa', 36.8620, 39.0280, NOW(), NOW()
)

ON CONFLICT (slug) DO NOTHING;

-- Hilvan kaplıcası slug fix (büyük harf içeriyor)
UPDATE places SET slug = 'hilvan-kaplicalari' WHERE slug = 'hilvan-kapLIcalari';

SELECT COUNT(*) AS yeni_mekan_sayisi FROM places WHERE slug IN (
  'birecik-kalesi','birecik-kelaynak-gozlem-alani','firat-kiyisi-lokantasi-birecik',
  'bozova-kalesi','ataturk-baraji-seyir-noktasi',
  'ceylanpinar-tarim-isletmesi','ceylanpinar-sehir-parki',
  'hilvan-kaplicalari','hilvan-merkez-camii',
  'suruc-kalesi','suruc-eyup-sultan-camii','suruc-sehir-lokantasi',
  'viransehir-antik-kenti','hz-zulkuf-turbesi-viransehir','serinnaz-havuzu-viransehir',
  'rumkale-halfeti','halfeti-tekne-turu','halfeti-misafirhanesi',
  'harran-konik-evleri-muzesi','harran-han-restoran'
);
