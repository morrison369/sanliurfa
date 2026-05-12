-- Kısa açıklamalı önemli mekanlar için genişletilmiş açıklamalar
BEGIN;

UPDATE places SET
  description = 'Göbeklitepe, MÖ 10.000-12.000 yıllarına tarihlenen dünyanın bilinen en eski tapınak kompleksidir. T biçimli dev taş sütunlar, yıldız haritaları, hayvan kabartmaları ve gizemi hâlâ tam çözülemeyen ritüel alanlarıyla Göbeklitepe, tarih öncesi dönem anlayışını kökten değiştiren UNESCO Dünya Mirası''dır. Şanlıurfa şehir merkezine 18 km uzaklıkta yer alır; müzeli ziyaretler rehber eşliğinde yapılmaktadır.',
  short_description = 'MÖ 12.000''den kalma dünyanın en eski tapınağı, UNESCO Dünya Mirası',
  updated_at = NOW()
WHERE slug = 'gobeklitepe-oren-yeri' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Balıklıgöl, Hz. İbrahim''in Nemrut tarafından ateşe atılması sonucunda gölde belirdiğine inanılan kutsal balıkların yaşadığı tarihi ve dini bir alandır. Gölün etrafını kuşatan tarihi yapılar, Rızvaniye Camii, Halilürrahman Camii ve Abrahamin Türbesi ile birlikte Şanlıurfa''nın en belirgin simgesi ve en çok ziyaret edilen mekânı konumundadır. Yüzyıllardır dini önemi korunan Balıklıgöl, saklı bahçeleri ve çeşmeleriyle de büyük bir huzur ortamı sunar.',
  short_description = 'Hz. İbrahim efsanesinin kutsal gölü, Şanlıurfa''nın simgesi',
  updated_at = NOW()
WHERE slug = 'balikligol' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Harran Antik Kenti, İnsanlığın bilinen ilk üniversitesine ve bilim merkezine ev sahipliği yapmış, MÖ 3.000''e tarihlenen kadim bir yerleşim yeridir. Birbirinden farklı medeniyetlerin hâkim olduğu şehirde konik kümbet evler, tarihi Ulu Cami kalıntıları ve antik kale surları ziyaretçileri büyülemektedir. Hz. İbrahim''in yıllarca ikamet ettiğine inanılan Harran; Mezopotamya, Babil ve Sümer medeniyetlerinin de geçiş noktası olarak tarih sahnesinde yerini almaktadır.',
  short_description = 'MÖ 3000''den kalma antik kent, konik kümbet evler ve kadim üniversite',
  updated_at = NOW()
WHERE slug = 'harran-antik-kenti' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Şanlıurfa Arkeoloji Müzesi, Türkiye''nin alan açısından en büyük arkeoloji müzesi olup Göbeklitepe, Karahantepe ve Nevali Çori başta olmak üzere bölgenin paha biçilmez buluntularını barındırmaktadır. 13.000 yıl öncesine ait heykelcikler, oyma taş eserler ve çivi yazılı tabletler, insanlığın tarihöncesi dönemini adım adım anlatmaktadır. Yakın zamanda modern galeri tasarımıyla yenilenerek ziyaretçi deneyimi önemli ölçüde geliştirilmiştir.',
  short_description = 'Türkiye''nin en büyük arkeoloji müzesi, Göbeklitepe buluntuları',
  updated_at = NOW()
WHERE slug = 'sanliurfa-arkeoloji-muzesi' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Halil İbrahim Sofrası, Balıklıgöl''ün hemen kıyısında tarihi bir konumda hizmet veren ve geleneksel Urfa lezzetlerini şehrin en güzel atmosferinde sunan bir restorandır. Göbeklitepe kebabı, fırın lahmacunu, ciğer sarması ve zengin meze çeşitleriyle Urfa mutfağını eksiksiz yansıtmaktadır. Tarihi kentin kalbinde yemek deneyimi isteyenler için ideal adreslerden biridir.',
  short_description = 'Balıklıgöl kıyısında geleneksel Urfa yemekleri ve tarihi atmosfer',
  updated_at = NOW()
WHERE slug = 'halil-ibrahim-sofrasi' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Ali Usta Çiğ Köfte, Şanlıurfa''nın geleneksel ezme tekniğiyle hazırlanan, isot biberinin keskin baharatlığını bulgurla buluşturan otantik çiğ köftesiyle nam salmış bir lokantadır. Makine değil el yoğurması tercih edildiğinden köftelerin dokusu yumuşak, tadı ise yoğun ve uzun solukludur. İnce lavaş ekmeği ve taze yeşilliklerle servis edilen bu lezzeti tatmadan Urfa ziyareti tamamlanmış sayılmaz.',
  short_description = 'El yoğurması geleneksel isot biberli Urfa çiğ köftesi',
  updated_at = NOW()
WHERE slug = 'ali-usta-cig-kofte' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Cantık Sıra Gecesi Salonu, Urfa''nın asırlık sıra gecesi geleneğini yaşatmaya devam eden, yaklaşık 50 kişilik özel oturum kapasitesiyle kültürel miras turizminin merkezinde yer alan bir mekândır. Kemençe, ud, divan sazı ve def eşliğinde icra edilen klasik Urfa şarkıları; mırra, leblebi ve baharatlarla desteklenen sofralar eşliğinde misafirlere sunulmaktadır. Özel davetlere ve kültürel turlara özel oturum rezervasyonu alınmaktadır.',
  short_description = '50 kişilik özel sıra gecesi, mırra ve geleneksel Urfa müziği',
  updated_at = NOW()
WHERE slug = 'sıra-gecesi-cantik' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Piazza AVM Şanlıurfa, 120''den fazla ulusal ve uluslararası mağaza, çok salonlu sinema kompleksi, geniş food court ve özel çocuk eğlence parkıyla Şanlıurfa''nın en büyük ve en kapsamlı alışveriş merkezidir. Ücretsiz Wi-Fi erişimi, geniş otopark ve engelli erişim düzenlemeleriyle her yaş ve ihtiyaca hitap etmektedir.',
  short_description = '120+ mağaza, sinema, food court ve çocuk parkı ile dev alışveriş merkezi',
  updated_at = NOW()
WHERE slug = 'piazza-avm' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Şanlıurfa Valiliği, ilin en üst idari birimini temsil eden ve kamu hizmetleri, güvenlik, sivil hizmetler ile koordinasyonu yürüten resmi devlet kuruluşudur. Vatandaşların başvuru, bilgi edinme ve şikâyetleri için hizmet ofisleri mesai saatleri içinde açıktır. Bina aynı zamanda il genelindeki acil koordinasyon ve afet yönetim birimlerini de bünyesinde barındırmaktadır.',
  short_description = 'Şanlıurfa''nın en üst idari birimi, vatandaş hizmetleri',
  updated_at = NOW()
WHERE slug = 'sanliurfa-valiligi' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Karaköprü Bowling Cafe, 8 lane profesyonel bowling pistleri, bilardo masaları ve çok sayıda atari oyununun yanı sıra ailelerin birlikte vakit geçirebileceği kafeterya alanıyla Şanlıurfa''da sosyal eğlence için en kapsamlı adreslerden biridir. Çocuklara özel erken saatlerde uygun fiyatlı uygulama paketleriyle hafta içi ve hafta sonu yoğun ziyaretçi akışı yaşanmaktadır.',
  short_description = '8 lane bowling, bilardo, atari ve kafeterya — aile eğlence merkezi',
  updated_at = NOW()
WHERE slug = 'karakopru-bowling-cafe' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Cevahir Konukevi & Restaurant, 19. yüzyıldan kalma restore edilmiş otantik bir Urfa evinin avlusunda hizmet veren, hem konaklama hem de gastronomi deneyimi sunan butik bir mekândır. Taş kemerler, çınarların gölgesindeki avlu ve zeytinyağı ağırlıklı pişirme geleneğiyle hazırlanan özel Urfa sofraları unutulmaz bir deneyim vadetmektedir. Küçük gruplar için özel yemek organizasyonları ve kültürel turlar da düzenlenmektedir.',
  short_description = 'Restore tarihi Urfa evinde butik konaklama ve geleneksel yemek',
  updated_at = NOW()
WHERE slug = 'cevahir-konukevi-restaurant' AND LENGTH(COALESCE(description,'')) < 150;

UPDATE places SET
  description = 'Karaköprü Yarı Olimpik Yüzme Havuzu, 25 metre uzunluğundaki yarı olimpik havuzuyla yüzme kursları ve antrenman imkânı sunan modern bir tesistir. Çocuklara yönelik sığ havuz ve özel yüzme eğitimi programları ile aileler için ideal bir spor ve dinlenme alanı işlevi görmektedir. Sıcak su sistemi sayesinde yıl boyu kullanılabilmektedir.',
  short_description = '25m yarı olimpik havuz, yüzme kursları, çocuk havuzu',
  updated_at = NOW()
WHERE slug = 'karakopru-yuzme-havuzu' AND LENGTH(COALESCE(description,'')) < 150;

-- Özet
SELECT COUNT(*) AS hala_kisa FROM places WHERE LENGTH(COALESCE(description,'')) < 120 AND status='active';

COMMIT;
