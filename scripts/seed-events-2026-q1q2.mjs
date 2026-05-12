#!/usr/bin/env node
/**
 * 2026 Q1-Q2 Etkinlik Takvimi: Ocak, Şubat, Mart, Nisan — ~11'er etkinlik (44 toplam).
 * Mevcut etkinlik takvimi Mayıs 2026'dan başlıyor; bu script öncesini doldurur.
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
  // ──────── OCAK 2026 ────────
  ['Şanlıurfa Kış Kültür Şenliği 2026', 'Festival',
   '2026-01-09', '2026-01-11', 'Şanlıurfa Kültür Merkezi', 'Şanlıurfa Valiliği',
   'Şanlıurfa\'nın zengin kültür mirasını kış ayında yaşatan üç günlük şenlik. Geleneksel müzik konserleri, el sanatları sergileri, yöresel yemek standları ve sıra geceleri programlarıyla şehrin kültürel dokusunu keşfetme fırsatı sunar.',
   true, false],

  ['Göbeklitepe Kış Rehberli Tur — Ocak', 'Turizm',
   '2026-01-06', '2026-01-06', 'Göbeklitepe Arkeoloji Alanı', 'Şanlıurfa Müze Müdürlüğü',
   '12.000 yıllık T-şeklili dikilitaşların soğuk hava atmosferinde rehberli keşfi. Kış aylarında ziyaretçi sayısının az olması sayesinde alana daha yakın inceleme imkânı sunan özel turlardandır.',
   false, false],

  ['Urfa Kebap Şampiyonası 2026', 'Gastronomi',
   '2026-01-15', '2026-01-16', 'Tarihi Gümrük Hanı', 'Şanlıurfa Esnaf Odası',
   'Şanlıurfa\'nın ustalı kebap kültürünü yarışmaya dönüştüren yıllık şampiyona. Katılımcı ustalar cağ kebabı, patlıcan kebabı, ciğer ve Urfa\'ya özgü baharatlı kıyma kebabı sunumlarıyla değerlendirme kuruluna ve ziyaretçilere lezzetlerini tanıtıyor.',
   false, false],

  ['Sıra Gecesi Geleneği — Ocak Özel', 'Kültür',
   '2026-01-23', '2026-01-23', 'Balıklıgöl Çevresi Kültür Evi', 'Şanlıurfa Belediyesi',
   'Urfa\'nın eşsiz sosyal geleneği sıra gecesi, kış programıyla yeniden hayat buluyor. Ud, kemençe ve tef eşliğinde söylenen Urfa türküleri; mırra, çay ve yöresel ikramlarla misafirlere unutulmaz bir gece yaşatıyor.',
   false, true],

  ['Halfeti Kış Tekne Turu — Ocak', 'Turizm',
   '2026-01-17', '2026-01-18', 'Halfeti İskele Meydanı', 'Halfeti Belediyesi',
   'Fırat nehri kıyısındaki büyülü Halfeti ilçesinde kış dönemine özel tekne turu programı. Sular altındaki Rum Kalesi kalıntıları ve kayalık vadiler kış ışığında farklı bir görünüm kazanıyor.',
   false, false],

  ['Harran Kış Tarım ve Kuru Meyve Pazarı', 'Pazar',
   '2026-01-10', '2026-01-11', 'Harran Antik Kenti Meydanı', 'Harran Belediyesi',
   'Harran Ovası\'nın bölgesel ürünlerinin toplandığı kış tarım pazarı. Kuru kayısı, kuru incir, üzüm pekmezi, sürme isot, kuru domates ve bakliyat çeşitleri köy üreticilerinden doğrudan satışa sunulacak.',
   false, true],

  ['Şanlıurfa Fotoğraf Yarışması — Kış Teması', 'Sanat',
   '2026-01-05', '2026-01-31', 'Online & Şanlıurfa Fotoğraf Kulübü', 'Şanlıurfa Fotoğrafçılar Derneği',
   'Şanlıurfa\'nın kış güzelliklerini konu alan yıllık fotoğraf yarışması. Tarihi dokular, kış ışığında Göbeklitepe ve Balıklıgöl fotoğrafları değerlendirmeye alınıyor. Dereceye girenler Şanlıurfa Kent Müzesi\'nde sergilenecek.',
   false, true],

  ['Şanlıurfa Kış Konser Serisi — Ocak', 'Konser',
   '2026-01-21', '2026-01-21', 'Şanlıurfa Devlet Tiyatrosu', 'Şanlıurfa Büyükşehir Belediyesi',
   'Kış konser serisinin ilk programı. Türk sanat müziği ve halk müziği yorumları; ney, kemençe, ud ve bağlama solistlerinin icrasıyla geleneksel Urfa makamları bu akşam seslendirilecek.',
   false, true],

  ['Ebru ve Geleneksel Sanatlar Atölyesi', 'Eğitim',
   '2026-01-24', '2026-01-25', 'Rızvaniye Medresesi Kültür Merkezi', 'Şanlıurfa Kültür Derneği',
   'İki günlük ebru, hat ve tezhip atölyesi. Uzman sanatçılar eşliğinde geleneksel Osmanlı sanatlarını deneyimleme imkânı. Katılımcılar ürettikleri eserleri yanlarında götürebilecek.',
   false, false],

  ['Balıklıgöl Kış Kültür Turu', 'Turizm',
   '2026-01-28', '2026-01-28', 'Balıklıgöl & Hz. İbrahim Makamı', 'Şanlıurfa Turizm Derneği',
   'Balıklıgöl, Hz. İbrahim Makamı ve Dergah çevresini kapsayan rehberli kültür turu. Saçılı Göl\'ün efsanesi, kutsal balıkların hikayesi ve İslam geleneğindeki yeri hakkında kapsamlı bilgi sunulmaktadır.',
   false, true],

  ['Şanlıurfa Kış Spor Oyunları', 'Spor',
   '2026-01-30', '2026-01-31', 'Şanlıurfa Gençlik Merkezi', 'İl Gençlik ve Spor Müdürlüğü',
   'Kış ayına özel spor etkinlikleri: masa tenisi, güreş, okçuluk ve geleneksel Urfa sporları yarışmaları. Tüm yaş gruplarına açık turnuvalar ve gösteri maçları iki gün boyunca düzenlenecek.',
   false, true],

  // ──────── ŞUBAT 2026 ────────
  ['Urfa\'da Ramazan Başlangıcı Etkinlikleri', 'Festival',
   '2026-02-17', '2026-02-19', 'Balıklıgöl Meydanı', 'Şanlıurfa Valiliği',
   'Şanlıurfa\'nın Ramazan ayını karşılayan açılış etkinlikleri. Kandil merasimi, dua töreni, mehter gösterisi ve iftar sofrası kurulması geleneksel törenlerle birlikte gerçekleşecek. Tüm şehrin katılımına açık ücretsiz etkinlikler.',
   true, true],

  ['Ramazan İftar Sofrası — Tarihi Gümrük Hanı', 'Gastronomi',
   '2026-02-20', '2026-03-19', 'Tarihi Gümrük Hanı', 'Şanlıurfa Belediyesi',
   'Tarihi Gümrük Hanı\'nın avlusunda Ramazan boyunca kurulan geleneksel iftar sofraları. Urfa mutfağının özgün lezzetleri; mercimek çorbası, pide, kaburga ve tatlılar eşliğinde manevi bir iftar deneyimi.',
   false, true],

  ['Kapalı Çarşı Ramazan Çarşısı', 'Pazar',
   '2026-02-18', '2026-03-18', 'Şanlıurfa Kapalı Çarşı', 'Şanlıurfa Esnaf Odaları Birliği',
   'Tarihi Kapalı Çarşı\'nın Ramazan ayına özel açılışı. Geleneksel el işi ürünler, baharat dükkânları, şerbetçiler ve tatlıcılar halkı karşılıyor. Sahurdan iftara kadar uzayan çarşı saatleri ve geleneksel alışveriş atmosferi.',
   false, false],

  ['Uluslararası Belgesel Film Festivali', 'Kültür',
   '2026-02-06', '2026-02-09', 'Şanlıurfa Kent Müzesi & Sineması', 'Şanlıurfa Büyükşehir Belediyesi',
   'Güneydoğu Anadolu\'yu ve Mezopotamya tarihini konu alan belgesel filmlerin uluslararası festivali. Göbeklitepe, Harran ve bölgenin arkeolojik zenginliklerini anlatan filmler, yönetmenler ve arkeologlarla soru-cevap oturumlarıyla sunulacak.',
   false, false],

  ['El Sanatları ve Geleneksel Tekstil Sergisi', 'Sanat',
   '2026-02-11', '2026-02-15', 'Rızvaniye Kapalı Çarşı Sergi Alanı', 'Şanlıurfa Kültür Turizm İl Müdürlüğü',
   'Urfa\'nın geleneksel el sanatları; taş işleme, bakırcılık, gümüş işlemeciliği, bez dokuması ve Urfa usulü nakış teknikleri ustalar tarafından sergilenecek. Canlı uygulama gösterileri ve satış standları eşliğinde.',
   false, true],

  ['Şanlıurfa Kış Tiyatro Festivali', 'Tiyatro',
   '2026-02-13', '2026-02-14', 'Şanlıurfa Devlet Tiyatrosu', 'Şanlıurfa Büyükşehir Belediyesi',
   'Şanlıurfa Devlet Tiyatrosu\'nun kış sezonu kısa oyunlar festivali. Yerel tiyatro grupları, üniversite ekipleri ve profesyonel sanatçılar sahne alacak. Urfa kültüründen ilham alan özgün eserler ve klasik oyun uyarlamaları programda yer alıyor.',
   false, false],

  ['Göbeklitepe Arkeoloji Söyleşileri — Şubat', 'Eğitim',
   '2026-02-05', '2026-02-05', 'Harran Üniversitesi Konferans Salonu', 'Harran Üniversitesi Arkeoloji Bölümü',
   'Güneydoğu Anadolu\'nun arkeolojik zenginliklerini konu alan aylık söyleşi serisi. Bu ay Karahantepe kazısından yeni bulgular ve Taş Tepeler projesinin gelişimi ele alınacak. Akademisyenler ve meraklılara açık ücretsiz etkinlik.',
   false, true],

  ['Halfeti Kış Gezisi — Şubat Turu', 'Turizm',
   '2026-02-21', '2026-02-22', 'Halfeti & Rumkale', 'Halfeti Belediyesi',
   'Fırat\'ın büyülü kıyısı Halfeti ve tarihi Rumkale kalıntılarını kapsayan iki günlük kış gezisi. Tekne turu, Halfeti mutfağından özel yemek ve geceleme seçenekleriyle kapsamlı bir Halfeti deneyimi.',
   false, false],

  ['Urfa Geleneksel Eğlenceler Şöleni', 'Kültür',
   '2026-02-27', '2026-02-28', 'Atatürk Parkı', 'Şanlıurfa Büyükşehir Belediyesi',
   'Geleneksel Urfa eğlencelerini gençlere aktarmayı amaçlayan halk şöleni. Cirit oyunu gösterisi, güreş müsabakaları, deve güreşi gösterisi, pehlivanlar ve halk oyunları ekipleri iki gün boyunca ziyaretçileri eğlendirecek.',
   false, true],

  ['Karacadağ Kış Doğa Yürüyüşü', 'Doğa',
   '2026-02-07', '2026-02-07', 'Karacadağ Etekleri', 'Şanlıurfa Dağcılık Derneği',
   'Karacadağ\'ın volkanik peyzajında rehberli kış doğa yürüyüşü. Düz kara bazalt formasyonları arasında 8-10 km\'lik parkur; rotada endemik bitkiler, volkana ait jeolojik yapılar ve geniş ova manzaraları eşlik ediyor.',
   false, true],

  // ──────── MART 2026 ────────
  ['Nevruz Bahar Şenlikleri 2026', 'Festival',
   '2026-03-21', '2026-03-22', 'Atatürk Stadyumu & Merkez', 'Şanlıurfa Valiliği',
   'Baharın müjdecisi Nevruz, Şanlıurfa\'da iki günlük büyük şenlikle kutlanıyor. Ateş yakma, renkli kıyafetler, halk oyunları, Nevruz yemekleri ve çocuklara özel eğlencelerle dolu bu kutlama tüm şehrin coşkusunu yansıtıyor.',
   true, true],

  ['Ramazan Bayramı Kutlamaları 2026', 'Festival',
   '2026-03-29', '2026-04-01', 'Şanlıurfa Geneli', 'Şanlıurfa Valiliği',
   'Ramazan Bayramı\'nın Şanlıurfa\'daki geleneksel kutlamaları. Bayram namazı sonrası mezarlık ziyaretleri, komşu ziyaretleri, çocuklara bayramlık verme ve şehir merkezindeki eğlence alanlarında bayram şenlikleri.',
   true, true],

  ['Halfeti Siyah Gül Sezonu Açılışı', 'Turizm',
   '2026-03-15', '2026-03-16', 'Halfeti Gül Bahçeleri', 'Halfeti Belediyesi',
   'Dünyada yalnızca Halfeti\'de yetişen ve sadece yılın belirli dönemlerinde siyah renk alan eşsiz güllerin açılış mevsimi. Gül bahçelerinde rehberli geziler, gül hasadı deneyimi ve Halfeti\'ye özgü gül ürünleri satışı.',
   true, false],

  ['Göbeklitepe Bahar Özel Turu — Mart', 'Turizm',
   '2026-03-07', '2026-03-07', 'Göbeklitepe Arkeoloji Alanı', 'Şanlıurfa Müze Müdürlüğü',
   'İlkbahar başında Göbeklitepe\'ye özel rehberli sabah turu. Bahar güneşinin dikilitaşlar arasından süzülmesi eşsiz bir görünüm yaratıyor. Sınırlı kontenjanla düzenlenen bu tura önceden kayıt yaptırılması zorunlu.',
   false, false],

  ['Urfa Bahar Müzik Festivali', 'Konser',
   '2026-03-06', '2026-03-08', 'Balıklıgöl Açık Hava Sahnesi', 'Şanlıurfa Büyükşehir Belediyesi',
   'Kış sezonunun kapanışını kutlayan bahar müzik festivali. Türk sanat müziği, halk müziği ve genç sanatçıların modern yorumları açık hava sahnesinde üç gün boyunca performans sunacak.',
   false, true],

  ['Harran Bahar Gezisi — Antik Kent Turu', 'Turizm',
   '2026-03-14', '2026-03-14', 'Harran Antik Kenti', 'Harran Belediyesi',
   'Tarihte bilinen en eski üniversite kentlerinden Harran\'da bahar özel rehberli turu. Kümbet evler, eski camiler ve antik kale kalıntıları bahar çiçekleriyle birlikte görülmeye değer bir manzara sunuyor.',
   false, false],

  ['Şanlıurfa Yöresel Ürünler Bahar Pazarı', 'Pazar',
   '2026-03-20', '2026-03-22', 'Karaköprü Millet Bahçesi', 'Şanlıurfa Ticaret ve Sanayi Odası',
   'Şanlıurfa ilçelerinden gelen üreticilerin bahar ürünlerini sergilediği pazar. Taze Halfeti balı, baharat karışımları, ilk mevsim zeytinyağı, baklavas ve Urfa biberi bazlı ürünler doğrudan üreticiden tüketiciye ulaşıyor.',
   false, true],

  ['Şanlıurfa Çocuk Bahar Şenliği', 'Çocuk & Aile',
   '2026-03-23', '2026-03-23', 'Atatürk Parkı & Botanik Bahçe', 'Şanlıurfa Büyükşehir Belediyesi',
   'Çocuklara yönelik bahar şenliği. Kukla tiyatrosu, renk koşusu, origami atölyesi, geleneksel oyun alanları ve çocuk konserleriyle dolu tek günlük kutlama. Belediye okul bahçelerinde de ek etkinlikler düzenleyecek.',
   false, true],

  ['Bahar Bisiklet Turu — Balıklıgöl Çevresi', 'Spor',
   '2026-03-28', '2026-03-28', 'Balıklıgöl Başlangıç Noktası', 'Şanlıurfa Bisiklet Derneği',
   'Balıklıgöl\'den başlayan ve şehrin tarihi mekânlarını kapsayan 20 km\'lik bahar bisiklet turu. Aile boyu katılıma uygun düz parkur; Dergah, Kapalı Çarşı ve park alanlarından geçen güzergah.',
   false, true],

  ['Sokak Sanatları Festivali — Mart', 'Sanat',
   '2026-03-27', '2026-03-29', 'Şanlıurfa Tarihi Çarşı & Sokakları', 'Şanlıurfa Kültür Derneği',
   'Tarihi kent dokusunu sahnesi olarak kullanan sokak sanatları festivali. Müzisyenler, cambazlar, ressam ve heykeltıraşlar Balıklıgöl çevresini yaratıcı performanslarla renklendiriyor.',
   false, true],

  ['Karacadağ Bahar Doğa Turu', 'Doğa',
   '2026-03-13', '2026-03-13', 'Karacadağ Etekleri', 'Şanlıurfa Dağcılık Derneği',
   'Bahar yağmurlarının ardından yeşeren Karacadağ eteklerinde doğa yürüyüşü. Endemik bitkiler ve bölgeye özgü yabani çiçekler bu mevsimde en görkemli halini alıyor.',
   false, true],

  // ──────── NİSAN 2026 ────────
  ['Halfeti Siyah Gül Festivali 2026', 'Festival',
   '2026-04-10', '2026-04-12', 'Halfeti İlçesi', 'Halfeti Belediyesi & Şanlıurfa Valiliği',
   'Halfeti\'nin dünyaca ünlü siyah güllerinin tam açılım dönemine denk gelen yıllık festival. Gül bahçesi gezileri, tekne turları, fotoğraf yarışması, el sanatları standları ve yöresel yemek şöleni. Şanlıurfa\'nın yılın en beklenen etkinliklerinden biri.',
   true, false],

  ['Göbeklitepe Bahar Arkeoloji Turu — Nisan', 'Arkeoloji',
   '2026-04-04', '2026-04-04', 'Göbeklitepe Arkeoloji Alanı', 'Şanlıurfa Müze Müdürlüğü',
   'İlkbaharın tam anlamıyla yerleştiği Nisan ayında Göbeklitepe özel arkeoloji turu. Kazı sezonu öncesinde yapılan hazırlıklar gözlemlenebilecek; uzman arkeolog rehberliğinde T şeklili dikilitaşlar ve semboller yakından incelenecek.',
   false, false],

  ['Şanlıurfa Bahar Koşusu 2026', 'Spor',
   '2026-04-05', '2026-04-05', 'Şanlıurfa Şehir Stadyumu Çevresi', 'Şanlıurfa Atletizm Federasyonu',
   'Şanlıurfa\'nın bahar koşusu. 5 km, 10 km ve yarı maraton mesafelerinde düzenlenen yarışmada yerel ve bölgesel koşucular bir araya geliyor. Şehrin tarihi mekânları arasından geçen parkur, yarışmayı benzersiz kılıyor.',
   false, false],

  ['Urfa Bahar Konserleri — Nisan', 'Konser',
   '2026-04-17', '2026-04-18', 'Balıklıgöl Açık Hava Sahnesi', 'Şanlıurfa Büyükşehir Belediyesi',
   'Bahar sezonunun açık hava konser serisi. Urfa müziğinin özgün sesleri; bağlama, saz, ud ve vokal solistlerin katılımıyla oluşan program akşam boyunca Balıklıgöl\'ün romantik atmosferinde sunulacak.',
   false, true],

  ['Harran Bahar Şenliği & Kümbet Evler Turu', 'Kültür',
   '2026-04-18', '2026-04-19', 'Harran Antik Kenti', 'Harran Belediyesi',
   'Harran\'ın petek şekilli kümbet evleri ve antik kale kalıntılarını bahar güzelliğiyle keşfetme şenliği. Kümbet evlerde geleneksel yaşamın canlandırılması, Harran mutfağından özel ikramlar ve rehberli antik kent turu.',
   false, false],

  ['Uluslararası Tarih ve Arkeoloji Toplantısı', 'Eğitim',
   '2026-04-23', '2026-04-24', 'Harran Üniversitesi', 'Harran Üniversitesi & Türk Arkeoloji Derneği',
   'Güneydoğu Anadolu arkeoloji araştırmalarını konu alan uluslararası akademik toplantı. Karahantepe, Gürcütepe ve Taş Tepeler projelerinden yeni bulgular ilk kez kamuoyuyla paylaşılacak. Akademisyen ve arkeoloji meraklılarına açık.',
   false, false],

  ['Urfa Çiçek ve Botanik Festivali', 'Doğa',
   '2026-04-25', '2026-04-26', 'Atatürk Parkı Botanik Bahçesi', 'Şanlıurfa Büyükşehir Belediyesi',
   'Şanlıurfa\'nın bahar çiçeklerini ve yöresel botanik zenginliğini kutlayan festival. Çiçek sergileri, doğa fotoğrafçılığı atölyeleri, botanik yürüyüşleri ve belediye bahçelerinde çiçek dikim şenlikleri programda yer alıyor.',
   false, true],

  ['Şanlıurfa Gastronomi Turu — Lezzet Günleri', 'Gastronomi',
   '2026-04-11', '2026-04-12', 'Tarihi Kapalı Çarşı & Restoran Alanları', 'Şanlıurfa Turizm Derneği',
   'Şanlıurfa\'nın efsanevi lezzetlerini yerinde keşfeden organize gastronomi turu. Ciğer ustası Aziz Usta\'da başlayan tur; kapalı çarşıda baharat alışverişi, kunefe ustasında ateş başında pişirme gösterisi ve sıra gecesiyle noktalanıyor.',
   false, false],

  ['Şanlıurfa Geleneksel El Sanatları Yarışması', 'Sanat',
   '2026-04-03', '2026-04-05', 'Kent Müzesi Sergi Alanı', 'Şanlıurfa Kültür Turizm İl Müdürlüğü',
   'Bakırcılık, taş işleme, gümüş kaplama, kilim dokuma ve seramik dallarında ustalar ve öğrencilerin katıldığı geleneksel el sanatları yarışması. Dereceye girenlerin eserleri yıl boyunca Kent Müzesi\'nde sergilenecek.',
   false, false],

  ['Şanlıurfa Uçurtma Festivali', 'Çocuk & Aile',
   '2026-04-19', '2026-04-19', 'Karaköprü Millet Bahçesi', 'Şanlıurfa Büyükşehir Belediyesi',
   'Baharın sembolü uçurtmayı bayrama dönüştüren aile festivali. Uçurtma yapım atölyesi, uçurtma yarışması, çocuk oyunları, masal anlatıcıları ve açık hava konser alanıyla bir araya gelen bahar şenliği.',
   false, true],

  ['Birecik Kelaynak Gözlem Günleri — Nisan', 'Doğa',
   '2026-04-01', '2026-04-30', 'Birecik Kelaynak Gözlem Kulesi', 'Şanlıurfa Çevre ve Şehircilik İl Müdürlüğü',
   'Birecik\'in dünyada yalnızca birkaç yerde görülen kelaynak kuşlarının gözlem dönemi. Nisan ayı boyunca sabah gruplarıyla yürütülen rehberli kuş gözlemi programı; bu nadir türü yakından izleme ve fotoğraflama fırsatı sunuyor.',
   false, true],
];

const LOCAL_TUNNEL_PORT = 15513;

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
          keepaliveInterval: 10000,
          keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log(`\n📅 2026 Q1-Q2 Etkinlik Takvimi — ${EVENTS.length} etkinlik ekleniyor...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_USER,
  });
  await client.connect();

  let ok = 0, skip = 0, fail = 0;

  for (const [title, category, startDate, endDate, location, organizer, description, isFeatured, isFree] of EVENTS) {
    const slug = slugify(title) + '-2026';
    const month = startDate.slice(0, 7);
    process.stdout.write(`  ${month} | ${title.slice(0, 45).padEnd(45)}... `);

    try {
      const result = await client.query(
        `INSERT INTO events
           (id, title, slug, description, start_date, end_date, location, organizer,
            category, status, is_featured, is_free, image_url, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10,$11,''::text,NOW(),NOW())
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [randomUUID(), title, slug, description, startDate, endDate,
         location, organizer, category, isFeatured, isFree]
      );
      if (result.rows.length > 0) {
        console.log('✓');
        ok++;
      } else {
        console.log('⊘ zaten var');
        skip++;
      }
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
  }

  // Ay dağılımı
  const { rows: dist } = await client.query(`
    SELECT TO_CHAR(start_date,'YYYY-MM') as month, COUNT(*) as cnt
    FROM events WHERE status='published' AND start_date < '2026-05-01'
    GROUP BY month ORDER BY month
  `);

  const { rows: [total] } = await client.query(
    `SELECT COUNT(*) as total FROM events WHERE status='published'`
  );

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} eklendi | ${skip} mevcut | ${fail} hata`);
  console.log(`\n📊 2026 Q1-Q2 dağılım:`);
  dist.forEach(r => console.log(`   ${r.month}: ${r.cnt}`));
  console.log(`   Toplam yayınlanan: ${total.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
