-- Session AX: kultur-tarih(5→8), kultur(5→8) — +6 yeni blog

INSERT INTO app.blog_posts (title, slug, content, excerpt, category, category_slug,
  author_id, author_name, featured_image, thumbnail, status, published, is_featured,
  published_at, read_time_minutes, meta_title, meta_description, tags)
VALUES

-- ============================================================
-- KÜLTÜR-TARİH (5 → 8, +3 yeni)
-- ============================================================
(
  'Şanlıurfa Surları ve Kalesi: Bin Yıllık Savunma Mimarisinin İzleri',
  'sanliurfa-surlari-kalesi-savunma-mimarisi',
  '<h2>Kale ve Surların Tarihi</h2>
<p>Şanlıurfa Kalesi, MS 2. yüzyılda Roma döneminde inşa edilmiş; Bizans, Hamdâniler, Selçuklular ve Osmanlılar tarafından genişletilerek günümüze ulaşmıştır. Kentin tepesindeki bu yapı, yüzyıllar boyunca bölgenin en stratejik savunma noktası olmuştur.</p>
<h2>İki Korint Sütunu</h2>
<p>Kalenin en dikkat çekici unsurlarından biri, MS 200 yıllarına tarihlenen iki Korint düzeninde sütundur. Rivayete göre Hz. İbrahim''in ateşe atılmadan önce bu sütunların arasındaki mancınığa yerleştirildiği anlatılır — bu nedenle yerel halk sütunlara "Nemrut''un Tahtı" demektedir.</p>
<h2>Surlar ve Kapılar</h2>
<p>Şehri çeviren sur sistemi Orta Çağ''dan kalma kapılar barındırmaktadır. Gümrük Kapısı, Harran Kapısı ve Bey Kapısı bu surların günümüze ulaşan önemli noktalarıdır. Surlar boyunca yürümek, şehrin tarihi dokusunu farklı bir perspektiften görme imkânı sunar.</p>
<h2>Ziyaret ve Pratik Bilgiler</h2>
<p>Kale, şehir merkezinden yürüme mesafesindedir. Üst kata çıkmak için dar merdivenleri olan tarihi yolu kullanın. Kale tepesinden Balıklıgöl ve tarihi çarşı manzarası özellikle gün batımında muhteşemdir. Giriş ücretsizdir.</p>',
  'Roma''dan Osmanlı''ya uzanan tarihi süreçte şekillenen Şanlıurfa Kalesi ve surları, şehrin savunma mirasının en somut tanıklarıdır.',
  'Kültür-Tarih', 'kultur-tarih',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-kalesi-ve-surlar-tarihi-mimarisi.jpg',
  '/uploads/blogs/sanliurfa-kalesi-ve-surlar-tarihi-mimarisi.jpg',
  'published', true, false, '2026-03-25 09:00:00', 5,
  'Şanlıurfa Kalesi ve Surları: Savunma Mimarisinin İzleri | Rehber',
  'Şanlıurfa Kalesi''nin Roma''dan Osmanlı''ya uzanan tarihi, iki Korint sütunu, kapılar ve sur mimarisi hakkında kapsamlı rehber.',
  ARRAY['sanliurfa-kalesi','surlar','roma-mimarisi','kale-rehberi','kultur-tarih']
),
(
  'Şanlıurfa''nın Tarihi Hanları: Gümrük Hanı''ndan Sipahi Hanı''na',
  'sanliurfa-tarihi-hanlari-gumruk-hani-rehberi',
  '<h2>Gümrük Hanı</h2>
<p>Şanlıurfa''nın en büyük ve en iyi korunmuş tarihi hanıdır. 1562 yılında Osmanlı döneminde inşa edilen bu yapı, Kapalı Çarşı''nın kalbinde yer almaktadır. Günümüzde çarşı mekânı olarak kullanılan Gümrük Hanı, geçmişte kervan tüccarları için konaklama ve depolama merkezi işlevi görürdü.</p>
<h2>Sipahi Hanı</h2>
<p>Kapalı Çarşı içindeki diğer önemli han yapısıdır. Osmanlı dönemi ticaret geleneğini yansıtan avlulu planı ve taş işçiliği ile dikkat çeker. Günümüzde küçük atölyeler ve dükkanlar barındırmaktadır.</p>
<h2>Mimarinin Özellikleri</h2>
<p>Şanlıurfa''nın tarihi hanları, bölgede bol bulunan sarı-bej renkli kalker taşından inşa edilmiştir. Kalın taş duvarlar, yazın serin kışın sıcak bir iç mekân yaratır. Avlulu plan tipik Osmanlı kervansaray mimarisinin özelliğidir.</p>
<h2>Günümüzde Hanlar</h2>
<p>Gümrük Hanı kafelerinden birine oturup taş avluda çay içmek, Şanlıurfa seyahatinin en keyifli anlarından birini oluşturur. Gece 22:00''ye kadar açık olan çay bahçesinde nargile ve Türk kahvesi eşliğinde sakin bir akşam geçirebilirsiniz.</p>',
  'Şanlıurfa''nın 16. yüzyıldan kalma tarihi hanları — Gümrük Hanı, Sipahi Hanı ve diğerleri — Osmanlı ticaret kültürünün canlı tanıkları.',
  'Kültür-Tarih', 'kultur-tarih',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-gumruk-hani-tarihi-hanlar.jpg',
  '/uploads/blogs/sanliurfa-gumruk-hani-tarihi-hanlar.jpg',
  'published', true, false, '2026-04-05 09:00:00', 5,
  'Şanlıurfa Tarihi Hanları: Gümrük Hanı ve Sipahi Hanı Rehberi',
  'Şanlıurfa''nın Osmanlı döneminden kalma tarihi hanları: Gümrük Hanı mimarisi, tarihi ve günümüzdeki kullanımı hakkında kapsamlı rehber.',
  ARRAY['gumruk-hani','tarihi-hanlar','osmanli-mimarisi','kapali-carsi','kultur-tarih']
),
(
  'Şanlıurfa''da Osmanlı Mirasları: Camiler, Medreseler ve Konak Evler',
  'sanliurfa-osmanli-miraslar-cami-medrese-konak',
  '<h2>Ulu Cami (Halil-ür Rahman Camii)</h2>
<p>Balıklıgöl kıyısındaki bu cami, Eyyûbîler döneminde inşa edilmiş; Osmanlı döneminde onarılarak bugünkü biçimini almıştır. Cami avlusundan Balıklıgöl''e açılan kapı, fotoğrafçıların en çok tercih ettiği çekimlerden birini sunar.</p>
<h2>Rızvaniye Camii ve Külliyesi</h2>
<p>1716 yılında inşa edilen bu külliye, Balıklıgöl''ün kuzeybatı köşesinde yer almaktadır. Külliye içinde cami, han, çarşı ve hamam yer almaktadır. Günümüzde hamamı restore edilerek ziyaretçilere açılmıştır.</p>
<h2>Tarihi Medreseler</h2>
<p>Şanlıurfa''da çok sayıda Osmanlı dönemi medresesi bulunmaktadır. Bunların bir kısmı günümüzde kültür merkezi, sergi alanı veya dini eğitim kurumu olarak hizmet vermektedir. Harran Üniversitesi bünyesindeki İlahiyat Fakültesi de tarihi bir medrese binasında faaliyet göstermektedir.</p>
<h2>Taş Konak Evleri</h2>
<p>Şanlıurfa''nın tarihi semtlerinde 19. yüzyıldan kalma taş konak evleri hâlâ ayaktadır. Bazıları pansiyona veya butik otele dönüştürülmüş olup bu mekânlarda konaklamak tarihi atmosferi yaşatmaktadır. Şanlıurfa Müzesi''nin yanındaki konak ise sergi alanı olarak kullanılmaktadır.</p>',
  'Şanlıurfa''nın Osmanlı mirasları: Halil-ür Rahman Camii, Rızvaniye Külliyesi, tarihi medreseler ve taş konak evleri rehberi.',
  'Kültür-Tarih', 'kultur-tarih',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-osmanli-cami-medrese-konak.jpg',
  '/uploads/blogs/sanliurfa-osmanli-cami-medrese-konak.jpg',
  'published', true, false, '2026-04-15 09:00:00', 5,
  'Şanlıurfa''da Osmanlı Mirası: Camiler, Medreseler ve Konak Evler',
  'Şanlıurfa''nın Osmanlı dönemi mimari mirası: Halil-ür Rahman Camii, Rızvaniye Külliyesi, tarihi medreseler ve taş konak evleri.',
  ARRAY['osmanli-mirasları','cami','medrese','konak-evler','kultur-tarih']
),

-- ============================================================
-- KÜLTÜR (5 → 8, +3 yeni)
-- ============================================================
(
  'Şanlıurfa Sıra Geceleri: Müzik, Şiir ve Geleneğin Buluşması',
  'sanliurfa-sira-geceleri-muzik-siir-gelenek',
  '<h2>Sıra Gecesi Nedir?</h2>
<p>Şanlıurfa''ya özgü geleneksel toplantı geleneği olan Sıra Geceleri, yüzyıllar öncesinden gelen bir kültürel pratiktir. Her hafta belirli ev ya da mekânlarda bir araya gelen topluluk; ilahi, türkü, şiir okuma ve sohbetle gece geçirir.</p>
<h2>Müzik Repertuarı</h2>
<p>Sıra gecelerinin müziği, Şanlıurfa makamı olarak bilinen kendine özgü bir icra geleneğine dayanmaktadır. Cümbüş, kanun ve keman gibi geleneksel çalgıların eşliğinde söylenen gazeller ve ilahiler, ruhani bir atmosfer yaratır. Kemençe eşliğinde söylenen mani geleneği de bu gecelerin önemli parçasıdır.</p>
<h2>Nerede İzlenebilir?</h2>
<p>Belediye Kültür Merkezi ve bazı tarihi mekânlar, turizm sezonunda Sıra Gecesi etkinlikleri düzenlemektedir. Ramazan ayında program yoğunlaşır. Şanlıurfa Kültür Sanat Vakfı''nın sosyal medya sayfaları ve belediyenin etkinlik takvimi, güncel program bilgisi için başvurulabilecek kaynaklardır.</p>
<h2>UNESCO Koruması</h2>
<p>Şanlıurfa Sıra Geceleri geleneği, 2010 yılında UNESCO Somut Olmayan Kültürel Miras Listesi''ne alınmıştır. Bu statü, geleneğin yaşatılması için devlet ve sivil toplum tarafından çeşitli programların hayata geçirilmesine zemin hazırlamıştır.</p>',
  'UNESCO listesindeki Şanlıurfa Sıra Geceleri; müzik, şiir ve geleneksel toplantı kültürü — nerede izlenir, nasıl katılınır?',
  'Kültür', 'kultur',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-sira-gecesi-muzik-gelenek.jpg',
  '/uploads/blogs/sanliurfa-sira-gecesi-muzik-gelenek.jpg',
  'published', true, false, '2026-03-28 09:00:00', 5,
  'Şanlıurfa Sıra Geceleri: Müzik ve Gelenek | UNESCO Mirası',
  'UNESCO listesindeki Şanlıurfa Sıra Geceleri geleneği: müzik repertuarı, nerede izleneceği ve bu kültürel mirasa nasıl dahil olunacağı.',
  ARRAY['sira-gecesi','muzik','unesco','gelenek','kultur']
),
(
  'Şanlıurfa El Sanatları: Bakırcılık, Kilimcilik ve Telkari',
  'sanliurfa-el-sanatlari-bakir-kilim-telkari',
  '<h2>Bakırcılık Geleneği</h2>
<p>Şanlıurfa Kapalı Çarşısı''ndaki bakırcı çarşısı, yüzyıllık geleneği sürdürmektedir. Ustalar; çekiç ve kalıpla şekillendirdikleri bakır tepsi, ibrik, sahan ve sürahilere geleneksel motifler işler. El yapımı bakır ürünler hem kullanım eşyası hem de koleksiyon objesi olarak değer taşımaktadır.</p>
<h2>Telkari Gümüş İşçiliği</h2>
<p>İnce gümüş ya da altın tellerin örülerek oluşturduğu telkari, Şanlıurfa''nın en özgün kuyumculuk geleneğidir. Bilezik, küpe, broş ve gerdanlık başta olmak üzere çeşitli takı formlarında uygulanan bu teknik; sabır ve ustalık gerektiren narin bir işçilik sunmaktadır.</p>
<h2>Kilim ve Dokuma</h2>
<p>Şanlıurfa''nın geleneksel kilim dokumacılığı Harran köylerinde yaşatılmaya devam etmektedir. Geometrik motifler ve isot kırmızısı hâkim renklerle dokunan kilimler, yöresel bir estetik dil oluşturur. Bazı kooperatifler kilim yapım atölyeleri düzenlemektedir.</p>
<h2>Nerede Bulunur?</h2>
<p>Bakırcılar: Kapalı Çarşı''daki Bakırcılar Sokağı. Telkari: Kuyumcular Çarşısı. Kilim: Harran köy pazarları ve şehir merkezindeki bazı el sanatları mağazaları. Sahte değil orijinal ürün için makul fiyatla ustanın elinden alanı tercih edin.</p>',
  'Şanlıurfa el sanatları kültürü: bakırcılık, telkari gümüş işçiliği ve kilim dokumacılığı — nerede bulunur, nasıl seçilir?',
  'Kültür', 'kultur',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-el-sanatlari-bakir-kilim-telkari.jpg',
  '/uploads/blogs/sanliurfa-el-sanatlari-bakir-kilim-telkari.jpg',
  'published', true, false, '2026-04-03 09:00:00', 5,
  'Şanlıurfa El Sanatları: Bakırcılık, Kilim ve Telkari Rehberi',
  'Şanlıurfa''nın geleneksel el sanatları: bakırcılık, telkari gümüş işçiliği ve kilim dokumacılığı hakkında kapsamlı kültürel rehber.',
  ARRAY['el-sanatlari','bakırcilik','telkari','kilim','zanaat']
),
(
  'Şanlıurfa Kıyafet ve Giyim Kültürü: Gelenekten Günümüze',
  'sanliurfa-kiyafet-giyim-kulturu-gelenek',
  '<h2>Geleneksel Erkek Kıyafeti</h2>
<p>Şanlıurfa''nın geleneksel erkek kıyafeti; geniş şalvar (potur), işlemeli yelek ve sarıktan oluşmaktadır. Özellikle Harran ve köy bölgelerinde yaşlı erkekler bu kıyafetleri hâlâ günlük yaşamda giyebilmektedir. Düğün ve özel günlerde geleneksel kıyafet kullanımı daha yaygındır.</p>
<h2>Kadın Kıyafeti ve Takıları</h2>
<p>Kadınlar için işlemeli entariler, renkli örtüler ve gümüş-altın takı setleri geleneksel giyim kültürünün temelini oluşturur. Özellikle başlık ve alın süsleri (hevle), Şanlıurfa kuyumculuğunun en özel ürünleridir. Düğünlerde altın takı takma geleneği hâlâ sürmektedir.</p>
<h2>İsot Rengi ve Motifler</h2>
<p>Şanlıurfa geleneksel dokumalarında ve kıyafetlerinde isot kırmızısı ve siyah ağırlıklı renk paleti dikkat çeker. Geometrik motifler ve çiçek desenleri, yöresel tekstil geleneğinin ortak dili olmuştur.</p>
<h2>Giyim Mağazaları ve Çarşı</h2>
<p>Geleneksel kumaşlar ve yöresel kıyafetler için Kapalı Çarşı''nın tekstil bölümünü ziyaret edin. Harran''da bazı kooperatifler kadın el emeği tekstil ürünleri satmaktadır. Bu ürünler, yaşayan kültürün somut bir parçasını evinize taşımanın en güzel yoludur.</p>',
  'Şanlıurfa''nın geleneksel kıyafet ve giyim kültürü: potur, işlemeli entariler, gümüş takılar ve isot rengi motifler.',
  'Kültür', 'kultur',
  '7a2816aa-d85a-481e-aa41-c89380f47d8f', 'Şanlıurfa Rehberi',
  '/uploads/blogs/sanliurfa-geleneksel-kiyafet-giyim-kulturu.jpg',
  '/uploads/blogs/sanliurfa-geleneksel-kiyafet-giyim-kulturu.jpg',
  'published', true, false, '2026-04-12 09:00:00', 4,
  'Şanlıurfa Geleneksel Kıyafet Kültürü | Giyim ve Takı Rehberi',
  'Şanlıurfa''nın geleneksel erkek ve kadın kıyafetleri, işlemeli entariler, gümüş-altın takılar ve yöresel giyim geleneği.',
  ARRAY['kiyafet','giyim','gelenek','geleneksel-kiyafet','tekstil']
)

ON CONFLICT (slug) DO NOTHING;

-- Sonuç kontrolü
SELECT category_slug, COUNT(*) as adet
FROM app.blog_posts WHERE status = 'published'
  AND category_slug IN ('kultur-tarih','kultur')
GROUP BY category_slug;
