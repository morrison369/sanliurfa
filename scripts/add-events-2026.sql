-- 2026 Şanlıurfa Etkinlikleri
INSERT INTO app.events (
  title, slug, description, start_date, end_date,
  location, category, status, is_featured, created_at
) VALUES
(
  'Uluslararası Göbeklitepe Kültür Sanat Festivali',
  'uluslararasi-gobeklitepe-kultur-sanat-festivali-2026',
  'Dünyanın en eski tapınak kompleksi Göbeklitepe''nin keşfini kutlayan uluslararası kültür ve sanat festivali. Konserler, sergiler, arkeoloji konferansları ve folklor gösterileri ile dolup taşan 5 günlük etkinlik.',
  '2026-06-05', '2026-06-09',
  'Göbeklitepe Arkeoloji Alanı, Örencik Köyü, Şanlıurfa', 'Kültür', 'active', true, NOW()
),
(
  'Şanlıurfa Ramazan Etkinlikleri 2026',
  'sanliurfa-ramazan-etkinlikleri-2026',
  'Ramazan boyunca Balıklıgöl çevresinde düzenlenen geleneksel Şanlıurfa kültür etkinlikleri. İftar programları, sıra geceleri, Türk sanat müziği konserleri ve el sanatları sergileri.',
  '2026-05-20', '2026-06-18',
  'Balıklıgöl Meydanı, Haliliye, Şanlıurfa', 'Kültür', 'active', true, NOW()
),
(
  'Harran Tarih ve Kültür Festivali',
  'harran-tarih-ve-kultur-festivali-2026',
  'Dünyanın ilk üniversitesine ev sahipliği yapan Harran''da düzenlenen geleneksel kültür festivali. Arkeoloji turları, koni evli köy ziyaretleri, tarihi kostüm gösterileri ve yöresel lezzetler.',
  '2026-07-03', '2026-07-05',
  'Harran Kalesi, Harran İlçesi, Şanlıurfa', 'Tarih', 'active', true, NOW()
),
(
  'Şanlıurfa Gastronomi Festivali',
  'sanliurfa-gastronomi-festivali-2026',
  'Türkiye''nin gastronomi başkentlerinden Şanlıurfa''nın eşsiz mutfağını tanıtan büyük festival. Ciğer, kebap, lahmacun, katmer ve isot biber ürünlerinin ustası şeflerin katılımıyla lezzet yarışmaları.',
  '2026-07-18', '2026-07-20',
  'Atatürk Bulvarı Etkinlik Alanı, Haliliye, Şanlıurfa', 'Gastronomi', 'active', true, NOW()
),
(
  'Halfeti Tekne Turu ve Doğa Festivali',
  'halfeti-tekne-turu-ve-doga-festivali-2026',
  'Batık köy Rumkale ve siyah gülleriyle ünlü Halfeti''de sabah tekne turları, kuş gözlem aktiviteleri, fotoğraf atölyeleri ve yöresel el sanatları sergisi.',
  '2026-05-30', '2026-06-01',
  'Halfeti İskele Meydanı, Halfeti, Şanlıurfa', 'Doğa', 'active', true, NOW()
),
(
  'Geleneksel Şanlıurfa Sıra Gecesi',
  'geleneksel-sanliurfa-sira-gecesi-temmuz-2026',
  'Kadim Şanlıurfa geleneği sıra gecesi; saz, ud, kemençe eşliğinde yöresel türküler, mani atışmaları ve geleneksel oyunlar. Davetiye ile katılım; kayıt yaptıranlar için sofra hizmeti.',
  '2026-07-11', '2026-07-11',
  'Tahmis Kahvesi, Kapalı Çarşı Yanı, Haliliye, Şanlıurfa', 'Müzik', 'active', false, NOW()
),
(
  'Göbeklitepe Yaz Akşamı Ziyareti',
  'gobeklitepe-yaz-aksami-ziyareti-2026',
  'Gün batımında Göbeklitepe''yi ziyaret etme fırsatı. Arkeolog rehber eşliğinde T-sütunlar ve hayvan kabartmaları keşfi; akabinde açık hava konser ve atölye.',
  '2026-08-01', '2026-08-01',
  'Göbeklitepe Ziyaretçi Merkezi, Şanlıurfa', 'Arkeoloji', 'active', false, NOW()
),
(
  'Şanlıurfa Fotoğraf Günleri',
  'sanliurfa-fotograf-gunleri-2026',
  'Şanlıurfa''nın tarihi dokusunu, Balıklıgöl''ü, Harran''ı ve Halfeti''yi mercek altına alan uluslararası fotoğraf etkinliği. Atölyeler, sergi, fotoğraf yürüyüşleri ve ödüllü yarışma.',
  '2026-08-14', '2026-08-16',
  'Şanlıurfa Müzesi Bahçesi, Haliliye, Şanlıurfa', 'Sanat', 'active', false, NOW()
),
(
  'Müzeler Gecesi — Şanlıurfa Müzesi',
  'muzeler-gecesi-sanliurfa-2026',
  'Avrupa Müzeler Gecesi kapsamında Şanlıurfa Müzesi''nin geç saatlere kadar ücretsiz ziyarete açıldığı özel gece. Arkeologlardan sunum, çocuklar için atölye ve ışıklı sergi.',
  '2026-05-16', '2026-05-16',
  'Şanlıurfa Müzesi, Haliliye, Şanlıurfa', 'Kültür', 'active', false, NOW()
),
(
  'Uluslararası Şanlıurfa Kültür Yolculuğu',
  'uluslararasi-sanliurfa-kultur-yolculugu-2026',
  'Yabancı turistlere yönelik rehberli kültür turu paketi: Göbeklitepe, Harran, Halfeti, Balıklıgöl, Kapalı Çarşı ve geleneksel evleri kapsayan 3 günlük program.',
  '2026-09-05', '2026-09-07',
  'Şanlıurfa Şehir Merkezi (Başlangıç Noktası)', 'Turizm', 'active', true, NOW()
),
(
  'Sonbahar Isot Hasatı Etkinliği',
  'sonbahar-isot-hasati-etkinligi-2026',
  'Şanlıurfa''nın coğrafi işaretli isot biberinin hasat döneminde gerçekleştirilen geleneksel köy şenliği. Tarla ziyareti, isot kurutma ve ezme atölyesi, yöresel yemek şöleni.',
  '2026-09-12', '2026-09-13',
  'Şanlıurfa İsot Üretim Köyleri, Eyyübiye', 'Gastronomi', 'active', false, NOW()
)
ON CONFLICT (slug) DO NOTHING;
