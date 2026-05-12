#!/usr/bin/env node
/**
 * Tarif Batch 6 — 10 yeni Şanlıurfa tarifi ekle (110 → 120)
 */
import net from 'node:net';
import fs from 'node:fs';
import pg from 'pg';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', 15617, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(15617, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

const RECIPES = [
  {
    slug: 'kabak-dolmasi',
    name: 'Kabak Dolması',
    description: `<p>Şanlıurfa mutfağının gözde sebze yemeklerinden biri olan Kabak Dolması, yazın bolluğunda sofraların en değerli lezzeti olarak öne çıkar. İnce kabuklu, taze Urfa kabakları içine isotuyla, fıstığıyla ve kıymalı pirinç harcıyla doldurulan bu yemek, ağır ateşte pişirildiğinde hem göze hem de damağa hitap eden bir şölen sunar. Urfa'nın baharatlı mutfak geleneğini mükemmel biçimde yansıtan bu tarif, ailelerin ortak sofralarında kalabalık misafir kitlelerini besleyen bir şükran yemeğidir.</p><p>Patlıcan dolmasıyla aynı aileden gelen bu yemek, kabaklara özgü hafif tatlımsı tat ve dolgunun yoğun baharat profiliyle benzersiz bir denge kurar. Geleneksel toprak kaplarda pişirildiğinde en otantik halini alan Kabak Dolması, üzerine gezdirilen domateslii sos ile servise sunulduğunda misafirlerin iştahını açar.</p>`,
    ingredients: [
      '- 1 kilogram orta boy kabak (6-8 adet)',
      '- 300 gram kıyma (kuzu tercih edilir)',
      '- 1 su bardağı pirinç',
      '- 1 orta boy soğan, ince kıyılmış',
      '- 3 yemek kaşığı domates salçası',
      '- 2 yemek kaşığı biber salçası',
      '- 1 çay kaşığı isot biberi',
      '- 1 çay kaşığı karabiber',
      '- 1 çay kaşığı kimyon',
      '- 2 yemek kaşığı doğranmış maydanoz',
      '- 2 yemek kaşığı tereyağı',
      '- Tuz',
      '- Üzeri için: 2 domates (dilimlenmiş)',
    ],
    instructions: [
      '1. Kabakları yıkayıp uçlarını kesin ve özel kabak kaşığıyla ya da ince bir bıçakla içlerini oyun; et kısmı 0,5 cm kalınlığında kalsın.',
      '2. Oyulan kabak içlerini ince doğrayın, ilerleyen adımda kullanılacak.',
      '3. Pirinçleri iyice yıkayıp 20 dakika soğuk suda bekletin.',
      '4. Geniş bir kasede kıyma, pirinç, soğan, isot, karabiber, kimyon ve maydanozu karıştırın.',
      '5. 1 yemek kaşığı salçayı harce ekleyin, tuzu ilave edin ve yoğurun.',
      '6. Kabakları 3/4 oranında doldurun (pirinç şişeceğinden tam doldurmayın).',
      '7. Geniş bir tencerede kalan salçaları tereyağıyla kavurun.',
      '8. Üzerine oyulmuş kabak içlerini ekleyin, 2 dakika daha kavurun.',
      '9. Sıcak su ekleyerek kaynatın, dolmaları tencereye dik olarak yerleştirin.',
      '10. Üstlerine dilimlenmiş domates kapak gibi yerleştirin.',
      '11. Kapağı kapatıp kısık ateşte 45-50 dakika pişirin.',
      '12. Sıcak servis yapın; yanında yoğurt tercih edilir.',
    ],
    prep_time: 30,
    cook_time: 50,
    servings: 5,
    difficulty: 'Orta',
    is_spicy: true,
    is_vegetarian: false,
    meta_description: 'Şanlıurfa usulü Kabak Dolması tarifi; kıymalı pirinç harcı ve isotuyla dolu, ağız sulandıran geleneksel bir Urfa lezzeti.',
  },
  {
    slug: 'sumakli-sogan-salatasi',
    name: 'Sumaklı Soğan Salatası',
    description: `<p>Şanlıurfa kebaplarının ayrılmaz yakını olan Sumaklı Soğan Salatası, görünüşü sade ama lezzeti derin bir meze-salatadır. Kırmızı ya da mor soğanın ince halkalar hâlinde doğranıp soğuk su banyosundan geçirilmesi, acılığın büyük kısmını gideren ve soğana hoş bir çıtırlık kazandıran sırdır. Üzerine dökülen ekşimsi sumak ve maydanoz, Şanlıurfa sofrasının en sade ama en lezzetli garnitürünü oluşturur.</p><p>Çiğ köfteyle, lahmacunla ya da fıstıklı kebapla kol kola verilen bu salata, kebap sofralarının olmazsa olmaz yardımcısıdır. Hazırlanması son derece kolay ve hızlı olmasına karşın yemeğe kattığı tazelik, hem damağı temizler hem de bir sonraki lokmaya iştah açar.</p>`,
    ingredients: [
      '- 3 büyük kırmızı soğan',
      '- 3 yemek kaşığı sumak',
      '- 1 demet maydanoz, ince kıyılmış',
      '- 1 çay kaşığı tuz',
      '- 1 çay kaşığı isot ya da pul biber (isteğe bağlı)',
      '- 2 yemek kaşığı zeytinyağı',
      '- 1 yemek kaşığı limon suyu',
    ],
    instructions: [
      '1. Soğanları soyup yarım ay şeklinde ince ince doğrayın.',
      '2. Doğranan soğanları büyük bir kaba alın; üzerine 1 çay kaşığı tuz serpin.',
      '3. Elinizle hafifçe ovalayın, 10 dakika bekletin — soğan suyunu bırakacak.',
      '4. Soğanları soğuk su altında iyice durulayın; bu işlem acılığı giderir.',
      '5. Süzdükten sonra kâğıt havluyla kurulayın.',
      '6. Üzerine sumağı, kıyılmış maydanozu ve isteyenler için isotu serpin.',
      '7. Zeytinyağı ve limon suyunu gezdin, birkaç kez harmanlayın.',
      '8. Hemen servis yapın; uzun beklerse sulanır.',
    ],
    prep_time: 15,
    cook_time: 0,
    servings: 4,
    difficulty: 'Kolay',
    is_spicy: false,
    is_vegetarian: true,
    meta_description: 'Urfa kebabının yanından eksik olmayan Sumaklı Soğan Salatası tarifi; ıslatılmış soğan, sumak ve maydanozun muhteşem uyumu.',
  },
  {
    slug: 'cevizli-baklava',
    name: 'Cevizli Baklava',
    description: `<p>Şanlıurfa'nın tatlı kültürü genellikle fıstıkla özdeşleştirilse de, sonbahar ve kış aylarında cevizin ön plana çıktığı geleneksel Cevizli Baklava da şehrin pastanelerinde özel bir yer tutar. İnce yufkalar arasına serilen bol ceviz içiyle hazırlanan bu baklava, şerbeti döküldükten sonra birkaç saat bekletildiğinde cevizin hafif acımsı aromasıyla şerbetin tatlılığı mükemmel bir dengeye ulaşır.</p><p>Ev yapımı yufka kullanıldığında bambaşka bir lezzete kavuşan bu tarif, özellikle kurban bayramı ve düğün sofralarında sıkça hazırlanır. Tereyağıyla katmerli kılınan her kat yufka, fırından çıktığında içi cevizle dolu, dışı altın sarısı bir görünüm kazanır.</p>`,
    ingredients: [
      '- 500 gram baklava yufkası (ince, 25-30 adet)',
      '- 400 gram ceviz içi, iri dövülmüş',
      '- 250 gram tereyağı, eritilmiş',
      '- 1 çay kaşığı tarçın',
      '- Şerbet için: 3 su bardağı toz şeker',
      '- Şerbet için: 2 su bardağı su',
      '- Şerbet için: 1 yemek kaşığı limon suyu',
    ],
    instructions: [
      '1. Şerbeti hazırlayın: şeker ve suyu kaynatın, 10 dakika pişirin, limon suyunu ekleyin; soğumaya bırakın.',
      '2. Ceviz içlerini dövün; tarçınla harmanlayın.',
      '3. Tepsiyi bol tereyağıyla yağlayın.',
      '4. Yufkaları ikiye bölün; tepsiye yerleştirmeye başlayın.',
      '5. Her yufkanın üzerine bol tereyağı fırçalayın.',
      '6. 10 kat yufka döşeyip üzerine yarı ceviz karışımını yayın.',
      '7. 8-10 kat daha yufka döşeyin, üzerine kalan cevizi yayın.',
      '8. Son 10 kat yufkayı da aynı şekilde tereyağılayarak kapatın.',
      '9. Baklavayı dilimleyin; her parçanın üzerine birer damla tereyağı damlatın.',
      '10. Önceden ısıtılmış 170°C fırında 30-35 dakika altın rengi alana kadar pişirin.',
      '11. Fırından çıkar çıkmaz soğuk şerbeti sıcak baklavanın üzerine yavaşça dökün.',
      '12. En az 3-4 saat oda sıcaklığında bekletin; servis yapın.',
    ],
    prep_time: 45,
    cook_time: 35,
    servings: 12,
    difficulty: 'Zor',
    is_spicy: false,
    is_vegetarian: true,
    meta_description: 'Geleneksel Cevizli Baklava tarifi; ince yufkalar, bol ceviz ve soğuk şerbetiyle hazırlanan, damaklarda iz bırakan Urfa tatlısı.',
  },
  {
    slug: 'ayva-dolmasi',
    name: 'Ayva Dolması',
    description: `<p>Kış aylarının nadir ve değerli lezzeti olan Ayva Dolması, Şanlıurfa'nın meyveli dolma geleneğini simgeler. Ekşimsi ayvanın baharatlı kuzu kıymasıyla buluşması, damakta alışılmadık ama çok hoş bir tat bırakır; tatlı-ekşi-baharatlı üçlüsü bir arada yakalanır. Geleneksel Urfa mutfaklarında kışın pişirilen bu yemek, servis tabağına alındığında ayvanın sarı-altın rengi ve kıymalı dolgunun kokusuyla iştah kabartır.</p><p>Urfa'nın meyve ile eti bir araya getirme geleneğinin en güzel örneklerinden biri olan bu tarif, sofranın konuğu olduğunda her zaman ilgi çeker ve anısı uzun süre hafızalarda kalır. Sadece kış aylarında piyasaya çıkan sert ve büyük ayva çeşitleri bu tarif için en uygunudur.</p>`,
    ingredients: [
      '- 4 büyük sert ayva',
      '- 250 gram kuzu kıyması',
      '- 1 küçük soğan, rendelenmiş',
      '- 3 yemek kaşığı pirinç, yıkanmış',
      '- 1 çay kaşığı isot biberi',
      '- 1 çay kaşığı karabiber',
      '- Tuz',
      '- 2 yemek kaşığı tereyağı',
      '- 1 yemek kaşığı nar ekşisi',
      '- 1 çay bardağı su',
      '- 1 yemek kaşığı toz şeker',
    ],
    instructions: [
      '1. Ayvaları yıkayın, ikiye bölün ve çekirdek yuvasını kaşıkla temizleyin.',
      '2. Oyulmuş iç kısmı biraz genişletin; kesilip çıkarılan parçaları küçük doğrayın.',
      '3. Kıyma, soğan, pirinç, isot, karabiber ve tuzu karıştırarak harç hazırlayın.',
      '4. Harcı ayvaların içine doldurun.',
      '5. Tereyağını geniş bir tencerede eritin, nar ekşisi ekleyip karıştırın.',
      '6. Doldurulmuş ayvaları tencereye dik biçimde dizin.',
      '7. Doğranan ayva parçalarını aralarına yerleştirin.',
      '8. Üzerine su ve şekeri ekleyin; tuz ve karabiber serpin.',
      '9. Kapağı kapatıp orta ateşte 40-45 dakika pişirin.',
      '10. Ayvanın yumuşadığını kontrol edin; sıcak servis yapın.',
    ],
    prep_time: 25,
    cook_time: 45,
    servings: 4,
    difficulty: 'Orta',
    is_spicy: true,
    is_vegetarian: false,
    meta_description: 'Şanlıurfa usulü Ayva Dolması tarifi; kışın pişirilen, baharatlı kuzu kıyması ve ekşi ayvanın mükemmel buluşması.',
  },
  {
    slug: 'isot-ezme',
    name: 'İsot Ezme',
    description: `<p>Şanlıurfa'nın dünyaya armağanı olan isot biberi, kışın güneşte kurutulup öğütüldükten sonra zeytinyağı ve tuza karıştırılarak dünyanın en özel meze malzemelerinden birini ortaya çıkarır: İsot Ezme. Bu koyu kırmızı, tütsülü ve derin aromalı ezme, hem kebap masalarında hem de pide yanında sunulan vazgeçilmez bir Urfa lezzetidir.</p><p>İsot, sıradan bir pul biberden kökten farklıdır; fermente edilmiş ve güneşte kurutulmuş olması sayesinde meyvemsi, tütsülü ve derinden gelen bir özel lezzet taşır. Bu ezmeyi bir kez tattıktan sonra sıradan acı soslarına bir daha bakmamak işten bile değildir. Evde hazırlaması oldukça basit olan bu tarif, kaliteli isot biberinin tüm sırrını ortaya koyar.</p>`,
    ingredients: [
      '- 100 gram isot biberi (pul ya da öğütülmüş)',
      '- 4 yemek kaşığı sızma zeytinyağı',
      '- 1 diş sarımsak, ezilmiş',
      '- 1 çay kaşığı tuz',
      '- 1 çay kaşığı nar ekşisi (isteğe bağlı)',
      '- 1 çay kaşığı kekik (isteğe bağlı)',
      '- 2 yemek kaşığı domates salçası (isteğe bağlı, renk ve dolgunluk için)',
    ],
    instructions: [
      '1. İsot biberini geniş bir kâseye alın.',
      '2. Ezilmiş sarımsak ve tuzu ekleyin.',
      '3. Zeytinyağını yavaş yavaş dökün, karıştırın.',
      '4. Kekik ve nar ekşisi kullanıyorsanız ekleyin.',
      '5. Tüm malzemeleri güzelce harmanlayın; ezme kıvamına gelene kadar çatalla bastırın.',
      '6. Kapaklı bir kavanoza koyun; üstünü örtecek kadar zeytinyağı ilave edin.',
      '7. Oda sıcaklığında 2 saat bekletin; tatlar birbirine karışsın.',
      '8. Küçük bir tabağa alıp ortasına zeytinyağı damlatarak servis yapın.',
    ],
    prep_time: 10,
    cook_time: 0,
    servings: 6,
    difficulty: 'Kolay',
    is_spicy: true,
    is_vegetarian: true,
    meta_description: 'Ev yapımı İsot Ezme tarifi; Şanlıurfa\'nın meşhur isot biberiyle hazırlanan, kebap sofralarının vazgeçilmez tütsülü acı mezesi.',
  },
  {
    slug: 'sogan-dolmasi',
    name: 'Soğan Dolması',
    description: `<p>Şanlıurfa'nın dolma kültürü sadece kabak ve patlıcanla sınırlı değildir; soğan dolması da bu zengin mirasın özel bir halkasını oluşturur. Haşlanarak yaprakları açılan soğanın içine yerleştirilen baharatlı kıymalı harç, ağır ateşte pişerken soğanın tatlımsı yapısıyla adeta kaynaşır. Sonuç, hem görsel hem lezzetsel anlamda alışılmadık ve etkileyici bir yemektir.</p><p>Özellikle kurban bayramı sofralarında hazırlanan bu tarif, yaşlı kuşakların hafızasında ayrı bir yer tutar. Soğanın karakterini aşan bu dolma, isotuyla ve kimyonuyla Urfa mutfağının tüm izlerini taşır. Yanında ayran ya da yoğurtla servis yapılması tavsiye edilir.</p>`,
    ingredients: [
      '- 6 orta boy soğan',
      '- 300 gram kuzu kıyması',
      '- 1/2 su bardağı pirinç, yıkıp süzülmüş',
      '- 2 yemek kaşığı biber salçası',
      '- 1 çay kaşığı isot biberi',
      '- 1 çay kaşığı kimyon',
      '- 1 çay kaşığı karabiber',
      '- Tuz',
      '- 2 yemek kaşığı tereyağı',
      '- 1 su bardağı sıcak su',
    ],
    instructions: [
      '1. Soğanları soyun, kökten kesip bütün olarak bırakın.',
      '2. Tuz eklenmiş suda 10-15 dakika hafifçe haşlayın; yaprakları açılabilir kıvama gelsin.',
      '3. Soğanları soğutun, ortasından bir bölüm çıkararak yuva açın; çıkarılan parçaları saklayın.',
      '4. Kıyma, pirinç, salça, isot, kimyon, karabiber ve tuzu yoğurarak harç hazırlayın.',
      '5. Her soğanın içine harç doldurun; açık ucu ince bir soğan yaprağıyla kapatın.',
      '6. Tencerede tereyağını eritin, salçayı hafifçe kavurun.',
      '7. Çıkarılan soğan parçalarını tencere tabanına yayın; dolmaları üstüne dik dizin.',
      '8. Sıcak suyu ekleyin; kapağı kapatıp kısık ateşte 40 dakika pişirin.',
      '9. Sıcak servis yapın; üzerine yoğurt dökülebilir.',
    ],
    prep_time: 30,
    cook_time: 40,
    servings: 4,
    difficulty: 'Orta',
    is_spicy: true,
    is_vegetarian: false,
    meta_description: 'Şanlıurfa usulü Soğan Dolması tarifi; baharatlı kıymalı harç ve soğanın tatlılığının buluştuğu, sofraların nadide lezzeti.',
  },
  {
    slug: 'patlıcanlı-tavuk-kebabi',
    name: 'Patlıcanlı Tavuk Kebabı',
    description: `<p>Şanlıurfa kebap kültüründe ağırlıklı olarak kuzu eti yer alsa da son yıllarda tavukla hazırlanan alternatifler de sofralarda giderek daha fazla yer bulmaktadır. Patlıcanlı Tavuk Kebabı, közlenmiş patlıcanın yumuşak ve dumanlı yapısıyla marine edilmiş tavuğu buluşturur; ortaya Urfa'nın baharat geleneğini yansıtan özgün bir lezzet çıkar.</p><p>İsot ve kimyonun tavuğun liflerine işlediği bu tarif, mangalda ya da fırında hazırlandığında özellikle yaz mevsiminde hafif ama doyurucu bir seçenek sunar. Yanında bol maydanozlu soğan salatası ve lavaş ekmeğiyle servis yapılması önerilir.</p>`,
    ingredients: [
      '- 600 gram bonfile tavuk göğsü ya da but eti',
      '- 3 orta boy patlıcan',
      '- 3 yemek kaşığı zeytinyağı',
      '- 1 çay kaşığı isot biberi',
      '- 1 çay kaşığı kimyon',
      '- 1 çay kaşığı karabiber',
      '- 1 çay kaşığı tuz',
      '- 1 çay kaşığı kekik',
      '- 2 diş sarımsak, ezilmiş',
      '- 1 yemek kaşığı domates salçası',
      '- Servis için: maydanoz, domates, lavaş',
    ],
    instructions: [
      '1. Tavuk etini kuşbaşı ya da şiş boyutunda kesin.',
      '2. Zeytinyağı, isot, kimyon, karabiber, tuz, kekik ve sarımsağı karıştırarak marine sosu hazırlayın.',
      '3. Tavuk parçalarını marine sosuna bulayın; en az 1 saat buzdolabında bekletin.',
      '4. Patlıcanları közde ya da fırında tüm yüzeyleri kömürleşene kadar kavurun.',
      '5. Kömürleşen patlıcanları soğutun, kabuklarını soyun, ince doğrayın ya da ezerek karıştırın.',
      '6. Domates salçasını küçük bir tavada zeytinyağıyla 2 dakika kavurun; patlıcan ezmesine karıştırın.',
      '7. Marine edilmiş tavukları mangalda ya da yağlı ızgarada her iki yandan 6-7 dakika pişirin.',
      '8. Servis tabağına önce patlıcan ezmesini yayın, üzerine tavuk parçalarını dizin.',
      '9. Maydanoz, domates ve ince kıyılmış soğanla süsleyerek servis yapın.',
    ],
    prep_time: 20,
    cook_time: 30,
    servings: 4,
    difficulty: 'Orta',
    is_spicy: true,
    is_vegetarian: false,
    meta_description: 'Közlenmiş patlıcan ve isotuyla marine edilmiş tavukla hazırlanan Patlıcanlı Tavuk Kebabı tarifi; Urfa\'nın baharatlı kebap geleneğine yeni bir soluk.',
  },
  {
    slug: 'meftune',
    name: 'Meftune',
    description: `<p>Meftune, Şanlıurfa mutfağının kış aylarında sıkça pişirilen, sade ama tatmin edici sebze-et yemeklerinden biridir. Kuzu etiyle kavrulan kuru soğanlar, üzerine eklenen domatesli sos ve baharatlarla uzun süre tencerede pişirilerek koyu kıvamlı ve derin lezzetli bir güveç hâline gelir. Adının Arapça kökenli olması, Şanlıurfa'nın Mezopotamya kültür çemberiyle olan güçlü bağını da simgeler.</p><p>Bazı ailelerde meftune, patlıcan ya da kabakla da hazırlanır; ancak en klasik ve en tutulan versiyonu sade sebze-kuzu eti uyumuna dayanan bu tarifte gizlidir. Taze lavaş ya da pirinç pilavıyla servis yapıldığında kışın tam bir konfor yemeği olan meftune, hem doyurucu hem de şifalı bir sofra arkadaşıdır.</p>`,
    ingredients: [
      '- 500 gram kuzu eti (kuşbaşı ya da kaburga parçası)',
      '- 4 büyük soğan, kalın dilimlenmiş',
      '- 3 orta boy domates, rendelenmiş',
      '- 2 yemek kaşığı domates salçası',
      '- 1 yemek kaşığı biber salçası',
      '- 3 yemek kaşığı tereyağı',
      '- 1 çay kaşığı isot biberi',
      '- 1 çay kaşığı karabiber',
      '- 1 çay kaşığı kimyon',
      '- Tuz',
      '- 1 su bardağı et suyu ya da sıcak su',
    ],
    instructions: [
      '1. Tereyağını geniş ve kalın dipli bir tencerede eritin.',
      '2. Kuzu etlerini ekleyerek her tarafı güzelce mühürleyin (yüksek ateşte, yaklaşık 5 dakika).',
      '3. Etleri çıkarın, aynı yağda soğanları altın rengi alana kadar kavurun.',
      '4. Etleri geri ekleyin; domates ve biber salçasını ilave edin, 3 dakika kavurun.',
      '5. Rendelenmiş domatesi ekleyin, 5 dakika daha kavurun.',
      '6. İsot, karabiber, kimyon ve tuzu serpin.',
      '7. Et suyunu ya da sıcak suyu ekleyip kapağı kapatın.',
      '8. Kısık ateşte 60-70 dakika pişirin; et iyice yumuşayıp sos koyulaşsın.',
      '9. Tuz kontrolü yapın; sıcak servis yapın.',
    ],
    prep_time: 15,
    cook_time: 70,
    servings: 4,
    difficulty: 'Kolay',
    is_spicy: true,
    is_vegetarian: false,
    meta_description: 'Geleneksel Meftune tarifi; kuzu eti ve soğanın derin domatesli sosla buluştuğu, kışın vazgeçilmezi Şanlıurfa güveç yemeği.',
  },
  {
    slug: 'urfa-kurabiyesi',
    name: 'Urfa Kurabiyesi',
    description: `<p>Şanlıurfa'nın ev yapımı tatlı geleneğinin köklü temsilcilerinden biri olan Urfa Kurabiyesi, içli tatlıların yanı sıra çay sofralarını da süsler. Ağzında dağılan, hafif gevrek yapısıyla öne çıkan bu kurabiye, bolca tereyağı ve içine gömülen fıstık ya da ceviz parçasıyla özgün Urfa kimliğini taşır. Şeker gezdirilerek servis yapılan bu tatlı, özellikle bayram ziyaretlerinin ve misafir ikramlarının değişmezi hâline gelmiştir.</p><p>Tarihin her döneminde Şanlıurfa'nın zengin kuruyemiş kültürünü yansıtan bu kurabiyelerin en büyük sırrı, tereyağını en az 20 dakika çırpmak; bu sayede hamurun havalanması ve ağızda erime özelliği kazanmasıdır.</p>`,
    ingredients: [
      '- 250 gram tereyağı (oda sıcaklığında)',
      '- 1 su bardağı pudra şekeri (servis için ekstra)',
      '- 1 adet yumurta sarısı',
      '- 1 çay kaşığı vanilya',
      '- 3 su bardağı un (elendikten sonra)',
      '- 1/2 su bardağı nişasta',
      '- 24 adet Antep fıstığı ya da ceviz içi',
    ],
    instructions: [
      '1. Tereyağını mikserle ya da el çırpıcısıyla 20 dakika krem hâline gelene kadar çırpın.',
      '2. Pudra şekerini, yumurta sarısını ve vanilyayı ekleyin; 5 dakika daha çırpın.',
      '3. Unu ve nişastayı yavaş yavaş ekleyin; ele yapışmayan bir hamur yoğurun.',
      '4. Hamurdan ceviz büyüklüğünde parçalar alın, yuvarlatın.',
      '5. Üzerine bir fıstık ya da ceviz parçası bastırın.',
      '6. Yağlı kâğıt serili fırın tepsisine dizin.',
      '7. Önceden ısıtılmış 160°C fırında 20-25 dakika, alt kısmı hafifçe kızarana kadar pişirin.',
      '8. Fırından çıktıktan hemen sonra sıcakken bol pudra şekeri serpin.',
      '9. Soğuyunca servis tabağına alın; 1 hafta oda sıcaklığında dayanır.',
    ],
    prep_time: 30,
    cook_time: 25,
    servings: 24,
    difficulty: 'Kolay',
    is_spicy: false,
    is_vegetarian: true,
    meta_description: 'Ağzında dağılan Urfa Kurabiyesi tarifi; bol tereyağı, fıstık ve pudra şekeriyle hazırlanan, bayramların ve misafir sofralarının tatlı yıldızı.',
  },
  {
    slug: 'tahin-corbasi',
    name: 'Tahin Çorbası',
    description: `<p>Şanlıurfa'nın tahin kültürü yalnızca sabah kahvaltılarının tahin pekmezi ile sınırlı değildir; tahin, çorba gibi beklenmedik bir lezzette de kendi büyüleyici izini bırakır. Tahin Çorbası, özellikle kış aylarında protein ve enerji deposu olarak tüketilen, nohut ya da mercimekle zenginleştirilen sıcak ve doyurucu bir çorbadır. Geçmişi yüzyıllara uzanan bu tarifin kökleri, Şanlıurfa'nın Mezopotamya ticaret yollarından beslendiği dönemlere dayanmaktadır.</p><p>Susam tahini, limon suyu ve sarımsağın bir araya geldiği bu çorba, hem vejetaryen hem de oruçlu sofralar için biçilmiş kaftan olan bir seçenektir. Bıçak arası ekmek dilimleriyle ya da yağlı lavaş parçasıyla servis yapıldığında mükemmel bir kış yemeği hâline gelir.</p>`,
    ingredients: [
      '- 3 yemek kaşığı tahin',
      '- 1 su bardağı haşlanmış nohut ya da mercimek',
      '- 5 su bardağı su ya da sebze suyu',
      '- 2 diş sarımsak, ezilmiş',
      '- 2 yemek kaşığı limon suyu',
      '- 1 çay kaşığı kimyon',
      '- 1 çay kaşığı zerdeçal (isteğe bağlı)',
      '- Tuz ve karabiber',
      '- Servis için: kırmızı pul biber, kuru nane, zeytinyağı',
    ],
    instructions: [
      '1. Tahin, limon suyu ve sarımsağı geniş bir kasede çırparak pürüzsüz hâle getirin.',
      '2. Haşlanmış nohut ya da mercimeği blender ile püre yapın ya da ezerek koyun.',
      '3. Tencerede sebze suyunu ısıtın; tahini yavaş yavaş suyun içine karıştırarak ekleyin.',
      '4. Nohut/mercimek püresini de ekleyin; pürüzsüz kıvama gelene kadar çırpın.',
      '5. Kimyon, zerdeçal, tuz ve karabiberi ekleyin.',
      '6. Orta ateşte, sürekli karıştırarak, 10-12 dakika pişirin (tahin pişmelidir).',
      '7. Limon suyunu son 2 dakikada ekleyin; tuz kontrolü yapın.',
      '8. Kaselere alın; üzerine zeytinyağı, kırmızı biber ve nane gezdirerek servis yapın.',
    ],
    prep_time: 10,
    cook_time: 15,
    servings: 4,
    difficulty: 'Kolay',
    is_spicy: false,
    is_vegetarian: true,
    meta_description: 'Besin değeri yüksek Tahin Çorbası tarifi; Şanlıurfa\'nın tahin kültüründen beslenen, nohutlu ve limonlu kış çorbası.',
  },
];

async function main() {
  console.log('\n🍽️  Tarif Batch 6 — 10 yeni tarif ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const db = new pg.Client({
    host: '127.0.0.1', port: 15617,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  const { rows: [{ count: before }] } = await db.query(`SELECT COUNT(*) as count FROM recipes WHERE status='published'`);
  console.log(`Başlangıç: ${before} tarif\n`);

  let added = 0, skipped = 0;

  for (const r of RECIPES) {
    process.stdout.write(`  → ${r.name.padEnd(35)}... `);
    const { rowCount } = await db.query(
      `INSERT INTO recipes
         (slug, name, description, ingredients, instructions, prep_time, cook_time,
          servings, difficulty, is_spicy, is_vegetarian, is_featured,
          rating, view_count, status, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,4.0,0,'published',$12)
       ON CONFLICT (slug) DO NOTHING`,
      [r.slug, r.name, r.description, r.ingredients, r.instructions,
       r.prep_time, r.cook_time, r.servings, r.difficulty,
       r.is_spicy, r.is_vegetarian, r.meta_description]
    );
    if (rowCount) { console.log('✓'); added++; }
    else { console.log('⊘ mevcut'); skipped++; }
  }

  const { rows: [{ count: after }] } = await db.query(`SELECT COUNT(*) as count FROM recipes WHERE status='published'`);
  console.log(`\n✅ ${added} yeni | ${skipped} mevcut`);
  console.log(`📊 Toplam tarif: ${after}`);

  await db.end();
  server.close();
  ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
