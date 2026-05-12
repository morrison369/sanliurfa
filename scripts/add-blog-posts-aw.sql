-- Session AW: arkeoloji(2→6), seyahat(3→6), sehir-rehberi(2→6), rehber(1→5)

INSERT INTO app.blog_posts (title, slug, content, excerpt, category, category_slug,
  author_id, author_name, featured_image, thumbnail, status, published, is_featured,
  published_at, read_time_minutes, meta_title, meta_description, tags)
VALUES

-- ============================================================
-- ARKEOLOJİ (2 → 6, +4 yeni)
-- ============================================================
(
  'Karahantepe: Göbeklitepe''nin Kardeş Kazı Alanı',
  'karahantepe-gobeklitepenin-kardes-kazi-alani',
  '<h2>Karahantepe Nedir?</h2>
<p>Şanlıurfa''nın Karahan köyü yakınlarındaki Karahantepe, 2019''dan bu yana yürütülen kazılarla Neolitik döneme ait yeni bulgular sunmaktadır. Göbeklitepe ile aynı kültürel havzada yer alan bu alan, T-biçimli dikilitaşlar ve insan figürleriyle Güneydoğu Anadolu''nun prehistorik gizemini derinleştiriyor.</p>
<h2>Kazılarda Neler Bulundu?</h2>
<p>2021-2023 yılları arasında ortaya çıkarılan bulgular arasında detaylı insan kabartmaları, hayvan figürlü sütunlar ve ritüel amaçlı yapılar yer almaktadır. Özellikle gerçekçi biçimde işlenmiş insan yüzü kabartmaları, Göbeklitepe''den farklı bir artistik anlayışa işaret etmektedir.</p>
<h2>Ziyaret Bilgileri</h2>
<p>Karahantepe, Göbeklitepe''den yaklaşık 46 km uzaklıktadır. Kazı çalışmaları hâlâ sürmekte olup ziyaretçi kabulü belirli dönemlerde ve kılavuz eşliğinde gerçekleştirilmektedir. Şanlıurfa Müze Müdürlüğü''nden güncel izin ve program bilgisi alınması önerilir.</p>
<h2>Taş Tepeler Projesi</h2>
<p>Karahantepe, Türkiye''nin "Taş Tepeler" turizm projesinin 12 arkeolojik alanından biridir. Bu proje kapsamında bölge, dünya arkeoloji turizm haritasına girmeye başlamıştır. Göbeklitepe, Karahan, Taş Tepe, Gürcütepe ve diğer alanlara yönelik tur paketleri düzenlenmektedir.</p>',
  'Göbeklitepe ile aynı kültürel havzada yer alan Karahantepe, insan kabartmaları ve T-biçimli sütunlarıyla Neolitik döneme dair yeni sorular açıyor.',
  'Arkeoloji', 'arkeoloji',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/karahantepe-gobeklitepe-kardes-kazi.jpg',
  '/uploads/blogs/karahantepe-gobeklitepe-kardes-kazi.jpg',
  'published', true, false, '2026-03-15 09:00:00', 5,
  'Karahantepe: Göbeklitepe''nin Kardeş Kazı Alanı | Şanlıurfa',
  'Şanlıurfa yakınlarındaki Karahantepe kazı alanı, Neolitik döneme ait insan kabartmaları ve T-biçimli dikilitaşlarıyla arkeoloji dünyasını heyecanlandırıyor.',
  ARRAY['karahantepe','arkeoloji','neolitik','tas-tepeler','gobeklitepe']
),
(
  'Harran''da Arkeolojik Keşif: 6000 Yıllık Tarihin İzleri',
  'harranda-arkeolojik-kesif-tarihin-izleri',
  '<h2>Harran''ın Arkeolojik Önemi</h2>
<p>Harran, MÖ 4. binyıldan bu yana kesintisiz iskân edilen nadir yerleşim alanlarından biridir. Mezopotamya, Sümer, Asur, Babil, Roma, Bizans ve İslam medeniyetlerinin katmanlarını barındıran Harran; arkeologlar için açık hava laboratuvarı niteliğindedir.</p>
<h2>Ulu Cami Kazıları</h2>
<p>8. yüzyılda inşa edilen Harran Ulu Camii''nin kalıntıları, bölgedeki en kapsamlı kazı alanlarından birini oluşturmaktadır. Kazılarda ele geçirilen mimari unsurlar, erken İslam döneminin cami mimarisine ışık tutmaktadır.</p>
<h2>Ay Tapınağı ve Sin Kültü</h2>
<p>Harran, antik çağlarda Ay tanrısı Sin''in kutsal kenti olarak bilinmekteydi. Günümüzde hâlâ araştırılan tapınak alanı, Mezopotamya dinî tarihinin önemli bir bölümünü yansıtmaktadır. Sabii dini de bu geleneğin devamı olarak Harran''da varlığını sürdürmüştür.</p>
<h2>Kümbet Evler ve Tarihi Doku</h2>
<p>Harran''ın konik damlı geleneksel kümbet evleri, arkeolojik miras ile yaşayan kültürün bir arada bulunduğunun somut göstergesidir. Bu evlerin bir kısmı müzeye dönüştürülmüş olup içlerinde geleneksel yaşam aletleri sergilenmektedir.</p>',
  'MÖ 4. binyıldan bu yana iskân edilen Harran, katmanlı arkeolojik dokusuyla Şanlıurfa''nın en değerli tarihi mekânlarından biridir.',
  'Arkeoloji', 'arkeoloji',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/harran-arkeolojik-kazılar-tarihi.jpg',
  '/uploads/blogs/harran-arkeolojik-kazılar-tarihi.jpg',
  'published', true, false, '2026-03-22 09:00:00', 5,
  'Harran Arkeoloji: 6000 Yıllık Tarihin İzleri | Şanlıurfa',
  'Harran''da MÖ 4. binyıldan Roma, Bizans ve İslam dönemine uzanan arkeolojik katmanlar, kazılar ve tarihi mekânlar hakkında kapsamlı rehber.',
  ARRAY['harran','arkeoloji','neolitik','mezopotamya','sin-tapınagı']
),
(
  'Gürcütepe ve Nevali Çori: Şanlıurfa''nın Gizli Arkeoloji Hazineleri',
  'gurcutepe-nevali-cori-sanliurfa-arkeoloji',
  '<h2>Gürcütepe Kazı Alanı</h2>
<p>Göbeklitepe''nin 10 km kuzeyinde yer alan Gürcütepe, Taş Tepeler projesinin önemli duraklarından biridir. Almanya''dan bir arkeoloji ekibinin yürüttüğü kazılarda, Neolitik döneme ait dikilitaşlar ve ritüel alanlar gün yüzüne çıkmaktadır.</p>
<h2>Nevali Çori''nin Önemi</h2>
<p>Bugün Atatürk Barajı''nın suları altında kalan Nevali Çori, 1980''lerde yapılan acil kurtarma kazılarında Göbeklitepe ile aynı döneme tarihlenen T-biçimli sütunlar ve insan figürlü kabartmalar ortaya çıkarmıştı. Bulgular Şanlıurfa Arkeoloji Müzesi''nde sergilenmektedir.</p>
<h2>Müze Ziyareti</h2>
<p>Nevali Çori''nin su altında kalması nedeniyle eserlerin tamamı müzeye taşınmıştır. Şanlıurfa Arkeoloji Müzesi''ndeki "Urfa Adamı" heykeli (MÖ 9500) ve Nevali Çori heykel koleksiyonu, dünyanın en eski anıtsal heykel örnekleri arasında sayılmaktadır.</p>
<h2>Taş Tepeler Turu</h2>
<p>Gürcütepe ziyareti, Göbeklitepe ve Karahantepe ile birleştirilerek tam günlük bir Taş Tepeler turuna dönüştürülebilir. Rehberli turlar Şanlıurfa''daki lisanslı acenteler aracılığıyla organize edilmektedir.</p>',
  'Gürcütepe''nin aktif kazıları ve Nevali Çori''nin müzedeki eserleri, Şanlıurfa''nın Göbeklitepe''nin ötesindeki arkeolojik zenginliğini gözler önüne seriyor.',
  'Arkeoloji', 'arkeoloji',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/gobeklitepe-arkeoloji-kazi-alani.jpg',
  '/uploads/blogs/gobeklitepe-arkeoloji-kazi-alani.jpg',
  'published', true, false, '2026-04-01 09:00:00', 5,
  'Gürcütepe ve Nevali Çori: Şanlıurfa Arkeoloji | Şanlıurfa.com',
  'Gürcütepe kazı alanı ve Nevali Çori bulguları hakkında kapsamlı rehber. Taş Tepeler projesinin gizli kalmış arkeolojik hazineleri.',
  ARRAY['gurcutepe','nevali-cori','arkeoloji','tas-tepeler','neolitik']
),
(
  'Şanlıurfa Arkeoloji Müzesi: Neolitik''ten Osmanlı''ya Tam Rehber',
  'sanliurfa-arkeoloji-muzesi-tam-rehber',
  '<h2>Müze Hakkında</h2>
<p>Şanlıurfa Arkeoloji Müzesi, Türkiye''nin en önemli arkeoloji müzelerinden biri olup özellikle Neolitik döneme ait eserleriyle dünya çapında tanınmaktadır. 2015 yılında yenilenen müze binası, modern sergileme teknikleriyle ziyaretçilere 12.000 yıllık tarihi aktarmaktadır.</p>
<h2>Urfa Adamı</h2>
<p>Müzenin en değerli eseri olan "Urfa Adamı", MÖ 9500''e tarihlenen ve dünyanın en eski boyutlu insan heykeli olma özelliğini taşımaktadır. 1,8 metre yüksekliğindeki bu heykel, Balıklıgöl yakınlarındaki bir inşaat çalışmasında 1996''da bulunmuştur.</p>
<h2>Göbeklitepe Buluntuları</h2>
<p>Göbeklitepe''den getirilen orijinal kabartmalar, hayvan figürlü sütun parçaları ve ritüel objeler müzenin diğer önemli koleksiyonunu oluşturmaktadır. Alandan sökülemeyecek büyük yapılar için ayrıntılı maket ve panoramik fotoğraflar sergilenmektedir.</p>
<h2>Ziyaret Bilgileri</h2>
<ul>
<li>Adres: Yusuf Paşa Mah. Atatürk Bulvarı, Şanlıurfa Merkez</li>
<li>Saat: 08:00-17:00 (Pazartesi kapalı)</li>
<li>Giriş: Müzekart geçerli, yabancı uyruklu: 150 TL</li>
<li>Müze içi sesli rehber uygulaması mevcuttur</li>
</ul>',
  'Urfa Adamı''nı ve Göbeklitepe bulgularını barındıran Şanlıurfa Arkeoloji Müzesi için zaman, ücret ve içerik rehberi.',
  'Arkeoloji', 'arkeoloji',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-arkeoloji-muzesi-rehber.jpg',
  '/uploads/blogs/sanliurfa-arkeoloji-muzesi-rehber.jpg',
  'published', true, false, '2026-04-10 09:00:00', 5,
  'Şanlıurfa Arkeoloji Müzesi Rehberi 2026 | Urfa Adamı & Göbeklitepe',
  'Şanlıurfa Arkeoloji Müzesi ziyaret rehberi: Urfa Adamı heykeli, Göbeklitepe buluntuları, açılış saatleri ve giriş ücretleri hakkında güncel bilgi.',
  ARRAY['arkeoloji-muzesi','urfa-adami','gobeklitepe','muzeler','sanliurfa']
),

-- ============================================================
-- SEYAHAT (3 → 6, +3 yeni)
-- ============================================================
(
  'Şanlıurfa''ya Nasıl Gidilir? Uçak, Otobüs ve Araba ile Ulaşım Rehberi 2026',
  'sanliurfaya-nasil-gidilir-ulasim-rehberi-2026',
  '<h2>Uçakla Ulaşım</h2>
<p>Şanlıurfa GAP Havalimanı, Türkiye''nin büyük şehirlerinden doğrudan seferler almaktadır. İstanbul''dan günde 4-6 sefer, Ankara''dan 2-3 sefer mevcuttur. Uçuş süresi İstanbul''dan yaklaşık 1 saat 55 dakikadır. THY, Pegasus ve AnadoluJet bu hatta düzenli sefer düzenlemektedir.</p>
<h2>Havalimanından Şehir Merkezine</h2>
<p>GAP Havalimanı şehir merkezine 30 km uzaklıktadır. Havalimandan havalimanı servis araçları, taksi ve çevrimiçi araç kiralama seçenekleri bulunmaktadır. Servis ücreti yaklaşık 100-150 TL, taksi 300-400 TL''dir.</p>
<h2>Otobüsle Ulaşım</h2>
<p>Şanlıurfa Şehirlerarası Otobüs Terminali ana caddeye yakın konumdadır. İstanbul''dan 14-15 saat, Ankara''dan 11-12 saat, Gaziantep''ten 1,5 saat, Diyarbakır''dan 1,5 saat sürmektedir. Metro Turizm, Kamil Koç ve Öz Urfa firmaları düzenli sefer yapmaktadır.</p>
<h2>Araçla Ulaşım</h2>
<p>Gaziantep''ten D.400 karayolu ile 2 saat, Diyarbakır''dan 1,5 saat, Adıyaman''dan (Göbeklitepe güzergâhı) 2 saat, Mardin''den 2,5 saattir. Şehirde araç kiralama ofisleri hem havalimanında hem şehir merkezinde mevcuttur.</p>
<h2>Komşu Şehirlerle Kombinasyon</h2>
<p>Şanlıurfa seyahatini Gaziantep (gastronomi), Diyarbakır (tarihi sur), Mardin (taş evler) veya Adıyaman (Nemrut) ile birleştirerek zengin bir Güneydoğu turu planlanabilir.</p>',
  'İstanbul, Ankara ve komşu şehirlerden Şanlıurfa''ya uçak, otobüs ve araçla ulaşım seçenekleri, süreleri ve ücretleri hakkında 2026 güncel rehber.',
  'Seyahat', 'seyahat',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-gap-havalimani-ulasim.jpg',
  '/uploads/blogs/sanliurfa-gap-havalimani-ulasim.jpg',
  'published', true, false, '2026-02-20 09:00:00', 5,
  'Şanlıurfa''ya Nasıl Gidilir? Ulaşım Rehberi 2026 | Uçak & Otobüs',
  'Şanlıurfa''ya uçak, otobüs ve araçla ulaşım seçenekleri: GAP Havalimanı, otobüs terminali, şehir içi ulaşım ve kombine tur önerileri.',
  ARRAY['sanliurfa-ulasim','gap-havalimani','otobüs','seyahat-rehberi','nasil-gidilir']
),
(
  'Şanlıurfa 3 Günlük Gezi Planı: En İyi Rota ve İpuçları',
  'sanliurfa-3-gunluk-gezi-plani-rota',
  '<h2>1. Gün: Tarihi Merkez ve Kutsal Mekânlar</h2>
<p>Sabah: Balıklıgöl ve Hz. İbrahim Külliyesi ile günü açın. Göl kenarında sabah kahvaltısı keyfi yaşayın, camileri ziyaret edin. Öğle: Kapalı Çarşı ve Bedesten''de alışveriş. Gümüş telkari ve bakır el sanatları. Akşam: Gümrük Hanı''nda kahve, ardından kale ve surları günbatımında görün.</p>
<h2>2. Gün: Göbeklitepe ve Çevresi</h2>
<p>Erken sabah: Göbeklitepe turu (09:00 gidin, sıcaklık artmadan görün). Öğle: Karahantepe ziyareti (Göbeklitepe''den 46 km). Akşam: Arkeoloji Müzesi''nde Urfa Adamı ve buluntular. Gece: Tarihi mahallede kebap akşam yemeği.</p>
<h2>3. Gün: Harran ve Halfeti</h2>
<p>Sabah: Harran''a gidiş (35 km). Kümbet evler, Ulu Cami kalıntıları ve Harran Üniversitesi müzesi. Öğle sonrası: Halfeti tekne turu, sular altındaki caminin fotoğrafı. Dönüşte: Güneşin batışını Fırat kenarında izleyin.</p>
<h2>Pratik İpuçları</h2>
<ul>
<li>Yaz aylarında (Haz-Eyl) öğlen saatleri çok sıcak; sabah ve akşam dış mekânda, öğle müzede</li>
<li>Kıyafet: Kutsal mekânlar için başörtüsü ve uzun kıyafet hazır bulundurun</li>
<li>Dil: Şehirde Türkçe ve Kürtçe yaygın</li>
</ul>',
  'Şanlıurfa''ya 3 gün gidenler için gün gün rota: Balıklıgöl, Göbeklitepe, Harran, Halfeti ve tarihi çarşı.',
  'Seyahat', 'seyahat',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-gezi-rotasi-3-gun.jpg',
  '/uploads/blogs/sanliurfa-gezi-rotasi-3-gun.jpg',
  'published', true, false, '2026-03-05 09:00:00', 5,
  'Şanlıurfa 3 Günlük Gezi Planı: En İyi Rota 2026',
  'Şanlıurfa''ya 3 günlük ziyaret için gün gün detaylı gezi planı. Göbeklitepe, Harran, Halfeti ve tarihi merkez rotaları.',
  ARRAY['gezi-plani','3-gun','rota','seyahat','tur-planlama']
),
(
  'Şanlıurfa''da En İyi Seyahat Dönemi: Aylık Hava Durumu ve Etkinlik Takvimi',
  'sanliurfada-en-iyi-seyahat-donemi',
  '<h2>İklim Genel Bakış</h2>
<p>Şanlıurfa, Türkiye''nin en sıcak şehirlerinden biridir. Yazları kavurucu (40°C üzeri), kışları ılıman-serin geçer. Bu özelliği, ziyaret zamanlamasını belirleyici kılmaktadır.</p>
<h2>En İdeal Dönem: Nisan–Haziran ve Eylül–Kasım</h2>
<p>İlkbaharda (Nisan-Mayıs) hava 20-28°C, Göbeklitepe ve açık alan ziyaretleri için ideal. Balıklıgöl çevresi çiçeklenir. Sonbaharda (Eylül-Kasım) sıcak yaz geçer, gündüz 25-32°C, gece serinler. Harran gezisi için en uygun dönem.</p>
<h2>Yaz Aylarında Seyahat (Haziran–Ağustos)</h2>
<p>Yaz ayları çok sıcak (38-44°C) ancak müze ve kapalı mekânlar klimayla serindir. Sabah 07:00-10:00 ve akşam 18:00 sonrası dış mekân ziyareti yapılabilir. Etkinlik takvimi yoğundur: Uluslararası Şeb-i Arus törenleri, Balıklıgöl Festivali.</p>
<h2>Kış Aylarında Seyahat (Aralık–Şubat)</h2>
<p>Kışın hava 5-15°C, müze ziyaretleri için konforlu. Kalabalık azdır, oteller daha uygun fiyatlıdır. Çarşı ve tarihi yerler yağmurlu günlerde de ziyaret edilebilir.</p>
<h2>Önemli Etkinlik Tarihleri 2026</h2>
<ul>
<li>Mayıs: Kiraz Festivali (Birecik)</li>
<li>Haziran: Uluslararası Şanlıurfa Kültür Sanat Festivali</li>
<li>Temmuz: Halfeti Gül Festivali</li>
<li>Eylül: Göbeklitepe Tarihi Festivali</li>
</ul>',
  'Şanlıurfa ziyareti için en uygun mevsim: aylık sıcaklık verileri, önemli etkinlikler ve pratik tavsiyeler.',
  'Seyahat', 'seyahat',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-mevsimler-seyahat-rehberi.jpg',
  '/uploads/blogs/sanliurfa-mevsimler-seyahat-rehberi.jpg',
  'published', true, false, '2026-03-12 09:00:00', 5,
  'Şanlıurfa''da En İyi Seyahat Dönemi | Aylık Hava ve Etkinlik Takvimi',
  'Şanlıurfa ziyareti için en iyi mevsim hangisi? İklim, sıcaklık, etkinlik takvimi ve pratik seyahat tavsiyelerini içeren rehber.',
  ARRAY['seyahat-donemi','hava-durumu','iklim','etkinlik-takvimi','ne-zaman-gidilir']
),

-- ============================================================
-- ŞEHİR REHBERİ (2 → 6, +4 yeni)
-- ============================================================
(
  'Şanlıurfa''da Toplu Taşıma Rehberi: Otobüs, Minibüs ve Taksi',
  'sanliurfa-toplu-tasima-rehberi',
  '<h2>Şehir İçi Otobüsler</h2>
<p>Şanlıurfa Büyükşehir Belediyesi''ne bağlı halk otobüsleri şehrin dört bir yanına sefer yapmaktadır. Hatlar numaralı olup durak bilgileri duraklarda ve belediye mobil uygulamasında yer almaktadır. Ücret: tek biniş 9-12 TL (ŞurKart ile indirimli).</p>
<h2>ŞurKart</h2>
<p>Şanlıurfa Ulaşım Kartı (ŞurKart), tüm belediye otobüslerinde geçerli akıllı karttır. Terminal ve büyük otobüs duraklarındaki kiosktan temin edilebilir. Öğrenci kartı için öğrenci kimliği ibrazı yeterlidir.</p>
<h2>Minibüs Hatları</h2>
<p>Belirli güzergâhlarda özel minibüsler de çalışmaktadır. Özellikle Bozova, Birecik, Halfeti ve çevre ilçelere giden minibüsler Şehirlerarası Terminal''den hareket eder. Ücretler 30-80 TL arasındadır.</p>
<h2>Taksi ve Online Ulaşım</h2>
<p>Şanlıurfa''da taksiler sarı renklidir ve taksimetreli çalışır. İndiTexi ve BiTaksi uygulamaları şehirde aktiftir. Havalimandan merkeze yaklaşık 300-400 TL''dir. Dolmuşlar bazı mahallelere daha uygun alternatif sunmaktadır.</p>
<h2>Kiralık Araç</h2>
<p>Çevre gezileri (Göbeklitepe, Harran, Halfeti) için araç kiralama önerilir. Havalimanı ve şehir merkezinde çeşitli firmalar günlük 600-1200 TL''den kiralama imkânı sunmaktadır.</p>',
  'Şanlıurfa''da otobüs, minibüs, taksi ve ŞurKart ile şehir içi ulaşım rehberi; çevre ilçelere nasıl gidilir?',
  'Şehir Rehberi', 'sehir-rehberi',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-sehir-ici-ulasim-rehberi.jpg',
  '/uploads/blogs/sanliurfa-sehir-ici-ulasim-rehberi.jpg',
  'published', true, false, '2026-02-15 09:00:00', 4,
  'Şanlıurfa Toplu Taşıma Rehberi 2026 | Otobüs, Minibüs, Taksi',
  'Şanlıurfa''da şehir içi ulaşım: halk otobüsü hatları, ŞurKart, taksi ücretleri ve ilçelere minibüs bilgileri.',
  ARRAY['toplu-tasima','sehir-ici-ulasim','surkart','taksi','otobüs-hatlari']
),
(
  'Şanlıurfa''nın Mahalleleri: Tarihi Dokudan Modern Semtlere Rehber',
  'sanliurfa-mahalleleri-rehberi',
  '<h2>Tarihi Merkez Mahalleleri</h2>
<p>Şanlıurfa''nın tarihi çekirdeği olan Kapalıçarşı çevresindeki mahalleler, taş evleri ve konak yapılarıyla kentin en özgün dokusunu korumaktadır. Yusuf Paşa, Camikebir ve Sarayönü mahalleleri tarihi yapı yoğunluğu bakımından öne çıkmaktadır.</p>
<h2>Balıklıgöl Çevresi</h2>
<p>Hz. İbrahim''le özdeşleşen Balıklıgöl çevresindeki mahalleler hem yerli hem yabancı ziyaretçilerin yoğun ilgi gösterdiği bölgedir. Göl kenarındaki kafeler ve yeşil alanlar, günlük dinlenme için idealdir.</p>
<h2>Yeni Mahalleler ve Gelişim Bölgeleri</h2>
<p>Karaköprü ve Eyyübiye''nin yeni gelişim alanları, modern konut sitelerini ve alışveriş merkezlerini barındırmaktadır. Dilovası ve Yenice gibi çeper mahalleler ise şehrin hızla büyüyen alanlarıdır.</p>
<h2>Hangi Mahallede Konaklayalım?</h2>
<p>Tarihi atmosfer için: Camikebir ve Sarayönü çevresi otelleri. Merkezi konum için: Atatürk Bulvarı yakını. Bütçe dostu için: Eyyübiye ve Karaköprü''de pansiyonlar mevcuttur.</p>',
  'Şanlıurfa''nın tarihi semtlerinden modern mahallelerine gezi rehberi; hangi mahallede ne var, nerede konaklayalım?',
  'Şehir Rehberi', 'sehir-rehberi',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-mahalleler-sehir-rehberi.jpg',
  '/uploads/blogs/sanliurfa-mahalleler-sehir-rehberi.jpg',
  'published', true, false, '2026-02-22 09:00:00', 4,
  'Şanlıurfa Mahalleleri Rehberi | Tarihi ve Modern Semtler',
  'Şanlıurfa''nın mahallelerini ve semtlerini tanıyın: tarihi doku, Balıklıgöl çevresi, yeni gelişim alanları ve konaklama önerileri.',
  ARRAY['mahalleler','sehir-rehberi','tarihi-merkez','konaklama-bolgesi','semtler']
),
(
  'Şanlıurfa Alışveriş Rehberi: Nerede Ne Bulunur?',
  'sanliurfa-alisveris-nerede-ne-bulunur',
  '<h2>Kapalı Çarşı ve Bedesten</h2>
<p>Geleneksel alışveriş için başlangıç noktası. Telkari gümüş takılar, bakır el işleri, isot biberi ve kuruyemiş için en doğru adres. Sabahın erken saatlerinde çarşı daha sakin ve pazarlığa açıktır.</p>
<h2>Kuyumcular Çarşısı</h2>
<p>Altın ve gümüş alışverişi için Kuyumcular Çarşısı''na gidin. Şanlıurfa''nın özgün telkari işçiliği, Mısır çarşısından farklı stil sunar. Gümüş üzeri filigran işlemeli takılar hem hediyelik hem yatırımlık değer taşır.</p>
<h2>Semt Pazarları</h2>
<p>Her ilçenin haftalık kurulu pazarı uygun fiyatlı alışveriş imkânı sunar. Çarşamba: Haliliye semt pazarı. Cuma: Eyyübiye meydanı. Buralarda yerel peynir, baharat, zeytinyağı ve mevsim sebze-meyveleri bulunur.</p>
<h2>Modern Alışveriş Merkezleri</h2>
<p>Urfa Park AVM ve Sanko Park, mağaza çeşitliliği isteyenler için modern seçenekler sunar. Geniş otopark ve yeme-içme alanlarıyla aileler için de uygundur.</p>
<h2>Getirmeye Değer Hediyelikler</h2>
<ul>
<li>Telkari gümüş takı (özgün Şanlıurfa el işçiliği)</li>
<li>İsot biberi ve isot sosu (şehrin markası)</li>
<li>Bakır tepsi ve ibrik</li>
<li>Çerezler: antep fıstığı, badem, ceviz</li>
</ul>',
  'Şanlıurfa''da alışverişin tam rehberi: kapalı çarşı, kuyumcular çarşısı, semt pazarları ve AVM; nerede ne bulunur, pazarlık ipuçları.',
  'Şehir Rehberi', 'sehir-rehberi',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-da-alisveris-merkezleri-ve-carsi-rehberi-nerede-ne-alinir.jpg',
  '/uploads/blogs/sanliurfa-da-alisveris-merkezleri-ve-carsi-rehberi-nerede-ne-alinir.jpg',
  'published', true, false, '2026-03-02 09:00:00', 4,
  'Şanlıurfa Alışveriş Rehberi: Nerede Ne Bulunur? 2026',
  'Şanlıurfa alışveriş rehberi: kapalı çarşı telkari takı, kuyumcular çarşısı, semt pazarları ve modern AVM''ler hakkında kapsamlı bilgi.',
  ARRAY['sehir-rehberi','alisveris','kapali-carsi','kuyumcular','semt-pazari']
),
(
  'Şanlıurfa''da Para, Banka ve Pratik Bilgiler: Seyahat Öncesi Bilinmesi Gerekenler',
  'sanliurfa-pratik-bilgiler-banka-para',
  '<h2>ATM ve Bankalar</h2>
<p>Şanlıurfa şehir merkezinde tüm büyük bankalar şube ve ATM ağına sahiptir. Atatürk Bulvarı ve çevresi, Ziraat, İş Bankası, Akbank, Garanti, Vakıfbank ve Halkbank ATM''lerini barındırmaktadır. Kapalı Çarşı içinde kısıtlı ATM vardır; nakit için çarşıya girmeden önce çekin.</p>
<h2>Döviz Bozdurma</h2>
<p>Şehir merkezinde yetkili döviz bürolarında Euro, Dolar ve Sterlin bozdurmak mümkündür. Kur karşılaştırması yapın; bazı kuyumcu dükkanları da döviz kabul etmektedir.</p>
<h2>İnternet ve GSM</h2>
<p>Şanlıurfa''da Turkcell, Vodafone ve Türk Telekom altyapıları aktiftir. Göbeklitepe ve Harran gibi çevre alanlarda sinyal zayıflayabilir; önemli yerleri önceden indirin (offline harita). Ücretsiz Wi-Fi: büyük kafeler, otel lobiler ve Balıklıgöl çevresi.</p>
<h2>Sağlık ve Acil</h2>
<p>Şanlıurfa Eğitim ve Araştırma Hastanesi 7/24 acil hizmet vermektedir. Şehirde aile hekimliği ve özel hastane yoğunluğu yüksektir. Acil: 112, Polis: 155, Jandarma: 156, Turizm Polis: (0414) 215 07 34.</p>',
  'Şanlıurfa seyahati öncesi pratik bilgiler: ATM konumları, döviz büroları, GSM kapsama, sağlık ve acil hatları.',
  'Şehir Rehberi', 'sehir-rehberi',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-pratik-seyahat-bilgileri.jpg',
  '/uploads/blogs/sanliurfa-pratik-seyahat-bilgileri.jpg',
  'published', true, false, '2026-03-20 09:00:00', 4,
  'Şanlıurfa Pratik Seyahat Bilgileri 2026 | Banka, ATM, GSM',
  'Şanlıurfa ziyareti öncesi bilinmesi gereken pratik bilgiler: ATM, döviz, internet bağlantısı, sağlık hizmetleri ve acil hatları.',
  ARRAY['pratik-bilgiler','atm','banka','seyahat-ipuclari','acil-hatlar']
),

-- ============================================================
-- REHBER (1 → 5, +4 yeni)
-- ============================================================
(
  'Şanlıurfa Sokak Lezzetleri Rehberi: Çiğköfte''den Katmerli''ye',
  'sanliurfa-sokak-lezzetleri-rehberi',
  '<h2>Çiğköfte</h2>
<p>Şanlıurfa''nın orijinal çiğköftesi, bugün Türkiye''nin her köşesinde bulunan zincir markalardan tamamen farklıdır. El ile yoğrulan gerçek çiğköfte, Kapalı Çarşı çevresindeki küçük dükkanlar ve seyyar satıcılarda bulunur. Yanında nar ekşisi, nar suyu ve limon ile servis edilir.</p>
<h2>Katmerli</h2>
<p>İnce hamurun üzerine antep fıstığı, kaymak ve bal dökülerek sacda pişirilen Şanlıurfa katmerlisi, sabah kahvaltısı kültürünün vazgeçilmezidir. Kapalı Çarşı''daki geleneksel kahvaltıcılarda taze servis edilmektedir.</p>
<h2>Lahmacun ve Pide</h2>
<p>Şanlıurfa lahmacunu, ince ve çıtır hamuru ile isot biber harmanlanmış köfte iç harcıyla öne çıkar. Kıymalı pide ise tereyağlı taş fırın usulüyle pişirilir. Kapalıçarşı çevresi bu lezzetler için güvenilir adrestir.</p>
<h2>Şalgam Suyu ve İçecekler</h2>
<p>Şanlıurfa''ya özgü acı şalgam suyu, kebapların yanında sindirim yardımcısı olarak tüketilir. Ayran, meyve suyu ve geleneksel tahin-pekmez ikilisi de şehrin içecek kültürünün parçasıdır.</p>
<h2>En Ucuz Sokak Lezzeti Rotası</h2>
<p>Balıklıgöl çıkışından başlayarak Kapalı Çarşı''ya yürüyerek ilerlein; yolda çiğköfte, katmer, lahmacun ve şalgam suyu tattırı. Ortalama kişi başı 100-150 TL ile doyurucu sokak yemeği turu yapılabilir.</p>',
  'Şanlıurfa''nın çiğköfte, katmerli, lahmacun ve şalgam suyu gibi eşsiz sokak lezzetleri için adres rehberi.',
  'Rehber', 'rehber',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-sokak-lezzetleri-cigkofte-lahmacun.jpg',
  '/uploads/blogs/sanliurfa-sokak-lezzetleri-cigkofte-lahmacun.jpg',
  'published', true, false, '2026-02-10 09:00:00', 4,
  'Şanlıurfa Sokak Lezzetleri Rehberi | Çiğköfte, Katmerli, Lahmacun',
  'Şanlıurfa''nın en iyi sokak lezzetleri: gerçek çiğköfte, katmerli, lahmacun ve şalgam suyu için adresler ve tavsiyeler.',
  ARRAY['sokak-lezzetleri','cigkofte','katmerli','lahmacun','yeme-rehberi']
),
(
  'Şanlıurfa''da Fotoğraf Çekimi İçin En İyi Noktalar',
  'sanliurfa-fotograf-cekimi-en-iyi-noktalar',
  '<h2>Altın Saatler</h2>
<p>Şanlıurfa''da en güzel ışık sabah 06:30-08:30 ve akşam 17:30-19:30 arasındadır. Bu saatlerde taş binalar sıcak ışıkla parlar, Balıklıgöl''deki sazan balıkları yüzeye çıkar.</p>
<h2>Balıklıgöl ve Hz. İbrahim Külliyesi</h2>
<p>Sabahın erken saatlerinde Halil-ür Rahman Camii ve yansımasını sudan yakalamak için gelin. İbadetin bitmesini bekleyerek cami önünde manzara fotoğrafı çekebilirsiniz. Geniş açı lens önerilir.</p>
<h2>Kale ve Surlar</h2>
<p>Şanlıurfa Kalesi''nin kapısından şehir panoraması çekmek için sabah veya altın saat tercih edin. Kale surları boyunca yürüyüş yaparken rölyef ve taş doku detayları için makro lens işe yarar.</p>
<h2>Kapalı Çarşı ve Çarşıcı Portresi</h2>
<p>Sabah 08:00-10:00 arası çarşı açılırken dükkân sahiplerini, bakırcıları, kuyumcuları portresini çekin. Sıcak bir iletişim ve küçük Türkçe selamlama kapıları açar; çoğu esnaf fotoğrafa olumlu bakar.</p>
<h2>Harran ve Kümbet Evler</h2>
<p>Kümbet evlerin geometrik silüeti gün ortasında bile etkileyici; kontrast için bulutlu gün tercih edin. Altın saat ışığında kümbet evlerin yuvarlak formları dramatik gölgeler oluşturur.</p>',
  'Şanlıurfa''da fotoğrafçılar için en iyi çekim noktaları: Balıklıgöl, kale, Kapalı Çarşı ve Harran kümbet evleri.',
  'Rehber', 'rehber',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-fotograf-cekimi-noktalari.jpg',
  '/uploads/blogs/sanliurfa-fotograf-cekimi-noktalari.jpg',
  'published', true, false, '2026-02-25 09:00:00', 4,
  'Şanlıurfa''da Fotoğraf Çekimi İçin En İyi Noktalar | Rehber',
  'Şanlıurfa''da fotoğrafçılar için en iyi çekim noktaları ve altın saat önerileri: Balıklıgöl, kale, çarşı ve Harran.',
  ARRAY['fotograf','fotografi-noktalari','fotog-rehberi','balikligol-fotograf','kale']
),
(
  'Şanlıurfa''da Gece Hayatı: Kahvehaneler, Konserler ve Şeb-i Arus',
  'sanliurfa-gece-hayati-kahvehaneler-konserler',
  '<h2>Geleneksel Kahvehaneler</h2>
<p>Şanlıurfa''nın gece kültürü, Batı tarzı bar yerine kahvehane merkezlidir. Tarihi Gümrük Hanı ve çevresi, gece 23:00''e kadar aktif olan geleneksel çay-kahve mekânlarını barındırmaktadır. Tavla, pişti ve satranç masaları hem yerel hem yabancı ziyaretçileri buluşturmaktadır.</p>
<h2>Müzik ve Sema Gösterileri</h2>
<p>Şanlıurfa''da ilahi ve sufi müziği canlı olarak dinlemek için Sıra Geceleri kültürel etkinliklerini takip edin. Belediye Kültür Merkezi ve bazı tarihi hanlar, özellikle Ramazan ayında düzenli konserler sunmaktadır.</p>
<h2>Şeb-i Arus Törenleri</h2>
<p>Hz. Mevlana''nın ölüm yıl dönümü olan Şeb-i Arus törenlerinde (Aralık) sema gösterileri ve ilahi konserler şehirde yoğunlaşmaktadır. Bilet kapasitesi sınırlı olup erken takip önerilir.</p>
<h2>Balıklıgöl Yürüyüşü</h2>
<p>Şanlıurfa sakinleri için en popüler gece aktivitesi, ışıklandırılmış Balıklıgöl çevresinde akşam yürüyüşüdür. Göl kenarındaki çay bahçeleri ve dondurma büfeleri gece boyunca açık kalır.</p>',
  'Şanlıurfa gece hayatı: geleneksel kahvehaneler, Gümrük Hanı, sufi müziği, Şeb-i Arus törenleri ve Balıklıgöl yürüyüşü.',
  'Rehber', 'rehber',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-gece-hayati-kahvehaneler.jpg',
  '/uploads/blogs/sanliurfa-gece-hayati-kahvehaneler.jpg',
  'published', true, false, '2026-03-08 09:00:00', 4,
  'Şanlıurfa Gece Hayatı Rehberi | Kahvehaneler ve Konserler',
  'Şanlıurfa''da gece ne yapılır? Geleneksel kahvehaneler, canlı müzik, Şeb-i Arus törenleri ve Balıklıgöl akşam yürüyüşü rehberi.',
  ARRAY['gece-hayati','kahvehaneler','konserler','sebi-arus','balikligol']
),
(
  'Şanlıurfa''da Bütçe Seyahat Rehberi: Ucuza Konak, Yemek ve Gezi',
  'sanliurfa-butce-seyahat-rehberi',
  '<h2>Bütçe Konaklama</h2>
<p>Şanlıurfa''da 300-600 TL arasında temiz ve merkezi pansiyon seçenekleri bulunmaktadır. Yusuf Paşa Mahallesi''ndeki küçük aile pansiyonları hem bütçe dostu hem tarihi atmosfer sunar. Hostel sistemi şehirde yaygın değil; pansiyonlar en uygun seçenektir.</p>
<h2>Bütçe Yeme-İçme</h2>
<p>Öğle yemeği: Kapalı Çarşı çevresindeki esnaf lokantalarında 60-100 TL''ye doyurucu kebap yenebilir. Kahvaltı: Tarihi çarşı içindeki küçük dükkânlarda 40-60 TL. Akşam: Lahmacun veya pide 30-50 TL.</p>
<h2>Ücretsiz ve Düşük Maliyetli Aktiviteler</h2>
<ul>
<li>Balıklıgöl ve Hz. İbrahim Külliyesi ziyareti: ücretsiz</li>
<li>Tarihi çarşı ve Bedesten gezisi: ücretsiz</li>
<li>Kale çevresi yürüyüşü: ücretsiz</li>
<li>Arkeoloji Müzesi: Müzekart ile ücretsiz, diğerleri 150 TL</li>
<li>Göbeklitepe: 300 TL giriş</li>
</ul>
<h2>Günlük Bütçe Tahmini</h2>
<p>Pansiyonda konaklama + 3 öğün yemek + 1 müze girişi + ulaşım: 800-1200 TL/gün. Göbeklitepe turu dahil ederseniz: 1200-1600 TL/gün. Aile (4 kişi) için günlük bütçe: 3000-4500 TL.</p>',
  'Az bütçeyle Şanlıurfa''yı gezme rehberi: ucuz pansiyonlar, esnaf lokantaları ve ücretsiz gezi noktaları.',
  'Rehber', 'rehber',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-butce-seyahat-ucuz-konaklama.jpg',
  '/uploads/blogs/sanliurfa-butce-seyahat-ucuz-konaklama.jpg',
  'published', true, false, '2026-03-18 09:00:00', 4,
  'Şanlıurfa Bütçe Seyahat Rehberi 2026 | Ucuz Konak ve Yemek',
  'Az para ile Şanlıurfa gezisi: ucuz pansiyonlar, esnaf lokantaları, ücretsiz müze ve gezi noktaları hakkında bütçe rehberi.',
  ARRAY['butce-seyahat','ucuz-konaklama','esnaf-lokanta','ucretsiz-gezi','ekonomik']
)

ON CONFLICT (slug) DO NOTHING;

-- Sonuç kontrolü
SELECT category_slug, COUNT(*) as adet
FROM app.blog_posts WHERE status = 'published'
  AND category_slug IN ('arkeoloji','seyahat','sehir-rehberi','rehber')
GROUP BY category_slug ORDER BY category_slug;
