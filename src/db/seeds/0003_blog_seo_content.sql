-- ============================================
-- SEO Blog Yazıları (Yüksek Arama Hacimli)
-- ============================================

INSERT INTO blog_posts (title, slug, excerpt, content, category, category_slug, status, author_name, published_at, created_at) VALUES

-- 1. Gezilecek Yerler Rehberi
(
  'Şanlıurfa''da Gezilecek 15 Yer (2026 Güncel Rehber)',
  'sanliurfa-gezilecek-yerler',
  'Göbeklitepe''den Balıklıgöl''e, Harran''dan Halfeti''ye Şanlıurfa''da mutlaka görülmesi gereken 15 yer. Giriş ücretleri, ziyaret saatleri ve ulaşım bilgileri.',
  '<h2>1. Göbeklitepe — Tarihin Sıfır Noktası</h2>
<p>MÖ 9600 yılına tarihlenen dünyanın bilinen en eski tapınağı. 2019''dan beri UNESCO Dünya Mirası Listesi''nde. T-şekilli devasa taş sütunlar ve üzerlerindeki hayvan kabartmaları insanlık tarihini yeniden yazdı.</p>
<p><strong>Giriş:</strong> Müzekart geçerli | <strong>Saat:</strong> 08:00-19:00 (Yaz) | <strong>Ulaşım:</strong> Şanlıurfa merkezden 18 km</p>

<h2>2. Balıklıgöl — Hz. İbrahim''in Ateşe Atıldığı Yer</h2>
<p>Efsaneye göre Nemrut tarafından ateşe atılan Hz. İbrahim''in düştüğü yerin göle, odunların ise balıklara dönüştüğü kutsal mekan. Halil-ür Rahman Gölü ve Ayn-ı Zeliha Gölü birbirine bağlıdır.</p>
<p><strong>Giriş:</strong> Ücretsiz | <strong>Saat:</strong> 7/24 | <strong>Ulaşım:</strong> Şehir merkezi, yürüme mesafesi</p>

<h2>3. Harran — Dünyanın İlk Üniversitesi</h2>
<p>Kümbet evleri, dünyanın ilk üniversitesi kalıntıları ve antik şehir surlarıyla benzersiz bir deneyim. Harran Ovası''nın ortasında tarih kokan bir ilçe.</p>

<h2>4. Halfeti — Batık Şehir ve Siyah Güller</h2>
<p>Birecik Barajı''nın suları altında kalan eski Halfeti ve eşsiz siyah gülleriyle UNESCO Cittaslow şehri. Fırat Nehri''nde tekne turu mutlaka yapılmalı.</p>

<h2>5. Urfa Kalesi ve Hz. İbrahim Mağarası</h2>
<p>Şehrin en yüksek noktasından panoramik manzara. Efsanelere göre Hz. İbrahim''in doğduğu mağara kalenin eteklerinde.</p>

<h2>6. Şanlıurfa Arkeoloji Müzesi</h2>
<p>Göbeklitepe buluntuları, Urfa Adamı (dünyanın en eski insan heykeli) ve binlerce yıllık eserler. Müzekart geçerli.</p>

<h2>7. Kapalı Çarşı ve Bakırcılar</h2>
<p>Osmanlı döneminden kalma tarihi çarşıda geleneksel el sanatları, bakır işçiliği ve yöresel ürünler.</p>

<h2>8-15. Diğer Yerler</h2>
<p>Ayn-ı Zeliha, Rızvaniye Camii, Hz. Eyyüp Makamı, Selahaddin Eyyübi Camii, Gümrük Hanı, Barutçu Hanı, Mevlid-i Halil Camii, Dergah bölgesi.</p>',
  'Gezi', 'gezi',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 2. En İyi Kebapçılar
(
  'Şanlıurfa''nın En İyi 10 Kebapçısı (2026 Fiyatlarıyla)',
  'sanliurfa-en-iyi-kebapcilar',
  'Ciğer kebabından Urfa kebabına, terbiyesiz tavuktan patlıcan kebabına Şanlıurfa''nın efsane kebapçıları. 2026 güncel fiyatları ve mekan bilgileri.',
  '<h2>1. Ciğerci Aziz Usta</h2>
<p>25 yıllık tecrübesiyle ciğer kebabının adresi. Balıklıgöl''e çıkan yolda çarşı içinde, salaş ama efsanevi bir mekan. <strong>2026 Fiyat: ₺450-650</strong></p>

<h2>2. Sembol Ocakbaşı</h2>
<p>Terbiyesiz tavuğun en iyi yapıldığı yer. "Terbiyesiz" Urfa''da baharat ve sos kullanılmadan ızgarada pişirme anlamına gelir. <strong>2026 Fiyat: ₺550-800</strong></p>

<h2>3. Çulcuoğlu Restoran</h2>
<p>Lahmacunun da kebabın da çok iyi olduğu köklü aile restoranı. <strong>2026 Fiyat: ₺400-700</strong></p>

<h2>4. Çağdaş Ocakbaşı</h2>
<p>Modern ambiyans, geleneksel lezzet. Özellikle kuşbaşı ve kaburga favori. <strong>2026 Fiyat: ₺600-900</strong></p>

<h2>5. Dedecan Ocakbaşı</h2>
<p>Patlıcan kebabı ve kuşbaşı konusunda şehrin en iddialı adresi. <strong>2026 Fiyat: ₺500-800</strong></p>

<h2>Sonuç</h2>
<p>Şanlıurfa''da kebap yemek bir kültür deneyimidir. Her mekanın kendine özgü bir hikayesi ve lezzeti var.</p>',
  'Gastronomi', 'gastronomi',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 3. Ciğer Nerede Yenir
(
  'Şanlıurfa''da Ciğer Nerede Yenir? En İyi 5 Ciğerci',
  'sanliurfa-ciger-nerede-yenir',
  'Şanlıurfa ciğer kebabı rehberi. En meşhur 5 ciğerci, fiyatları ve adresleriyle.',
  '<p>Ciğer kebabı Şanlıurfa''nın imza lezzetidir. Taze dana ciğeri, özel isot karışımı ve el yapımı lavaşla servis edilir.</p>
<h2>1. Ciğerci Aziz Usta — Efsanenin Adresi</h2>
<p>Şanlıurfa''da ciğer denince akla gelen ilk isim. 25 yıllık tecrübe, masada kendiniz doğradığınız soğanlar. <strong>₺450</strong></p>
<h2>2-5. Diğer ciğerciler yakında eklenecek...</h2>',
  'Gastronomi', 'gastronomi',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 4. Balıklıgöl Rehberi
(
  'Balıklıgöl Rehberi: Tarihi, Efsaneleri ve Ziyaret Bilgileri',
  'balikligol-rehberi',
  'Balıklıgöl''ün tarihi, Hz. İbrahim efsanesi, kutsal balıklar ve çevresindeki mekanlar. Ziyaret rehberi.',
  '<h2>Balıklıgöl Nedir?</h2>
<p>Şanlıurfa''nın kalbi sayılan Balıklıgöl, Hz. İbrahim''in Nemrut tarafından ateşe atılması efsanesiyle bilinir. Efsaneye göre ateş suya, odunlar balığa dönmüştür.</p>
<h2>Kutsal Balıklar</h2>
<p>Göldeki sazan balıklarına dokunmak veya tutmak yasaktır. Halk arasında "balıklara dokunanın başına kötülük gelir" inancı vardır.</p>
<h2>Çevresinde Ne Yapılır?</h2>
<p>Dergah bölgesinde çay içmek, Rızvaniye Camii''ni ziyaret etmek, Gümrük Hanı''nda mırra içmek, Kapalı Çarşı''da alışveriş yapmak.</p>',
  'Tarih', 'tarih',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 5. Göbeklitepe Hakkında
(
  'Göbeklitepe Hakkında Her Şey: Tarih, Ulaşım ve Ziyaret Rehberi',
  'gobeklitepe-hakkinda-bilgiler',
  'Göbeklitepe tarihi, önemi, nasıl gidilir, giriş ücreti ve ziyaret saatleri. 2026 güncel bilgiler.',
  '<h2>Göbeklitepe Nedir?</h2>
<p>MÖ 9600 yılına tarihlenen dünyanın bilinen en eski tapınak kompleksi. Alman arkeolog Klaus Schmidt tarafından 1994''te keşfedildi ve 2019''da UNESCO Dünya Mirası Listesi''ne girdi.</p>
<h2>Neden Bu Kadar Önemli?</h2>
<p>Tarım ve yerleşik yaşamdan ÖNCE inşa edilmiş bir tapınak olması, "önce tapınak, sonra şehir" teorisini kanıtladı. İnsanlık tarihini yeniden yazdı.</p>
<h2>Nasıl Gidilir?</h2>
<p>Şanlıurfa şehir merkezinden 18 km uzaklıkta. Taksi (~₺300), tur otobüsü veya özel araçla ulaşılır.</p>
<h2>Giriş ve Saatler</h2>
<p>Müzekart geçerlidir. Yaz: 08:00-19:00 / Kış: 08:00-17:00. Pazartesi açık.</p>',
  'Tarih', 'tarih',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 6. Sıra Gecesi Rehberi
(
  'Şanlıurfa Sıra Gecesi Nerede Yapılır? Gelenek ve Mekanlar',
  'sanliurfa-sira-gecesi-nerede-yapilir',
  'Şanlıurfa sıra gecesi geleneği, nasıl düzenlenir ve hangi mekanlarda yapılır? Geleneksel Urfa müziği ve sıra gecesi kültürü.',
  '<h2>Sıra Gecesi Nedir?</h2>
<p>Sıra gecesi, Şanlıurfa''ya özgü geleneksel toplantılardır. Bir grup erkek, sırayla birbirlerinin evlerinde toplanır. Müzik, sohbet ve yöresel yemeklerle dolu bu geceler yüzyıllardır süregelen bir gelenektir.</p>
<h2>Ne Yapılır?</h2>
<p>Bağlama ve ud eşliğinde Urfa türküleri söylenir, çiğ köfte yoğrulur, mırra ve meyan şerbeti içilir. Yaşlılar nasihat verir, gençler dinler.</p>
<h2>Nerelerde Yapılır?</h2>
<p>Geleneksel olarak evlerde yapılır. Turistler için Gümrük Hanı ve Dergah çevresindeki mekanlarda düzenlenen sıra geceleri mevcuttur.</p>',
  'Kültür', 'kultur',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
),

-- 7. Hafta Sonu Rehberi
(
  'Şanlıurfa Hafta Sonu Rehberi: 2 Günde Neler Yapılır?',
  'sanliurfa-hafta-sonu-rehberi',
  'Şanlıurfa''da 2 günlük gezi planı. Cumartesi ve pazar günü yapılacaklar, gezilecek yerler ve yeme içme önerileri.',
  '<h2>1. Gün: Tarih ve Kültür</h2>
<p><strong>Sabah:</strong> Göbeklitepe ziyareti (2-3 saat). Erken gidin, kalabalıktan kaçının.</p>
<p><strong>Öğle:</strong> Ciğerci Aziz Usta''da ciğer kebabı.</p>
<p><strong>Öğleden Sonra:</strong> Balıklıgöl, Dergah bölgesi, Rızvaniye Camii.</p>
<p><strong>Akşam:</strong> Gümrük Hanı''nda mırra, Kapalı Çarşı''da alışveriş.</p>

<h2>2. Gün: Doğa ve Lezzet</h2>
<p><strong>Sabah:</strong> Harran kümbet evleri (yarım gün tur).</p>
<p><strong>Öğle:</strong> Çulcuoğlu''nda lahmacun ve kebap.</p>
<p><strong>Öğleden Sonra:</strong> Halfeti tekne turu (batık şehir, siyah güller).</p>
<p><strong>Akşam:</strong> Sıra gecesi mekanlarında Urfa müziği.</p>',
  'Gezi', 'gezi',
  'published', 'Şanlıurfa Rehberi', NOW(), NOW()
)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  status = 'published';
