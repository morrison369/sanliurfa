-- Kalan 15 blog yazısı için iç linkleme (slug düzeltmeli)
BEGIN;

-- Göbeklitepe rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Göbeklitepe Ziyareti</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe Arkeoloji Müzesi</a></li>
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/ulasim/ucak-saatleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ GAP Havalimanı Uçuş Saatleri</a></li>
    <li><a href="/konaklama" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Konaklama Seçenekleri</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'gobeklitepe-rehberi-ziyaret-bilgileri' AND content NOT LIKE '%blog-related-places%';

-- Halfetide bir gün
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Halfeti''de Gezilecek Yerler</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/halfeti-tekne-turu" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Halfeti Tekne Turu</a></li>
    <li><a href="/ilceler/halfeti" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Halfeti İlçe Rehberi</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl, Şanlıurfa</a></li>
    <li><a href="/etkinlikler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Yaklaşan Etkinlikler</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'halfetide-1-gun-tekne-turu' AND content NOT LIKE '%blog-related-places%';

-- Harran konik evleri
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Harran ve Çevresi</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/gezilecek-yerler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Tarihi Yerler</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'harran-konik-evleri-mimari-hikayesi' AND content NOT LIKE '%blog-related-places%';

-- Bakırcılar / hediyelik eşya rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Alışveriş Mekanları</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/bakırcilar-carsisi-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Bakırcılar Çarşısı</a></li>
    <li><a href="/isletme/sanliurfa-kapalicarsi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Kapalıçarşı</a></li>
    <li><a href="/alisveris/yoresel-urunler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Yöresel Ürünler</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'bakircilar-carsisi-hediyelik-rehberi' AND content NOT LIKE '%blog-related-places%';

-- Çiğ köfte tarifi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Urfa Mutfağını Keşfedin</h3>
  <ul class="space-y-2">
    <li><a href="/yemek-tarifleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Urfa Tarifleri</a></li>
    <li><a href="/gastronomi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Gastronomi Rehberi</a></li>
    <li><a href="/yeme-icme" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Restoranlar ve Mekanlar</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug IN ('cig-kofte-nasil-yapilir-sanliurfa-tarifi', 'kunefe-nereden-yenir-sanliurfa')
  AND content NOT LIKE '%blog-related-places%';

-- Sıra gecesi mekanları
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Urfa Gece Hayatı</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/sira-gecesi-kultur-evi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Sıra Gecesi Kültür Evi</a></li>
    <li><a href="/yeme-icme" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Yeme-İçme Mekanları</a></li>
    <li><a href="/etkinlikler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Kültür Etkinlikleri</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-sira-gecesi-mekanlari' AND content NOT LIKE '%blog-related-places%';

-- Kahvaltı mekanları
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Kahvaltı ve Cafe Mekanları</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/balikligol-kahvalti-salonu" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl Kahvaltı Salonu</a></li>
    <li><a href="/isletme/tas-kahve-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Taş Kahve</a></li>
    <li><a href="/yeme-icme/kahvalti" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Kahvaltı Mekanları</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfada-kahvalti-7-efsane-mekan' AND content NOT LIKE '%blog-related-places%';

-- Kebapçılar rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa Kebap Mekanları</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/cigerci-aziz-usta" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Ciğerci Aziz Usta</a></li>
    <li><a href="/isletme/sembol-ocakbasi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Sembol Ocakbaşı</a></li>
    <li><a href="/isletme/culcuoglu-restoran" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Çulcuoğlu Restoran</a></li>
    <li><a href="/en-iyi-kebapcilar" class="text-urfa-600 hover:text-urfa-800 font-medium">→ En İyi Kebapçılar Listesi</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-en-iyi-kebapcilar' AND content NOT LIKE '%blog-related-places%';

-- Festivaller / etkinlikler
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa Etkinlik Takvimi</h3>
  <ul class="space-y-2">
    <li><a href="/etkinlikler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Etkinlikler</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-festivalleri-etkinlikleri-2026' AND content NOT LIKE '%blog-related-places%';

-- Tarihi yerler rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Tarihi Mekanlar</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/gezilecek-yerler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Gezilecek Yerler</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug IN ('sanliurfa-gezilecek-10-tarihi-yer', 'sanliurfa-muzeleri-rehberi')
  AND content NOT LIKE '%blog-related-places%';

-- Konaklama rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa Otel ve Konaklama</h3>
  <ul class="space-y-2">
    <li><a href="/konaklama/oteller" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Oteller</a></li>
    <li><a href="/isletme/harran-otel-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Otel</a></li>
    <li><a href="/isletme/divan-otel-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Divan Otel</a></li>
    <li><a href="/isletme/doubletree-hilton-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ DoubleTree by Hilton</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-konaklama-otel-rehberi' AND content NOT LIKE '%blog-related-places%';

-- Otobüs saatleri rehberi
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa Ulaşım</h3>
  <ul class="space-y-2">
    <li><a href="/ulasim/otobus-saatleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Otobüs Saatleri</a></li>
    <li><a href="/ulasim/ucak-saatleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Uçak Saatleri</a></li>
    <li><a href="/ulasim" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Ulaşım Rehberi</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-otobus-saatleri-nasil-ogrenilir' AND content NOT LIKE '%blog-related-places%';

-- Aile ile gezilecek yerler
UPDATE blog_posts SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Aileyle Gezilecek Mekanlar</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/yeme-icme" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Aile Restoranları</a></li>
  </ul>
</nav>', updated_at = NOW()
WHERE slug = 'sanliurfa-aile-ile-gezilecek-yerler' AND content NOT LIKE '%blog-related-places%';

-- Özet: tüm linklenen blog sayısı
SELECT COUNT(*) AS toplam_linkli FROM blog_posts WHERE content LIKE '%blog-related-places%';

COMMIT;
