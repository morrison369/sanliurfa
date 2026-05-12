-- Haziran–Eylül 2026 blog yazıları (10 yeni yazı)

INSERT INTO blog_posts (
  id, title, slug, excerpt, content, author_id,
  status, published_at, featured_image, tags, read_time_minutes
)
SELECT
  gen_random_uuid(),
  v.title, v.slug, v.excerpt, v.content,
  (SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1),
  'published', v.published_at::timestamp,
  v.thumbnail_url, string_to_array(v.tags, ','), v.read_time::integer
FROM (VALUES

  ('Halfeti Siyah Gülleri: Dünyanın Tek Doğal Siyah Gülü',
   'halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul',
   'Halfeti''nin eşsiz siyah gülleri neden bu kadar özel? Nerede yetişir, ne zaman çiçek açar, nasıl ziyaret edilir? Tüm merak ettikleriniz bu rehberde.',
   '## Halfeti Siyah Gülü Nedir?

Dünyada yalnızca Halfeti''de yetişen ve doğal olarak koyu bordo–siyah renge bürünen bu gül, bölgenin yüksek asitli toprak yapısı ve Fırat nehri sularının birleşiminin ürünüdür. Bilimsel adı *Rosa odorata* olmakla birlikte halk arasında "Halfeti''nin siyah gülü" olarak anılır.

## Ne Zaman Çiçek Açar?

Gül, yılda iki dönemde çiçek açar:
- **İlkbahar:** Mayıs ortası – Haziran sonu
- **Sonbahar:** Ekim başı – Kasım ortası

En yoğun çiçeklenme Mayıs-Haziran döneminde yaşanır.

## Nerede Görülebilir?

Halfeti köy evlerinin bahçelerinde, yerel üreticilerin seralarında ve ilçe merkezindeki gül bahçesinde görülebilir. Bazı esnaf, tel sepetlerde taze gül satar.

## Ziyaret Önerileri

- Şanlıurfa''dan Halfeti''ye yaklaşık 1 saat araç seferi
- Tekne turuyla Fırat üzerinde gül bahçelerini izleyebilirsiniz
- Festival döneminde (Haziran ortası) yer bulmak güçleşebilir — önceden rezervasyon yapın',
   '/uploads/blog/halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul.jpg',
   'Halfeti,Gül,Doğa,Turizm',
   6,
   '2026-06-04 10:00:00'),

  ('Şanlıurfa''da Bir Hafta: Eksiksiz Gezi Planı',
   'sanliurfa-bir-hafta-gezi-plani',
   'Şanlıurfa''ya 7 gün gidiyorsanız nerede konaklayın, hangi günü nereyi görün? İlçe gezileri, tarihi mekanlar ve yeme-içme rehberini bu yazıda bulacaksınız.',
   '## 1. Gün — Şehir Merkezi ve Balıklıgöl

Sabah erken saatlerde Balıklıgöl''e gidin. Gölü ve çevresindeki tarihi camileri gezip Hz. İbrahim Makamı''nı ziyaret edin. Öğleden sonra Şanlıurfa Arkeoloji Müzesi''ne geçin. Akşam Kapalıçarşı''da alışveriş yapın.

## 2. Gün — Göbeklitepe

Sabah 8''de araçla Göbeklitepe''ye hareket edin (yaklaşık 20 dk). Rehberli tur en az 3 saat sürer. Öğleden sonra yakındaki Karahantepe''ye uğrayabilirsiniz.

## 3. Gün — Harran

Harran Antik Kenti''ni (konik evler, Ulu Cami kalıntıları) tam gün keşfedin. Akşam Şanlıurfa''ya dönün.

## 4. Gün — Halfeti ve Rumkale

Halfeti tekne turu sabah başlar (Cuma hariç). Öğleden sonra Rumkale''ye yürüyüş yapın.

## 5. Gün — Birecik ve Nizip

Birecik''te Fırat üzerindeki köprüyü ve Birecik Kalesi''ni görün. Nizip''te Zeugma mozaikleri sergisine uğrayabilirsiniz.

## 6. Gün — İlçe Keşfi: Siverek veya Ceylanpınar

Siverek''teki tarihi kaleyi veya Ceylanpınar tarım işletmesini tercih edebilirsiniz.

## 7. Gün — Alışveriş ve Veda

Sabah Bakırcılar ve Halıcılar Çarşısı. Öğle yemeği olarak son kez Urfa kebabı. Gece uçuş.',
   '/uploads/blog/sanliurfa-bir-hafta-gezi-plani.jpg',
   'Şanlıurfa,Gezi Rehberi,Turizm,Tatil',
   7,
   '2026-06-11 11:00:00'),

  ('Göbeklitepe''ye Nasıl Gidilir? Ulaşım ve Ziyaret Rehberi',
   'gobeklitepeye-nasil-gidilir-ulasim-rehberi',
   'Şanlıurfa''dan Göbeklitepe''ye giden yollar, ulaşım alternatifleri, bilet fiyatları ve ziyarette dikkat edilmesi gerekenler hakkında güncel bilgiler.',
   '## Konum ve Mesafe

Göbeklitepe, Şanlıurfa şehir merkezine yaklaşık 22 km uzaklıkta Karadag köyü yakınlarında yer almaktadır. Düz yolda yaklaşık 25–30 dakika sürer.

## Ulaşım Alternatifleri

**Kiralanmış araçla:** En esnek seçenek. Şanlıurfa oto kiralama şirketlerinden günlük 500–800 TL arasında araç kiralayabilirsiniz.

**Taksiyle:** Gidiş-dönüş ve bekleme dahil yaklaşık 600–900 TL. Sabah erken hareket ederseniz 10–11 arasında dönebilirsiniz.

**Belediye servisiyle:** Bazı dönemlerde belediye Göbeklitepe''ye özel servis düzenler. Belediye turizm hattını arayarak güncel seferleri öğrenebilirsiniz.

**Tur şirketleriyle:** Harran turu ile birleştirilen paket turlar genellikle daha hesaplı olur.

## Bilet ve Müzekart

- Giriş ücreti: Müzekart ile ücretsiz, diğerleri için 200–300 TL (güncel kontrol edin)
- Müzekart Şanlıurfa Arkeoloji Müzesi''nden temin edilebilir

## Ziyaret Saatleri

Tesis yaz saatlerinde 08:00–19:00, kış saatlerinde 08:00–17:00 açık. Öğlen saatlerinde kalabalık olabilir — sabahın erken saatleri tercih edilmeli.',
   '/uploads/blog/gobeklitepeye-nasil-gidilir-ulasim-rehberi.jpg',
   'Göbeklitepe,Ulaşım,Turizm,Rehber',
   5,
   '2026-06-18 09:30:00'),

  ('Urfa Usulü Lahmacun ve Pide: Tarifte Gizli Olan Sır',
   'urfa-usulu-lahmacun-pide-tarif',
   'Şanlıurfa mutfağının özü olan lahmacun ve pide nasıl yapılır? Urfa usulü ile klasik tarif arasındaki farklar ve şehrin en iyi pidecileri.',
   '## Urfa Lahmacunu Nasıl Farklıdır?

Urfa usulü lahmacunun temel farkı, kıymanın hazırlanış biçiminde yatmaktadır. Kıyma çok ince kıyılmadan dövülür; bu sayede farklı bir doku elde edilir. Baharatlar daha az, taze kırmızıbiber miktarı ise oldukça fazladır.

**Malzemeler:**
- 500g iri kıyma (elenmiş)
- 3 adet taze kırmızıbiber (çekirdeksiz)
- 1 orta boy domates
- 1 demet maydonoz
- 1 çay kaşığı pul biber
- Tuz

**Hazırlanışı:** Tüm malzemeleri rondo veya taş havan ile ezin, hamura yayın ve 250°C''de 4–5 dakika pişirin.

## Urfa Pidesi

Urfa pidesi kapalı değil açık formdadır ve üzerine sıradan kaşar değil, tel peynir sürülür. Şanlıurfa''daki geleneksel pideciler, hamuru çok ince açıp yüksek ısılı taş fırında pişirir.

## Şehrin En İyi Pidecileri

Piyangoevi ve Tarihi Kapalıçarşı içindeki eski usul pideciler otantik lezzeti yaşatmaya devam ediyor. Sabah 6''dan itibaren açık olan fırınlar güne erken başlamanızı sağlar.',
   '/uploads/blog/urfa-usulu-lahmacun-pide-tarif.jpg',
   'Yemek,Tarif,Urfa Mutfağı,Lahmacun',
   5,
   '2026-07-02 10:00:00'),

  ('Şanlıurfa''da Çocuklarla Gezi: Ailelere Özel Rehber',
   'sanliurfa-cocuklarla-gezi-aile-rehberi',
   'Şanlıurfa''ya çocuklarınızla geliyorsanız hangi mekanlar çocuklar için uygun? Yaşa göre aktiviteler, güvenli mekanlar ve pratik ipuçları.',
   '## Küçük Çocuklar İçin (3–8 Yaş)

**Balıklıgöl:** Saatlerce balıkları izleyebilirler. Çevresi güvenli, bol oturma alanı var.

**Hayvanat Bahçesi:** Şanlıurfa Hayvanat Bahçesi''nde yerel hayvanlar ve piknik alanları çocukları eğlendiriyor.

**Mini Golf Park:** Balıklıgöl çevresinde küçükler için mini golf ve çocuk oyun alanları.

## Büyük Çocuklar İçin (9–14 Yaş)

**Göbeklitepe:** İlk insanlık tarihi konusunda merak uyandırıcı. Öncesinde konuya hazırlıklı gitmeleri daha verimli bir ziyaret sağlar.

**Harran:** Konik evler ve antik kentin tartışmalı tarihi çocuklar için ilgi çekici sorular doğurur.

**Çocuk Bilim Müzesi:** İnteraktif sergileriyle öğrenmeyi eğlenceli hale getiriyor.

## Pratik İpuçları

- Yaz aylarında öğlen saatlerinden kaçının (40°C''ye ulaşabilir)
- Kapalı ve serin iç mekanlara öncelik verin
- Balıklıgöl çevresindeki restoranlar aileler için uygundur
- Çocuklara özel menü sunan mekanlar mevcuttur',
   '/uploads/blog/sanliurfa-cocuklarla-gezi-aile-rehberi.jpg',
   'Aile,Çocuk,Gezi,Tatil',
   6,
   '2026-07-09 09:00:00'),

  ('Şanlıurfa''nın Tarihi Çarşıları: Alışveriş Rehberi',
   'sanliurfa-tarihi-carsilari-alisveris-rehberi',
   'Kapalıçarşı''dan Bakırcılar Çarşısı''na, Altın Çarşısı''ndan Halıcılar Sokağına Şanlıurfa''da alışverişin püf noktaları ve pazarlık kültürü.',
   '## Kapalıçarşı

Şanlıurfa Kapalıçarşısı, 500 yıllık tarihi yapısıyla hâlâ aktif olarak kullanılan nadir Osmanlı ticaret yapılarından biridir. Baharatlar, el dokuması kumaşlar ve yöresel ürünler burada en uygun fiyatlarla bulunur.

## Bakırcılar Çarşısı

Ustalar gözünüzün önünde bakır kap, ibrik ve tepsi işler. Otantik hediye arayanlar için eşsiz bir adres. Fiyatlar sabit değildir — pazarlık kültürü hakimdir.

## Altın Çarşısı

Filigran gümüş işçiliği bölgenin karakteristik tasarımı. Küpe, bileklik ve kolye fiyatları gramaj üzerinden belirlenir.

## Halıcılar Çarşısı

Yörük halıları ve Harran motifleri burada. El dokuma ile makine dokuması arasındaki farkı öğrenmek için esnafla konuşun — gerçek el dokumalar arka yüzden ayırt edilir.

## Alışveriş İpuçları

- Sabah saatleri hem daha serin hem daha sakin
- Pazarlık yaygın, ilk fiyatı kabul etmeyin
- Güvenilir ve köklü dükkânları yerel rehberlerden öğrenin
- Çay ikramı normaldir, reddetmek ayıp sayılmaz',
   '/uploads/blog/sanliurfa-tarihi-carsilari-alisveris-rehberi.jpg',
   'Alışveriş,Kapalıçarşı,Tarih,Rehber',
   5,
   '2026-07-23 11:00:00'),

  ('Harran: Dünyanın İlk Üniversite Şehrinin Hikayesi',
   'harran-dunyanin-ilk-universite-sehrinin-hikayesi',
   'Hz. İbrahim''in yaşadığı yer, dünyanın ilk üniversitesinin kurulduğu kadim kent Harran''ın tarihi, konik evleri ve nasıl ziyaret edildiğine dair kapsamlı rehber.',
   '## Harran''ın Tarihi

Harran, MÖ 3. binyıla kadar uzanan yazılı tarihi ile Mezopotamya''nın en eski yerleşim merkezlerinden biridir. İbrahim Peygamber''in ailesiyle birlikte Ur''dan göç ettiği ve uzun yıllar ikamet ettiği yer olarak kabul edilmektedir.

Emeviler döneminde burada kurulan Harran Akademisi, İslam bilim dünyasının ilk yükseköğretim kurumlarından biri sayılmaktadır.

## Konik Evler

Harran''ın karakteristik petek biçimli konik evleri, çölün sıcağına karşı doğal klima işlevi görür. Toprak tuğla ile inşa edilen yapıların iç kısımları yaz aylarında 10°C''ye kadar serin kalabilir.

## Ne Görülür?

- **Harran Kalesi:** MS 8. yüzyıldan kalma Emevi yapısı
- **Ulu Cami Kalıntıları:** Dünyanın ilk Cuma camisinin harabeleri
- **Konik evler köyü:** Bazıları hâlâ yaşayan konut olarak kullanılıyor

## Pratik Bilgiler

- Şanlıurfa''dan 44 km güneyde, yaklaşık 45 dakika
- En iyi ziyaret saati: sabah 08–10 arası (yaz sıcağından önce)
- Rehber tutmak kesinlikle önerilir — her taşın bir hikayesi var',
   '/uploads/blog/harran-dunyanin-ilk-universite-sehrinin-hikayesi.jpg',
   'Harran,Tarih,Arkeoloji,Gezi',
   7,
   '2026-08-06 09:00:00'),

  ('Şanlıurfa''da Yaz Sıcağından Korunma Rehberi',
   'sanliurfa-yaz-sicagindan-korunma-rehberi',
   'Şanlıurfa yazları 45°C''ye ulaşabiliyor. Güneşi en az zararla atlatan yerel halkın sırları, kaçınılacak saatler, serin mekanlar ve yaz gezisi için pratik öneriler.',
   '## Şanlıurfa Yazı Ne Kadar Sıcak?

Temmuz–Ağustos döneminde günlük maksimum sıcaklık 42–46°C''ye ulaşır. Bu, Türkiye''nin en sıcak şehirlerinden biri olduğu anlamına gelir. Bununla birlikte doğru zamanlama ve önlemlerle ziyaret keyifli hale getirilebilir.

## Kaçınılacak Saatler

**11:00–16:00 arası** güneş etkisi en yoğun dönemdir. Bu saatlerde kapalı, serin mekanlarda kalmak en doğrusudur.

## Serin Mekanlar

- **Şanlıurfa Arkeoloji Müzesi:** Klimalı, saatlerce kalınabilir
- **Kapalıçarşı iç kısmı:** Taş yapı doğal serinlik sağlar
- **Alışveriş merkezleri:** Piazza AVM gün ortası için iyi tercih
- **Camilerin iç avluları:** Gölgeli ve serin

## Su ve Beslenme

- Her saat en az yarım litre su için
- Tuzlu ayran (yayık veya kase) elektrolit kaybını önler
- Ağır yemeklerden ve öğlen yemeklerinden kaçının

## Giyim

- Açık renkli, uzun kollu ve hafif kumaş tercih edin
- Şapka ve UV korumalı güneş gözlüğü zorunlu
- Sandalet yerine kapalı burunlu ve nefes alan ayakkabı daha güvenli',
   '/uploads/blog/sanliurfa-yaz-sicagindan-korunma-rehberi.jpg',
   'Yaz,Pratik,İpucu,Seyahat',
   5,
   '2026-08-13 10:00:00'),

  ('Şanlıurfa''nın El Sanatları: Bakır, Kilim ve Deri',
   'sanliurfa-el-sanatlari-bakir-kilim-deri',
   'Yüzlerce yıllık geleneksel el sanatlarını ayakta tutan ustalarla tanışın. Bakır işlemeciliği, kilim dokuma ve deri işçiliğinin sırları ve nerede bulunabileceği.',
   '## Bakır İşlemeciliği

Bakırcılar Çarşısı''nda ustalar dövme bakır tekniğini hâlâ çekiç ve keski ile icra ediyor. Bir ibrik ya da tepsi, birkaç saatlik emek gerektiriyor. Süsleme motifleri genellikle geometrik İslam sanat formlarını takip ediyor.

**Satın almadan önce dikkat:** Gerçek el dövme bakırın arka yüzü düzensiz ve hafifçe matdır. Makine üretiminde yüzey tamamen düzgündür.

## Kilim ve Halı Dokuma

Yörük halıları ve köy kilimleri bölgenin en özgün dokuma ürünleri. Harran motifleri geometrik; Halfeti kilimleri ise bitkisel boyalarla üretilmiş nadir örnekler sunuyor.

**Ayırt etme yöntemi:** El dokuma halının arka yüzü ön yüzüyle aynı desene sahipdir, makine dokumasında bu fark çok belirgindir.

## Deri İşçiliği

Şanlıurfa''nın geleneksel deri işçiliği (çarık, kemer, çanta) eski şehir içinde küçük atölyelerde yaşatılıyor. Çarşı içinde deri kokusuyla dolup taşan atölyeler turistlerin ilgisini çekiyor.',
   '/uploads/blog/sanliurfa-el-sanatlari-bakir-kilim-deri.jpg',
   'El Sanatları,Kültür,Alışveriş,Geleneksel',
   6,
   '2026-09-03 09:30:00'),

  ('Eylül''de Şanlıurfa: Sonbaharın En İyi Ziyaret Mevsimi',
   'eylulde-sanliurfa-sonbahar-ziyaret-rehberi',
   'Yaz sıcağının sona erdiği Eylül, Şanlıurfa için altın mevsimdir. Hangi mekanlar açık, hava nasıl, ne yenir içilir ve Eylül''e özel etkinlikler.',
   '## Eylül''de Hava Koşulları

Eylül başında hâlâ 35–38°C görülse de ay ilerledikçe hava 28–30°C''ye iner. Sabah ve akşam saatleri oldukça ferahlar. Yaz ortasındaki ezici sıcak yerini daha gezilebilir bir iklime bırakır.

## Eylül''e Özel Etkinlikler

- Harran Antik Kent Açık Hava Tiyatrosu (Eylül boyunca her hafta sonu)
- Şanlıurfa Maratonu (13 Eylül 2026)
- Göbeklitepe Gece Turu ve Işık Şovu (hafta sonu)

## Açık Hava Mekanları

Eylül''de artık tüm tarihi alanlarda gündüzleri rahatça dolaşılabilir. Göbeklitepe, Harran ve Halfeti, Eylül''de en güzel sezonunu yaşar.

## Yeme-İçme Önerileri

Eylül bölgenin hasat mevsimidir. Taze nar, üzüm ve incirin bolluğu yemek kültürüne yansır. Mevsimlik taze bakliyat çorbası ve taze sıkılmış nar suyu bu dönemin vazgeçilmezleri.

## Konaklama

Eylül''de sezonu kaçırmadan gelmek için en popüler otel ve butikleri önceden rezerve edin — Eylül hâlâ turizm sezonunun içindedir.',
   '/uploads/blog/eylulde-sanliurfa-sonbahar-ziyaret-rehberi.jpg',
   'Eylül,Sonbahar,Gezi,Rehber',
   7,
   '2026-09-10 10:00:00')

) AS v(title, slug, excerpt, content, thumbnail_url, tags, read_time, published_at)
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = v.slug);

SELECT COUNT(*) AS toplam_blog FROM blog_posts WHERE status='published';
SELECT DATE_TRUNC('month', published_at)::date AS ay, COUNT(*) AS yazi
FROM blog_posts WHERE status='published'
GROUP BY ay ORDER BY ay;
