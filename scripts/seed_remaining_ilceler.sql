-- Halfeti, Akçakale, Ceylanpınar, Harran — mekan takviyesi

INSERT INTO places (
  name, slug, description, short_description,
  address, phone, district_id, category_id,
  latitude, longitude, rating, review_count, status
) VALUES

-- ── HALFETİ (id=12) ─────────────────────────────────────────────────────────
(
  'Halfeti Nehir Balık Restaurant',
  'halfeti-nehir-balik-restaurant',
  'Fırat Nehri kıyısında konumlanan Halfeti Nehir Balık Restaurant, dere ve nehir balıklarını taze olarak servis ediyor. Tekne turunu tamamlayan ziyaretçilerin en çok tercih ettiği mekânlardan biridir. Manzaralı masalar ve akşam saatlerinde nehir sesi eşliğinde yemek imkânı sunuluyor.',
  'Halfeti''de nehir kıyısında taze balık.',
  'Fırat Nehri Kıyısı, Halfeti Merkez, Halfeti/Şanlıurfa', '+90 414 411 90 11',
  12, 2, 37.2525, 37.8698, 4.7, 88, 'active'
),
(
  'Halfeti Butik Otel',
  'halfeti-butik-otel',
  'Sular altında kalan tarihi Halfeti''nin hikâyesini taşıyan bu butik otel, nehir manzaralı odalarıyla konuklarına unutulmaz bir konaklama deneyimi sunuyor. Sabah kahvaltısı da sunan otel, tekne turu rezervasyonu konusunda yardımcı olabiliyor.',
  'Halfeti''de nehir manzaralı butik otel.',
  'Nehir Cad. No:7, Halfeti/Şanlıurfa', '+90 414 411 95 22',
  12, 41, 37.2531, 37.8705, 4.5, 61, 'active'
),
(
  'Halfeti Tur Tekneleri',
  'halfeti-tur-tekneleri',
  'Halfeti tekne turları, Rum Kale, Su Altı Camii ve siyah gül bahçelerini keşfetmek için vazgeçilmez bir deneyim. Halfeti Tur Tekneleri işletmesi, grup ve bireysel turlar için uygun fiyatlı paketler sunuyor; önceden rezervasyon tavsiye edilir.',
  'Halfeti''nin ünlü tekne turları.',
  'Halfeti İskele, Halfeti/Şanlıurfa', '+90 414 411 88 44',
  12, 2, 37.2515, 37.8692, 4.8, 124, 'active'
),
(
  'Siyah Gül Kafe',
  'siyah-gul-kafe-halfeti',
  'Dünyada yalnızca Halfeti''de yetişen nadir siyah güllerin adını taşıyan bu kafe, tekne turu sonrası için ideal bir mola noktası. Türk kahvesi, çay, taze meyve suları ve hafif atıştırmalıklar sunuluyor. Nehir manzaralı terası ile fotoğraf çekimi için mükemmel.',
  'Halfeti''nin ikonik nehir manzaralı kafesi.',
  'İskele Yanı, Halfeti/Şanlıurfa', NULL,
  12, 2, 37.2520, 37.8695, 4.6, 95, 'active'
),

-- ── AKÇAKALE (id=8) ──────────────────────────────────────────────────────────
(
  'Akçakale Sınır Lokantası',
  'akcakale-sinir-lokantasi',
  'Akçakale''de Türkiye-Suriye sınırına yakın konumuyla dikkat çeken bu lokanta, yoğun ticaret trafiğine hizmet veriyor. Şanlıurfa''ya özgü etli pide, lahmacun ve döner sunuluyor. Uygun fiyatlı tabldot seçeneği ile sabah-öğle-akşam hizmet veriliyor.',
  'Akçakale''de uygun fiyatlı sınır lokantası.',
  'Sınır Kapısı Cad. No:14, Akçakale/Şanlıurfa', '+90 414 311 22 33',
  8, 2, 36.7131, 38.9460, 4.2, 31, 'active'
),
(
  'Akçakale Devlet Hastanesi Eczanesi',
  'akcakale-devlet-hastanesi-eczanesi',
  'Akçakale Devlet Hastanesi bünyesinde hizmet veren eczane, ilçe ve çevre köylerin sağlık ihtiyacına cevap veriyor. Reçeteli ilaçlar, kronik hastalık tedavi ürünleri ve bebek bakım malzemeleri stokta bulunduruluyor.',
  'Akçakale ilçe hastane eczanesi.',
  'Akçakale Devlet Hastanesi Yanı, Akçakale/Şanlıurfa', '+90 414 311 10 55',
  8, 61, 36.7124, 38.9452, 4.1, 14, 'active'
),
(
  'Akçakale Çarşı Kuyumcusu',
  'akcakale-carsi-kuyumcusu',
  'Akçakale çarşısındaki bu köklü kuyumcu, altın bilezik, yüzük ve kolye satışının yanı sıra gümüş aksesuar da sunuyor. Sınır ticaretinin canlı olduğu ilçede rekabetçi fiyatlarla hizmet veriyor.',
  'Akçakale''de altın-gümüş kuyumculuk.',
  'Akçakale Çarşı Mah. Kuyumcular Sok. No:5, Akçakale/Şanlıurfa', '+90 414 311 33 77',
  8, 147, 36.7135, 38.9468, 4.0, 18, 'active'
),

-- ── CEYLANPINAR (id=9) ───────────────────────────────────────────────────────
(
  'Ceylanpınar Tarım İşletmesi Misafirhanesi',
  'ceylanpinar-tarim-isletmesi-misafirhanesi',
  'Türkiye''nin en büyük devlet tarım işletmelerinden biri olan Ceylanpınar TİGEM bünyesindeki misafirhane, tarım çalışmaları ve ilçeyi ziyaret edenlere uygun fiyatlı konaklama imkânı sunuyor. Geniş tarım arazilerini gözlemlemek isteyenler için özgün bir deneyim.',
  'Ceylanpınar''da TİGEM misafirhanesi.',
  'Ceylanpınar TİGEM Merkezi, Ceylanpınar/Şanlıurfa', '+90 414 411 51 00',
  9, 41, 36.8451, 40.0412, 4.0, 11, 'active'
),
(
  'Ceylanpınar Merkez Lokantası',
  'ceylanpinar-merkez-lokantasi',
  'Ceylanpınar ilçe merkezinde konumlanan bu lokanta, tarım işçileri ve yerel halkın buluşma noktası. Sabahtan akşama kadar Şanlıurfa mutfağından yöresel yemekler, çorbalar ve et yemekleri servis ediliyor.',
  'Ceylanpınar''da yöresel yemek lokantası.',
  'Ceylanpınar Merkez Mah. Ana Cad. No:11, Ceylanpınar/Şanlıurfa', '+90 414 411 52 44',
  9, 2, 36.8448, 40.0405, 4.2, 22, 'active'
),
(
  'Ceylanpınar Eczanesi',
  'ceylanpinar-eczanesi',
  'Ceylanpınar''da ilçe merkezinde hizmet veren eczane, sınıra yakın konumuyla da önem taşıyor. Kronik hastalık ilaçları, bebek ürünleri ve sağlık malzemeleri temin edilebiliyor. Nöbet günlerinde 24 saat açık.',
  'Ceylanpınar ilçe merkez eczanesi.',
  'Ceylanpınar Merkez Mah. Sağlık Cad. No:3, Ceylanpınar/Şanlıurfa', '+90 414 411 50 22',
  9, 61, 36.8455, 40.0418, 4.2, 9, 'active'
),

-- ── HARRAN (id=13) ───────────────────────────────────────────────────────────
(
  'Harran Kümbet Evleri Kafe',
  'harran-kumbet-evleri-kafe',
  'Harran''ın ikonik petek (kümbet) evlerinden birinde faaliyet gösteren bu benzersiz kafe, ziyaretçilere tarihin tam içinde çay ve Türk kahvesi içme deneyimi sunuyor. Fotoğraf çekimi için en popüler lokasyonlardan biri olan kafe, bölgenin El Sanatları ürünlerini de satışa sunuyor.',
  'Harran''ın tarihi petek evinde kafe.',
  'Harran Ören Yeri Yanı, Harran/Şanlıurfa', NULL,
  13, 2, 36.8626, 39.0235, 4.8, 143, 'active'
),
(
  'Harran Tur Rehberi Merkezi',
  'harran-tur-rehberi-merkezi',
  'Harran''ı ziyaret eden turistlere profesyonel rehberlik hizmeti sunan merkez, kümbet evleri, Harran Üniversitesi, tarihi kale ve arkeolojik alanlar için tur programları hazırlıyor. Türkçe ve İngilizce rehber seçeneği mevcut.',
  'Harran''da profesyonel tur rehberliği.',
  'Harran Müze Yanı, Harran/Şanlıurfa', '+90 414 441 10 88',
  13, 2, 36.8620, 39.0228, 4.7, 67, 'active'
),
(
  'Harran Höyük Restaurant',
  'harran-hoyuk-restaurant',
  'Harran arkeolojik alanına yakın konumuyla ziyaretçilerin öğle molası için tercih ettiği Harran Höyük Restaurant, tandır kebabı, kuzu çevirme ve yöresel mezelerle zengin bir sofra sunuyor. Geniş bahçe alanı piknik ve grup rezervasyonu için uygun.',
  'Harran ören yeri yakınında yöresel lezzetler.',
  'Harran Ören Yeri Cad. No:2, Harran/Şanlıurfa', '+90 414 441 22 00',
  13, 2, 36.8633, 39.0241, 4.5, 89, 'active'
)

ON CONFLICT (slug) DO NOTHING;
