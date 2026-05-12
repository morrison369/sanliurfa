-- Halfeti/Harran/Göbeklitepe/Balıklıgöl için destek blog yazıları
-- Mevcut author_id kullanılıyor
DO $$
DECLARE
  v_author_id uuid := '7a2816aa-d85a-481e-aa41-c89380f47d8f';
  v_cat_id    int;
BEGIN
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'gezi-rehberi' LIMIT 1;

  INSERT INTO blog_posts (title, slug, content, excerpt, author_id, category_id, status, published_at, tags, meta_title, meta_description)
  VALUES
  (
    'Harran Gezi Rehberi: Kümbet Evler, Kale ve 6000 Yıllık Tarih',
    'harran-gezi-rehberi',
    '<h2>Harran Nedir?</h2><p>Harran, Şanlıurfa''ya 44 km uzaklıkta, dünyanın kesintisiz iskân gören en eski şehirlerinden biridir. MÖ 4. binyıldan bu yana yaşam alanı olan Harran; Babil tabletlerinde, İbrahim Peygamber anlatılarında ve İslam kaynaklarında adı geçen kadim bir yerleşim yeridir.</p><h2>Kümbet Evler</h2><p>Harran''ın simgesi olan kümbet (konik) evler, kerpiçten yapılmış ve birbirine bitişik kubbeli yapılardan oluşur. Dünyada benzeri olmayan bu mimari, iklime uyum için geliştirilmiştir: kış aylarında içeriyi sıcak, yaz aylarında serin tutar. Köyde yürüyerek gezilebilir ve bazılarının içi ziyarete açıktır.</p><h2>Harran Kalesi</h2><p>Harran iç kalesi ve Ulu Cami kalıntıları, Emevi dönemine (MS 7-8. yy) tarihlenir. Kale, askerî ve dinî işlev görmüş; bugün kalıntılar arkeolojik çalışma alanı olarak korunmaktadır. Giriş serbesttir.</p><h2>Harran Üniversitesi Kalıntıları</h2><p>Orta Çağ''da faaliyet göstermiş Harran Üniversitesi, İslam dünyasının ilk yükseköğretim kurumlarından sayılır. Tıp, astronomi ve matematik alanlarında eser veren alimler burada yetişmiştir. Kalıntılar, kale yakınında açık alanda görülebilir.</p><h2>Nasıl Gidilir?</h2><p>Şanlıurfa otogarından Harran minibüsleri düzenli kalkar. Yol süresi 45–60 dakikadır. Araçla Şanlıurfa–Akçakale yolundan Harran sapağına dönülür.</p><h2>Pratik Bilgiler</h2><ul><li>En iyi sezon: Ekim–Nisan (yaz 45°C''ye ulaşır)</li><li>Ziyaret süresi: 2–3 saat</li><li>Kümbet evler ve kale girişi ücretsiz</li><li>Yerel rehber önerilir</li></ul>',
    'Harran kümbet evleri, Harran Kalesi ve Ulu Cami kalıntılarını kapsayan kapsamlı gezi rehberi. Nasıl gidilir, ne görülür, pratik bilgiler.',
    v_author_id, v_cat_id, 'published', '2026-04-25',
    ARRAY['harran', 'gezi-rehberi', 'şanlıurfa'],
    'Harran Gezi Rehberi 2026 | Kümbet Evler, Kale, Ulaşım',
    'Harran kümbet evleri, Harran Kalesi ve tarihi üniversite kalıntıları için kapsamlı rehber. Şanlıurfa''dan nasıl gidilir, ziyaret saatleri ve pratik bilgiler.'
  ),
  (
    'Göbeklitepe Ziyaret Rehberi: Bilet, Ulaşım ve Merak Edilenler',
    'gobeklitepe-ziyaret-rehberi',
    '<h2>Göbeklitepe Neden Önemli?</h2><p>MÖ 10.000 yılına tarihlenen Göbeklitepe, insanlığın bilinen en eski tapınak kompleksidir. T biçimli dikili taşlar (stelae) ve üzerlerindeki hayvan kabartmaları, tarih öncesi toplumların dini örgütlenme kapasitesini ortaya koyar. 2018''de UNESCO Dünya Mirası Listesi''ne alınan alan, Şanlıurfa şehir merkezinden 18 km uzaklıktadır.</p><h2>Nasıl Gidilir?</h2><p>Şanlıurfa şehir merkezinden taksi veya araçla yaklaşık 25–30 dakikada ulaşılır. Şanlıurfa Otogarı''ndan düzenli servis bulunmamakla birlikte çeşitli tur şirketleri taşıma hizmeti sunmaktadır. Örencik köyü yönünde Göbeklitepe tabelaları takip edilir.</p><h2>Bilet ve Ziyaret Saatleri</h2><p>Göbeklitepe''ye giriş ücretlidir; Müzekart ile indirim uygulanır. Yaz sezonu (Nisan–Ekim) 08:00–19:00, kış sezonu (Kasım–Mart) 08:00–17:00 saatleri arasında ziyarete açıktır. Yoğun sezonda online bilet alımı önerilir.</p><h2>Rehberli Tur</h2><p>Alanda rehberli tur zorunlu değildir; sesli rehber cihazı kiralanabilir. Ancak 12.000 yıllık tarihin tam anlaşılması için sertifikalı rehber güçlü şekilde önerilir. Tur süresi genellikle 1,5–2 saattir.</p><h2>Pratik İpuçları</h2><ul><li>Yaz aylarında sabah erken veya akşam üstü ziyaret edin (gündüz 45°C+)</li><li>Rahat ayakkabı ve güneş koruyucu şart</li><li>Bol su yanınızda bulundurun</li><li>Fotoğraf serbest; flash ve drone özel izin gerektirir</li><li>Arkeolojik yapılara dokunmayın</li></ul><h2>Yakın Gezilecek Yerler</h2><p>Göbeklitepe ziyareti sonrası Şanlıurfa Arkeoloji Müzesi (şehirde) ve Harran''ı aynı gün gezebilirsiniz. Şanlıurfa''nın 18 km yakınında olması, günübirlik program için idealdir.</p>',
    'Göbeklitepe bilet fiyatları, ziyaret saatleri, ulaşım ve rehberli tur bilgisi. Dünyanın en eski tapınağı için eksiksiz ziyaret rehberi.',
    v_author_id, v_cat_id, 'published', '2026-04-18',
    ARRAY['göbeklitepe', 'gezi-rehberi', 'şanlıurfa', 'tarihi-yerler'],
    'Göbeklitepe Ziyaret Rehberi 2026 | Bilet, Ulaşım, Saatler',
    'Göbeklitepe nasıl gidilir, bilet ücreti, ziyaret saatleri ve rehberli tur bilgisi. Dünyanın en eski tapınağı için eksiksiz ziyaret rehberi 2026.'
  ),
  (
    'Balıklıgöl Ziyaret Rehberi: Hz. İbrahim''in Gölü',
    'balikligol-ziyaret-rehberi-2026',
    '<h2>Balıklıgöl Nedir?</h2><p>Balıklıgöl (Aynzeliha Gölü olarak da bilinir), Şanlıurfa şehir merkezinde yer alan, içinde kutsal sayılan sazan balıklarını barındıran tarihi bir göldür. İslam geleneğine göre Hz. İbrahim''in ateşe atıldığı yerde oluşan bu gölde balıklara dokunmak uğursuz sayılır; bu nedenle balıklar asırlardır korunmaktadır.</p><h2>Nasıl Gidilir?</h2><p>Balıklıgöl, Şanlıurfa şehir merkezinde Divan Caddesi ile Gölbaşı Caddesi''nin kesiştiği noktadadır. Merkezi konumu sayesinde yürüyerek veya kısa bir taksi yolculuğuyla kolayca ulaşılır. Yakınındaki Halilürrahman Camii ile birlikte gezilir.</p><h2>Neler Görülür?</h2><p>Balıklıgöl çevresinde Halilürrahman Camii, Aynzeliha Gölü, Rızvaniye Camii ve Vakfı, tarihi çarşıya açılan dar sokaklar ve çay bahçeleri bulunur. Gölün etrafında gezinti parkuru, oturma alanları ve seyyar tatlı satıcıları mevcuttur.</p><h2>Ziyaret Saatleri</h2><p>Balıklıgöl çevresi gün boyu açıktır; giriş ücretsizdir. Sabah namazı sonrası ve akşam saatleri en hareketli vakitlerdir. Ramazan ayında özellikle canlı ve atmosferli bir görünüm kazanır.</p><h2>Pratik Bilgiler</h2><ul><li>Giriş ücretsiz</li><li>Balıklara kesinlikle dokunmayın (inanç ve koruma amaçlı)</li><li>Yakınındaki kapalı çarşıda alışveriş yapılabilir</li><li>Fotoğraf serbesttir</li><li>Öğlen saatlerinde güneş şiddetli olabilir; şapka önerin</li></ul><h2>Yakın Gezilecek Yerler</h2><p>Balıklıgöl ziyaretini Şanlıurfa Kalesi, Kapalı Çarşı (Bedesten) ve Hz. İbrahim Doğduğu Mağara ile birleştirebilirsiniz. Tüm bu noktalar yürüyüş mesafesindedir.</p>',
    'Balıklıgöl ziyareti için rehber: Hz. İbrahim''in kutsal gölü, Halilürrahman Camii, çevre gezisi ve pratik bilgiler.',
    v_author_id, v_cat_id, 'published', '2026-05-01',
    ARRAY['balıklıgöl', 'gezi-rehberi', 'şanlıurfa', 'dini-yerler'],
    'Balıklıgöl Ziyaret Rehberi 2026 | Hz. İbrahim''in Gölü',
    'Balıklıgöl nasıl gidilir, ziyaret saatleri, çevre gezisi ve pratik bilgiler. Şanlıurfa''nın simgesi Hz. İbrahim''in kutsal gölü için eksiksiz rehber.'
  ),
  (
    'Şanlıurfa''da 2 Gün: Eksiksiz Gezi Rotası ve Öneriler',
    'sanliurfa-2-gunluk-gezi-rotasi',
    '<h2>Birinci Gün: Şehir Merkezi ve Tarihi Yerler</h2><h3>Sabah: Balıklıgöl ve Çevresi</h3><p>İlk güne Balıklıgöl''den başlayın. Halilürrahman Camii''ni ziyaret edin, gölü ve kutsal balıkları izleyin. Buradan kısa yürüyüşle Hz. İbrahim Doğduğu Mağara''ya gidin.</p><h3>Öğle: Tarihi Çarşı ve Kapalı Çarşı</h3><p>Kapalı Çarşı''da (Bedesten) gümüş takılar, bakır el işleri ve yöresel ürünler alışverişi yapın. Öğle yemeğinde Şanlıurfa''nın efsane kebabını bir köklü kebapçıda deneyin.</p><h3>Öğleden Sonra: Şanlıurfa Kalesi ve Müze</h3><p>Şanlıurfa Kalesi''ne çıkarak şehrin panoramik görüntüsünü izleyin. Ardından Şanlıurfa Arkeoloji Müzesi''nde Göbeklitepe ve Harran''dan gelen eserleri inceleyin.</p><h3>Akşam: Sıra Gecesi</h3><p>Şanlıurfa''nın özgün geleneği sıra gecesinde Türkü eşliğinde yöresel yemekler tadın. Gece cıvıl cıvıl olan Balıklıgöl çevresinde çay içerek günü tamamlayın.</p><h2>İkinci Gün: Yakın Çevre Turları</h2><h3>Sabah: Göbeklitepe (18 km)</h3><p>Sabah erken hareket ederek Göbeklitepe''ye gidin. Sabah serinliğinde 1,5–2 saatlik rehberli tur yapın. Biletinizi önceden online alın.</p><h3>Öğle: Harran (44 km)</h3><p>Göbeklitepe''den Harran''a geçin. Kümbet evleri, Harran Kalesi ve Ulu Cami kalıntılarını görün. Köyde yerel rehberle tur yarım güne tamamlanır.</p><h3>Dönüş</h3><p>Harran''dan Şanlıurfa merkezine dönerken Eyyübiye''nin tarihi sokaklarında kısa bir yürüyüş yapabilirsiniz.</p><h2>Pratik Bilgiler</h2><ul><li>En iyi sezon: Ekim–Mayıs (yaz çok sıcak)</li><li>2 günlük bütçe: Kişi başı yaklaşık 800–1500 TL (konaklama hariç)</li><li>Araç kiralamak veya rehberli tur paketi almak zamandan kazandırır</li><li>Göbeklitepe için önceden bilet alın</li></ul>',
    'Şanlıurfa''da 2 günlük gezi rotası: Balıklıgöl, Göbeklitepe, Harran, tarihi çarşı ve sıra gecesi. Eksiksiz gezi planı ve pratik öneriler.',
    v_author_id, v_cat_id, 'published', '2026-05-03',
    ARRAY['şanlıurfa', 'gezi-rehberi', '2-günlük-tur', 'rota'],
    'Şanlıurfa''da 2 Gün: Eksiksiz Gezi Rotası 2026',
    'Şanlıurfa''da 2 günlük gezi planı: Balıklıgöl, Göbeklitepe, Harran ve tarihi çarşıyı kapsayan rota. Pratik ipuçları ve öneriler.'
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;
