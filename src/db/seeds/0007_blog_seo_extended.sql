-- ============================================
-- Genişletilmiş Blog ve SEO İçerikleri
-- ============================================

-- ============================================
-- SEO Landing Pages
-- ============================================
INSERT INTO seo_pages (title, slug, meta_description, content, h1, is_active) VALUES

('Şanlıurfa Konaklama Rehberi | En İyi Oteller ve Butik Tesisler',
 'sanliurfa-konaklama',
 'Şanlıurfa''da konaklama seçenekleri: 5 yıldızlı oteller, tarihi hanlarda butik oteller ve uygun pansiyonlar.',
 'Şanlıurfa''da tarih ve konforun buluştuğu konaklama tesisleri. Hilton Garden Inn''den tarihi Hanehan Butik Otel''e, Balıklıgöl yakınındaki butik tesislerden modern otellere kadar her bütçeye uygun seçenek.',
 'Şanlıurfa Konaklama Rehberi',
 true),

('Şanlıurfa Ulaşım Rehberi | GAP Havalimanı ve Otogar Bilgileri',
 'sanliurfa-ulasim-rehberi',
 'Şanlıurfa''ya nasıl gidilir? GAP Havalimanı, otogar, tren garı ve şehir içi ulaşım rehberi.',
 'Şanlıurfa''ya ulaşımın birden fazla yolu var. Uçakla gelecekseniz GAP Havalimanı şehir merkezine yaklaşık 40 km uzaklıkta. Otobüsle gelecekseniz GAP Şehirlerarası Terminali kullanabilirsiniz.',
 'Şanlıurfa Ulaşım Rehberi',
 true),

('Şanlıurfa Alışveriş Rehberi | Kapalı Çarşı ve AVM''ler',
 'sanliurfa-alisveris-rehberi',
 'Şanlıurfa''da alışveriş: tarihi kapalı çarşı, bakırcılar, isot pazarı ve modern AVM''ler.',
 'Şanlıurfa alışverişinde iki dünya bir arada: Gümrük Hanı ve tarihi Kapalıçarşı''da bakır eşyalar, isot ve Urfa boncukları; modern Urfa Park AVM ve UrfaCity AVM''de moda ve teknoloji.',
 'Şanlıurfa Alışveriş Rehberi',
 true),

('Şanlıurfa''da Ne Yapılır? | Günlük Aktivite Rehberi',
 'sanliurfada-ne-yapilir',
 'Şanlıurfa''da 1-3 günlük gezi planı. Göbeklitepe, Balıklıgöl, Harran ve yöresel lezzetler.',
 '1 Günlük Plan: Sabah Balıklıgöl ve Dergah bölgesini ziyaret edin, öğlen ciğer kebabı yiyin, öğleden sonra Urfa Kalesi ve Arkeoloji Müzesi, akşam Gümrük Hanı''nda sıra gecesi keyfi. 2. Gün: Göbeklitepe, Harran, tekne turu için Halfeti.',
 'Şanlıurfa''da Ne Yapılır?',
 true),

('Şanlıurfa Tarihi Yerler Rehberi | Antik Şehirler ve Kaleler',
 'sanliurfa-tarihi-yerler',
 'Şanlıurfa''nın tarihi yerleri: Göbeklitepe, Balıklıgöl, Urfa Kalesi, Harran ve daha fazlası.',
 'Şanlıurfa tarihin sıfır noktası olarak anılır. MÖ 9600''e tarihlenen Göbeklitepe, Hz. İbrahim''in doğduğu şehir olarak bilinen Balıklıgöl, dünyanın ilk üniversitesinin kurulduğu Harran ve batık şehriyle ünlü Halfeti bu şehri benzersiz kılar.',
 'Şanlıurfa Tarihi Yerler Rehberi',
 true)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  meta_description = EXCLUDED.meta_description,
  is_active = true;

-- ============================================
-- Blog Yazıları
-- ============================================
INSERT INTO blog_posts (title, slug, content, excerpt, status, published_at, reading_time) VALUES

('Şanlıurfa''da Konaklama: En İyi 10 Otel ve Butik Tesis',
 'sanliurfa-en-iyi-oteller',
 E'## Şanlıurfa''da Nerede Kalınır?\n\nŞanlıurfa''da konaklama deneyimi, şehrin tarihi dokusunu ve modern konforunu bir arada sunar. İşte en iyi konaklama seçenekleri:\n\n### 1. Hanehan Butik Otel\nDergah yakınındaki tarihi handa konfor. Balıklıgöl manzarası ve geleneksel taş mimarisi.\n\n### 2. Hilton Garden Inn Şanlıurfa\nŞehir merkezinde 5 yıldızlı konfor. Havuz, spa ve uluslararası restoran.\n\n### 3. Manici Hotel\nBalıklıgöl''e yürüme mesafesinde şirin otel. Aile dostu fiyatlar.',
 'Şanlıurfa''da konaklama seçenekleri: tarihi hanlarda butik oteller, 5 yıldızlı tesisler ve bütçe dostu pansiyonlar.',
 'published', NOW() - INTERVAL '5 days', 6),

('Şanlıurfa''ya Nasıl Gidilir? Ulaşım Rehberi 2026',
 'sanliurfaya-nasil-gidilir',
 E'## Şanlıurfa Ulaşım Rehberi\n\n### Uçakla\nGAP Havalimanı şehir merkezine 40 km uzaklıkta. THY, Pegasus ve SunExpress direkt sefer yapıyor. Havalimanından merkeze havataş veya taksiyle ulaşım mümkün.\n\n### Otobüsle\nGAP Otogarı''na Türkiye''nin tüm büyük şehirlerinden otobüs var. Metro, Kamil Koç, Flixbus...\n\n### Araçla\nİstanbul''dan ~1.100 km, Ankara''dan ~800 km, Gaziantep''ten 145 km.',
 'GAP Havalimanı, otogar ve kara yoluyla Şanlıurfa''ya ulaşım rehberi. Tüm ulaşım alternatifleri.',
 'published', NOW() - INTERVAL '3 days', 5),

('Şanlıurfa Alışveriş: Kapalıçarşı''dan AVM''lere Tam Rehber',
 'sanliurfa-alisveris-rehberi-blog',
 E'## Şanlıurfa''da Alışveriş\n\n### Tarihi Kapalıçarşı\nGümrük Hanı, Sipahioğlu Çarşısı ve Zincirli Bedesten. El yapımı bakır eşyalar, isot, Urfa boncuğu ve yöresel ürünler burada satılır.\n\n### İsot (Kırmızı Biber)\nŞanlıurfa''nın ikonik ürünü. Toz, pul veya bez formunda — eve mutlaka götürün.\n\n### Urfa Boncuğu\nGeleneksel cam boncuklar, nazarlıklar ve takılar.',
 'Şanlıurfa''da ne alınır? Kapalıçarşı, isot pazarı, bakırcılar çarşısı ve modern AVM''ler.',
 'published', NOW() - INTERVAL '1 days', 4)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  status = 'published';
