#!/usr/bin/env node
/**
 * 2027 Q1 Etkinlik Takvimi: Ocak, Şubat, Mart — 12'şer etkinlik (36 toplam).
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

function slugify(text) {
  const map = {ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c'};
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c=>map[c]||c)
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// [title, category, start_date, end_date, location, organizer, description, is_featured, is_free]
const EVENTS = [
  // ──────── OCAK 2027 ────────
  ['Şanlıurfa Kış Kültür Festivali 2027', 'Festival',
   '2027-01-08', '2027-01-10', 'Şanlıurfa Kültür Merkezi', 'Şanlıurfa Valiliği',
   'Şanlıurfa\'nın zengin kültür mirasını kış ayında yaşatan üç günlük festival. Geleneksel müzik konserleri, el sanatları sergileri, yöresel yemek standları ve Urfa usulü sıra geceleri etkinlikleri ile şehrin kültürel dokusunu keşfedebilirsiniz.',
   true, false],
  ['Uluslararası Urfa Mutfağı Haftası', 'Gastronomi',
   '2027-01-14', '2027-01-17', 'Tarihi Gümrük Hanı', 'Şanlıurfa Belediyesi Kültür İşleri',
   'Şanlıurfa mutfağının dünyaya açılan penceresi. Urfa kebabı, çiğ köfte, borani, kaburga ve şıllık gibi yöresel lezzetlerin ustalarından hazırlanan demolar, tatma etkinlikleri ve yemek yarışmaları dört gün boyunca sürecek.',
   false, false],
  ['Gobeklitepe Kış Rehberli Tur Programı', 'Turizm',
   '2027-01-07', '2027-01-07', 'Göbeklitepe Arkeoloji Alanı, Örencik Köyü', 'KUDAKA / Şanlıurfa Müze Müdürlüğü',
   'Dünyanın bilinen en eski tapınak kompleksi Göbeklitepe\'de kış ayına özel rehberli gece turu. 12.000 yıllık T-şeklili dikilitaşların soğuk hava atmosferinde görülmesi unutulmaz bir deneyim sunuyor.',
   false, false],
  ['Şanlıurfa Kış Konser Serisi — Ocak', 'Konser',
   '2027-01-20', '2027-01-20', 'Şanlıurfa Devlet Tiyatrosu', 'Şanlıurfa Büyükşehir Belediyesi',
   'Şanlıurfa Devlet Tiyatrosu\'nda düzenlenen kış konser serisinin ilk programı. Türk sanat müziği ve halk müziği yorumları; ney, kemençe, ud ve bağlama solistlerinin icrasıyla geleneksel Urfa makamları akşam boyunca seslendirilecek.',
   false, true],
  ['Harran Kış Tarım ve Kuru Meyve Pazarı', 'Pazar',
   '2027-01-09', '2027-01-11', 'Harran Antik Kenti Meydanı', 'Harran Belediyesi',
   'Harran Ovası\'nın bölgesel ürünlerinin toplandığı kış tarım pazarı. Kuru kayısı, kuru incir, üzüm pekmezi, sürme isot, kuru domates ve bakliyat çeşitleri köy üreticilerinden doğrudan satışa sunulacak.',
   false, true],
  ['Urfa Çiğ Köfte Şampiyonası', 'Gastronomi',
   '2027-01-22', '2027-01-22', 'Atatürk Stadyumu Fuaye Alanı', 'Şanlıurfa Aşçılar Derneği',
   'Her yıl düzenlenen Urfa Çiğ Köfte Şampiyonası\'nda ustalar geleneksel yoğurma tekniklerini ve özel baharat karışımlarını yarıştıracak. Katılımcı ekipler dereceye girme şansını değerlendirirken izleyiciler taze çiğ köfte tadabilecek.',
   false, true],
  ['Şanlıurfa Fotoğraf Sanatı Sergisi', 'Sanat',
   '2027-01-15', '2027-01-31', 'Şanlıurfa Müzesi Geçici Sergi Salonu', 'SÜRFOTOĞRAF Derneği',
   'Şanlıurfa\'nın tarihi dokusunu, insanlarını ve doğal güzelliklerini belgeleyen yerel fotoğrafçıların eserlerinin sergilendiği aylık fotoğraf sanatı etkinliği. Göbeklitepe, Halfeti ve Harran\'dan kareler öne çıkacak.',
   false, true],
  ['Sıra Gecesi Geleneği — Ocak Özel', 'Kültür',
   '2027-01-17', '2027-01-17', 'Tarihi Urfa Konaklarından Biri', 'Urfa Sıra Gecesi Kültür Derneği',
   'Asırlık Şanlıurfa geleneği sıra gecesi, seçkin bir tarihi konakta misafirperverlik ritüelleri ve canlı halk müziği ile yaşatılıyor. Daveti konuklar geleneksel yerden sofralar etrafında toplandı, şiir ve türküler eşliğinde hoş sohbet ortamı kuruyor.',
   false, false],
  ['Halfeti Kış Tekne Turu', 'Turizm',
   '2027-01-23', '2027-01-23', 'Halfeti İskelesi, Gaziantep Yolu', 'Halfeti Belediyesi',
   'Fırat Nehri\'nin sakin kış sularında teknelerle Halfeti\'nin batık camileri, kayalık koyları ve kış yeşilliğini keşfeden yarım günlük tur. Kış ayında sular çekildiğinde ortaya çıkan tarihi yapılar ziyaretçilere benzersiz bir manzara sunuyor.',
   false, false],
  ['Şanlıurfa Ebru ve Geleneksel Sanatlar Atölyesi', 'Sanat',
   '2027-01-25', '2027-01-25', 'Şanlıurfa El Sanatları Çarşısı', 'Şanlıurfa Kültür ve Sanat Derneği',
   'Osmanlı döneminden gelen ebru sanatının yanı sıra telkari gümüş işlemeciliği, bakır çekme ve çini boyama atölyeleri düzenleniyor. Ustalar eşliğinde katılımcılar kendi eserlerini oluşturma fırsatı bulacak.',
   false, false],
  ['Balıklıgöl ve Hz. İbrahim Makamı Kültür Turu', 'Tarih',
   '2027-01-30', '2027-01-30', 'Hz. İbrahim Külliyesi, Balıklıgöl', 'Şanlıurfa İl Kültür ve Turizm Müdürlüğü',
   'Şanlıurfa\'nın manevi merkezi Balıklıgöl çevresini, Hz. İbrahim Külliyesi\'ni ve Rızvaniye Camii\'ni kapsayan rehberli kültür turu. Alevilerin ve Müslümanların ortak kutsal mekânını tarihsel ve kültürel boyutlarıyla tanımak isteyenler için.',
   false, true],
  ['Şanlıurfa Kış Spor Oyunları', 'Spor',
   '2027-01-28', '2027-01-29', 'Şanlıurfa Spor Salonu', 'Şanlıurfa Gençlik ve Spor İl Müdürlüğü',
   'Güreş, halter, masa tenisi ve badminton dallarında gençlerin katıldığı kış spor yarışmaları. Şanlıurfa genelindeki okul ve kulüpleri temsil eden sporcular madalya için yarışırken seyirciler de sporun keyfini çıkaracak.',
   false, true],

  // ──────── ŞUBAT 2027 ────────
  ['Şanlıurfa Uluslararası Divan Şiiri Festivali 2027', 'Festival',
   '2027-02-05', '2027-02-08', 'Şanlıurfa Kültür Merkezi', 'Şanlıurfa Valiliği',
   'Divan edebiyatının yaşayan geleneğini sürdüren uluslararası şiir festivali. Türkiye ve yurt dışından divan şairi ve akademisyenler Urfa\'nın şairane kültürel atmosferinde bir araya geliyor. Özel recitaller, panel tartışmaları ve şiir dinletileri programda yer alıyor.',
   true, false],
  ['Nevruz Şenliği Hazırlık Programı', 'Kültür',
   '2027-02-20', '2027-02-20', 'Şanlıurfa Atatürk Parkı', 'Şanlıurfa Büyükşehir Belediyesi',
   'Mart\'a aylar kala Nevruz coşkusunun ön habercisi olarak düzenlenen kültürel program. Folklor ekiplerinin halay gösterileri, yöresel giysilerle kostüm yarışması ve çocuklar için bahar temalı etkinlikler ile aileler bir araya geliyor.',
   false, true],
  ['Göbeklitepe Arkeoloji Konferansı 2027', 'Arkeoloji',
   '2027-02-12', '2027-02-13', 'Şanlıurfa Valiliği Konferans Salonu', 'Şanlıurfa Müze Müdürlüğü & Üniversitesi',
   'Göbeklitepe\'nin son kazı sezonunda ortaya çıkan bulguların uluslararası arkeologlar ve akademisyenler tarafından tartışıldığı bilimsel konferans. Neolitik dönem araştırmaları, insanlık tarihi açısından önemi ve koruma çalışmaları ana başlıklar arasında.',
   true, false],
  ['Şubat Ayı Kış Konserleri Serisi', 'Konser',
   '2027-02-14', '2027-02-14', 'Şanlıurfa Devlet Tiyatrosu', 'Şanlıurfa Büyükşehir Belediyesi',
   'Sevgililer Günü\'nde Şanlıurfa Devlet Tiyatrosu\'nda özel konser. Türk sanat ve pop müziğinin buluştuğu akşam programında yerel sanatçılar seçkin repertuvarlarıyla sahne alacak.',
   false, false],
  ['Harran Üniversitesi Bilim Fuarı', 'Eğitim',
   '2027-02-18', '2027-02-20', 'Harran Üniversitesi Merkez Kampüsü', 'Harran Üniversitesi',
   'Harran Üniversitesi öğrencilerinin geliştirdiği yenilikçi projelerin sergilendiği üç günlük bilim ve teknoloji fuarı. Tarım teknolojisi, yenilenebilir enerji, yapay zeka ve biyomedikal mühendislik alanlarında proje sunumları ve demo\'lar yapılacak.',
   false, true],
  ['Urfa İsot Hasadı Festivali — Şubat Lansman', 'Gastronomi',
   '2027-02-07', '2027-02-07', 'Şanlıurfa Ticaret Borsası', 'Şanlıurfa Ticaret Borsası',
   'Şanlıurfa\'nın dünyaca ünlü İsot biberi için yıllık hasat sezonunun açılış programı. İsot üreticileri, ihracatçılar ve gastronomicilerin bir araya geldiği bu etkinlikte isot çeşitleri, üretim teknikleri ve ihracat hedefleri tartışılıyor.',
   false, true],
  ['Şanlıurfa Tiyatro Festivali 2027', 'Tiyatro',
   '2027-02-22', '2027-02-27', 'Şanlıurfa Devlet Tiyatrosu', 'Kültür Bakanlığı / Şanlıurfa Tiyatrosu',
   'Şanlıurfa Devlet Tiyatrosu\'nun ev sahipliğinde gerçekleştirilen altı günlük tiyatro festivali. Türkiye\'nin önde gelen tiyatro topluluklarının oyunlarının sergilendiği bu festivalda çağdaş ve klasik eserler sahneleniyor.',
   true, false],
  ['Balıklıgöl Çevresi Doğa Yürüyüşü', 'Doğa',
   '2027-02-06', '2027-02-06', 'Balıklıgöl, Şanlıurfa Merkez', 'Şanlıurfa Doğaseverler Kulübü',
   'Balıklıgöl ve çevresindeki tarihi dokuda 4 km\'lik sabah doğa yürüyüşü. Aynı zamanda kuş gözlemi de yapılabilen bu rota boyunca rehber eşliğinde floranın ve tarihi yapıların özelliklerinden bahsedilecek.',
   false, true],
  ['Şanlıurfa Geleneksel Eğlenceler Şöleni', 'Kültür',
   '2027-02-28', '2027-02-28', 'Şanlıurfa Atatürk Parkı', 'Şanlıurfa Büyükşehir Belediyesi',
   'Çocukluk oyunları, halk oyunları ve geleneksel Urfa eğlencelerinin yaşatıldığı aile şöleni. Çevirme, mendil kapmaca, güvercin uçurma ve deve güreşi gösterileri günün eğlence dolusu programını oluşturuyor.',
   false, true],
  ['Halfeti Kış Turları — Şubat Özel', 'Turizm',
   '2027-02-13', '2027-02-13', 'Halfeti Yeni Mahalle, Birecik Barajı Kıyısı', 'Halfeti Turizm Derneği',
   'Şubat ayında Halfeti\'nin kış güzelliklerini keşfetmek için düzenlenen özel günübirlik tur. Tekneli Fırat gezisi, köy kahvaltısı, siyah gül yetiştiricilerinin bahçelerini ziyaret ve yerel lokantada öğle yemeği programda yer alıyor.',
   false, false],
  ['Karacadağ Bisiklet Turu', 'Spor',
   '2027-02-21', '2027-02-21', 'Şanlıurfa Karacadağ Etekleri', 'Şanlıurfa Bisiklet Kulübü',
   'Karacadağ eteklerinde 30 km\'lik orta seviye bisiklet turu. Kış mevsiminde volkanik arazinin nefes kesen manzarasını keşfeden katılımcılar sabah kahvaltısından akşama kadar sürecek tura katılabilir.',
   false, false],
  ['Şanlıurfa Kış Seramik Atölyesi', 'Sanat',
   '2027-02-15', '2027-02-15', 'Şanlıurfa El Sanatları Eğitim Merkezi', 'Şanlıurfa El Sanatları Derneği',
   'Seramik ve çömlekçilik sanatını uzmanlardan öğrenme fırsatı. Katılımcılar çarkta kil şekillendirme, Harran mimari motiflerinden ilham alan Urfa desenleriyle bezeme ve fırınlama aşamalarını uygulayarak kendi eserlerini oluşturacak.',
   false, false],

  // ──────── MART 2027 ────────
  ['Şanlıurfa Nevruz Bahar Şenlikleri 2027', 'Festival',
   '2027-03-21', '2027-03-21', 'Şanlıurfa Atatürk Parkı ve Balıklıgöl Çevresi', 'Şanlıurfa Valiliği',
   'Baharın gelişini kutlayan ve UNESCO tarafından kültürel miras olarak tescillenen Nevruz töreni Şanlıurfa\'da büyük coşkuyla kutlanıyor. Ateş yakma ritüelleri, halay gösterileri, folklor etkinlikleri ve yöresel yemek şöleni gün boyu sürecek.',
   true, true],
  ['Uluslararası Göbeklitepe Arkeoloji Yarışması', 'Arkeoloji',
   '2027-03-10', '2027-03-12', 'Harran Üniversitesi Arkeoloji Bölümü', 'Harran Üniversitesi / Avrupa Arkeoloji Derneği',
   'Türkiye ve Avrupa üniversitelerinden arkeoloji öğrencilerinin katıldığı uluslararası yarışma. Göbeklitepe\'deki bulguların yorumlanması ve kazı tekniklerinin uygulanmasına yönelik simülasyon yarışmaları yapılacak.',
   false, false],
  ['Şanlıurfa Bahar Moda ve El Sanatları Fuarı', 'Sanat',
   '2027-03-06', '2027-03-09', 'Şanlıurfa Fuar Alanı', 'Şanlıurfa Ticaret ve Sanayi Odası',
   'Şanlıurfa\'nın geleneksel el sanatlarının modern tasarımla buluştuğu dört günlük fuar. Telkari gümüş, bakır el sanatları, kilim ve halı dokumacılığı, tahta oyma, deri işlemeciliği ve yöresel kumaşlar sergileniyor.',
   true, false],
  ['Bahar Turları — Harran Antik Kentine Özel', 'Turizm',
   '2027-03-14', '2027-03-14', 'Harran Antik Kenti, Şanlıurfa', 'Şanlıurfa İl Kültür ve Turizm Müdürlüğü',
   'Harran\'ın bahar çiçekleri ile kaplanan geniş ovalarında rehberli antik kent turu. Kümbet evler, tarihi ticaret yollarının kavşağındaki Ulu Cami kalıntıları ve Suların Kapısı gibi Harran\'ın özel mekânlarını keşfetmek için ideal mevsim.',
   false, false],
  ['Şanlıurfa Uluslararası Belgesel Film Festivali', 'Sanat',
   '2027-03-17', '2027-03-20', 'Şanlıurfa Sinema Merkezi', 'Şanlıurfa Belediyesi Kültür İşleri',
   'Orta Doğu ve Güneydoğu Anadolu temalarını işleyen belgesel filmlerden oluşan dört günlük festival. Göbeklitepe, Halfeti, yerel gelenekler ve bölgesel meseleler üzerine çekilmiş filmler gösterilecek, yönetmenlerle söyleşiler yapılacak.',
   false, false],
  ['Şanlıurfa Yöresel Ürünler Bahar Pazarı', 'Pazar',
   '2027-03-27', '2027-03-28', 'Gümrük Hanı Avlusu, Şanlıurfa Merkez', 'Şanlıurfa Esnaf Odaları Birliği',
   'Bahar hasatlarının ilk ürünlerinin satışa sunulduğu iki günlük yöresel pazar. Taze bahar soğanı, nane ve kişniş, bakliyat, zeytinyağı, isot seti, takılar ve el işlemeleri köy üreticilerinden direkt satışa sunulacak.',
   false, true],
  ['Halfeti Siyah Gül Bahçesi Ziyaretleri', 'Turizm',
   '2027-03-24', '2027-03-31', 'Halfeti Köy Bahçeleri', 'Halfeti Belediyesi',
   'Dünyada yalnızca Halfeti\'de yetişen nadir siyah güllerin mevsimine özel rehberli bahçe ziyareti haftası. Çiçeklenme sezonunun başlangıcında bahçe sahipleri konuklarına gül yetiştirme sırlarını ve ekolojik önemine dair bilgileri aktarıyor.',
   true, false],
  ['Şanlıurfa Çocuk Bayramı Etkinlikleri', 'Çocuk & Aile',
   '2027-03-29', '2027-03-29', 'Şanlıurfa Atatürk Stadyumu', 'Şanlıurfa Milli Eğitim Müdürlüğü',
   'Çocuklar için özel düzenlenen etkinlik günü. Bölge okullarının halk oyunları gösterileri, resim yarışması sergileri, geleneksel oyunlar, kukla tiyatrosu ve çocuk korosu performansları programda yer alıyor.',
   false, true],
  ['Şanlıurfa Bahar Konser Serisi — Mart', 'Konser',
   '2027-03-05', '2027-03-05', 'Şanlıurfa Devlet Tiyatrosu', 'Şanlıurfa Büyükşehir Belediyesi',
   'Kış konser serisinin son durağı; halk müziği ve türkü dinletisi. Şanlıurfa\'nın efsane türküleri yerel ses sanatçıları tarafından canlı olarak seslendirilecek. Atatürk\'ü anma ve bahar karşılama temalı özel bir program hazırlandı.',
   false, true],
  ['Şanlıurfa Aşçılar Festivali ve Yemek Yarışması', 'Gastronomi',
   '2027-03-19', '2027-03-20', 'Şanlıurfa Fuar Alanı', 'Şanlıurfa Aşçılar Derneği',
   'Şanlıurfa mutfak ustalarının ve ev aşçılarının yeteneklerini sergilediği iki günlük yemek yarışması ve festival. Urfa kebabı, ciğer, çiğ köfte, borani ve şıllık kategorilerinde jüri değerlendirmesi yapılırken ziyaretçiler tadım alanında örnekleyebilecek.',
   true, false],
  ['Şanlıurfa Sokak Sanatları Festivali', 'Sanat',
   '2027-03-13', '2027-03-13', 'Tarihi Çarşı Bölgesi, Şanlıurfa Merkez', 'Şanlıurfa Kültür ve Sanat Derneği',
   'Tarihi çarşı sokaklarında müzisyenler, sokak performansçıları, canlı resim sanatçıları ve sirk sanatçılarının bir arada sahne aldığı bir günlük kent sanatları festivali. Aile dostu etkinlikler sabahtan akşama kadar sürecek.',
   false, true],
  ['Şanlıurfa-Gaziantep Dostluk Gençlik Maratonu', 'Spor',
   '2027-03-07', '2027-03-07', 'Şanlıurfa Atatürk Bulvarı Start Noktası', 'Şanlıurfa Atletizm Federasyonu',
   'Şanlıurfa ve Gaziantep illeri arasındaki komşuluk ve dostluğu pekiştirmek için düzenlenen yarı maraton. 21 km\'lik parkurun yanı sıra 10 km ve 5 km\'lik mesafeler de mevcut. Spor camiasının yanı sıra koşu meraklıları da kayıt yaptırabilecek.',
   false, false],
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', 15512, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(15512, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log(`\n📅 2027 Q1 Etkinlik Takvimi — ${EVENTS.length} etkinlik ekleniyor...\n`);
  const { ssh, server } = await openSshTunnel();
  const pool = new pg.Pool({ host:'127.0.0.1', port:15512, database:process.env.DB_USER, user:process.env.DB_USER, password:process.env.DB_PASS });

  let ok = 0, skip = 0, fail = 0;

  for (const [title, category, startDate, endDate, location, organizer, description, isFeatured, isFree] of EVENTS) {
    const slug = slugify(title) + '-2027';
    process.stdout.write(`  ${startDate.slice(0,7)} | ${title.slice(0,50)}... `);

    try {
      const result = await pool.query(`
        INSERT INTO events (id, title, slug, description, category, start_date, end_date,
          location, organizer, is_featured, status, is_online, is_free, view_count, attendee_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',false,$11,
          floor(random()*300+50)::int, floor(random()*150+20)::int)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `, [randomUUID(), title, slug, description, category, startDate, endDate,
          location, organizer, isFeatured, isFree]);

      if (result.rowCount > 0) { console.log('✓'); ok++; }
      else { console.log('⊘ zaten var'); skip++; }
    } catch (err) {
      console.log(`✗ ${err.message.slice(0,60)}`);
      fail++;
    }
  }

  const check = await pool.query(`
    SELECT TO_CHAR(start_date,'YYYY-MM') ym, COUNT(*) cnt
    FROM events WHERE status='published' AND start_date >= '2027-01-01'
    GROUP BY ym ORDER BY ym
  `);
  const total = await pool.query(`SELECT COUNT(*) FROM events WHERE status='published'`);

  await pool.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} eklendi | ${skip} mevcut | ${fail} hata`);
  console.log('📊 2027 dağılım:');
  check.rows.forEach(r => console.log(`   ${r.ym}: ${r.cnt}`));
  console.log(`   Toplam yayınlanan: ${total.rows[0].count}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
