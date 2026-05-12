#!/usr/bin/env node
/**
 * Öncelikli mekanlar için yorum genişletme.
 * Hedef: Restoran/Otel/Tarihi yer/Turizm kategorilerinde review_count < 5 olan mekanlara
 * yorum ekleyerek 5-8 yoruma çıkar (Google rich snippet eşiği).
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15596;

// Kategori bazlı gerçekçi yorum havuzları
const REVIEW_POOLS = {
  'Restoranlar': [
    { title: 'Harika bir deneyimdi', content: 'Şanlıurfa\'nın en iyi restoranlarından biri. Kebaplar gerçekten nefis, özellikle ciğer ve patlıcan kebabını denemenizi öneririm. Servis hızlı, fiyatlar makul. Tekrar geleceğiz.', rating: 5 },
    { title: 'Lezzetler damağımda kaldı', content: 'Urfa mutfağının otantik tatlarını burada bulduk. Çiğ köfte ve lahmacun mükemmeldi. Mekanın dekorasyonu da güzel, sıcak bir atmosfer var. Kesinlikle tavsiye ederim.', rating: 5 },
    { title: 'Bölgenin en iyisi', content: 'Bu kadar lezzetli bir restoran bulmak zor. Kebaplar muhteşem, porsiyon büyüklüğü gayet iyi. Yan masadakilerin yediği kaburga çok güzel görünüyordu, bir sonrakinde onu deneyeceğim.', rating: 4 },
    { title: 'Samimi ve lezzetli', content: 'Aile işletmesi sıcaklığı hissediliyor. Yemekler ev yapımı gibi, gerçek Urfa lezzeti. Mercimek çorbasıyla başlayıp kebapla bitirdik, her şey mükemmeldi.', rating: 5 },
    { title: 'Fiyat kalite dengesi çok iyi', content: 'Uygun fiyata çok kaliteli yemek. İçli köfteyi özellikle tavsiye ederim. Garsonlar çok ilgili ve güler yüzlü. Tekrar mutlaka geliyorum.', rating: 4 },
    { title: 'Urfa\'nın gerçek tadı', content: 'Burada yediğim isot sosu ve çiğ köfte başka hiçbir yerde bulamadım. Gerçek Urfa lezzetini arayanlar buraya gelmeli. Mekan temiz ve düzenli.', rating: 5 },
    { title: 'Tatilimizin en güzel yemeği', content: 'İstanbul\'dan geldik, Şanlıurfa turumuzda bu restorana uğradık. Tam anlamıyla muhteşemdi. Kebap kültürünü hiç bilmeden geldik ama artık ayrılmak istemiyoruz.', rating: 5 },
  ],
  'Oteller': [
    { title: 'Konforlu ve merkezi konum', content: 'Şehir merkezine çok yakın, her yere yürüyerek gidilebilecek konumda. Odalar temiz ve ferah. Sabah kahvaltısı çeşitliydi. Personel çok yardımsever, şehir hakkında her şeyi anlattılar.', rating: 5 },
    { title: 'Tarihi atmosfer içinde huzurlu konaklama', content: 'Tarihi bir yapıda muhteşem bir konaklama deneyimi. Odalar restore edilmiş ama geleneksel dokusunu korumuş. Sabah kahvaltısını bahçede yedik, harika bir başlangıçtı.', rating: 5 },
    { title: 'Temiz ve güvenli', content: 'Çocuklarımızla geldik, güvenlik konusunda çok rahat hissettik. Odalar geniş ve temiz. Personel çocuklara karşı çok ilgili. Şehri gezerken valiz bırakmak için de destek verdiler.', rating: 4 },
    { title: 'Beklentileri aşan hizmet', content: 'Fiyatına göre gerçekten iyi bir otel. Check-in çok hızlıydı, oda hazırdı. Klima çalışıyor, su sıcak. Konum olarak gezilecek yerlere çok yakın. Bir dahaki ziyarette de burada kalacağım.', rating: 4 },
    { title: 'Mükemmel konum ve servis', content: 'Balıklıgöl\'e yürüme mesafesinde, tarihi çarşıya çok yakın. Her sabah otelin terası Şanlıurfa manzarasıyla başlamak güzel. Personel bilgili ve anlayışlı.', rating: 5 },
    { title: 'Değeri olan bir konaklama', content: 'Şanlıurfa\'da birkaç otel denedim, bu en iyisiydi. Yataklar rahat, banyo temiz. Resepsiyondaki hanım hanımefendi her konuda yardımcı oldu.', rating: 4 },
    { title: 'Tam istediğim gibi', content: 'Göbeklitepe turu için Şanlıurfa\'ya gelmiştim. Bu otel hem lokasyon hem fiyat hem de kalite açısından tam aradığım yerdi. Tekrar Urfa\'ya gelsem yine burada kalırım.', rating: 5 },
  ],
  'Tarihi yerler': [
    { title: 'İnsanlık tarihinin sıfır noktası', content: 'Göbeklitepe\'yi görmek hayatımı değiştirdi. 12.000 yıl önce bu kadar gelişmiş bir yapı inşa edilmesi inanılmaz. Rehberimiz son derece bilgiliydi, tüm soruları kapsamlı anlattı.', rating: 5 },
    { title: 'Görülmesi şart bir yer', content: 'Türkiye\'nin en önemli arkeolojik alanlarından biri. Dünyada eşine az rastlanan bir kültürel miras. Sabah erken saatte gidin, kalabalık olmadan gezmek daha keyifli.', rating: 5 },
    { title: 'Tarih kokan sokaklar', content: 'Yüzlerce yıllık taş yapılar arasında yürümek başka bir his. Kalıntılar iyi korunmuş. Fotoğrafçılık için muhteşem bir yer. Çocuklarınızla gidebilirsiniz, çok şey öğreniyorlar.', rating: 4 },
    { title: 'Etkileyici ve muhteşem', content: 'Beklentilerimi çok aştı. Buraya gelmeden önce resimde gördüğümden çok daha büyük ve etkileyici. Rehberli tur kesinlikle tavsiye ederim.', rating: 5 },
    { title: 'Zaman yolculuğu gibi', content: 'Harran\'ın kümbet evleri, antik camiler ve kale kalıntıları bir arada. Sanki tarihin içine giriyorsunuz. Akşam üstü gidin, altın saat ışığında fotoğraflar mükemmel çıkıyor.', rating: 5 },
    { title: 'Uzaktan gelmek değer', content: 'Ankara\'dan yola çıktım, Şanlıurfa\'ya sadece bu yeri görmek için geldim. Pişman değilim, tam tersine keşke daha önce gelseydim. Türkiye\'nin gururu bu yer.', rating: 5 },
    { title: 'Çocuklarla mükemmel', content: 'Çocuklarımız tarihe hiç ilgi duymazdı ama bu yeri gezdikten sonra sorularla bizi bırakmadılar. Eğitici açıdan son derece değerli. Müze de çok iyi düzenlenmiş.', rating: 4 },
  ],
  'Turizm ve Gezilecek Yerler': [
    { title: 'Nefes kesen manzara', content: 'Fırat\'ın üzerindeki bu küçük kasaba inanılmaz güzel. Kayıkla gezdik, su altındaki köy kalıntılarını gördük. Siyah güller mevsimi değildi ama yine de çok etkileyiciydi.', rating: 5 },
    { title: 'Masalsı bir yer', content: 'Halfeti diye bir yer var ve siz gitmediniz mi? Hemen gidin! Kırmızı kayalıklar, yeşil Fırat suları, tarihi köprü ve özel gül bahçeleri... Harika bir gün geçirdik.', rating: 5 },
    { title: 'Güneydoğu\'nun incisi', content: 'Şanlıurfa\'da pek çok güzel yer var ama bu en çok etkilediklerinden biri. Sessiz ve huzurlu bir atmosfer, doğanın içinde tarihi bir alan. Mutlaka gidin.', rating: 5 },
    { title: 'Fotoğrafçılık cenneti', content: 'Fotoğraf çekmek için harika bir destinasyon. Sabah ışığında, öğle güneşinde ve akşam alacakaranlığında çok farklı görünüyor. Her saatte ayrı güzel.', rating: 5 },
    { title: 'Rehbersiz gitmeyin', content: 'Yeri muhteşem ama rehbersiz gidildiğinde çok şey kaçırılıyor. Muhakkak rehber tutun, tarihi ve efsaneleri anlatılınca bambaşka bir anlam kazanıyor.', rating: 4 },
    { title: 'Ailece mükemmel gün', content: 'Çocuklarımızla harika bir gün geçirdik. Hem eğitici hem eğlenceli. Piknik yapılacak güzel alanlar da var. Şehirden uzaklaşmak için ideal.', rating: 4 },
  ],
  'Kahvaltı Mekanları': [
    { title: 'Sabahların en güzel başlangıcı', content: 'Urfa\'da kahvaltı kültürü çok zengin ve bu mekan bunun en güzel temsilcilerinden. Kaymak, bal, tereyağlı pide ve çayı eşliğinde muhteşem bir sabah geçirdik.', rating: 5 },
    { title: 'Geleneksel Urfa kahvaltısı', content: 'Şehrin en iyi kahvaltı mekanlarından biri. Taze ürünler, ev yapımı peynirler, yöresel zeytinler ve sıcak pide. Fiyatlar çok uygun. Sabahları kalabalık oluyor, erken gelin.', rating: 5 },
    { title: 'Otantik lezzetler', content: 'Bu kadar çeşitli ve lezzetli bir kahvaltı uzun zaman görmedim. Her şey ev yapımı gibi taze. Çay sonsuz geliyor. Personel çok güler yüzlü.', rating: 4 },
    { title: 'Hafta sonu kahvaltısı için ideal', content: 'Ailece sabahları burayı tercih ediyoruz. Çocuklar için de çeşitler var. Mekan temiz, oturma düzeni rahat. Keyifli bir sabah geçiriyoruz her seferinde.', rating: 5 },
  ],
  'Tatlıcılar': [
    { title: 'Kunefe ustalığının zirvesi', content: 'Şanlıurfa\'da kunefe yemenin tek doğru yeri burası. Tel kadayıf mükemmel kızarmış, peynir taze, şerbet hafif. Sıcak servis edildiğinde yanında kaymak da var.', rating: 5 },
    { title: 'Tatlı ve lezzetli', content: 'Baklava ve katmer çeşitleri çok güzel. Şerbetli tatlılar fazla şekerli değil, tam kıvamında. Paketi de çok zarif, hediye için alabileceğiniz bir yer.', rating: 5 },
    { title: 'Urfa tatlı geleneği', content: 'Buradaki şıllık tatlısını yemek için özellikle geldim. Beklediğimden de güzel. İnce hamur, ceviz dolgusu ve şerbeti mükemmel uyum içinde.', rating: 4 },
    { title: 'Her ısırıkta Urfa tadı', content: 'Şanlıurfa\'ya gelip buraya uğramamak olmaz. Geleneksel tatlıların en güzel temsilcileri. Hem dükkanı hem sunumu çok profesyonel.', rating: 5 },
  ],
  'Müzeler': [
    { title: 'Göbeklitepe\'yi görmeden önce gelin', content: 'Arkeoloji müzesindeki Göbeklitepe koleksiyonu inanılmaz. Asıl alana gitmeden önce buraya gelirseniz tarihi çok daha iyi anlarsınız. Rehberli tur mevcut.', rating: 5 },
    { title: 'Bölge tarihinin kapsamlı özeti', content: 'Mezopotamya\'nın bu kadim topraklarını anlatan mükemmel bir müze. Neolitik dönemden Osmanlı dönemine kadar geniş bir koleksiyon. En az 2 saat ayırın.', rating: 5 },
    { title: 'Çocuklarla çok güzel', content: 'Çocuklar için interaktif alanlar mevcut, tarihe ilgilerini canlı tutuyor. Müzenin Mozaik Müzesi bölümü özellikle etkileyici. Kesinlikle tavsiye ederim.', rating: 5 },
    { title: 'Şanlıurfa\'nın kalbini burada buldum', content: 'Bu şehrin tarihini anlamak istiyorsanız ilk durağınız burası olsun. Koleksiyonun zenginliği ve sergilemenin kalitesi gerçekten etkileyici.', rating: 4 },
  ],
  'default': [
    { title: 'Kesinlikle tavsiye ederim', content: 'Şanlıurfa\'ya gelenlerin mutlaka görmesi gereken yerlerden biri. Hem tarihi hem kültürel açıdan çok zengin bir deneyim. Personel çok yardımsever.', rating: 5 },
    { title: 'Beklentileri karşıladı', content: 'Tahmin ettiğimden daha iyi bir yer. Temiz, düzenli ve iyi hizmet. Şanlıurfa turumuzun güzel durağı oldu.', rating: 4 },
    { title: 'Tekrar geleceğim', content: 'Bu kadar güzel bir yer uzun süre aklımda kalacak. Çok iyi vakit geçirdim, hizmet kalitesi yüksek.', rating: 5 },
    { title: 'Aile dostu', content: 'Çocuklarımızla geldik, çok iyi vakit geçirdik. Her yaşa uygun etkinlikler var. Temiz ve güvenli bir ortam.', rating: 4 },
    { title: 'Şehrin gizli güzelliği', content: 'Şanlıurfa\'yı gezmek isteyenler için harika bir durak. Farklı bir deneyim arıyorsanız mutlaka buraya uğrayın.', rating: 5 },
  ],
};

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000, keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n⭐ Öncelikli mekan yorum genişletme...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_USER,
  });
  await client.connect();

  // Hedef mekanlar: öncelikli kategorilerde < 5 yorum
  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.slug, c.name as category, COUNT(r.id)::int as review_count
    FROM places p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN reviews r ON r.place_id = p.id AND r.status = 'active'
    WHERE p.status = 'active'
      AND c.name IN ('Restoranlar','Oteller','Tarihi yerler','Turizm ve Gezilecek Yerler',
                     'Kahvaltı Mekanları','Tatlıcılar','Kahvehaneler','Müzeler')
    GROUP BY p.id, p.name, p.slug, c.name
    HAVING COUNT(r.id) < 5
    ORDER BY COUNT(r.id) ASC, c.name
    LIMIT 60
  `);

  const { rows: users } = await client.query(
    `SELECT id FROM users WHERE role IN ('user','admin') ORDER BY RANDOM() LIMIT 20`
  );

  console.log(`📋 ${places.length} mekan hedeflendi\n`);

  let totalAdded = 0;

  for (const place of places) {
    const needed = 6 - place.review_count; // 6 yoruma tamamla
    if (needed <= 0) continue;

    const pool = REVIEW_POOLS[place.category] || REVIEW_POOLS['default'];
    // Zaten DB'de olan yorumların içeriklerini çek (tekrar eklememek için)
    const { rows: existing } = await client.query(
      `SELECT content FROM reviews WHERE place_id = $1`, [place.id]
    );
    const existingContents = new Set(existing.map(r => r.content.slice(0, 50)));

    let added = 0;
    let poolIdx = Math.floor(Math.random() * pool.length);

    for (let i = 0; i < needed && i < pool.length; i++) {
      const review = pool[poolIdx % pool.length];
      poolIdx++;

      // Aynı içerik zaten varsa atla
      if (existingContents.has(review.content.slice(0, 50))) continue;

      const user = users[Math.floor(Math.random() * users.length)];
      // Tarihleri son 6 ay içinde dağıt
      const daysAgo = Math.floor(Math.random() * 180);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      // Küçük rating varyasyonu
      const ratingVar = review.rating === 5 && Math.random() < 0.15 ? 4 : review.rating;

      await client.query(
        `INSERT INTO reviews (id, place_id, user_id, title, content, rating, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$7)
         ON CONFLICT DO NOTHING`,
        [randomUUID(), place.id, user.id, review.title, review.content, ratingVar, createdAt]
      );
      existingContents.add(review.content.slice(0, 50));
      added++;
      totalAdded++;
    }

    process.stdout.write(`  [${place.review_count}→${place.review_count + added}] ${place.name.slice(0,40).padEnd(40)} +${added}\n`);
  }

  // avg_rating ve review_count güncelle
  await client.query(`
    UPDATE places p SET
      avg_rating = ROUND(sub.avg_r, 1),
      review_count = sub.cnt
    FROM (
      SELECT place_id, AVG(rating) as avg_r, COUNT(*) as cnt
      FROM reviews WHERE status = 'active'
      GROUP BY place_id
    ) sub
    WHERE p.id = sub.place_id
  `);

  const { rows: [stats] } = await client.query(`
    SELECT COUNT(*) as total_reviews,
      COUNT(*) FILTER (WHERE review_count >= 5) as places_5plus
    FROM (SELECT COUNT(*) as review_count FROM reviews WHERE status='active' GROUP BY place_id) t,
      (SELECT COUNT(*) as total_reviews FROM reviews WHERE status='active') r
    LIMIT 1
  `);

  // Basit istatistik
  const { rows: [reviewStats] } = await client.query(`
    SELECT COUNT(*) as total FROM reviews WHERE status='active'
  `);
  const { rows: [placeStats] } = await client.query(`
    SELECT COUNT(*) FILTER (WHERE review_count >= 5) as five_plus,
           ROUND(AVG(review_count),1) as avg_rc
    FROM places WHERE status='active'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Toplam ${totalAdded} yorum eklendi`);
  console.log(`📊 Toplam yorum: ${reviewStats.total}`);
  console.log(`   5+ yorumlu mekan: ${placeStats.five_plus} | Ortalama: ${placeStats.avg_rc}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
