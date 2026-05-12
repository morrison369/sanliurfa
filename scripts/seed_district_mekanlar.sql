-- İlçe mekan seed — Hilvan, Bozova, Viranşehir, Suruç, Birecik, Siverek
-- Her ilçeye çeşitli kategorilerde 3–4 gerçekçi mekan

INSERT INTO places (
  name, slug, description, short_description,
  address, phone, district_id, category_id,
  latitude, longitude, rating, review_count, status
) VALUES

-- ── HİLVAN (id=10) ──────────────────────────────────────────────────────────
(
  'Hilvan Çarşı Eczanesi',
  'hilvan-carsi-eczanesi',
  'Hilvan ilçe merkezinde hizmet veren Hilvan Çarşı Eczanesi, nöbet saatlerinde ve hafta sonlarında kesintisiz ilaç ve sağlık ürünleri temin ediyor. Kronik hastalık ilaçları, bebek bakım ürünleri ve reçeteli ilaçlar için güvenilir adresiniz.',
  'Hilvan merkez eczanesi, nöbet hizmeti.',
  'Hilvan Çarşı, Merkez Mah., Hilvan/Şanlıurfa', '+90 414 511 10 01',
  10, 61, 37.4800, 38.9650, 4.3, 19, 'active'
),
(
  'Fırat Et Lokantası',
  'firat-et-lokantasi-hilvan',
  'Fırat Et Lokantası, Hilvan''da yöre halkının uğrak noktalarından biri. Sabahın erken saatlerinden akşama kadar Şanlıurfa mutfağının vazgeçilmez lezzetleri sunuluyor: kuzu kavurma, tandır kebap, piyaz ve mevsim çorbaları.',
  'Hilvan''ın sevilen yöresel et lokantası.',
  'Cumhuriyet Mah. İnönü Cad. No:8, Hilvan/Şanlıurfa', '+90 414 511 22 44',
  10, 2, 37.4812, 38.9672, 4.5, 34, 'active'
),
(
  'Hilvan Çiçek Pastanesi',
  'hilvan-cicek-pastanesi',
  'Hilvan Çiçek Pastanesi; baklava, kadayıf ve Türk pastacılık ürünleriyle müşterilerine taze lezzetler sunuyor. Düğün siparişi, hazır pasta ve şerbet büfe hizmetleri de mevcuttur.',
  'Hilvan''ın taze tatlı ve pasta durağı.',
  'Atatürk Cad. No:14, Hilvan/Şanlıurfa', '+90 414 511 33 77',
  10, 21, 37.4795, 38.9645, 4.2, 22, 'active'
),
(
  'Güneş Berber Salonu',
  'gunes-berber-salonu-hilvan',
  'Hilvan merkezdeki Güneş Berber Salonu, yıllardır bölge sakinlerine hizmet veren köklü bir kuaför ve berber işletmesidir. Erkek saç kesimi, sakal düzeltme ve klasik tıraş hizmetleri uygun fiyatlarla sunuluyor.',
  'Hilvan''ın güvenilir berber salonu.',
  'Belediye Yanı, Merkez Mah., Hilvan/Şanlıurfa', '+90 414 511 12 66',
  10, 185, 37.4808, 38.9668, 4.1, 15, 'active'
),

-- ── BOZOVA (id=11) ──────────────────────────────────────────────────────────
(
  'Atakent Aile Sağlık Merkezi',
  'atakent-aile-saglik-merkezi-bozova',
  'Bozova ilçesinde hizmet veren Atakent Aile Sağlık Merkezi; birinci basamak sağlık hizmetleri, aşı, gebelik takibi ve kronik hastalık yönetimi konularında kapsamlı destek sağlıyor.',
  'Bozova''da aile hekimliği ve koruyucu sağlık.',
  'Bozova Merkez Mah. Sağlık Sok. No:3, Bozova/Şanlıurfa', '+90 414 516 10 55',
  11, 57, 37.3720, 38.5140, 4.4, 28, 'active'
),
(
  'Özge Restaurant',
  'ozge-restaurant-bozova',
  'Özge Restaurant, Atatürk Barajı ve Bozova çevresini ziyaret eden turistler ile yerel halk için cazibe merkezi. Fırat balıkları, et döner, lahmacun ve yöresel çorbalarla dolu menüsüyle her öğünde tazelik sunuyor.',
  'Bozova''da Fırat balığı ve yöresel lezzetler.',
  'Atatürk Barajı Yolu Üzeri No:12, Bozova/Şanlıurfa', '+90 414 516 22 33',
  11, 2, 37.3712, 38.5118, 4.6, 47, 'active'
),
(
  'Çelik Kuyumculuk',
  'celik-kuyumculuk-bozova',
  'Bozova''da on yılı aşkın deneyime sahip Çelik Kuyumculuk; altın bilezik, yüzük, kolye ve gümüş aksesuar satışı yapıyor. Düğün takıları için özel sipariş ve onarım hizmeti de sunulmaktadır.',
  'Bozova merkez kuyumcusu, düğün takısı uzmanı.',
  'Bozova Çarşı Cad. No:22, Bozova/Şanlıurfa', '+90 414 516 14 88',
  11, 147, 37.3725, 38.5132, 4.3, 21, 'active'
),
(
  'Bozova Konak Otel',
  'bozova-konak-otel',
  'Bozova Konak Otel, Atatürk Barajı ziyaretçileri için rahat ve uygun fiyatlı konaklama seçeneği sunuyor. Doğa manzaralı odaları, kahvaltı hizmeti ve ücretsiz otopark ile konuklarını ağırlıyor.',
  'Bozova''da baraj manzaralı konaklama.',
  'Çarşı Mah. Konak Sok. No:5, Bozova/Şanlıurfa', '+90 414 516 30 10',
  11, 41, 37.3730, 38.5145, 4.2, 33, 'active'
),

-- ── VİRANŞEHİR (id=5) ───────────────────────────────────────────────────────
(
  'Viranşehir Şifa Eczanesi',
  'viransehir-sifa-eczanesi',
  'Viranşehir merkezdeki Şifa Eczanesi, geniş ilaç stoku ve deneyimli eczacılarıyla hizmet veriyor. Nöbet günlerinde 24 saat açık olan eczane, reçeteli ilaçlar, vitamin ve dermokozmetik ürünler konusunda kapsamlı hizmet sunmaktadır.',
  'Viranşehir nöbet eczanesi, geniş ürün yelpazesi.',
  'Cumhuriyet Cad. No:31, Viranşehir/Şanlıurfa', '+90 414 411 22 55',
  5, 61, 37.2295, 39.7663, 4.4, 38, 'active'
),
(
  'Kebapçı Serhan Usta',
  'kebapci-serhan-usta-viransehir',
  'Viranşehir''de yıllardır Şanlıurfa kebabı geleneğini yaşatan Serhan Usta, tandırda pişen kuzu etleri ve közde hazırlanan sebzeler ile gerçek Urfa lezzetini konuklarına sunuyor. Özellikle hafta sonları yoğun talep görüyor.',
  'Viranşehir''in ünlü tandır kebap ustası.',
  'Pazar Mah. Kebapçılar Çarşısı No:4, Viranşehir/Şanlıurfa', '+90 414 411 18 90',
  5, 2, 37.2301, 38.9680, 4.7, 62, 'active'
),
(
  'Medya Spor Salonu',
  'medya-spor-salonu-viransehir',
  'Viranşehir''deki Medya Spor Salonu, modern ekipmanları, deneyimli antrenörleri ve düzenli grup derslerikle spor tutkunlarına hizmet veriyor. Fitness, kardiyo ve ağırlık çalışması için çeşitli üyelik paketleri mevcuttur.',
  'Viranşehir''de modern fitness merkezi.',
  'Yeni Mah. Spor Cad. No:17, Viranşehir/Şanlıurfa', '+90 414 411 55 44',
  5, 273, 37.2288, 38.9652, 4.3, 24, 'active'
),
(
  'Yıldız Pastane ve Börekçi',
  'yildiz-pastane-borekci-viransehir',
  'Viranşehir''de sabahın erken saatlerinden itibaren açılan Yıldız Pastane ve Börekçi, taze su böreği, poğaça, baklava ve çay ile müşterilerine günaydın diyor. Öğleden sonra simit, poğaça ve tatlı çeşitleri de hazır.',
  'Viranşehir''de taze börek ve pastane.',
  'Atatürk Cad. No:44, Viranşehir/Şanlıurfa', '+90 414 411 33 08',
  5, 21, 37.2298, 38.9661, 4.5, 41, 'active'
),

-- ── SURUÇ (id=6) ─────────────────────────────────────────────────────────────
(
  'Suruç Merkez Eczanesi',
  'suruc-merkez-eczanesi',
  'Suruç ilçe merkezinde hizmet veren Merkez Eczanesi; reçeteli ilaç temini, sağlık danışmanlığı ve sağlık ürünleri satışı ile bölge halkına destek oluyor. Nöbet hizmetiyle acil ihtiyaçlarda da erişilebilir.',
  'Suruç''ta güvenilir nöbet eczanesi.',
  'Suruç Çarşı Mah. Ana Cad. No:16, Suruç/Şanlıurfa', '+90 414 611 10 22',
  6, 61, 36.9725, 38.4302, 4.3, 17, 'active'
),
(
  'Dicle Lokantası',
  'dicle-lokantasi-suruc',
  'Suruç''ta ailelerin tercih ettiği köklü lokanta olan Dicle Lokantası; günlük hazırlanan yemekler, etli ekmek, mercimek çorbası ve simit sabah saatlerinde sunuluyor. Öğle saatlerinde tabldot menüsü de tercih edilen seçenekler arasında.',
  'Suruç''ta ev yemeği lezzetiyle tanınan lokanta.',
  'Cumhuriyet Mah. Çarşı Sok. No:9, Suruç/Şanlıurfa', '+90 414 611 22 44',
  6, 2, 36.9718, 38.4295, 4.4, 29, 'active'
),
(
  'Güler Kuaför',
  'guler-kuafor-suruc',
  'Suruç''taki Güler Kuaför, bayan kuaförlük hizmetleri sunan deneyimli bir salon. Saç kesimi, boyama, keratin bakımı ve gelin saçı konularında uzman ekibiyle çalışıyor. Randevulu ya da sırasız kabul yapılıyor.',
  'Suruç''ta profesyonel bayan kuaför salonu.',
  'Yeni Mah. İnönü Cad. No:7, Suruç/Şanlıurfa', '+90 414 611 33 55',
  6, 184, 36.9730, 38.4310, 4.2, 22, 'active'
),
(
  'Suruç Pazar Çarşısı',
  'suruc-pazar-carsisi',
  'Suruç Pazar Çarşısı, haftanın belirli günlerinde kurulan ve bölge çiftçilerinin yerel ürünlerini sattığı geleneksel bir pazar alanıdır. Taze sebze, meyve, peynir çeşitleri ve yöresel el ürünleri bulunabilir.',
  'Suruç''ta taze ürün pazarı.',
  'Suruç Pazar Alanı, Suruç/Şanlıurfa', NULL,
  6, 2, 36.9720, 38.4285, 4.0, 14, 'active'
),

-- ── BİRECİK (id=7) ──────────────────────────────────────────────────────────
(
  'Fırat Nehri Kenarı Restaurant',
  'firat-nehri-kenari-restaurant-birecik',
  'Birecik''in simgesi Fırat Nehri''nin hemen yanı başında kurulu bu restorantta balık taze sunuluyor. Fırat levreği, sazan ve diğer nehir balıklarını mangalda veya buğulamada yiyebilirsiniz. Manzaralı masalar rezervasyona tabidir.',
  'Birecik''te nehir kenarında taze balık restoranı.',
  'Fırat Sahil Yolu No:3, Birecik/Şanlıurfa', '+90 414 318 11 22',
  7, 2, 37.0283, 37.9755, 4.7, 58, 'active'
),
(
  'Birecik Kalesi Ziyaret Durağı',
  'birecik-kalesi-ziyaret-duragi',
  'Birecik Kalesi''nin eteklerinde konumlanan bu küçük kafe-ziyaret durağı, tarihi kale gezisinizin öncesi veya sonrasında mola vermek için ideal. Çay, Türk kahvesi ve hafif atıştırmalıklar servis ediliyor.',
  'Birecik Kalesi eteklerinde mola noktası.',
  'Birecik Kalesi Yolu Üzeri, Birecik/Şanlıurfa', '+90 414 318 33 11',
  7, 2, 37.0295, 37.9742, 4.4, 32, 'active'
),
(
  'Akıncı Eczanesi Birecik',
  'akinci-eczanesi-birecik',
  'Birecik çarşı bölgesinde merkezi konumuyla öne çıkan Akıncı Eczanesi, yerli ve yabancı ilaçlar, vitamin takviyesi ve medikal malzeme satışı yapıyor. Eczacı danışmanlığı ve nöbet hizmetiyle tüm saatlerde erişilebilir.',
  'Birecik merkez eczanesi.',
  'Çarşı Cad. No:18, Birecik/Şanlıurfa', '+90 414 318 10 44',
  7, 61, 37.0275, 37.9748, 4.3, 21, 'active'
),

-- ── SİVEREK (id=4) ──────────────────────────────────────────────────────────
(
  'Siverek Et Merkezi',
  'siverek-et-merkezi',
  'Siverek''in en köklü kasaplarından biri olan Siverek Et Merkezi, günlük kesilen taze kırmızı et, kuzu eti, tavuk ve hazır köfte çeşitleri sunuyor. Helal kesilmiş, sertifikalı et garantisi veriliyor.',
  'Siverek''in güvenilir kasabı, taze et.',
  'Siverek Pazar Mah. Kasaplar Çarşısı No:7, Siverek/Şanlıurfa', '+90 414 511 44 88',
  4, 2, 37.7540, 39.3185, 4.5, 44, 'active'
),
(
  'Siverek Huzur Otel',
  'siverek-huzur-otel',
  'Siverek ilçe merkezinde konumlanan Huzur Otel, iş seyahatleri ve uzun dönem konaklamalar için uygun fiyatlı bir tercih. Klimalı odaları, kahvaltı dahil seçeneği ve otopark hizmetiyle misafirlerine konforlu bir ortam sunuyor.',
  'Siverek''te uygun fiyatlı şehir oteli.',
  'İnönü Cad. No:24, Siverek/Şanlıurfa', '+90 414 511 55 77',
  4, 41, 37.7548, 39.3192, 4.1, 37, 'active'
),
(
  'Koç Kuyumculuk Siverek',
  'koc-kuyumculuk-siverek',
  'Siverek''te altın ve gümüş takı alım-satımı yapan Koç Kuyumculuk; bilezik, kolye, yüzük ve küpe modelleriyle geniş bir portföy sunuyor. Hurda altın değerlendirme ve tamir hizmetleri de mevcuttur.',
  'Siverek''te altın-gümüş kuyumculuk.',
  'Siverek Çarşı Cad. No:32, Siverek/Şanlıurfa', '+90 414 511 60 11',
  4, 147, 37.7533, 39.3178, 4.3, 26, 'active'
)

ON CONFLICT (slug) DO NOTHING;
