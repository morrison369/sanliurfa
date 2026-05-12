-- Blog yazıları için iç linkleme — "İlgili Yerler" footer bölümü eklenir
-- İdempotent: zaten bölüm varsa güncellenmez

BEGIN;

-- 1. Göbeklitepe rehberi → müze, Harran, Halfeti
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">İlgili Mekanlar</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe Arkeoloji Müzesi</a></li>
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/ulasim/ucak-saatleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ GAP Havalimanı Uçuş Saatleri</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN ('gobeklitepeye-nasil-gidilir-ulasim-rehberi', 'gobeklitepe-rehberi')
  AND content NOT LIKE '%blog-related-places%';

-- 2. Haftalık gezi planı → tüm ana mekanlar
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Ziyaret Listesi</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe Arkeoloji Müzesi</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/isletme/halfeti-tekne-turu" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Halfeti Tekne Turu</a></li>
    <li><a href="/konaklama/oteller" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Otel Seçenekleri</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug = 'sanliurfa-bir-hafta-gezi-plani'
  AND content NOT LIKE '%blog-related-places%';

-- 3. Tarihi çarşılar rehberi → alışveriş mekanları
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Çarşı ve Alışveriş Mekanları</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/sanliurfa-kapalicarsi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Kapalıçarşısı</a></li>
    <li><a href="/isletme/bakırcilar-carsisi-sanliurfa" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Bakırcılar Çarşısı</a></li>
    <li><a href="/isletme/piazza-sanliurfa-avm" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Piazza AVM</a></li>
    <li><a href="/alisveris/yoresel-urunler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Yöresel Ürünler Rehberi</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN ('sanliurfa-tarihi-carsilari-alisveris-rehberi', 'sanliurfa-el-sanatlari-bakir-kilim-deri')
  AND content NOT LIKE '%blog-related-places%';

-- 4. Aile / çocukla gezi → turistik mekanlar
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Aileye Özel Mekanlar</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/yeme-icme" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Aile Dostu Restoranlar</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug = 'sanliurfa-cocuklarla-gezi-aile-rehberi'
  AND content NOT LIKE '%blog-related-places%';

-- 5. Harran rehberi → Harran + Göbeklitepe + Urfa Müze
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Harran Çevresinde Gezilecek Yerler</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/harran-antik-kent" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Harran Antik Kent</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe Arkeoloji Müzesi</a></li>
    <li><a href="/isletme/sanliurfa-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Şanlıurfa Müzesi</a></li>
    <li><a href="/gezilecek-yerler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Tarihi Yerler</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN ('harran-dunyanin-ilk-universite-sehrinin-hikayesi', 'harran-konik-evleri')
  AND content NOT LIKE '%blog-related-places%';

-- 6. Halfeti rehberi → Halfeti + Birecik
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Halfeti ve Çevresinde Gezilecek Yerler</h3>
  <ul class="space-y-2">
    <li><a href="/isletme/halfeti-tekne-turu" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Halfeti Tekne Turu</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl, Şanlıurfa</a></li>
    <li><a href="/ilceler/halfeti" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Halfeti İlçe Rehberi</a></li>
    <li><a href="/etkinlikler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Yaklaşan Etkinlikler</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN ('halfetide-1-gun', 'halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul')
  AND content NOT LIKE '%blog-related-places%';

-- 7. Gastronomi / yemek rehberleri
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa Mutfağını Keşfedin</h3>
  <ul class="space-y-2">
    <li><a href="/yeme-icme" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Restoranlar ve Mekanlar</a></li>
    <li><a href="/isletme/cigerci-aziz-usta" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Ciğerci Aziz Usta</a></li>
    <li><a href="/isletme/culcuoglu-restoran" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Çulcuoğlu Restoran</a></li>
    <li><a href="/yemek-tarifleri" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Urfa Yemek Tarifleri</a></li>
    <li><a href="/gastronomi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Gastronomi Rehberi</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN ('urfa-usulu-lahmacun-pide-tarif', 'sanliurfada-ne-yenir', 'sanliurfa-gastronomi')
  AND content NOT LIKE '%blog-related-places%';

-- 8. Eylül / yaz / mevsim rehberleri → etkinlikler ve genel mekanlar
UPDATE blog_posts
SET content = content || '
<hr class="my-8 border-sand-300"/>
<nav class="blog-related-places not-prose bg-sand-50 rounded-xl p-6 mt-8">
  <h3 class="text-lg font-semibold text-urfa-800 mb-3">Şanlıurfa''da Yapılacaklar</h3>
  <ul class="space-y-2">
    <li><a href="/etkinlikler" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Tüm Etkinlikler</a></li>
    <li><a href="/isletme/gobeklitepe-arkeoloji-muzesi" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Göbeklitepe</a></li>
    <li><a href="/isletme/balikligol" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Balıklıgöl</a></li>
    <li><a href="/konaklama" class="text-urfa-600 hover:text-urfa-800 font-medium">→ Konaklama Seçenekleri</a></li>
  </ul>
</nav>',
    updated_at = NOW()
WHERE slug IN (
  'eylulde-sanliurfa-sonbahar-ziyaret-rehberi',
  'sanliurfa-yaz-sicagindan-korunma-rehberi',
  'bugun-sanliurfada-ne-yapilir'
)
  AND content NOT LIKE '%blog-related-places%';

-- Özet: kaç post güncellendi
SELECT slug, (content LIKE '%blog-related-places%') AS linked
FROM blog_posts
WHERE status = 'published'
ORDER BY slug;

COMMIT;
