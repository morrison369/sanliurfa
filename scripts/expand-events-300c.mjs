#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_PORT = 15632;

const EXPANSIONS = {
  'dc9c7019': `Harran'ın 5000 yıllık tarihi dokusunu keşfetmek için düzenlenen bu özel bahar turunda, antik kentin konik kümbet evleri, Harran Kalesi ve Ulu Camii kalıntıları rehber eşliğinde gezilmektedir. Baharın ilk ışıklarında Harran Ovası'nın yeşile büründüğü bu dönem, fotoğraf tutkunları ve tarih meraklıları için ideal bir zaman sunmaktadır. Tur kapsamında yerel halkla bir araya gelme ve geleneksel yaşamı yakından tanıma fırsatı da bulunmaktadır.`,

  '7497bc57': `Balıklıgöl'ün sakin kıyılarından başlayarak Gölbaşı bölgesinin yeşil alanlarına uzanan bu doğa yürüyüsü, şehrin kalbinde huzur arayan herkes için düzenlenmiştir. Yürüyüş rotası boyunca Hz. İbrahim ile bağlantılı kutsal mekânlar, tarihi yapılar ve bakımlı parklar bir arada keşfedilmektedir. Rehber eşliğinde gerçekleşen etkinlik, hem tarihî bilgi hem de fiziksel aktivite arayanlar için mükemmel bir seçenektir.`,

  '03dec445': `Geleneksel ebru sanatının tüm inceliklerini öğrenmek isteyen katılımcılar için hazırlanan bu atölye çalışmasında; kil, taş ve kağıt üzerine geleneksel Türk süsleme sanatları uygulamalı olarak öğretilmektedir. Uzman zanaatkârlar eşliğinde renklerin su üzerindeki dansı izlenecek, katılımcılar kendi özgün eserlerini yaratacaktır. Hem başlangıç hem de orta seviye için uygun olan atölye, sanatla yeni bir bağ kurmak isteyenlere kapılarını açmaktadır.`,

  'e85044a5': `Şanlıurfa'nın zengin gelenek ve eğlence kültürünü yaşatmak amacıyla düzenlenen bu şölende; sıra gecesi müziği, geleneksel oyunlar, halk dansları ve yöresel el sanatları bir arada sunulmaktadır. Şehrin dört bir yanından katılımcıların bir araya geldiği etkinlik, nesiller boyu aktarılan kültürel mirasın canlı bir tanıklığını sunarken seyircilere de özgün bir sahne deneyimi yaşatmaktadır.`,

  '354c4485': `Şanlıurfa'nın minik sakinleri için özel olarak tasarlanan bu bayram etkinliklerinde; tiyatro gösterileri, kukla oyunları, yarışmalar ve interaktif atölyeler çocukları beklemektedir. Aileler için düzenlenen piknik alanları ve geleneksel oyun stantlarıyla şehrin farklı semtlerindeki parklarda hayat bulan bu şenlik, çocuklara hem eğlenceli hem de kültürel açıdan zengin bir bayram günü hediye etmektedir.`,

  'c52d7d88': `Şanlıurfa, Ramazan Bayramı'nı kentte yaşanan en coşkulu geleneksel etkinliklerden biriyle kutlamaktadır. Tarihi Gümrük Hanı'ndan Balıklıgöl çevresine uzanan süslemeler, canlı müzik performansları, geleneksel tatlar sunan stantlar ve çocuklara yönelik eğlenceler bu özel günleri daha anlamlı kılmaktadır. Şehrin tüm mahallelerinden katılımın beklendiği bayram kutlamalarında komşuluk ve dayanışma ruhu ön plana çıkmaktadır.`,

  '054aba8d': `İnsanlığın en eski tapınak kompleksi Göbeklitepe, baharın gelmesiyle birlikte benzersiz bir atmosfere bürünmektedir. Uzman arkeolog rehberler eşliğinde düzenlenen bu özel Mart turunda; T şeklindeki dikilitaşlar, hayvan kabartmaları ve 12 bin yıllık mistik yapı yakından incelenmektedir. Tur kapsamında ziyaretçilere Göbeklitepe'nin dünya arkeolojisi üzerindeki devrimsel etkisi ve devam eden kazı çalışmaları hakkında kapsamlı bilgi aktarılmaktadır.`,

  'a80d0cf7': `Yüzyıllardır Şanlıurfa'da yaşatılan el sanatları ve tekstil geleneğini gözler önüne seren bu sergi; bakır işlemeciliği, kilim dokumacılığı, telkari gümüş süsleme ve geleneksel işlemeler gibi özgün eserleri bir arada sunmaktadır. Yerli ve yabancı ustalar ile genç sanatçıların bir araya geldiği etkinlikte el yapımı ürünler satışa sunulmakta, zanaatkârlık atölyeleri düzenlenmekte ve geleneksel ile çağdaş yorumların buluşması seyircilere ilham vermektedir.`,

  '83a54a88': `Şanlıurfa'nın en özgün gece kültürü olan Sıra Gecesi, misafirleri içli türküler, saz eserleri ve geleneksel sohbet atmosferiyle başbaşa bırakır. Ocak ayına özel bu geceye saklanan program; bölgenin usta saz çalıcıları, türkücüler ve hikâyecilerinin performanslarıyla zenginleşmektedir. Ağırlıklı olarak davetlilerin katıldığı bu özel sıra gecesine iştirak etmek, Urfa kültürünün en derinlikli katmanlarına dokunmak anlamına gelmektedir.`,

  '97f66d26': `Karacadağ'ın volkanik platosunda kış mevsiminin eşsiz manzarası eşliğinde düzenlenen bu doğa yürüyüşünde, bölgenin endemik bitki örtüsü, kuş gözlem noktaları ve panoramik vadiler rehberler eşliğinde keşfedilmektedir. Katılımcılar hem fiziksel kondisyon geliştirebilmekte hem de Güneydoğu Anadolu'nun çarpıcı kış peyzajını fotoğraflayabilmektedir. Her deneyim düzeyine uygun güzergâhlar sunulan etkinlikte termos çay ve yöresel atıştırmalıklar ikram edilmektedir.`,

  '6a819632': `Şanlıurfa'nın yaratıcı tekstil ve moda alanındaki genç tasarımcıları ile geleneksel el sanatlarının ustalarını buluşturan bu fuar, baharın coşkusunu renkli koleksiyonlar ve el yapımı ürünlerle yansıtmaktadır. Atölye çalışmaları, defileler ve tasarım söyleşileriyle zenginleştirilen etkinlikte ziyaretçiler hem alışveriş yapabilmekte hem de yöresel zanaatkârlığın geleceğe nasıl taşındığını yakından görebilmektedir.`,

  '9e6ecc60': `Baharın ilk günlerinde Şanlıurfa'nın en küçük sakinlerini coşkuyla karşılayan bu çocuk şenliği; eğlenceli oyunlar, renkli gösteriler, yaratıcı atölyeler ve sürpriz sahne etkinlikleriyle dolu bir gün sunmaktadır. Ebeveynler ve çocuklar birlikte katılabileceği piknik alanları, ailece fotoğraf köşeleri ve geleneksel oyun stantlarıyla şehrin en sevilen mevsimlik etkinliklerinden biri haline gelmiştir.`,

  '3a29a1fe': `Göbeklitepe'nin uluslararası arkeoloji dünyasında yarattığı yankıyı genç kuşaklara taşımayı hedefleyen bu yarışmada; lise ve üniversite öğrencileri araştırma projeleri, sunum ve yaratıcı eserlerle yarışmaktadır. Dünyanın farklı ülkelerinden katılımcıları bir araya getiren organizasyon, Göbeklitepe araştırmalarına katkı sağlarken gelecek nesil arkeologları ve araştırmacıları teşvik etmeyi amaçlamaktadır.`,

  'cacd6993': `Şanlıurfa'nın tarihi mekânlarını, insan yüzlerini ve gündelik yaşamı kadrajına alan fotoğrafçıların eserlerini bir araya getiren bu sergi; şehrin gözden kaçan güzelliklerini belgeleme amacıyla her yıl düzenlenmektedir. Profesyonel ve amatör fotoğrafçıların katıldığı etkinlikte farklı teknikler ve perspektifler sergilenmekte, ziyaretçilere kentin çok katmanlı dokusu görsel bir yolculukla sunulmaktadır.`,

  '2d493e13': `Şanlıurfa'nın kuyumculuk, bakırcılık, dokumacılık ve dericilik gibi geleneksel el sanatlarını yaşatan zanaatkârları bu yarışmada ustalıklarını sergiliyor. Jüri değerlendirmesiyle belirlenen ödüller teknik ustalık, yaratıcılık ve geleneğe bağlılık kriterlerine göre verilmektedir. Ziyaretçiler de atölyelere katılarak geleneksel zanaat deneyimi yaşayabiliyor; el yapımı eserler etkinlik boyunca satışa sunuluyor.`,

  'eeae127a': `Dünya genelinde yalnızca Halfeti'de yetişen siyah gül, her yılın belirli aylarında görkemli çiçeklenme dönemine girmektedir. Sezonun açılış etkinliğinde tekne turları, bağ gezileri ve gül bahçesi ziyaretleriyle katılımcılar bu eşsiz bitkiyi yakından görebilmektedir. Fırat Nehri boyunca uzanan rotada Halfeti'nin su altındaki tarihi yapıları da ziyaret kapsamında yer almakta; etkinlik seyircilere unutulmaz bir görsel şölen sunmaktadır.`,

  '151296b8': `Şanlıurfa'nın farklı semtlerini ve tarihi bölgelerini birbirine bağlayan parkur üzerinde düzenlenen bu koşu etkinliği; hem profesyonel atletleri hem de hobileri nedeniyle koşan bireysel katılımcıları aynı çizgide buluşturmaktadır. 5 km, 10 km ve yarı maraton seçenekleriyle herkesin kendi seviyesinde katılabildiği koşu, şehrin canlı ve aktif bir topluluk kültürüne sahip olduğunu gözler önüne sermektedir.`,

  'b0567424': `Harran'ın eşsiz koni biçimli kümbet evleri ve antik arkeolojik alanlarını baharın hükmünde keşfetmek için düzenlenen bu şenlikte; halk oyunları gösterileri, geleneksel müzik performansları ve rehberli tarihi yürüyüşler bir arada sunulmaktadır. Katılımcılar kümbet evlerin içini ziyaret edebilmekte, yerel zanaatkârlarla tanışabilmekte ve Harran Ovası'nın bahar manzarasının tadını çıkarabilmektedir.`,

  'f4c5b72f': `Şanlıurfa'nın dört bir yanından üreticilerin katıldığı bu bahar pazarında; taze sebze ve meyvelerden ev yapımı reçellere, yöresel peynirlerden kuru baklagillere kadar uzanan geniş bir ürün yelpazesi satışa sunulmaktadır. Organik ve doğal ürünlere ilgi duyanlar için biçilmiş kaftan olan pazar, çiftçilerle doğrudan iletişim kurma ve yerel ekonomiyi destekleme imkânı sunmaktadır.`,

  '536701e3': `Şanlıurfa kışını hareketli kılmak amacıyla düzenlenen bu çok branşlı spor etkinliğinde; koşu, bisiklet, masa tenisi, satranç ve geleneksel güreş gibi çeşitli spor dallarında bireysel ve takım yarışmaları yer almaktadır. Hem amatörlerin hem de deneyimli sporcuların katıldığı oyunlarda kupa ve madalyalar dağıtılmakta, şehrin aktif yaşam kültürü ve spor ruhu ön plana çıkarılmaktadır.`,

  '4281ff63': `Nevruz, Şanlıurfa'da baharın gelişini ateşler, müzikler ve halk oyunlarıyla coşkuyla karşılayan bir şenlikle kutlanmaktadır. Yöresel kıyafetler içinde gerçekleştirilen halk dansı gösterileri, geleneksel yemek dağıtımı, ateş yakma ritüelleri ve renkli standlarla bezenen alanlar, her yaştan katılımcıyı kendine çekmektedir. Şehrin kültürel çeşitliliğini ve neşeli ruhunu en açık biçimde ortaya koyan etkinliklerden biridir.`,

  '92e92eb3': `2027 yılının en beklenen kültür etkinliklerinden biri olan Şanlıurfa Tiyatro Festivali'nde; ulusal ve uluslararası tiyatro toplulukları sahne almaktadır. Klasik eserlerin çağdaş yorumlarından deneysel performanslara, çocuk oyunlarından sokak tiyatrosuna kadar geniş bir program sunan festival, şehrin sahne sanatları ekosistemine önemli bir katkı sağlamaktadır.`,

  '66f42eeb': `Şanlıurfa'nın birbirinden farklı ilçelerinde kurulan bu bahar pazarları, üreticilerle tüketicileri arasındaki mesafeyi kısaltarak yerel gıda ekonomisini desteklemektedir. İlkbaharın ilk ürünleri, geleneksel el işi ürünler ve yöresel hazır yiyecekler bir arada sunulan bu pazar günleri, şehirdeki aile ve bireyler için hafta sonunun vazgeçilmez durağı haline gelmektedir.`,

  'b0d22866': `Urfa'nın köklü gelenek ve eğlence kültürünü yaşatmak için düzenlenen bu şölende türkü geceleri, geleneksel oyunlar, sıra gecesi müziği ve yöresel el sanatları birlikte sunulmaktadır. Farklı kuşakların bir arada eğlendiği etkinlik, şehrin kültürel belleğini canlandırırken genç nesle de Urfa geleneğini deneyimleme imkânı tanımaktadır.`,

  '1dec94cc': `Şanlıurfa mutfağının ulusal ve uluslararası ölçekte tanıtılmasını hedefleyen bu özel haftada; çiğ köfte atölyeleri, kebap gösterileri, yöresel tatlı degüstasyonları ve ünlü şeflerle söyleşiler düzenlenmektedir. Farklı ülkelerden gastronomi uzmanları ve gezi yazarlarının katıldığı etkinlik, Urfa mutfak kültürünün küresel mutfak dünyasındaki yerini pekiştirmeyi amaçlamaktadır.`,

  '4b719501': `Tarihi Kapalı Çarşı, Ramazan boyunca geleneksel dekorasyonlar ve özel aydınlatmalarla başka bir kimliğe bürünmektedir. İftar öncesi ve sonrasında canlanan çarşıda; tatlı, börek ve yöresel lezzetler sunan özel stantlar, el sanatları satış noktaları ve geleneksel Ramazan eğlenceleri ziyaretçilere nostaljik bir pazar deneyimi sunmaktadır.`,

  '9816a552': `Şanlıurfa'nın kendine özgü kış atmosferini belgelemeye davet eden bu fotoğraf yarışmasında; karlı tarihi sokaklar, sıra gecelerinin ışıl ışıl çerçeveleri ve kışın getirdiği hüzünlü güzellikler konu olarak belirlenmektedir. Profesyonel ve amatör fotoğrafçılara açık olan yarışmada eserler dijital olarak değerlendirilerek ödüle layık görülenler sergi ve yayınlarda yer almaktadır.`,

  'bb98cd6c': `Şanlıurfa'nın ilkbaharla birlikte açan endemik bitki türlerini, yabani çiçek tarlalarını ve kentteki botanik varlıklarını kutlayan bu festival; doğa yürüyüşleri, bitki tanımlama atölyeleri ve fotoğraf gezileriyle birlikte düzenlenmektedir. Botanik ve doğa tutkunlarının buluşma noktası haline gelen etkinlikte uzman botanikçiler eşliğinde rehberli tur imkânı da sunulmaktadır.`,

  'ca9c7761': `Her yıl ilkbaharda Birecik'e dönen kelaynak kuşlarının göç sezonunu kutlayan bu gözlem günlerinde; doğa fotoğrafçıları, araştırmacılar ve kuş gözlemcileri Fırat kıyısında bir araya gelmektedir. Nesli tehlike altında olan bu eşsiz kuş türünün koruma çabalarını anlatan söyleşiler ve rehberli gözlem turları etkinliğe ayrı bir anlam katmaktadır.`,

  '42321655': `Şanlıurfa sokaklarını açık hava galerisine dönüştüren bu festival; duvar resmi, yerleştirme sanatı, performans ve müzik dallarında yerli ile yabancı sanatçıları buluşturmaktadır. Tarihi dokularla harmanlanan çağdaş sanat eserleri şehrin görünümünü dönüştürürken atölyeler ve sanatçı buluşmaları katılımcılara yaratıcılıklarını keşfetme fırsatı sunmaktadır.`,

  '720667e4': `Harran Ovası'nın bereketli kış hasadından elde edilen kuru meyve, baharat, tahıl ve geleneksel gıdaların bir araya geldiği bu pazar; köy üreticileriyle kentli tüketiciler arasında doğrudan köprü kurmaktadır. İncir, üzüm kurusu, antepfıstığı ve isot biberi başta olmak üzere organik yöntemlerle yetiştirilmiş ürünler uygun fiyatlarla sunulmakta, geleneksel dokuma ve el sanatları stantları da ziyaretçilere eşlik etmektedir.`,

  '00cb9944': `Göbeklitepe kazılarında elde edilen bulgular ve arkeoloji dünyasına etkileri üzerine düzenlenen bu söyleşi serisinde; alanın baş araştırmacıları, üniversite akademisyenleri ve uluslararası uzmanlar sahne almaktadır. Şubat ayı boyunca iki haftada bir gerçekleşecek etkinliklere konuşmacıların sunumlarının yanı sıra Q&A oturumları ve belgesel gösterimleri de eklenmektedir.`,

  'dd19c9ec': `Şanlıurfa, Ramazan hilalinin görülmesiyle birlikte şehri aydınlatan kandillerle, camilerin önündeki toplaşmalarla ve geleneksel Ramazan davullarıyla coşkulu bir başlangıcı kutlamaktadır. Balıklıgöl çevresindeki iftar sofraları, tarihi hanların avlularında düzenlenen manevi konserler ve yöresel tatlıların dağıtıldığı stantlar bu etkinliğin vazgeçilmez unsurları arasındadır.`,

  '872bb28f': `Şanlıurfa'nın açık hava sahnelerinde ve kültür merkezlerinde Mart boyunca devam eden bu konser serisinde; bölgenin yerel sanatçılarından ulusal ölçekte tanınan isimlere kadar geniş bir müzik yelpazesi seyirciyle buluşmaktadır. Türk halk müziği, klasik Türk müziği ve modern yorumların yer aldığı programıyla her hafta sonu farklı bir sanatçıyı ağırlayan seri, baharın müzikle kutlanmasına zemin hazırlamaktadır.`,

  '7b27e777': `Nisan ayının ılık havasında, Göbeklitepe'nin muhteşem arazisinde yürüyerek gerçekleştirilen bu arkeoloji turunda; uzman rehberler Neolitik çağa ait yapıların ayrıntılarını katılımcılara tüm incelikleriyle aktarmaktadır. Farklı ülkelerden gelen arkeoloji meraklılarıyla buluşma imkânı da sunan tur, hem bilgi derinliği hem de sahaya inme deneyimi açısından benzersizdir.`,

  '23412d72': `Harran Ovası'nın sonsuz sessizliğinde yıldız gözlemi yaparak, ateş başında yöresel yemekler pişirerek ve tarihi arazi üzerinde geceyi geçirerek Güneydoğu Anadolu'nun kamp geleneğini yaşatan bu etkinlik; doğa ve tarih tutkunlarına özgün bir deneyim sunmaktadır. Uzman rehberler kamp boyunca hem güvenlik hem de bölge tarihi hakkında kapsamlı bilgi vermektedir.`,

  'ca1aeafe': `Şanlıurfa'nın kültür mekânlarında Ocak boyunca devam eden bu konser serisi; Türk müziğinin köklü geleneğini modern yorumlarla bir araya getiren sanatçıları sanatseverlerle buluşturmaktadır. Her hafta sonu farklı bir temayı işleyen konserler; klasik saz eserleri, türküler ve sözel müzik performanslarıyla soğuk kış gecelerine sıcak bir kültürel atmosfer katmaktadır.`,

  '54e71fd7': `Dünya genelindeki tarih ve arkeoloji araştırmacılarını Şanlıurfa'da buluşturan bu uluslararası toplantıda; Göbeklitepe başta olmak üzere bölgenin arkeolojik zenginlikleri, koruma stratejileri ve yeni bulgular tartışılmaktadır. Panel oturumları, saha ziyaretleri ve akademik poster sunumlarıyla zenginleştirilen program, şehrin uluslararası akademik arenada giderek artan görünürlüğüne katkı sağlamaktadır.`,

  '167a18ce': `Halfeti'nin gizemli sular altındaki tarihi evleri, Fırat'ın serin kucağında kış turlarına yeni bir boyut katmaktadır. Şubat'a özel bu turda rehber eşliğinde tekne gezisi yapılmakta, siyah gül bahçeleri ziyaret edilmekte ve yerel rehberler Halfeti'nin sular altında kalan mirasını anlatmaktadır. Küçük gruplar halinde düzenlenen etkinlikte konforlu tekne servisi ve sıcak içecek ikramı yer almaktadır.`,

  '899f9668': `Şanlıurfa'nın kış sezonunda sanatseverlere kapılarını açan bu seramik atölyesinde; çanak çömlek gelişimini Neolitik çağdan günümüze inceleyen katılımcılar kendi el yapımı eserlerini de tasarlamaktadır. Temel çarkçılık ve seramik boyama tekniklerinin öğretildiği atölyede; hem yetişkinler hem de çocuklar için ayrı programlar bulunmaktadır.`,

  'd54e9343': `Şanlıurfa'nın kış kültür takviminin en renkli etkinliklerinden biri olan bu şenlikte; fotoğraf sergileri, film gösterimleri, konserler, şiir dinletileri ve geleneksel el sanatları standlarının bir arada yer aldığı kapsamlı bir kültür programı sunulmaktadır. Şehrin farklı semtlerinde organize edilen etkinlikler aracılığıyla kış aylarının kültürel havası zenginleştirilmekte ve topluluk bağları güçlendirilmektedir.`,

  '9a6e8371': `Şanlıurfa'nın en popüler sokak lezzeti çiğ köfteye adanmış bu yarışmada; ustalar ve hobiciler özgün tariflerini en iyi form ve lezzette sunmaya çalışmaktadır. Jüri değerlendirmesinin yanı sıra halk oylamasıyla da belirlenen ödüller, katılımcıları farklı domates oranları, baharatlar ve sunuş teknikleri denemelerine yönlendirmektedir. Etkinlik boyunca katılımcılara ücretsiz çiğ köfte tadımı sunulmaktadır.`,

  '3e7883b7': `Nevruz kutlamalarına hazırlık sürecinde düzenlenen bu program; geleneksel Nevruz dansları, müzik ve kostüm atölyeleriyle katılımcılara kültürel hazırlık fırsatı sunmaktadır. Okul grupları, kültür dernekleri ve bireylerin birlikte katıldığı etkinlikte Nevruz'un tarihsel ve kültürel anlamı anlatılmakta; geleneksel yemek ve içecek yapım gösterileri de program kapsamında yer almaktadır.`,

  '8fa05271': `Şanlıurfa'nın tarihi çarşılarından kebapçı sıralarına, tatlı ustalarından baharatlı sokak lezzetlerine uzanan bu gastronomi turunda katılımcılar şehrin eşsiz mutfak kültürünü bizzat tatma fırsatı bulmaktadır. Rehber eşliğinde küçük gruplarla gerçekleşen tur; çiğ köfte, lahmacun, Urfa kebabı ve mırra gibi simge lezzetlerin hazırlanış öykülerini de kapsamaktadır.`,

  '894a569c': `Dünya tarihinin en kadim kentlerinden biri olan Harran'ı bahar mevsiminde keşfetmek için tasarlanan bu özel turda; kümbet evler, Ulu Camii, Harran Kalesi ve antik surlar uzman rehberlerin eşliğinde gezilmektedir. Tur süresince katılımcılara Harran'ın Babil, Roma, Emevi ve Abbasi dönemlerine ait izleri, bilimsel önemi ve Cumhuriyet döneminde geçirdiği dönüşüm anlatılmaktadır.`,

  '0a6e27f0': `Şanlıurfa ve bölgesiyle ilgili belgesel filmlerin gösteriminden oluşan bu sinema gecelerinde; Göbeklitepe, Halfeti ve Harran'ı konu alan yapımların yanı sıra şehrin kültürel ve sosyal dokusunu işleyen bağımsız yapımlar da perdede yer almaktadır. Filmlerin ardından yönetmenler ya da akademisyenlerle gerçekleşen söyleşiler izleyicilere konuya daha derin bir bakış açısı kazandırmaktadır.`,

  '4b701c83': `Her yıl Şanlıurfa'nın uluslararası sinemaya katkısını artırmayı hedefleyen bu belgesel film festivali; insan hakları, çevre, arkeoloji ve kültürel miras temalarındaki yapımları ön plana çıkarmaktadır. Seçici jürinin değerlendirdiği filmler sahne söyleşileri ve ödül töreniyle taçlandırılmaktadır; ulusal ve uluslararası yönetmenler aynı çatı altında buluşmaktadır.`,

  '5171669c': `Şanlıurfa'nın Kız Düzlüğü platosunda düzenlenen bu sonbahar trekking etkinliği; bölgenin geniş çayırlıklarını, kaya oluşumlarını ve büyüleyici gün batımı manzaralarını keşfetmek isteyenlere hitap etmektedir. Orta güçlük seviyesindeki rota, rehber eşliğinde yaklaşık 4-5 saatlik bir yürüyüş sunmakta; katılımcılara yöresel atıştırmalıklar ve sıcak içecekler ikram edilmektedir.`,

  '25f2c478': `İsot biberinin hasat edildiği bu özel dönemde düzenlenen lansman etkinliğinde; Şanlıurfa'nın simge baharatı isot, tüm üretim süreciyle birlikte tanıtılmaktadır. Çiftlik ziyaretleri, isot ezme atölyeleri ve yöresel yemek gösterileriyle zenginleştirilen etkinlikte katılımcılar tarladan sofraya uzanan bu geleneksel sürecin her adımını bizzat deneyimleyebilmektedir.`,

  '5092a760': `Şanlıurfa'nın inanç turizmi açısından en önemli alanlarından biri olan Balıklıgöl ve Hz. İbrahim Makamı; bu rehberli kültür turunda tarihsel, dinî ve arkeolojik boyutlarıyla birlikte ele alınmaktadır. Aynzeliha Gölü, Halilürrahman Camii ve çevresindeki tarihi yapıları kapsayan tur, inançlı ziyaretçilere derin bir manevi deneyim yaşatırken tarih meraklılarına da kapsamlı bilgi sunmaktadır.`,

  '80b89a88': `Şanlıurfa'nın kış mevsimindeki özgün mutfak atmosferini keşfetmek için hazırlanan bu gastronomi turunda; tarihi çarşılardaki geleneksel kebapçılar, yöresel tatlı ustaları ve mırra kahvesi sunan mekânlar ziyaret edilmektedir. Rehber eşliğinde yürütülen tur; çiğ köfte, Urfa kebabı, katmer ve şıllık gibi simge lezzetlerin tadıyla şehrin kış gastronomi kültürünü tüm zenginliğiyle aktarmaktadır.`,

  '2197ecc5': `Halfeti'nin benzersiz siyah gülleri, yılın belirli aylarında büyülü bir renk gösterisi sunar. Bu özel bahar ziyaretlerinde küçük gruplar halinde tekne turuna çıkılarak gül bahçelerine gelinmekte ve bu nadir bitkinin büyümesi, tarihi ve kültürel önemi uzman rehberlerce anlatılmaktadır. Fırat Nehri manzarası eşliğinde yapılan tur, katılımcılara yılın en özel fotoğraf karelerini çekme imkânı sunmaktadır.`,

  '6f27ac7b': `Kültürel bellek, toplumsal değişim ve insan hikayeleri temalarını merkezine alan bu uluslararası belgesel film festivali; dünya genelinden yapımları Şanlıurfa'ya taşımaktadır. Türk ve uluslararası yönetmenlerin buluştuğu etkinlikte panel oturumları, atölye çalışmaları ve özel gösterimler sinema severlerine özgün bir program sunmaktadır.`,

  'da2f1f88': `Halfeti'nin tarihi ve büyülü atmosferi, kış mevsiminde tekne turu yapanlara başka bir deneyim yaşatmaktadır. Su seviyesinin yüksek olduğu bu dönemde sular altındaki yapılar daha görünür hale gelirken Fırat'ın serin solukları doğa ile tarihi iç içe sunar. Rehber eşliğinde yaklaşık 2 saat süren tur sırasında katılımcılara Halfeti'nin efsaneleri ve sular altında kalan tarihi anlatılmaktadır.`,

  '6ce32f39': `Şanlıurfa ile Gaziantep arasındaki dostluk ve kardeşlik bağlarını pekiştirmek amacıyla düzenlenen bu maraton; iki şehrin sporcularını ve amatör koşucularını aynı parkurda buluşturmaktadır. Güzergah boyunca iki şehrin tarihi ve kültürel sembolleri izleyicilere tanıtılmakta, etkinlik sonrasında ortak kutlamalar ve gençlik buluşmaları düzenlenmektedir.`,

  '46ce14ac': `2027 yılının Nevruz coşkusu Şanlıurfa'da ateş yakma ritüelleri, halk oyunları gösterileri ve geleneksel bahar şarkılarıyla karşılanmaktadır. Her yaştan katılımcıya kapısını açan şenlikte yöresel lezzetler dağıtılmakta, çocuklara yönelik etkinlikler düzenlenmekte ve şehrin farklı semtlerindeki meydanlar baharın gelişini coşkuyla kutlamaktadır.`,

  '0c9af58c': `Göbeklitepe'nin yıldızlarla dolu gökyüzü altında, uzman rehberler eşliğinde gerçekleştirilen bu yaz gecesi turu; gündüz ziyaretlerinden çok farklı bir deneyim sunmaktadır. Dikilitaşlar ve hayvan kabartmaları gece aydınlatmaları altında gizemli bir atmosfer kazanırken uzmanlar neolitik insan topluluklarının gece ritüelleri ve astronomiyle ilişkileri hakkında ilgi çekici bilgiler aktarmaktadır.`,

  '5e21b8f3': `2027 kış sezonunun en kapsamlı kültür etkinliklerinden biri olma hedefini taşıyan bu festival; tiyatro, sinema, fotoğraf, müzik ve edebiyat alanlarındaki gösterimler ve söyleşilerle şehrin entelektüel hayatına canlılık katmaktadır. Ulusal ve uluslararası sanatçıların sahne aldığı etkinlikte aynı zamanda genç yeteneklere yönelik atölye programları da düzenlenmektedir.`,

  'd608abfa': `Şanlıurfa Devlet Tiyatrosu ve bağımsız sahne toplulukları iş birliğiyle düzenlenen bu kış festivali; klasik Türk tiyatrosu, modern dram ve çocuk oyunlarından oluşan çeşitli bir repertuvar sunmaktadır. Şehir içindeki farklı sahnelerde yürütülen gösterimler sayesinde tiyatronun her yaştan izleyiciye ulaşması hedeflenirken öğrenci matineleri ve özel grup biletleri de programa dahil edilmektedir.`,

  '8bb133af': `Yılbaşı gecesine özel olarak düzenlenen bu sıra gecesi kutlaması; geleneksel Urfa müziğini, yeni yılın coşkusuyla harmanlayan benzersiz bir etkinliktir. Usta saz ve ud çalıcıları, kemençe solistleri ve türkücülerin bir arada sahne aldığı bu gece, katılımcılara hem nostalji hem de kutlama keyfi yaşatmaktadır. Rezervasyonlu oturum düzeniyle gerçekleşen geceye yöresel mezeler de eşlik etmektedir.`,

  'ccb966db': `Şanlıurfa'nın ünlü kebap ustalarını ve genç aşçıları karşı karşıya getiren bu şampiyonada; Urfa kebabı, patlıcanlı kebap, ciğer kebabı ve katmer gibi yöresel lezzetler jüri önünde yarışmaktadır. Halkın da oy kullandığı bu etkinlikte ödüle layık görülenler yöresel mutfağın temsilcileri olarak ulusal platformlarda tanıtılmaktadır.`,

  '465ba7a4': `Şanlıurfa'nın yaz gecelerini müzikle taçlandıran bu açık hava konserleri; Türk pop, folk ve geleneksel müzik yorumlarını bir arada sunan farklı sanatçıları her hafta ağırlamaktadır. Tarihi mekânların eşsiz mimarisi önünde seyircilere sunulan bu müzik şöleni, şehrin canlı yaz kültürünü ve gece yaşamını yansıtan en özgün etkinliklerden biri olma özelliği taşımaktadır.`,

  '40dff562': `Harran Üniversitesi'nin öğrenci ve akademisyenleri tarafından düzenlenen bu bilim fuarında; mühendislik, tıp, tarım, çevre ve sosyal bilimler alanlarındaki yenilikçi projeler sergilenmektedir. Lise öğrencilerine de açık olan fuar, genç araştırmacıları bilimsel kariyer seçimlerine yönlendirmeyi ve bölgede bilimsel kültürü yaygınlaştırmayı amaçlamaktadır.`,

  '8a5f2ce0': `Şanlıurfa'nın en özgün kültürel geleneği olan Sıra Gecesi, misafirlerin sırayla oturması, türkü söylemesi ve saz çalması geleneğiyle yaşatılmaktadır. Ocak ayına özel bu geceye ünlü Urfalı saz çalıcıları ve türkücüler katılmakta; geleneksel oturma düzeniyle gerçekleşen etkinliğe şehrin farklı kesimlerinden konuklar davet edilmektedir.`,

  '62d91b4d': `Her yıl Halfeti'nin efsanevi siyah gülleri çiçek açtığında gerçekleştirilen bu festival; tekne turları, gül bahçesi gezileri, fotoğraf etkinlikleri ve konserlerle ziyaretçileri karşılamaktadır. Bölgenin en yoğun turist sezonuna denk gelen festival, şehrin doğal güzelliklerini ön plana çıkarırken yerel üreticilerin ürünleriyle kurulan standlar da ekonomik katkı sağlamaktadır.`,

  '27aa29e6': `2027 yılında Şanlıurfa'da gerçekleştirilecek bu uluslararası konferans; Göbeklitepe ve bölgedeki Neolitik alanların arkeolojik, kültürel ve sosyal boyutlarını tartışmak üzere dünya genelinden akademisyenleri bir araya getirmektedir. Açılış konuşmaları, akademik bildiriler, poster sunumları ve saha gezilerinden oluşan program kapsamında yayımlanacak bildiri kitabı arkeoloji literatürüne önemli bir katkı sunacaktır.`,

  'ded909fd': `Şanlıurfa'nın geleneksel mutfak ustalarını ve yeni nesil aşçıları aynı sahnede buluşturan bu festival; teknik yarışmaların yanı sıra açık hava yemek gösterileri ve atölye çalışmaları içermektedir. Urfa kebabı, çiğ köfte, katmer ve baklava gibi simge tatlar jüri önünde yarışırken katılımcılar da usta ellerin sırlarına tanıklık etmektedir.`,

  'fe92dcd7': `Halfeti'nin yazın bir başka güzelliğe büründüğü bu özel turda; Fırat boyunca tekne gezisi yapılmakta, Rumkale ve çevre alanlara uzanılmakta, yerel rehberler bölgenin efsane ve hikayelerini aktarmaktadır. Katılımcılar hem doğal güzelliklerin keyfini çıkarabilmekte hem de bu toprakların kültürel derinliğine tanıklık edebilmektedir.`,

  'bbfd2b69': `Divan şiirinin dilini, estetiğini ve Şanlıurfa'daki kültürel izlerini kutlayan bu festival; şiir okuma gösterileri, söyleşiler ve şiir atölyeleriyle sanatseverleri buluşturmaktadır. Urfalı şairlerin eserleri özel seslendirmelerle hayat bulmakta; yerli ve yabancı şairler ortak platformda bir araya gelerek divan edebiyatının evrensel dilini gözler önüne sermektedir.`,
};

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n📝 69 etkinlik açıklaması genişletme (<300c → 300c+)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  const { rows: events } = await db.query(
    `SELECT id, title FROM events WHERE status = 'published' AND length(description) < 300 ORDER BY title`
  );
  console.log(`İnce etkinlik sayısı: ${events.length}\n`);

  let updated = 0, skipped = 0;

  for (const ev of events) {
    const prefix = ev.id.toString().slice(0, 8);
    const desc = EXPANSIONS[prefix];
    if (!desc) {
      console.log(`  ⚠ ${ev.title.slice(0, 55)} — EXPANSIONS'ta yok (${prefix})`);
      skipped++;
      continue;
    }
    await db.query(`UPDATE events SET description = $1 WHERE id = $2`, [desc.trim(), ev.id]);
    console.log(`  ✓ ${ev.title.slice(0, 55)} (${desc.trim().length}c)`);
    updated++;
  }

  const { rows: [stats] } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE length(description) < 300) AS thin
     FROM events WHERE status = 'published'`
  );

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${updated} güncellendi | ${skipped} atlandı`);
  console.log(`📊 Kalan ince (<300c): ${stats.thin}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
