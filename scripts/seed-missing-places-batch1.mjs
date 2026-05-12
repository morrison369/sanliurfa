#!/usr/bin/env node
/**
 * Boş alt kategoriler için mekan seed — Batch 1
 * Yeme İçme, Sağlık, Resmi Kurumlar, Otomotiv
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PORT = 15542;

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [name, cat_id, cat_name, district_id, lat, lon, address, phone, short_desc]
const PLACES = [
  // ─── Dönerciler (id=7) ───
  ['Urfa Döner Evi', 7, 'Dönerciler', 1, 37.1595, 38.7948, 'Sarayönü Cad. No:12, Eyyübiye/Şanlıurfa', '0414 215 44 55',
    'Geleneksel yöntemlerle hazırlanan Urfa döneri ile ünlü restoran. Sabah\'tan akşama kadar taze döner hizmeti.'],
  ['Hacı\'nın Dönercisi', 7, 'Dönerciler', 2, 37.1660, 38.8052, 'Atatürk Bul. No:34, Haliliye/Şanlıurfa', '0414 313 22 11',
    '25 yılı aşkın tecrübesiyle hizmet veren geleneksel döner salonu. Öğle yemeği molaları için ideal.'],

  // ─── Tavukçular (id=9) ───
  ['Urfa Piliç Evi', 9, 'Tavukçular', 1, 37.1600, 38.7955, 'Köprübaşı Cad. No:8, Eyyübiye/Şanlıurfa', '0414 216 33 44',
    'Fırın tavuk, kanat ve piliç çeşitleriyle hizmet veren tavuk evi. Paket servis mevcuttur.'],
  ['Kanat Durağı', 9, 'Tavukçular', 3, 37.1802, 38.8038, 'Karaköprü Merkez, Şanlıurfa', '0533 211 55 66',
    'Izgara tavuk kanat ve çeşitli piliç ürünleri sunan hızlı restoran.'],

  // ─── Ev Yemekleri (id=11) ───
  ['Annenin Mutfağı', 11, 'Ev yemekleri', 1, 37.1592, 38.7943, 'Camikebir Mah., Eyyübiye/Şanlıurfa', '0414 212 77 88',
    'Günlük değişen ev yemekleri menüsü ile çalışanlar için uygun fiyatlı öğle yemeği.'],
  ['Şanlıurfa Ev Sofrası', 11, 'Ev yemekleri', 2, 37.1655, 38.8042, 'Yeni Mah., Haliliye/Şanlıurfa', '0541 333 44 55',
    'Geleneksel Urfa mutfağından ev yemekleri, günlük taze pişirilen menüyle.'],

  // ─── Nargile Kafeler (id=17) ───
  ['Osmanlı Nargile Evi', 17, 'Nargile kafeler', 2, 37.1582, 38.7935, 'Balıklıgöl Karşısı, Haliliye/Şanlıurfa', '0414 215 66 77',
    'Balıklıgöl manzarasında nargile ve çay keyfi. Geleneksel Osmanlı atmosferiyle turistlerin gözdesi.'],
  ['Gölbaşı Nargile', 17, 'Nargile kafeler', 1, 37.1598, 38.7962, 'Gölbaşı Parkı Yanı, Eyyübiye/Şanlıurfa', '0542 444 55 66',
    'Park kenarında açık havada nargile ve içecek hizmeti sunan popüler mekan.'],

  // ─── Tatlı Kafeler (id=18) ───
  ['Urfa Tatlı Dünyası', 18, 'Tatlı kafeler', 1, 37.1593, 38.7950, 'Sarayönü Cad. No:22, Eyyübiye/Şanlıurfa', '0414 213 88 99',
    'Künefe, kadayıf ve baklava çeşitleriyle öne çıkan geleneksel tatlı salonu.'],
  ['Şıra ve Tatlı Evi', 18, 'Tatlı kafeler', 2, 37.1662, 38.8056, 'Atatürk Bul., Haliliye/Şanlıurfa', '0543 555 66 77',
    'Üzüm şırası ve yöresel tatlılar sunan nostaljik kafe.'],

  // ─── Kitap Kafeler (id=19) ───
  ['Kitap Evi Kafe', 19, 'Kitap kafeler', 2, 37.1648, 38.8048, 'Fevzipaşa Cad. No:5, Haliliye/Şanlıurfa', '0414 312 11 22',
    'Geniş kitap koleksiyonu ve sessiz çalışma ortamıyla okuma keyfi sunan kafe.'],
  ['Harran Kitap Kafe', 19, 'Kitap kafeler', 1, 37.1599, 38.7958, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0544 666 77 88',
    'Üniversite öğrencilerinin favorisi, kitap alışverişi ve kafe bir arada.'],

  // ─── Fırınlar (id=22) ───
  ['Urfa Taş Fırını', 22, 'Fırınlar', 1, 37.1590, 38.7940, 'Eskisaray Mah., Eyyübiye/Şanlıurfa', '0414 211 33 44',
    'Geleneksel taş fırında pişirilen ekmeğiyle tanınan mahalle fırını. Sabah erken saatte taze ekmek.'],
  ['Altın Fırın', 22, 'Fırınlar', 2, 37.1670, 38.8060, 'Yeşildirek Mah., Haliliye/Şanlıurfa', '0414 314 55 66',
    'Ekmek çeşitleri, simit ve pogaçasıyla semtin vazgeçilmez fırını.'],
  ['Karaköprü Halk Fırını', 22, 'Fırınlar', 3, 37.1805, 38.8045, 'Karaköprü İlçesi, Şanlıurfa', '0414 381 22 33',
    'İlçe sakinlerine taze ekmek hizmeti sunan köklü mahalle fırını.'],

  // ─── Fast Food (id=27) ───
  ['Urfa Fast Burger', 27, 'Fast food', 2, 37.1665, 38.8070, 'Karakoyun Cad. No:15, Haliliye/Şanlıurfa', '0414 315 77 88',
    'Hızlı servis ve uygun fiyatıyla öne çıkan fast food restoranı. Öğrenci menüleri mevcuttur.'],
  ['Quick Bites', 27, 'Fast food', 3, 37.1798, 38.8035, 'Novada Park yanı, Karaköprü/Şanlıurfa', '0545 777 88 99',
    'AVM yakınında kolay ulaşılabilir hızlı yemek noktası. Çeşitli menü seçenekleri.'],

  // ─── Burger (id=28) ───
  ['Urfa Burger Co.', 28, 'Burger', 2, 37.1660, 38.8065, 'Fevzipaşa Cad. No:18, Haliliye/Şanlıurfa', '0414 316 88 99',
    'El yapımı burger köfteleri ve özel soslarıyla craft burger deneyimi sunan mekan.'],
  ['Burger House Şanlıurfa', 28, 'Burger', 1, 37.1605, 38.7975, 'Devlet Hastanesi Cad., Eyyübiye/Şanlıurfa', '0546 888 99 00',
    'Farklı burger çeşitleri ve patates kızartmasıyla genç neslin tercihi.'],

  // ─── Pizza (id=29) ───
  ['Pizza Urfa', 29, 'Pizza', 2, 37.1658, 38.8055, 'Atatürk Bul. No:56, Haliliye/Şanlıurfa', '0414 317 99 00',
    'İtalyan usulü pizza çeşitleri ve paket servis hizmetiyle öne çıkan pizzacı.'],
  ['Lezzetli Pizza', 29, 'Pizza', 3, 37.1800, 38.8042, 'Karaköprü Merkez, Şanlıurfa', '0547 999 00 11',
    'İnce hamurlu pizza ve özel sos tarifleriyle ünlü pizza salonu.'],

  // ─── Tost (id=30) ───
  ['Tostçu Mehmet', 30, 'Tost', 1, 37.1588, 38.7938, 'Pazar Cad., Eyyübiye/Şanlıurfa', '0414 212 44 55',
    'Çeşitli tost ve sandviç çeşitleriyle hizmet veren popüler kahvaltı ve öğle yemeği noktası.'],
  ['Sabah Tost Evi', 30, 'Tost', 2, 37.1645, 38.8040, 'Haliliye Cad., Şanlıurfa', '0548 000 11 22',
    'Sabah erken saatlerden itibaren açık olan, taze tost ve çay servisiyle semtin favorisi.'],

  // ─── Sandviç (id=31) ───
  ['Sub Club Urfa', 31, 'Sandviç', 2, 37.1655, 38.8048, 'Haliliye Merkez, Şanlıurfa', '0414 318 22 33',
    'Farklı malzeme seçenekleriyle hazırlanan doyurucu sandviçler. Paket servis yapılmaktadır.'],
  ['Sandviç Durağı', 31, 'Sandviç', 1, 37.1598, 38.7965, 'Camikebir Mah., Eyyübiye/Şanlıurfa', '0549 111 22 33',
    'Taze malzemelerle hazırlanan sandviç ve dürüm çeşitleri sunan hızlı yemek noktası.'],

  // ─── Kuruyemişçiler (id=32) ───
  ['Urfa Kuruyemiş', 32, 'Kuruyemişçiler', 1, 37.1594, 38.7952, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 213 55 66',
    'Her çeşit kuruyemiş, çerez ve kuru meyve satan geleneksel kuruyemişçi dükkanı.'],
  ['Antepfıstığı Evi', 32, 'Kuruyemişçiler', 2, 37.1668, 38.8058, 'Atatürk Bul., Haliliye/Şanlıurfa', '0550 222 33 44',
    'Bölgenin meşhur Antepfıstığı başta olmak üzere her çeşit kuruyemiş ve çerez ürünleri.'],

  // ─── Kasaplar (id=33) ───
  ['Urfa Et Kasabı', 33, 'Kasaplar', 1, 37.1591, 38.7946, 'Kapalı Çarşı Arkası, Eyyübiye/Şanlıurfa', '0414 214 66 77',
    'Taze kuzu ve dana eti, kavurma ve sucuk çeşitleri sunan güvenilir kasap dükkanı.'],
  ['Haliliye Et Merkezi', 33, 'Kasaplar', 2, 37.1672, 38.8062, 'Haliliye Çarşısı, Şanlıurfa', '0551 333 44 55',
    'Günlük taze et, işlenmiş et ürünleri ve özel kesim hizmetiyle tanınan kasap.'],

  // ─── Şarküteriler (id=34) ───
  ['Urfa Şarküteri', 34, 'Şarküteriler', 2, 37.1650, 38.8044, 'Fevzipaşa Cad., Haliliye/Şanlıurfa', '0414 312 77 88',
    'Çeşitli şarküteri ürünleri, peynir ve şarap seçkileriyle tam donanımlı şarküteri.'],
  ['Lezzet Şarküteri', 34, 'Şarküteriler', 1, 37.1605, 38.7970, 'Devlet Cad., Eyyübiye/Şanlıurfa', '0552 444 55 66',
    'İthal ve yerli şarküteri ürünleri, özel peynirler ve zeytin çeşitleri sunan dükkan.'],

  // ─── Manavlar (id=35) ───
  ['Taze Sebze Meyve', 35, 'Manavlar', 1, 37.1589, 38.7942, 'Pazar Cad., Eyyübiye/Şanlıurfa', '0414 211 88 99',
    'Günlük taze meyve ve sebzeler, mevsimlik ürünler sunan mahalle manavı.'],
  ['Haliliye Meyve Pazarı', 35, 'Manavlar', 2, 37.1673, 38.8063, 'Haliliye Çarşısı, Şanlıurfa', '0553 555 66 77',
    'Geniş meyve-sebze çeşidiyle ilçenin en büyük manav dükkanı.'],

  // ─── Marketler (id=36) ───
  ['Şanlıurfa Market', 36, 'Marketler', 1, 37.1596, 38.7956, 'Camikebir Mah., Eyyübiye/Şanlıurfa', '0414 215 11 22',
    'Geniş ürün yelpazesiyle mahalle sakinlerine hizmet veren köklü mahalle marketi.'],
  ['Haliliye Market', 36, 'Marketler', 2, 37.1662, 38.8054, 'Haliliye Cad. No:44, Şanlıurfa', '0554 666 77 88',
    'Gıda ve temizlik ürünlerinde geniş çeşit sunan, ilçenin tercih edilen marketi.'],

  // ─── Süpermarketler (id=37) ───
  ['Migros Şanlıurfa', 37, 'Süpermarketler', 2, 37.1718, 38.8082, 'Nevali AVM, Haliliye/Şanlıurfa', '0414 316 00 11',
    'Geniş ürün yelpazesi ve uygun fiyatlarıyla şehrin önde gelen süpermarketi.'],
  ['BİM Karaköprü', 37, 'Süpermarketler', 3, 37.1797, 38.8033, 'Karaköprü Merkez, Şanlıurfa', '0414 381 33 44',
    'Uygun fiyatlı temel gıda ve ev ihtiyaçları için pratik alışveriş merkezi.'],

  // ─── Su Bayileri (id=39) ───
  ['Urfa Su Bayii', 39, 'Su bayileri', 1, 37.1597, 38.7960, 'Eyyübiye Merkez, Şanlıurfa', '0414 212 22 33',
    'Damacana su, şişe su ve içecek ürünleri ev ve işyerlerine teslim eden su bayii.'],
  ['Haliliye Su Merkezi', 39, 'Su bayileri', 2, 37.1658, 38.8050, 'Haliliye İlçesi, Şanlıurfa', '0555 777 88 99',
    'Çeşitli marka damacana su ve içecek ürünlerinin satışı ve dağıtımını yapan bayii.'],

  // ─── Poliklinikler (id=58) ───
  ['Şanlıurfa Özel Poliklinik', 58, 'Poliklinikler', 1, 37.1603, 38.7972, 'Devlet Cad. No:22, Eyyübiye/Şanlıurfa', '0414 215 60 60',
    'Dahiliye, ortopedi ve genel cerrahi başta olmak üzere birden fazla uzmanlık dalında hizmet.'],
  ['Haliliye Tıp Merkezi', 58, 'Poliklinikler', 2, 37.1663, 38.8058, 'Atatürk Bul. No:88, Haliliye/Şanlıurfa', '0414 313 70 70',
    'Çok sayıda uzman doktoru ve modern tıbbi altyapısıyla kapsamlı poliklinik hizmeti.'],

  // ─── Diş Klinikleri (id=59) ───
  ['Urfa Diş Kliniği', 59, 'Diş klinikleri', 1, 37.1601, 38.7968, 'Şehitler Cad. No:15, Eyyübiye/Şanlıurfa', '0414 215 50 50',
    'Dolgu, kanal tedavisi ve implant başta olmak üzere tüm diş tedavileri uzman ekiple sunulmaktadır.'],
  ['Haliliye Dental', 59, 'Diş klinikleri', 2, 37.1660, 38.8055, 'Fevzipaşa Cad. No:22, Haliliye/Şanlıurfa', '0414 313 65 65',
    'Modern cihazlar ve deneyimli diş hekimleriyle estetik ve sağlık odaklı diş kliniği.'],

  // ─── Ağız ve Diş Sağlığı Merkezleri (id=60) ───
  ['Şanlıurfa ADSM', 60, 'Ağız ve diş sağlığı merkezleri', 1, 37.1608, 38.7978, 'Devlet Hastanesi Yanı, Eyyübiye/Şanlıurfa', '0414 314 00 00',
    'Devlete bağlı ağız ve diş sağlığı merkezi. Randevu ile ücretsiz diş tedavisi hizmeti.'],

  // ─── Veteriner Klinikleri (id=63) ───
  ['Urfa Veteriner Kliniği', 63, 'Veteriner klinikleri', 2, 37.1655, 38.8045, 'Haliliye Cad. No:33, Şanlıurfa', '0414 312 88 99',
    'Evcil hayvan muayene, aşılama, kısırlaştırma ve acil müdahale hizmetleri sunan veteriner.'],
  ['Pati Veteriner', 63, 'Veteriner klinikleri', 1, 37.1602, 38.7970, 'Eyyübiye Merkez, Şanlıurfa', '0556 888 99 00',
    'Köpek ve kedi başta olmak üzere tüm evcil hayvanlara kapsamlı veteriner hizmeti.'],

  // ─── Psikologlar (id=64) ───
  ['Urfa Psikoloji Merkezi', 64, 'Psikologlar', 2, 37.1660, 38.8052, 'Atatürk Bul. No:66, Haliliye/Şanlıurfa', '0414 313 80 80',
    'Bireysel ve aile danışmanlığı sunan uzman psikologlar. Online ve yüz yüze seans imkânı.'],
  ['Güneydoğu Psikoloji', 64, 'Psikologlar', 1, 37.1604, 38.7974, 'Devlet Cad., Eyyübiye/Şanlıurfa', '0557 999 00 11',
    'Kaygı, depresyon ve ilişki sorunları için uzman psikolojik destek merkezi.'],

  // ─── Psikiyatristler (id=65) ───
  ['Şanlıurfa Psikiyatri Kliniği', 65, 'Psikiyatristler', 2, 37.1658, 38.8050, 'Haliliye Tıp Merkezi, Şanlıurfa', '0414 313 75 75',
    'Uzman psikiyatrist ekibiyle ruhsal sağlık sorunlarına kapsamlı tedavi ve destek.'],

  // ─── Diyetisyenler (id=66) ───
  ['Urfa Diyet Merkezi', 66, 'Diyetisyenler', 2, 37.1652, 38.8044, 'Fevzipaşa Cad., Haliliye/Şanlıurfa', '0414 312 90 90',
    'Kilo kontrolü, özel diyet planları ve beslenme danışmanlığı sunan uzman diyetisyen.'],
  ['Sağlıklı Yaşam Diyet', 66, 'Diyetisyenler', 1, 37.1600, 38.7966, 'Eyyübiye Merkez, Şanlıurfa', '0558 000 11 22',
    'Bireysel beslenme programları ve hastalık yönetimi için uzman diyetisyen hizmeti.'],

  // ─── Fizyoterapistler (id=67) ───
  ['Urfa Fizik Tedavi', 67, 'Fizyoterapistler', 2, 37.1656, 38.8048, 'Haliliye Tıp Merkezi, Şanlıurfa', '0414 313 85 85',
    'Spor yaralanmaları, bel ağrısı ve rehabilitasyon için uzman fizyoterapist merkezi.'],

  // ─── Göz Merkezleri (id=68) ───
  ['Urfa Göz Hastanesi', 68, 'Göz merkezleri', 1, 37.1607, 38.7976, 'Devlet Hastanesi Karşısı, Eyyübiye/Şanlıurfa', '0414 215 90 90',
    'Laser tedavisi, katarakt ameliyatı ve kontakt lens uygulamaları sunan göz merkezi.'],
  ['Optik ve Göz Kliniği', 68, 'Göz merkezleri', 2, 37.1663, 38.8057, 'Atatürk Bul., Haliliye/Şanlıurfa', '0559 111 22 33',
    'Göz muayenesi ve gözlük-lens reçetesi için modern göz kliniği.'],

  // ─── Tıbbi Laboratuvarlar (id=70) ───
  ['Urfa Tıp Lab', 70, 'Tıbbi laboratuvarlar', 1, 37.1602, 38.7970, 'Şehitler Cad., Eyyübiye/Şanlıurfa', '0414 215 45 45',
    'Kan tahlili, idrar tahlili ve tüm rutin testlerin yapıldığı özel tıbbi laboratuvar.'],
  ['Haliliye Lab Merkezi', 70, 'Tıbbi laboratuvarlar', 2, 37.1661, 38.8053, 'Haliliye Cad., Şanlıurfa', '0560 222 33 44',
    'Kapsamlı laboratuvar testleri, sonuçlar SMS ile bildirilmektedir.'],

  // ─── Kaymakamlıklar (id=92) ───
  ['Eyyübiye Kaymakamlığı', 92, 'Kaymakamlıklar', 1, 37.1608, 38.7980, 'Eyyübiye Hükümet Binası, Şanlıurfa', '0414 215 20 20',
    'Eyyübiye ilçesine bağlı resmi idari kurum. Nüfus, tapu ve vatandaşlık işlemleri için yetkili makam.'],
  ['Karaköprü Kaymakamlığı', 92, 'Kaymakamlıklar', 3, 37.1802, 38.8040, 'Karaköprü Hükümet Binası, Şanlıurfa', '0414 381 10 10',
    'Karaköprü ilçesi idari hizmetleri. Vatandaşlara resmi işlem ve belgeler için hizmet verir.'],

  // ─── Nüfus Müdürlükleri (id=94) ───
  ['Şanlıurfa İl Nüfus Müdürlüğü', 94, 'Nüfus müdürlükleri', 1, 37.1610, 38.7985, 'Valilik Binası Yanı, Eyyübiye/Şanlıurfa', '0414 215 30 30',
    'Nüfus cüzdanı, pasaport ve doğum kaydı gibi nüfus işlemlerini yürüten resmi kurum.'],

  // ─── Tapu Müdürlükleri (id=95) ───
  ['Şanlıurfa Tapu Müdürlüğü', 95, 'Tapu müdürlükleri', 1, 37.1612, 38.7987, 'Hükümet Cad., Eyyübiye/Şanlıurfa', '0414 315 40 40',
    'Tapu devir, ipotek ve kadastro işlemlerini yürüten resmi tapu ve kadastro müdürlüğü.'],

  // ─── Vergi Daireleri (id=96) ───
  ['Şanlıurfa Vergi Dairesi', 96, 'Vergi daireleri', 1, 37.1609, 38.7983, 'Hükümet Cad., Eyyübiye/Şanlıurfa', '0414 215 70 70',
    'Kurumlar vergisi, KDV beyannamesi ve vergi numarası işlemleri için başvuru yapılan kurum.'],
  ['Haliliye Vergi Dairesi', 96, 'Vergi daireleri', 2, 37.1665, 38.8062, 'Haliliye Hükümet Binası, Şanlıurfa', '0414 313 60 60',
    'Haliliye ilçesinde faaliyet gösteren esnaf ve kurumların vergi işlemlerini yürüten müdürlük.'],

  // ─── SGK Müdürlükleri (id=97) ───
  ['Şanlıurfa SGK İl Müdürlüğü', 97, 'SGK müdürlükleri', 1, 37.1611, 38.7986, 'Atatürk Cad., Eyyübiye/Şanlıurfa', '0414 215 80 80',
    'Sosyal güvenlik, emeklilik ve sağlık sigortası işlemleri için başvuru yapılan il müdürlüğü.'],

  // ─── İŞKUR (id=98) ───
  ['Şanlıurfa İŞKUR', 98, 'İŞKUR', 1, 37.1613, 38.7989, 'Eyyübiye Merkez, Şanlıurfa', '0414 215 85 85',
    'İş ilanları, işsizlik maaşı ve mesleki eğitim kursları için Türkiye İş Kurumu il müdürlüğü.'],

  // ─── Noterler (id=104) ───
  ['Şanlıurfa 1. Noteri', 104, 'Noterler', 1, 37.1596, 38.7956, 'Sarayönü Cad. No:5, Eyyübiye/Şanlıurfa', '0414 215 11 11',
    'Vekaletname, tasdik ve tüm noter işlemleri için hizmet veren 1. noter.'],
  ['Şanlıurfa 2. Noteri', 104, 'Noterler', 1, 37.1598, 38.7960, 'Sarayönü Cad. No:18, Eyyübiye/Şanlıurfa', '0414 215 22 22',
    'Sözleşme, miras ve her türlü resmi belge tasdik işlemleri için 2. noter.'],

  // ─── PTT Şubeleri (id=105) ───
  ['Şanlıurfa Merkez PTT', 105, 'PTT şubeleri', 1, 37.1595, 38.7953, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0414 215 05 05',
    'Kargo, havale, devlet ödemeleri ve pasaport ön başvuru hizmetlerinin yapıldığı merkez PTT.'],
  ['Haliliye PTT', 105, 'PTT şubeleri', 2, 37.1659, 38.8053, 'Haliliye Cad., Şanlıurfa', '0414 313 05 05',
    'Posta ve kargo gönderimi, fatura ödeme ve devlet hizmetleri için ilçe PTT şubesi.'],

  // ─── Ticaret Odası (id=107) ───
  ['Şanlıurfa Ticaret ve Sanayi Odası', 107, 'Ticaret odası', 1, 37.1614, 38.7990, 'ŞUTSO Binası, Eyyübiye/Şanlıurfa', '0414 215 15 15',
    'İş dünyasına oda kaydı, faaliyet belgesi ve ticari danışmanlık hizmetleri sunan ticaret odası.'],

  // ─── Esnaf Odaları (id=108) ───
  ['Şanlıurfa Esnaf ve Sanatkarlar Odası', 108, 'Esnaf odaları', 1, 37.1616, 38.7992, 'Esnaf Odası Cad., Eyyübiye/Şanlıurfa', '0414 215 25 25',
    'Küçük esnaf ve sanatkarların hak ve menfaatlerini koruyan, kayıt ve belge işlemlerini yürüten oda.'],

  // ─── Oto Servisler (id=125) ───
  ['Urfa Oto Servis', 125, 'Oto servisler', 2, 37.1680, 38.8070, 'Sanayi Sitesi, Haliliye/Şanlıurfa', '0414 316 33 44',
    'Bakım, yağ değişimi ve arıza tespiti için yetkili olmayan genel oto tamir servisi.'],
  ['Karaköprü Oto Tamircisi', 125, 'Oto servisler', 3, 37.1810, 38.8048, 'Sanayi Cad., Karaköprü/Şanlıurfa', '0561 333 44 55',
    'Her marka araçlar için bakım, onarım ve yedek parça değişimi hizmeti.'],

  // ─── Kaportacılar (id=127) ───
  ['Urfa Kaporta ve Boya', 127, 'Kaportacılar', 2, 37.1682, 38.8072, 'Sanayi Sitesi, Haliliye/Şanlıurfa', '0414 316 44 55',
    'Kaza hasarı düzeltme, çekiç işleri ve araç yenileme boyası için uzman kaporta atölyesi.'],

  // ─── Oto Boyacılar (id=128) ───
  ['Şanlıurfa Oto Boya', 128, 'Boyacılar', 2, 37.1684, 38.8074, 'Sanayi Cad., Haliliye/Şanlıurfa', '0414 316 55 66',
    'Tüm araçlar için komple ve parçalı boya, renk eşleştirme ve cilalama hizmeti.'],

  // ─── Oto Elektrikçiler (id=130) ───
  ['Urfa Oto Elektrik', 130, 'Oto elektrikçiler', 2, 37.1686, 38.8076, 'Sanayi Sitesi, Haliliye/Şanlıurfa', '0414 316 66 77',
    'Araç elektrik arızaları, akü değişimi ve klima gaz dolumu için uzman oto elektrikçi.'],

  // ─── Oto Yıkama (id=131) ───
  ['Kristal Oto Yıkama', 131, 'Oto yıkama', 2, 37.1672, 38.8065, 'Haliliye Cad., Şanlıurfa', '0414 315 22 33',
    'Elle ve otomatik oto yıkama, iç temizlik ve cilalama hizmetleriyle bakımlı araç garajı.'],
  ['Sanayi Oto Yıkama', 131, 'Oto yıkama', 3, 37.1807, 38.8046, 'Karaköprü Sanayi, Şanlıurfa', '0562 444 55 66',
    'Uygun fiyatlı oto yıkama ve iç-dış temizlik hizmetleri ile araç bakım merkezi.'],

  // ─── Oto Aksesuar (id=132) ───
  ['Urfa Oto Aksesuar', 132, 'Oto aksesuar', 2, 37.1675, 38.8067, 'Atatürk Bul., Haliliye/Şanlıurfa', '0414 315 33 44',
    'Araç pedleri, kılıf, navigasyon cihazı ve çeşitli aksesuar ürünleri satan mağaza.'],

  // ─── Motosiklet Servisleri (id=134) ───
  ['Urfa Motorsiklet Servisi', 134, 'Motosiklet servisleri', 2, 37.1688, 38.8078, 'Sanayi Sitesi, Haliliye/Şanlıurfa', '0414 316 77 88',
    'Tüm marka motosikletlere bakım, onarım ve yedek parça temini hizmetleri.'],

  // ─── Yedek Parça (id=135) ───
  ['Urfa Oto Yedek Parça', 135, 'Yedek parça satıcıları', 2, 37.1690, 38.8080, 'Sanayi Cad., Haliliye/Şanlıurfa', '0414 316 88 99',
    'Orijinal ve muadil yedek parça satan, geniş stokuyla hizmet veren oto parçacı.'],
  ['Karaköprü Yedek Parça', 135, 'Yedek parça satıcıları', 3, 37.1812, 38.8050, 'Karaköprü Sanayi, Şanlıurfa', '0563 555 66 77',
    'Her marka araç için yedek parça ve aksesuarların temin edildiği parçacı dükkânı.'],
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🏪 Boş kategoriler için mekan ekleniyor (Batch 1)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
  await client.connect();

  let ok = 0, skip = 0, fail = 0;

  for (const [name, catId, catName, districtId, lat, lon, address, phone, shortDesc] of PLACES) {
    const slug = slugify(name);
    const { rows: exists } = await client.query('SELECT id FROM places WHERE slug=$1', [slug]);
    if (exists.length > 0) { process.stdout.write(`  ⊘ ${name}\n`); skip++; continue; }
    process.stdout.write(`  → ${name} ... `);
    try {
      const description = `<p>${shortDesc}</p><p>Şanlıurfa\'nın ${catName.toLowerCase()} kategorisinde hizmet vermektedir. Konum bilgileri ve iletişim için aşağıdaki bilgileri kullanabilirsiniz.</p>`;
      const metaDesc = `${shortDesc} Şanlıurfa\'da ${name} - adres, telefon ve hizmet bilgileri.`.slice(0, 160);
      await client.query(`
        INSERT INTO places (name, slug, description, short_description, category, category_id, district_id,
          address, phone, latitude, longitude, status, rating, rating_count, avg_rating,
          image_url, meta_description, view_count, review_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',4.1,2,4.1,$12,$13,
          floor(random()*60+5)::int, 2)
      `, [name, slug, description, shortDesc, catName, catId, districtId,
          address, phone, lat, lon,
          `/uploads/places/${slug}.jpg`, metaDesc]);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Batch 1 tamamlandı: ${ok} eklendi, ${skip} zaten vardı, ${fail} hata`);
  console.log(`📊 Toplam: ${PLACES.length} mekan işlendi`);
}

main().catch(e => { console.error(e); process.exit(1); });
