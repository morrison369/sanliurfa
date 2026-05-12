-- İlçe açıklamaları ve SEO meta verileri güncelleme
-- Session V — SEO Audit Fix (oku.txt - İlçe sayfaları)

UPDATE districts SET
  description = 'Şanlıurfa''nın tarihi ve manevi merkezini oluşturan Eyyübiye, Balıklıgöl çevresi, Hz. İbrahim''in doğduğuna inanılan mağara, Rızvaniye Camii ve Halil Rahman Külliyesi ile inanç turizminin odak noktasıdır. Kapalı Çarşı, Gümrük Hanı, Bakırcılar ve Kuyumcular Çarşısı bu ilçede yer alır; geleneksel el sanatları, yöresel lezzetler ve tarihi yapılar yoğun bir seyahat deneyimi sunar.',
  meta_title = 'Eyyübiye Rehberi — Balıklıgöl, Tarihi Çarşı ve İnanç Turizmi',
  meta_description = 'Şanlıurfa Eyyübiye ilçesi: Balıklıgöl, Hz. İbrahim Mağarası, Rızvaniye Camii, Kapalı Çarşı ve Gümrük Hanı. Tarihi ve manevi merkez rehberi.'
WHERE slug = 'eyyubiye';

UPDATE districts SET
  description = 'Şanlıurfa''nın modern şehir merkezi olan Haliliye, büyük alışveriş merkezleri, resmi kurumlar, üniversite kampüsü ve konut alanlarıyla günlük şehir yaşamının kalbinde yer alır. GAP Otogarı bu ilçede bulunur; şehre giriş çıkışın merkezidir. Kafeler, restoranlar ve hizmet sektörü mekanları bakımından Şanlıurfa''nın en gelişmiş ilçelerinden biridir.',
  meta_title = 'Haliliye Rehberi — Şanlıurfa Şehir Merkezi Mekanları',
  meta_description = 'Şanlıurfa Haliliye ilçesi: GAP Otogarı, alışveriş merkezleri, kafeler, restoranlar ve şehir merkezi mekanları rehberi.'
WHERE slug = 'haliliye';

UPDATE districts SET
  description = 'Karaköprü, Şanlıurfa''nın hızla gelişen modern konut bölgesidir. Geniş bulvarları, yeni inşaat projeleri, yerel kafeler ve marketleriyle şehrin batı yakasında yoğun nüfuslu bir yaşam alanı oluşturur. Büyük market zincirleri, spor tesisleri ve yerel esnaf Karaköprü''de bir arada bulunur.',
  meta_title = 'Karaköprü Rehberi — Şanlıurfa Modern Konut Bölgesi',
  meta_description = 'Şanlıurfa Karaköprü ilçesi: modern konut bölgesi, kafeler, marketler ve yerel esnaf rehberi.'
WHERE slug = 'karakopru';

UPDATE districts SET
  description = 'Halfeti, Fırat Nehri kenarına kurulu eşsiz konumuyla Şanlıurfa''nın en romantik ilçesidir. Atatürk Barajı''nın dolmasıyla sular altında kalan tarihi eski Halfeti''nin izleri hâlâ görünürken, yeni ilçe tekne turları ve Fırat manzarasıyla ziyaretçileri büyülemektedir. Siyah gülleri, dar sokakları ve Rumkale harabeleriyle eşsiz bir destinasyondur.',
  meta_title = 'Halfeti Rehberi — Fırat Nehri, Tekne Turu ve Siyah Güller',
  meta_description = 'Şanlıurfa Halfeti: Fırat Nehri kıyısı, tekne turu, batık şehir manzarası, Rumkale harabeleri ve siyah güller. Gezi rehberi.'
WHERE slug = 'halfeti';

UPDATE districts SET
  description = 'Harran, insanlığın bilinen en eski yerleşim merkezlerinden biridir. Dünyada hâlâ yaşanan tek kümbet ev mimarisine ev sahipliği yapar; bal peteği görünümlü konik damları binlerce yıllık bir serin hava tekniğini yansıtır. MÖ 2000''lere uzanan tarihiyle dünyanın ilk üniversitesine sahip olduğu rivayet edilir. Harran Ovası''nın ortasındaki bu ilçe, arkeoloji meraklıları için vazgeçilmez bir duraktır.',
  meta_title = 'Harran Rehberi — Kümbet Evler, Tarihi Üniversite ve Mezopotamya',
  meta_description = 'Şanlıurfa Harran: kümbet evler, dünyanın ilk üniversitesi, Mezopotamya mirasları ve arkeoloji turu. Tam gezi rehberi.'
WHERE slug = 'harran';

UPDATE districts SET
  description = 'Birecik, Fırat Nehri''nin üzerinde köklü bir köprü kentidir. Dünyada sadece Birecik''te yaşayan nesli tükenmekte olan kelaynak kuşlarının üreme merkezi olması nedeniyle ekolojik öneme sahiptir. Birecik Kalesi, nehir kıyısı kafe ve restoranları, balıkçılık kültürü ve akşam manzarası bu ilçeyi çekici kılar.',
  meta_title = 'Birecik Rehberi — Kelaynak Kuşları, Fırat ve Birecik Kalesi',
  meta_description = 'Şanlıurfa Birecik: kelaynak kuşları, Birecik Kalesi, Fırat Nehri, nehir kıyısı restoranlar ve balıkçılık. Gezi rehberi.'
WHERE slug = 'birecik';

UPDATE districts SET
  description = 'Siverek, Şanlıurfa''nın en kalabalık ilçelerinden biridir. Takoran Vadisi doğal güzellikleriyle yürüyüş ve fotoğraf turları için idealdir. Güçlü tarım ekonomisi, haftalık pazarlar ve yerel kültür zenginliği Siverek''i bölgenin ticaret merkezi yapar. Şehirden yaklaşık 80 km uzaklıktaki bu ilçe, kendi kimliğine sahip bir yaşam alanıdır.',
  meta_title = 'Siverek Rehberi — Takoran Vadisi, Tarım ve Yerel Kültür',
  meta_description = 'Şanlıurfa Siverek: Takoran Vadisi, haftalık pazarlar, yerel kültür ve gezi rehberi.'
WHERE slug = 'siverek';

UPDATE districts SET
  description = 'Viranşehir, Şanlıurfa''nın en büyük ilçelerinden biridir. Tarım arazileri, pamuk üretimi ve ticaret Viranşehir ekonomisinin bel kemiğini oluşturur. Küçük esnaf çarşıları, yerel pazarlar ve bölgesel ulaşım kavşakları bu ilçeyi Şanlıurfa''nın doğu hattında önemli bir nokta yapar.',
  meta_title = 'Viranşehir Rehberi — Şanlıurfa Tarım İlçesi',
  meta_description = 'Şanlıurfa Viranşehir ilçesi: tarım ekonomisi, yerel pazarlar, ticaret çarşıları ve ilçe rehberi.'
WHERE slug = 'viransehir';

UPDATE districts SET
  description = 'Suruç, Şanlıurfa''nın Suriye sınırına yakın ilçesidir. Tarım ve hayvancılık ekonomisi güçlüdür; pirinç tarlaları, buğday tarlaları ve meyve bahçeleriyle kaplı verimli ovaları geniş bir kırsal alan oluşturur. Şehir merkezi, esnaf çarşıları ve yerel yaşam ritmiyle özgün bir ilçe karakteri taşır.',
  meta_title = 'Suruç Rehberi — Şanlıurfa Sınır İlçesi Kültür ve Tarım',
  meta_description = 'Şanlıurfa Suruç ilçesi: pirinç tarlaları, yerel kültür, esnaf çarşıları ve sınır hattı yaşamı rehberi.'
WHERE slug = 'suruc';

UPDATE districts SET
  description = 'Akçakale, Türkiye-Suriye sınırında yer alan ilçesiyle sınır ticareti ve tarım ekonomisiyle tanınır. Pamuk ve buğday üretiminin yaygın olduğu bu ilçede haftalık pazar günleri yöre halkını bir araya getirir. GAP sulama projesi kapsamında sulanan verimli arazileriyle tarımsal üretimin önemli bir merkezidir.',
  meta_title = 'Akçakale Rehberi — Şanlıurfa Sınır İlçesi Tarım ve Ticaret',
  meta_description = 'Şanlıurfa Akçakale ilçesi: sınır ticareti, pamuk ve buğday tarımı, haftalık pazar ve yerel yaşam rehberi.'
WHERE slug = 'akcakale';

UPDATE districts SET
  description = 'Ceylanpınar, doğu kesimde geniş tarım arazileriyle bilinen bir Şanlıurfa ilçesidir. Tarihte büyük çiftliklere ev sahipliği yapan bu bölge, bugün modern tarım işletmeleriyle öne çıkmaktadır. Sınır yakınlığı ve stratejik konumuyla ekonomik açıdan önemli bir güzergah üzerindedir.',
  meta_title = 'Ceylanpınar Rehberi — Şanlıurfa Doğu İlçesi Tarım',
  meta_description = 'Şanlıurfa Ceylanpınar ilçesi: geniş tarım arazileri, modern çiftlikler ve sınır hattı yaşamı rehberi.'
WHERE slug = 'ceylanpinar';

UPDATE districts SET
  description = 'Hilvan, Atatürk Barajı gölü kıyısında yer alan Şanlıurfa ilçesidir. Baraj gölü refahı, balıkçılık, su sporları imkânı ve kırsal gezi rotaları Hilvan''ı doğa severler için ilginç bir seçenek yapar. Tarımsal yapısı, yerel pazarları ve sakin ilçe yaşamıyla kalabalıktan kaçmak isteyenlere sessiz bir ortam sunar.',
  meta_title = 'Hilvan Rehberi — Atatürk Barajı Kıyısı ve Kırsal Gezi',
  meta_description = 'Şanlıurfa Hilvan ilçesi: Atatürk Barajı kıyısı, balıkçılık, kırsal gezi rotaları ve yerel yaşam rehberi.'
WHERE slug = 'hilvan';

UPDATE districts SET
  description = 'Bozova, Atatürk Barajı''nın yarattığı göl kenarında kurulu bir Şanlıurfa ilçesidir. Tekne turları, balıkçılık, su sporları ve gün batımı manzarası Bozova''yı hafta sonu gezisi için cazip yapar. Tarım ve bağcılık ekonomisiyle de öne çıkan ilçede yerel esnaf ve pazar kültürü canlılığını korumaktadır.',
  meta_title = 'Bozova Rehberi — Atatürk Barajı, Tekne Turu ve Su Sporları',
  meta_description = 'Şanlıurfa Bozova ilçesi: Atatürk Barajı gölü, tekne turu, balıkçılık, su sporları ve gezi rehberi.'
WHERE slug = 'bozova';
