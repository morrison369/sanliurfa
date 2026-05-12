-- Kategori açıklamalarını güncelle — oku.txt 15 günlük madde
-- Şanlıurfa odaklı, SEO dostu, gerçek içerik

UPDATE categories SET description = 'Şanlıurfa''nın en gözde tatlı ve pasta mekânlarını keşfedin. Baklava, kadayıf ve künefenin başkenti Şanlıurfa''da geleneksel Urfa tatlıları ile modern pastacılık anlayışını bir arada bulacaksınız. Bakır çarşısından tarihi Kapalıçarşı''ya uzanan güzergâhta onlarca pastane, unnafiye ve şerbet dükkanı bulunuyor.'
WHERE slug = 'yeme-icme-pastaneler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''da altın ve gümüş kuyumculuk geleneği, Kapalıçarşı''nın köklü esnafıyla yaşatılmaya devam ediyor. Urfa tarzı el yapımı bilezik, küpe ve yüzüklerden modern kuyumculuk ürünlerine kadar geniş bir yelpazeyi sunan Şanlıurfa kuyumcuları, özellikle tarihi çarşı bölgesinde yoğunlaşmıştır.'
WHERE slug = 'alisveris-kuyumcular' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''nın sıcak yazlarında serinlemenin en keyifli yolu yerli dondurmacılar. Dondurma ustalarının geleneksel yöntemlerle ürettiği meyve sorbeleri, sakızlı dondurma çeşitleri ve buzlu şerbetler, hem yerel halk hem de ziyaretçiler arasında büyük ilgi görüyor.'
WHERE slug = 'yeme-icme-dondurmacilar' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''daki eczaneler 24 saat nöbet hizmetiyle sağlık hizmetlerine erişimi kolaylaştırıyor. Merkez ilçelerden Halfeti''ye, Harran''dan Siverek''e kadar Şanlıurfa''nın tüm ilçelerinde hizmet veren eczaneleri bu sayfadan kolayca bulabilirsiniz.'
WHERE slug = 'saglik-eczaneler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa konaklama sektörü; lüks oteller, butik tesisler ve ekonomik seçenekleriyle her bütçeye hitap ediyor. Göbeklitepe ziyareti, Halfeti turu veya Harran gezisi için Şanlıurfa şehir merkezindeki oteller, hem konumları hem de hizmet kaliteleriyle misafirlerini bekliyor.'
WHERE slug = 'konaklama-oteller' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa mutfağının zengin lezzetlerini sunan restoranlar, şehrin dört bir yanında konumlanmış durumda. Urfa kebabından lahmacuna, içli köfteden Harran çorbasına kadar yöresel yemeklerin yanı sıra Türk ve dünya mutfağına ait çeşitli seçenekler de mevcut. Tarihi hanlarda, modern mekânlarda ve aile restoranlarında enfes bir Şanlıurfa deneyimi yaşayabilirsiniz.'
WHERE slug = 'yeme-icme-restoranlar' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''da çiçekçiler; özel günler, düğünler ve kurumsal etkinlikler için taze buket, çiçek aranjmanı ve peyzaj hizmetleri sunuyor. Şehir merkezindeki butik çiçekçilerden ilçelerdeki yerel floristlere kadar geniş bir ağ, Şanlıurfa''da her ihtiyacınıza cevap verir.'
WHERE slug = 'alisveris-cicekciler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''daki optik ve gözlük mağazaları; muayene hizmetinden numaralı gözlük, güneş gözlüğü ve lens satışına kadar kapsamlı göz sağlığı ve optik çözümler sunuyor. Şehrin farklı semtlerinde konumlanmış optikçiler arasında fiyat ve hizmet karşılaştırması yaparak ihtiyacınıza en uygun seçeneği bulabilirsiniz.'
WHERE slug = 'alisveris-optikciler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''nın tarihi medreseleri, İslam eğitim ve bilim geleneğinin Anadolu''daki en köklü izlerini taşıyor. Osmanlı döneminden günümüze ulaşan Şanlıurfa medreseleri, mimari güzellikleri ve tarihi önemleriyle bölgenin kültürel mirasına ışık tutuyor.'
WHERE slug = 'dini-ve-kulturel-yerler-medreseler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Halfeti''nin nehir kıyısı bungalovlarından Göbeklitepe çevresindeki doğa tatil köylerine kadar Şanlıurfa''da bungalov ve doğa konaklama seçenekleri giderek çeşitleniyor. Gece gökyüzünü seyredebileceğiniz açık hava konaklama tesisleri, macera tutkunları ve doğa severler için ideal bir kaçış noktası sunuyor.'
WHERE slug = 'konaklama-bungalov-doga-konaklama' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''nın köklü cami mimarisi, Osmanlı, Selçuklu ve Artuklular döneminden günümüze taşınan taş işçiliğiyle dikkat çekiyor. Balıklıgöl çevresindeki tarihi camilerden ilçelerdeki köy camilerine kadar ibadet, mimari ve tarih arayanlar için zengin bir rota sunuyor.'
WHERE slug = 'dini-ve-kulturel-yerler-camiler' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''daki çocuk etkinlik merkezleri; eğitici oyun parkları, sanat atölyeleri ve interaktif müze deneyimleriyle ailelere hafta sonları için dolu dolu bir program sunuyor. Eyyübiye, Haliliye ve Karaköprü''deki çocuk merkezleri, Şanlıurfa''nın genç nesline yönelik eğlence ve gelişim ortamı oluşturuyor.'
WHERE slug = 'aile-ve-cocuk-cocuk-etkinlik-merkezleri' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa''da halı saha tesisleri, futbol severler için modern ve bakımlı sahalar sunuyor. Eyyübiye, Haliliye ve Karaköprü ilçelerinde yayılmış halı sahalar aydınlatmalı, kapalı ve açık seçenekleriyle her mevsimde hizmet veriyor.'
WHERE slug = 'spor-ve-fitness-hali-sahalar' AND (description IS NULL OR description = '');

UPDATE categories SET description = 'Şanlıurfa çevresindeki ören yerleri, Göbeklitepe''nin keşfiyle birlikte dünya arkeoloji haritasına kazınan en önemli merkezlerden biri haline geldi. Karahantepe, Taş Tepeler ve Harran''ın antik yapıları, tarih ve arkeoloji meraklıları için büyüleyici bir keşif rotası sunuyor.'
WHERE slug = 'turizm-ve-gezilecek-yerler-oren-yerleri' AND (description IS NULL OR description = '');
