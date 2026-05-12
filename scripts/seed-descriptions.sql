-- Kısa açıklamalı mekanların description ve short_description güncellenmesi
BEGIN;

UPDATE places SET
  description = 'Şanlıurfa Büyükşehir Belediyesi İtfaiye Müdürlüğü, şehrin genelinde yangın söndürme, kurtarma ve ilk yardım hizmetlerini 7/24 kesintisiz sürdürmektedir. Büyükşehir bünyesinde faaliyet gösteren birim, ilçe istasyonları ile koordineli çalışmaktadır.',
  short_description = '7/24 yangın söndürme ve kurtarma hizmetleri',
  updated_at = NOW()
WHERE slug = 'sanliurfa-itfaiye' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa İl Emniyet Müdürlüğü, şehrin genelinde asayiş, trafik ve kamu düzeni hizmetlerini yürüten ana emniyet birimidir. İl genelinde pek çok karakol ve birime koordinatörlük yapmaktadır.',
  short_description = 'Şanlıurfa geneli asayiş ve güvenlik hizmetleri',
  updated_at = NOW()
WHERE slug = 'sanliurfa-il-emniyet-mudurlugu' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Nevali Hotel, Şanlıurfa şehir merkezinde konumlanan 4 yıldızlı bir oteldir. Modern odaları, zengin kahvaltısı ve ulaşım kolaylığıyla hem iş hem de tatil amaçlı konuklar için ideal bir konaklama seçeneği sunar.',
  short_description = 'Şehir merkezinde 4 yıldızlı, modern konforlu otel',
  updated_at = NOW()
WHERE slug = 'nevali-hotel' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa Kültür Merkezi; tiyatro, müzik konserleri, resim sergileri ve çeşitli sanat etkinliklerine ev sahipliği yapan çok amaçlı bir kültür mekânıdır. Şehrin kültürel ve sanatsal yaşamının kalbinde yer alır.',
  short_description = 'Tiyatro, konser ve sergi etkinlikleri için kültür mekânı',
  updated_at = NOW()
WHERE slug = 'sanliurfa-kultur-merkezi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Özel Şanlıurfa Hastanesi, 7/24 acil servis, poliklinik ve yataklı tedavi birimleriyle geniş bir sağlık hizmeti portföyü sunmaktadır. Uzman hekim kadrosu ve modern tıbbi ekipmanlarıyla şehrin önemli özel sağlık merkezlerinden biridir.',
  short_description = '7/24 acil servis ve çok branşlı özel hastane',
  updated_at = NOW()
WHERE slug = 'ozel-sanliurfa-hastanesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Halilürrahman Gölü, Balıklıgöl ile omuz omuza uzanan, çevresi yemyeşil peyzaj ile kaplı kutsal bir su kaynağıdır. Hz. İbrahim ile özdeşleşen bu iki göl, Şanlıurfa''nın en fazla ziyaret edilen manevî ve tarihi mekânlarını oluşturur.',
  short_description = 'Balıklıgöl ile birlikte Hz. İbrahim''e atfedilen kutsal göl',
  updated_at = NOW()
WHERE slug = 'halilurrahman-golu' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa GAP Havalimanı (GAP International Airport), şehri İstanbul, Ankara ve diğer büyük şehirlere bağlayan uluslararası havalimanıdır. Türk Hava Yolları başta olmak üzere birçok havayoluyla düzenli uçuş seçenekleri sunmaktadır.',
  short_description = 'Şanlıurfa''nın uluslararası havalimanı, İstanbul-Ankara direkt uçuşları',
  updated_at = NOW()
WHERE slug = 'sanliurfa-gap-havalimani' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Bediüzzaman Said Nursi Türbesi, modern dönemin önemli İslam alimlerinden Said Nursi''nin son istirahatgâhıdır. Ziyaretçiler tarafından saygı ve hürmetle ziyaret edilen türbe; derin bir manevi atmosfer içinde şehir içinde yer almaktadır.',
  short_description = 'Said Nursi''nin türbesi ve ziyaret mekânı',
  updated_at = NOW()
WHERE slug = 'bediuzzaman-said-nursi-turbesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa Eğitim ve Araştırma Hastanesi, şehrin en büyük devlet hastanesi olarak tüm branşlarda poliklinik, acil ve yataklı tedavi hizmeti vermektedir. Tıp eğitimi ve araştırma faaliyetleri de bünyesinde sürdürülmektedir.',
  short_description = 'Şanlıurfa''nın en büyük devlet hastanesi, tüm branşlar',
  updated_at = NOW()
WHERE slug = 'sanliurfa-egitim-ve-arastirma-hastanesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Harran Üniversitesi, 1992 yılında kurulan ve uygarlığın ilk üniversite şehri olarak bilinen Harran''ın adını taşıyan köklü bir devlet üniversitesidir. Şanlıurfa''da birçok fakülte, enstitü ve yüksekokuluyla yaklaşık 40.000 öğrenciye eğitim vermektedir.',
  short_description = 'Şanlıurfa''nın köklü devlet üniversitesi, 40.000+ öğrenci',
  updated_at = NOW()
WHERE slug = 'harran-universitesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Halilürrahman Yüzme Havuzu, Şanlıurfa Büyükşehir Belediyesi tarafından işletilen açık hava yüzme tesisidir. Çocuklar için sığ havuz ve yetişkinler için olimpik standartta büyük havuzuyla aile dostu bir rekreasyon alanıdır.',
  short_description = 'Belediyeye ait açık hava yüzme tesisi, çocuk ve büyük havuz',
  updated_at = NOW()
WHERE slug = 'halilurrahman-yuzme-havuzu' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa Bakırcılar Çarşısı, asırlık geleneği yaşatan ustalarla el yapımı bakır güğüm, cezve, tepsi ve süs eşyalarının üretildiği tarihi çarşıdır. Zanaatkâr dükkânlarında hem üretimi izleyebilir hem de özgün hediyelik eşya satın alabilirsiniz.',
  short_description = 'El yapımı bakır ustalarının tarihi çarşısı',
  updated_at = NOW()
WHERE slug = 'bakircilar-carsisi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Sülüklü Han Kahvaltı, tarihi bir kervansaray içindeki eşsiz atmosferde geleneksel Şanlıurfa kahvaltısı sunan benzersiz bir mekândır. Taş avluda serpme kahvaltı tabakları, mırra kahvesi eşliğinde sunulmaktadır.',
  short_description = 'Tarihi handa efsane Şanlıurfa serpme kahvaltısı',
  updated_at = NOW()
WHERE slug = 'suluklu-han-kahvalti' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa Büyükşehir Belediyesi, şehrin merkez ve ilçelerindeki altyapı, ulaşım, temizlik, park-bahçe ve sosyal hizmetlerden sorumlu ana yerel yönetim kuruluşudur. Hizmet binası şehir merkezinde yer almakta ve vatandaşlara birçok hizmet penceresi sunmaktadır.',
  short_description = 'Şanlıurfa merkezi yerel yönetim hizmet binası',
  updated_at = NOW()
WHERE slug = 'sanliurfa-buyuksehir-belediyesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Manici Konukevi, titizlikle restore edilmiş tarihi bir Urfa konağında butik konaklama imkânı sunan özgün bir tesistir. Taş kemerli odalar, avlu bahçesi ve yöresel kahvaltıyla geleneksel Şanlıurfa mimarisini yaşatan eşsiz bir deneyim sunar.',
  short_description = 'Restore tarihi Urfa konağında butik konaklama',
  updated_at = NOW()
WHERE slug = 'manici-konukevi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Hz. İbrahim Doğum Mağarası, İslam peygamberi Hz. İbrahim''in doğduğuna inanılan kutsal mekândır. Balıklıgöl çevresinde konumlanan mağara, her yıl milyonlarca ziyaretçiyi ağırlayan Şanlıurfa''nın en önemli dini ve tarihi ziyaret noktalarından biridir.',
  short_description = 'Hz. İbrahim''in doğduğuna inanılan kutsal mağara',
  updated_at = NOW()
WHERE slug = 'hz-ibrahim-dogum-magarasi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Hilton Garden Inn Şanlıurfa, uluslararası Hilton zincirinin Şanlıurfa''daki modern oteldir. Spa, açık yüzme havuzu, çok amaçlı toplantı salonları ve şehrin en güzel panoramik restoranını bünyesinde barındırmaktadır.',
  short_description = 'Uluslararası Hilton zinciri; spa, havuz, toplantı olanakları',
  updated_at = NOW()
WHERE slug = 'hilton-garden-inn-sanliurfa' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Ulu Cami (Şanlıurfa), 12. yüzyılda inşa edilmiş ve kentin en eski camilerinden biri olma özelliğini koruyan tarihi bir ibadet mekânıdır. Rızvaniye Külliyesi ile birlikte Balıklıgöl çevresinin en belirgin siluetini oluşturan cami, görkemli minaresi ve avlu çeşmesiyle dikkat çekmektedir.',
  short_description = '12. yüzyıldan kalma Şanlıurfa''nın en eski camisi',
  updated_at = NOW()
WHERE slug = 'ulu-cami-sanliurfa' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Mado Şanlıurfa, Maraş usulü dondurma ve yaprak dövme yöntemiyle hazırlanan kadayıf künefesini şehre taşıyan zincir tatliyanın şubesidir. Aile dostu ortamı, geniş menüsü ve merkezi konumuyla her yaştan ziyaretçiye hitap etmektedir.',
  short_description = 'Maraş dondurması ve künefesiyle ünlü aile tatli mekânı',
  updated_at = NOW()
WHERE slug = 'mado-sanliurfa' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Harran Üniversitesi Hastanesi, Şanlıurfa''nın en büyük eğitim ve araştırma hastanesidir. Harran Üniversitesi Tıp Fakültesi bünyesinde faaliyet gösteren hastane; geniş uzman hekim kadrosu ve modern tıbbi altyapısıyla hem hasta tedavisi hem de tıp eğitimi için önemli bir merkez niteliği taşımaktadır.',
  short_description = 'HRÜ Tıp Fakültesi bünyesinde eğitim ve araştırma hastanesi',
  updated_at = NOW()
WHERE slug = 'harran-universitesi-hastanesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Şanlıurfa Mozaik Müzesi, Roma dönemine ait dünyanın en büyük mozaik koleksiyonlarından birine ev sahipliği yapmaktadır. "Amazonlar Savaşı" ve "Avcılık Sahneleri" gibi şaheserler başta olmak üzere 1.700 m²''yi aşan sergi alanıyla ziyaretçilere antik çağın ihtişamını sunan eşsiz bir müzedir.',
  short_description = 'Dünyanın en büyük Roma mozaik koleksiyonlarından biri',
  updated_at = NOW()
WHERE slug = 'sanliurfa-mozaik-muzesi' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Mevlid-i Halil Camii, Hz. İbrahim''in doğduğuna inanılan kutsal mağaranın hemen bitişiğinde yer alan ve büyük dini öneme sahip bir camidir. Balıklıgöl bölgesindeki en prestijli ibadet mekânlarından biri olan cami, her yıl binlerce hacı ve ziyaretçiyi ağırlamaktadır.',
  short_description = 'Hz. İbrahim doğum mağarası yanındaki kutsal cami',
  updated_at = NOW()
WHERE slug = 'mevlid-i-halil-camii' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Hacı Arif Cığerci, Şanlıurfa''da sabahın erken saatlerinde taze ciğer kavurmasıyla ünlü, kuşaktan kuşağa aktarılan efsane bir kahvaltı ve ciğer lokantasıdır. Ateşte şipşak pişirilen ciğer; isot biberli lavaş ekmeği, taze soğan ve domatesiyle servis edilmektedir.',
  short_description = 'Sabah erkenden efsane Urfa ciğer kahvaltısı',
  updated_at = NOW()
WHERE slug = 'haci-arif-cigerci' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Halfeti, Fırat Nehri kıyısında kurulan ve Birecik Barajı''nın inşasıyla büyük bölümü su altında kalan tarihi bir ilçedir. Dünyada tek doğal siyah gülün yetiştiği yer olan Halfeti''de tekneli gezi rotaları, batan köy kalıntıları ve nefes kesen yeşil su koyları eşsiz bir atmosfer yaratmaktadır.',
  short_description = 'Dünyada tek siyah gülün yetiştiği, kısmen su altındaki tarihi ilçe',
  updated_at = NOW()
WHERE slug = 'halfeti' AND LENGTH(COALESCE(description,'')) < 100;

UPDATE places SET
  description = 'Pide Saray, geleneksel Şanlıurfa pideciliğini yaşatan ve kıymalı, peynirli, kuşbaşılı çeşitleri taş fırında pişiren yöresel bir lokantadır. Şişman hamur tabanı ve cömert iç malzemesiyle kentin pidecileri arasında öne çıkan adreslerin başında gelmektedir.',
  short_description = 'Taş fırında geleneksel Şanlıurfa pidesi',
  updated_at = NOW()
WHERE slug = 'pide-saray' AND LENGTH(COALESCE(description,'')) < 100;

-- Kaç kayıt güncellendi özeti
SELECT slug, LEFT(description, 80) AS desc_preview
FROM places
WHERE slug IN (
  'sanliurfa-itfaiye','sanliurfa-il-emniyet-mudurlugu','nevali-hotel',
  'sanliurfa-kultur-merkezi','ozel-sanliurfa-hastanesi','halilurrahman-golu',
  'sanliurfa-gap-havalimani','bediuzzaman-said-nursi-turbesi',
  'sanliurfa-egitim-ve-arastirma-hastanesi','harran-universitesi',
  'halilurrahman-yuzme-havuzu','bakircilar-carsisi','suluklu-han-kahvalti',
  'sanliurfa-buyuksehir-belediyesi','manici-konukevi','hz-ibrahim-dogum-magarasi',
  'hilton-garden-inn-sanliurfa','ulu-cami-sanliurfa','mado-sanliurfa',
  'harran-universitesi-hastanesi','sanliurfa-mozaik-muzesi','mevlid-i-halil-camii',
  'haci-arif-cigerci','halfeti','pide-saray'
)
ORDER BY slug;

COMMIT;
