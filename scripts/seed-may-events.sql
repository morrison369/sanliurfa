-- Mayıs 2026 Etkinlikleri Seed (bugün: 2026-05-08)
-- 10 yeni etkinlik — tüm ay boyunca dağılmış

INSERT INTO events (
  id, title, slug, description, location, organizer,
  start_date, end_date, category, is_free, is_online,
  is_featured, status, capacity, image_url, tags
) VALUES

-- 1
(gen_random_uuid(),
 'Şanlıurfa Fotoğraf Sanatı Sergisi',
 'sanliurfa-fotograf-sanati-sergisi-2026',
 'Şanlıurfa''nın tarihi ve kültürel dokusunu mercek altına alan fotoğrafçıların eserleri Kültür Merkezi''nde sergileniyor. Göbeklitepe, Harran ve Balıklıgöl''ün büyülü anları dijital ve baskılı kareler halinde görücüye çıkıyor.',
 'Şanlıurfa Kültür ve Sanat Merkezi', 'Şanlıurfa Fotoğrafçılar Derneği',
 '2026-05-10 10:00:00', '2026-05-15 18:00:00',
 'Kültür & Sanat', true, false, true, 'published', 500,
 '/uploads/events/fotograf-sergisi.jpg',
 ARRAY['fotoğraf', 'sergi', 'kültür', 'sanat']),

-- 2
(gen_random_uuid(),
 'Harran Antik Kent Rehberli Gezi',
 'harran-antik-kent-rehberli-gezi-mayis-2026',
 'UNESCO Dünya Mirası adayı Harran antik kentini uzman arkeolog rehberler eşliğinde keşfediyoruz. Konik evler, Han el-Barur ve tarihi camiler turda yer alıyor. Katılım sınırlı, önceden kayıt gerekiyor.',
 'Harran Antik Kenti', 'Şanlıurfa Kültür Turizm Müdürlüğü',
 '2026-05-11 09:00:00', '2026-05-11 17:00:00',
 'Turizm & Kültür', false, false, true, 'published', 40,
 '/uploads/events/harran-gezi.jpg',
 ARRAY['harran', 'antik', 'arkeoloji', 'gezi', 'tur']),

-- 3
(gen_random_uuid(),
 'Göbeklitepe Bilim ve Kültür Günü',
 'gobeklitepe-bilim-kultur-gunu-2026',
 'Dünyanın en eski tapınağı Göbeklitepe''yi çevre bölgelerin öğrencileriyle buluşturan bilim şenliği. Sunum, atölye ve rehberli keşif turları. Tüm yaşlara açık, katılım ücretsiz.',
 'Göbeklitepe Ziyaretçi Merkezi, Karadag', 'Göbeklitepe Vakfı',
 '2026-05-14 09:30:00', '2026-05-14 16:00:00',
 'Eğitim & Bilim', true, false, true, 'published', 300,
 '/uploads/events/gobeklitepe-bilim.jpg',
 ARRAY['göbeklitepe', 'arkeoloji', 'bilim', 'eğitim']),

-- 4
(gen_random_uuid(),
 'Balıklıgöl Kültür Şenliği',
 'balikligol-kultur-senligi-mayis-2026',
 'Şanlıurfa''nın sembolü Balıklıgöl çevresinde geleneksel el sanatları, müzik ve lezzet şenliği. Bakırcılar, dokumacılar ve yöresel tatlar tek alanda buluşuyor. Yerel sanatçıların sahne alacağı akşam konserleri de programa dahil.',
 'Balıklıgöl Meydanı', 'Şanlıurfa Büyükşehir Belediyesi',
 '2026-05-17 10:00:00', '2026-05-18 22:00:00',
 'Kültür & Eğlence', true, false, true, 'published', 2000,
 '/uploads/events/balikligol-senligi.jpg',
 ARRAY['balıklıgöl', 'şenlik', 'kültür', 'müzik', 'el sanatları']),

-- 5
(gen_random_uuid(),
 'Şanlıurfa Gastronomi Haftası',
 'sanliurfa-gastronomi-haftasi-2026',
 'Çiğ köfte, lahmacun, katmer ve künefe başta olmak üzere Güneydoğu Anadolu mutfağının eşsiz lezzetleri şef yarışması, tadım etkinlikleri ve tarif atölyeleriyle kutlanıyor. Türkiye''nin dört bir yanından gastronomi tutkunları Urfa''ya akın ediyor.',
 'Şanlıurfa Fuar Alanı', 'Urfa Mutfak Derneği & TURSAB',
 '2026-05-19 11:00:00', '2026-05-24 20:00:00',
 'Gastronomi', true, false, true, 'published', 5000,
 '/uploads/events/gastronomi-haftasi.jpg',
 ARRAY['gastronomi', 'yemek', 'festival', 'lahmacun', 'künefe', 'katmer']),

-- 6
(gen_random_uuid(),
 'Halfeti Tekne Turu ve Bahar Festivali',
 'halfeti-tekne-turu-bahar-festivali-2026',
 'Fırat Nehri üzerindeki sular altındaki Rumkale eşliğinde unutulmaz tekne turları. Bahar çiçekleriyle bezeli Halfeti köyünde siyah gül sergisi ve yerel lezzetler. Günlük turlar sabah 09:00''da kalkıyor.',
 'Halfeti İskele', 'Halfeti Kaymakamlığı & Tekne İşletmecileri Kooperatifi',
 '2026-05-22 09:00:00', '2026-05-25 18:00:00',
 'Turizm & Doğa', false, false, true, 'published', 200,
 '/uploads/events/halfeti-tekne-festivali.jpg',
 ARRAY['halfeti', 'tekne', 'fırat', 'doğa', 'siyah gül']),

-- 7
(gen_random_uuid(),
 'Geleneksel Urfa El Sanatları Pazarı',
 'geleneksel-urfa-el-sanatlari-pazari-mayis-2026',
 'Bakır işleme, çömlekçilik, yöresel dokuma ve boncuk takı ustaları bir arada. Çocuklar için mini atölye köşeleri. Hafta sonu boyunca halk oyunları gösterisi ve bağlama performansları.',
 'Kapalıçarşı Meydanı, Şanlıurfa', 'Urfa Esnaf Odaları Birliği',
 '2026-05-23 09:00:00', '2026-05-24 19:00:00',
 'El Sanatları & Kültür', true, false, false, 'published', 1000,
 '/uploads/events/el-sanatlari-pazari.jpg',
 ARRAY['el sanatları', 'pazar', 'bakır', 'dokuma', 'halk oyunları']),

-- 8
(gen_random_uuid(),
 'Şanlıurfa Çocuk Şenliği',
 'sanliurfa-cocuk-senligi-mayis-2026',
 'Çocuklar için tasarlanmış özel programa dahil tiyatro, kukla gösterisi, resim yarışması ve mini spor turnuvaları. Şanlıurfa''nın genç nesli tarih ve kültürle eğlenceli bir şekilde buluşuyor.',
 'Atatürk Parkı, Şanlıurfa', 'Şanlıurfa Belediyesi Kültür İşleri',
 '2026-05-23 10:00:00', '2026-05-23 17:00:00',
 'Çocuk & Aile', true, false, false, 'published', 500,
 '/uploads/events/cocuk-senligi.jpg',
 ARRAY['çocuk', 'şenlik', 'tiyatro', 'aile', 'eğlence']),

-- 9
(gen_random_uuid(),
 'Urfa Kültür ve Turizm Festivali',
 'urfa-kultur-turizm-festivali-2026',
 'Her yıl geleneksel olarak düzenlenen Urfa Kültür Festivali''nde Türkiye''nin ve dünya''nın farklı bölgelerinden sanatçılar buluşuyor. Konser, sergi, panel ve şehir turlarını kapsayan 3 günlük program.',
 'Harran Üniversitesi Merkez Yerleşke', 'Şanlıurfa Valiliği',
 '2026-05-29 10:00:00', '2026-05-31 22:00:00',
 'Kültür & Festival', true, false, true, 'published', 3000,
 '/uploads/events/kultur-festivali.jpg',
 ARRAY['festival', 'kültür', 'turizm', 'konser', 'sanat']),

-- 10
(gen_random_uuid(),
 'Şanlıurfa Miras Yürüyüşü',
 'sanliurfa-miras-yuruyusu-mayis-2026',
 'Tarihi Şanlıurfa surlarını, Kalesi''ni ve geleneksel mahallelerini kapsayan 5 km''lik yürüyüş rotası. Gönüllü rehberler eşliğinde her pazar düzenleniyor. Uygulama üzerinden kayıt gerekiyor.',
 'Şanlıurfa Kalesi Girişi', 'Şanlıurfa Belediyesi Turizm Birimi',
 '2026-05-10 08:30:00', '2026-05-10 12:00:00',
 'Turizm & Kültür', true, false, false, 'published', 50,
 '/uploads/events/miras-yuruyusu.jpg',
 ARRAY['yürüyüş', 'tarihi', 'kale', 'miras', 'tur'])

ON CONFLICT (slug) DO NOTHING;

SELECT COUNT(*) AS toplam_etkinlik FROM events WHERE status='published';
SELECT COUNT(*) AS mayis_etkinlik FROM events WHERE start_date >= '2026-05-01' AND start_date < '2026-06-01';
