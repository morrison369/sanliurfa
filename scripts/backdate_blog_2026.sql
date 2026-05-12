-- 2026 yılına ait gelecek tarihli blog yazılarını geriye çek
-- Timeless rehber yazıları Mart-Mayıs 2026 arasına yayılıyor

UPDATE blog_posts SET published_at = '2026-05-07', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-aile-ile-gezilecek-yerler',
  'halfeti-tekne-turu-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-05-05', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-otobus-saatleri-nasil-ogrenilir',
  'sanliurfa-ne-yenir-mutlaka-tatmaniz-gereken-lezzetler'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-05-03', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-festivalleri-etkinlikleri-2026',
  'balikligol-ziyaret-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-30', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-konaklama-otel-rehberi',
  'sanliurfa-harran-gunubirlik-tur'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-28', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-ciger-kebabi-rehberi',
  'sanliurfa-ne-alinir-hediyelik-yerel-urun-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-24', updated_at = NOW()
WHERE slug IN (
  'halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul',
  'gobeklitepe-ziyaret-rehberi-2026'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-22', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-bir-hafta-gezi-plani',
  'gobeklitepeye-nasil-gidilir-ulasim-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-18', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-yaz-tatili-temmuz-agustos-gezi',
  'urfa-usulu-lahmacun-pide-tarif'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-16', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-cocuklarla-gezi-aile-rehberi',
  'sanliurfa-isotu-hikayesi-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-12', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-tarihi-carsilari-alisveris-rehberi',
  'halfeti-birecik-firat-kiyisi-gezi-guzergahi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-10', updated_at = NOW()
WHERE slug IN (
  'harran-dunyanin-ilk-universite-sehrinin-hikayesi',
  'sanliurfa-yaz-sicagindan-korunma-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-06', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-gastronomi-turu-2-gun',
  'sanliurfa-el-sanatlari-bakir-kilim-deri'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-04-04', updated_at = NOW()
WHERE slug IN (
  'eylulde-sanliurfa-sonbahar-ziyaret-rehberi',
  'sanliurfa-tarihi-hanlar-gumruk-hani'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-03-30', updated_at = NOW()
WHERE slug IN (
  'ekimde-sanliurfa-sonbahar-gezi-rehberi',
  'sanliurfa-baklava-en-iyi-adresler'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-03-28', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-en-guzel-camileri-tarihi',
  'karahantepe-rehberi-gobeklitepe-kardes-kazisi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-03-22', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-pazar-rehberi-hangi-gun-nerede',
  'sanliurfa-romantik-mekanlar-sevgililer-rehberi'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-03-20', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-geleneksel-kahvalti-rehberi',
  'urfa-isotu-dunya-en-aromatik-biber'
) AND published_at > NOW();

UPDATE blog_posts SET published_at = '2026-03-15', updated_at = NOW()
WHERE slug IN (
  'sanliurfa-ilkbahar-mart-mayis-gezi-rehberi',
  'sanliurfa-geleneksel-icecekler-mirra-salgam'
) AND published_at > NOW();
