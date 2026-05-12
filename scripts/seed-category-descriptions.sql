-- Ana kategori açıklamaları — SEO + içerik kalitesi
-- Session V+ — oku.txt "her kategori özgün metin" maddesi

UPDATE categories SET description = 'Şanlıurfa mutfağı, Türkiye''nin en özgün ve en çeşitli lezzet coğrafyalarından birini temsil eder. Urfa kebabı, tandır ciğeri, lahmacun, çiğ köfte ve bostana gibi yöresel lezzetlerin yanı sıra kaburga dolması, oruk, patlıcanlı kebap, meyan şerbeti ve Halfeti''nin tatlı balıkları da bu mutfağın parçasıdır. Balıklıgöl çevresi ve Gümrük Hanı etrafındaki geleneksel mekanlardan modern restoranlar ve kafe zincirlere kadar geniş bir yelpazede yeme-içme rehberi burada derlenmiştir.'
WHERE slug = 'yeme-icme' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa, Göbeklitepe, Karahantepe ve Harran kazıları nedeniyle artan ziyaretçi kitlesiyle birlikte konaklama sektörünü hızla geliştiren bir şehirdir. Balıklıgöl çevresi ve tarihi merkezde butik oteller; şehir merkezinde zincir oteller; Halfeti ve Harran''da bungalov ve konuk evleri mevcut konaklama seçeneklerini oluşturur. Aile pansiyonları, hostel seçenekleri ve apart daireler de rehberimizde listelenmiştir.'
WHERE slug = 'konaklama' AND parent_id IS NULL;

UPDATE categories SET description = 'UNESCO Dünya Mirası listesinde yer alan Göbeklitepe başta olmak üzere Şanlıurfa, dünyanın en önemli arkeolojik ve tarihi destinasyonlarından birini barındırır. Karahantepe, Harran kümbet evleri, Halfeti''nin sular altındaki tarihi dokusu, Balıklıgöl ve Hz. İbrahim külliyesi, Birecik''teki kelaynak kuşları ve tarihi kale gibi değerler bu rehberde bir araya gelir. Hem bireysel ziyaretçiler hem de tur grupları için kapsamlı bilgi sunulur.'
WHERE slug = 'turizm-ve-gezilecek-yerler' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''daki hastaneler, klinikler, eczaneler ve sağlık hizmetleri bu kategoride listelenmektedir. Eğitim araştırma hastaneleri, özel hastaneler, diş klinikleri, aile sağlığı merkezleri ve nöbetçi eczaneler gibi acil bilgilere bu sayfadan ulaşabilirsiniz. Şanlıurfa Eğitim ve Araştırma Hastanesi, özel hastaneler ve günlük nöbet bilgileri en güncel haliyle sunulur.'
WHERE slug = 'saglik' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da alışveriş, geleneksel çarşılar ile modern alışveriş merkezlerini bir arada sunar. Bakırcılar Çarşısı, Kuyumcular Çarşısı ve Kapalı Çarşı el sanatları, bakır işçiliği ve yöresel ürünlerin merkezi iken; ŞanlıUrfa Park ve Forum AVM gibi modern alışveriş merkezleri zincir mağazaları barındırır. İsot biberi, urfa pekmezi ve baklava gibi yerel ürünler de hediyelik eşya kategorisinde bulunabilir.'
WHERE slug = 'alisveris' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''daki eğitim kurumları; ilkokullar, ortaokullar, liseler ve Harran Üniversitesi ile Şanlıurfa Sağlık Bilimleri Üniversitesi gibi yükseköğretim kurumlarını kapsar. Bunların yanı sıra özel dershane, kurs merkezi, kreş ve anaokulları da bu kategoride listelenmiştir. Eğitim hayatına katkı sağlayan kütüphaneler ve araştırma merkezleri de burada bulunur.'
WHERE slug = 'egitim' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''nın ulaşım ağı; GAP Havalimanı ile Türkiye''nin büyük şehirlerine bağlanan hava seferleri, şehirlerarası otobüs hatları ve GAP Otogarı üzerinden sağlanan kara ulaşımından oluşur. Şehir içinde belediye otobüsleri, dolmuş hatları ve taksi hizmetleri mevcuttur. İlçelere minibüs bağlantıları ve araç kiralama seçenekleri de bu kategoride yer alır.'
WHERE slug = 'ulasim' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''daki resmi kurumlar; nüfus müdürlükleri, vergi daireleri, tapu müdürlükleri, mahkemeler ve belediye birimleri gibi vatandaşların sık başvurduğu kamu hizmet noktalarını kapsar. Adresler, randevu bilgileri ve hizmet saatleri bu rehberde güncel tutulmaya çalışılmaktadır.'
WHERE slug = 'resmi-kurumlar' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da emlak sektörü; bölgenin turizm, tarım ve sanayi gelişimiyle birlikte hareketlenen bir piyasayı yansıtır. Satılık ve kiralık daireler, ticari gayrimenkuller, arsa ve tarım arazileri bu kategoride listelenmektedir. Şehir merkezi, yeni gelişen konut bölgeleri ve ilçelere göre emlak rehberi sunulur.'
WHERE slug = 'emlak' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''daki eğlence, sosyal yaşam ve kültürel aktivite mekanları; sıra gecesi mekânları, sinemasallar, parklar, sosyal tesisler ve kültür merkezlerini kapsar. Sıra gecesi Şanlıurfa''ya özgü geleneksel bir eğlence geleneğidir; müzik, sohbet ve yöresel ikramlarla geçen bu geceler için en iyi mekânlar bu kategoride derlenmiştir.'
WHERE slug = 'eglence-ve-sosyal-yasam' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''nın dini ve kültürel alanları; İslam tarihinde derin anlam taşıyan camileri, Hz. İbrahim ile özdeşleşen Balıklıgöl ve Dergah bölgesini, Rızvaniye Camii ile Halil Rahman Camii gibi tarihi yapıları kapsar. Türk-İslam mimarisinin en nadide örneklerinden olan bu alanlar inanç turizminin kalbini oluşturur. Aşiret toplantı mekânları ve kültür dernekleri de bu kategoride listelenmiştir.'
WHERE slug = 'dini-ve-kulturel-yerler' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da spor ve fitness olanakları; spor salonları (gym), yüzme havuzları, futbol sahaları, tenis kortları ve açık hava spor alanlarını kapsar. Şehirde düzenlenen yerel spor turnuvaları ve atletizm etkinlikleri ile bisiklet parkurları hakkında bilgi de bu kategoride bulunabilir.'
WHERE slug = 'spor-ve-fitness' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da aile ve çocuklara yönelik mekanlar; oyun parkları, çocuk kütüphaneleri, kreşler, anaokulları, çocuk klinikleri ve aile etkinlik merkezlerini kapsar. Güvenli oyun alanları ve çocuk dostu restoranlar hakkında güncel bilgi bu kategoride derlenmiştir.'
WHERE slug = 'aile-ve-cocuk' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa ve çevre illerde hizmet veren hukuk büroları, mali müşavirler, noter ofisleri, bankalar ve sigorta şirketleri bu kategoride listelenmektedir. İş kurmak isteyen girişimciler ve hukuki danışmanlık arayanlar için faydalı bir kaynak oluşturmaktadır.'
WHERE slug = 'hukuk-ve-finans' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da günlük yaşama kolaylık sağlayan hizmet sektörü; kuaförler, berberler, temizlik firmaları, tamir servisleri, çilingirler, elektrikçiler ve tesisatçıları kapsar. Çağrı üzerine gelen acil servisler ve periyodik bakım hizmetleri de bu kategoride derlenmiştir.'
WHERE slug = 'hizmetler' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa, GAP (Güneydoğu Anadolu Projesi) kapsamında Türkiye''nin en önemli tarım bölgelerinden biri haline gelmiştir. Pamuk, buğday, mısır, pirinç ve sebze üretiminde öne çıkan il; hayvancılık ve arıcılık açısından da değerli bir potansiyele sahiptir. Tarım danışmanlık firmaları, fidancılar, veteriner klinikleri ve çiftlik malzemeleri tedarikçileri bu kategoride yer alır.'
WHERE slug = 'tarim-ve-hayvancilik' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da otomobil servis istasyonları, akaryakıt istasyonları, araç kiralama firmaları, oto yıkama ve bakım merkezleri bu kategoride listelenmektedir. İkinci el araç satıcıları ve yedek parça tedarikçilerine de buradan ulaşabilirsiniz.'
WHERE slug = 'otomotiv' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da ev ve yaşam kategorisi; mobilyacılar, dekorasyon mağazaları, beyaz eşya ve elektronik satış/servis noktaları, bahçe merkezleri ve ev tekstili dükkanlarını kapsar. Tadilat ve dekorasyon hizmetleri ile mutfak stüdyoları da bu rehberde bulunur.'
WHERE slug = 'ev-ve-yasam' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da organize sanayi bölgeleri, imalat atölyeleri ve iş dünyası hizmetleri bu kategoride listelenmektedir. GAP bölgesinin sanayi merkezi olan Şanlıurfa''da tekstil, gıda işleme, tarım makineleri ve inşaat malzemeleri üretimi öne çıkan sektörlerdir.'
WHERE slug = 'is-dunyasi-ve-sanayi' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da yerel medya kuruluşları, radyo istasyonları, televizyon kanalları ve internet haber siteleri bu kategoride yer alır. İletişim hizmetleri kapsamında GSM bayileri, internet servis sağlayıcıları ve telefon tamir servisleri de listelenmiştir.'
WHERE slug = 'medya-ve-iletisim' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da acil servis ve kriz hizmetleri; hastane acil servisleri, itfaiye istasyonları, polis karakolları, AFAD ve 112 acil koordinasyon merkezlerini kapsar. Gece açık eczaneler, 7/24 hizmet veren nöbetçi klinikleri ve kurtarma ekipleri hakkında güncel bilgiye bu kategoriden ulaşabilirsiniz.'
WHERE slug = 'acil-durum' AND parent_id IS NULL;

UPDATE categories SET description = 'Şanlıurfa''da düzenlenen kültürel, sanatsal, sportif ve ticari etkinlikler bu kategoride derlenmektedir. Uluslararası Göbeklitepe Festivali, Halfeti Siyah Gül Festivali, Harran Kültür Festivali ve yerel belediye etkinlikleri öne çıkan organizasyonlar arasındadır. Güncel etkinlik takibi için etkinlikler sayfamızı da ziyaret edebilirsiniz.'
WHERE slug = 'etkinlikler' AND parent_id IS NULL;
