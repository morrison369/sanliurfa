#!/usr/bin/env node
/**
 * Boş alt kategoriler için mekan seed — Batch 2
 * Alışveriş, Hizmetler, Eğitim, Turizm, Ev ve Yaşam, Emlak, Konaklama
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

const PORT = 15544;

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [name, cat_id, cat_name, district_id, lat, lon, address, phone, short_desc]
const PLACES = [
  // ─── Giyim Mağazaları (id=141) ───
  ['Urfa Giyim', 141, 'Giyim mağazaları', 1, 37.1592, 38.7948, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 213 11 22',
    'Kadın, erkek ve çocuk giyim ürünleri sunan genel giyim mağazası.'],
  ['Moda Merkezi Şanlıurfa', 141, 'Giyim mağazaları', 2, 37.1660, 38.8054, 'Atatürk Bul. No:45, Haliliye/Şanlıurfa', '0414 313 22 33',
    'Her yaş grubuna uygun sezonluk koleksiyonlar ve uygun fiyatlı giyim seçenekleri.'],

  // ─── Kadın Giyim (id=142) ───
  ['Hanım Butik', 142, 'Kadın giyim', 2, 37.1655, 38.8048, 'Fevzipaşa Cad. No:12, Haliliye/Şanlıurfa', '0414 312 33 44',
    'Şık ve modern kadın giyim koleksiyonları, günlük ve özel gün kıyafetleri.'],
  ['Urfa Kadın Moda', 142, 'Kadın giyim', 1, 37.1594, 38.7952, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0564 111 22 33',
    'Tesettür ve modern kadın giyim seçenekleriyle geniş koleksiyon sunan kadın mağazası.'],

  // ─── Erkek Giyim (id=143) ───
  ['Gentleman\'s Urfa', 143, 'Erkek giyim', 2, 37.1658, 38.8052, 'Atatürk Bul. No:55, Haliliye/Şanlıurfa', '0414 313 44 55',
    'Klasik ve spor erkek giyim, takım elbise ve günlük koleksiyon sunan erkek mağazası.'],
  ['Urfa Erkek Giyim', 143, 'Erkek giyim', 1, 37.1597, 38.7958, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0565 222 33 44',
    'Uygun fiyatlı erkek giyim ürünleri, her sezon yeni koleksiyonlarla.'],

  // ─── Çocuk Giyim (id=144) ───
  ['Minik Moda', 144, 'Çocuk giyim', 2, 37.1662, 38.8056, 'Haliliye Çarşısı, Şanlıurfa', '0414 313 55 66',
    'Bebek ve çocuk giyim ürünleri, okul kıyafetleri ve mevsimlik koleksiyonlar.'],
  ['Bebek ve Çocuk Dünyası', 144, 'Çocuk giyim', 3, 37.1800, 38.8040, 'Karaköprü Merkez, Şanlıurfa', '0566 333 44 55',
    'Doğumdan okul çağına kadar her yaş grubu için kaliteli çocuk giyim.'],

  // ─── Ayakkabıcılar (id=145) ───
  ['Urfa Ayakkabı', 145, 'Ayakkabıcılar', 1, 37.1590, 38.7944, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 212 66 77',
    'Her yaş için klasik, spor ve günlük ayakkabı çeşitleri sunan geleneksel ayakkabıcı.'],
  ['Step Ayakkabı', 145, 'Ayakkabıcılar', 2, 37.1665, 38.8060, 'Haliliye Merkez, Şanlıurfa', '0567 444 55 66',
    'Ünlü marka ayakkabı ve çanta koleksiyonları, geniş beden seçenekleri.'],

  // ─── Çantacılar (id=146) ───
  ['Urfa Çanta Evi', 146, 'Çantacılar', 1, 37.1593, 38.7950, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 213 77 88',
    'Deri ve kumaş çanta çeşitleri, el yapımı Urfa işlemeli ürünler ve aksesuar.'],
  ['Moda Çanta', 146, 'Çantacılar', 2, 37.1668, 38.8062, 'Atatürk Bul., Haliliye/Şanlıurfa', '0568 555 66 77',
    'Günlük, iş ve özel gün çantaları ile cüzdan ve aksesuar çeşitleri.'],

  // ─── Saatçiler (id=148) ───
  ['Urfa Saat Evi', 148, 'Saatçiler', 1, 37.1591, 38.7946, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 213 88 99',
    'Ünlü marka saat satışı, onarım ve pil değişimi için güvenilir saatçi.'],
  ['Zaman Saat', 148, 'Saatçiler', 2, 37.1670, 38.8064, 'Haliliye Çarşısı, Şanlıurfa', '0569 666 77 88',
    'Duvar saati, kol saati ve akıllı saat modelleri ile onarım servisi.'],

  // ─── Bilgisayarcılar (id=150) ───
  ['Urfa Bilgisayar', 150, 'Bilgisayarcılar', 2, 37.1656, 38.8048, 'Fevzipaşa Cad. No:30, Haliliye/Şanlıurfa', '0414 312 99 00',
    'Masaüstü, dizüstü bilgisayar satışı, yazılım kurulumu ve teknik servis hizmeti.'],
  ['Tekno Bilişim', 150, 'Bilgisayarcılar', 1, 37.1600, 38.7966, 'Devlet Cad., Eyyübiye/Şanlıurfa', '0570 777 88 99',
    'Bilgisayar donanımı, sarf malzemeleri ve yazıcı kartuşu satışı ile teknik destek.'],

  // ─── Elektronik Mağazaları (id=151) ───
  ['Urfa Elektronik', 151, 'Elektronik mağazaları', 2, 37.1660, 38.8054, 'Haliliye Merkez, Şanlıurfa', '0414 313 00 11',
    'Telefon, tablet, kulaklık ve her türlü elektronik ürün satışı ve teknik servis.'],
  ['Dijital Dünya', 151, 'Elektronik mağazaları', 1, 37.1603, 38.7970, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0571 888 99 00',
    'Güncel elektronik cihazlar, aksesuarlar ve garanti kapsamında satış sonrası hizmet.'],

  // ─── Beyaz Eşya Mağazaları (id=152) ───
  ['Urfa Beyaz Eşya', 152, 'Beyaz eşya mağazaları', 2, 37.1665, 38.8060, 'Atatürk Bul. No:78, Haliliye/Şanlıurfa', '0414 313 11 22',
    'Buzdolabı, çamaşır makinesi, fırın ve tüm beyaz eşya ürünleri, taksit imkânıyla.'],
  ['Beko Bayii Şanlıurfa', 152, 'Beyaz eşya mağazaları', 1, 37.1606, 38.7974, 'Eyyübiye Merkez, Şanlıurfa', '0572 999 00 11',
    'Yetkili bayi kalitesiyle ev aletleri ve büyük beyaz eşya satış ve servisi.'],

  // ─── Mobilyacılar (id=153) ───
  ['Urfa Mobilya', 153, 'Mobilyacılar', 3, 37.1795, 38.8030, 'Mobilyacılar Sitesi, Karaköprü/Şanlıurfa', '0414 381 44 55',
    'Salon, yatak odası ve mutfak mobilyaları, özel ölçü ve tasarım imkânıyla.'],
  ['Modern Ev Mobilya', 153, 'Mobilyacılar', 2, 37.1670, 38.8065, 'Haliliye Mobilya Çarşısı, Şanlıurfa', '0573 000 11 22',
    'Şık ve fonksiyonel ev mobilyaları, ergo tasarım ürünler ve döşeme hizmeti.'],

  // ─── Ev Dekorasyon (id=154) ───
  ['Urfa Dekorasyon', 154, 'Ev dekorasyon', 2, 37.1668, 38.8062, 'Haliliye Cad., Şanlıurfa', '0414 314 22 33',
    'Aydınlatma, tablolar, perde ve ev aksesuar ürünleri ile iç mekan dekorasyon hizmetleri.'],
  ['Şık Ev', 154, 'Ev dekorasyon', 3, 37.1800, 38.8043, 'Karaköprü Merkez, Şanlıurfa', '0574 111 22 33',
    'Ev yaşam ürünleri, dekoratif objeler ve modern iç tasarım çözümleri.'],

  // ─── Züccaciyeler (id=155) ───
  ['Urfa Züccaciye', 155, 'Züccaciyeler', 1, 37.1588, 38.7940, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 211 44 55',
    'Cam, porselen ve metal mutfak eşyaları, sofra takımları ve ev gereçleri.'],
  ['Mutfak Dünyası', 155, 'Züccaciyeler', 2, 37.1672, 38.8066, 'Haliliye Çarşısı, Şanlıurfa', '0575 222 33 44',
    'Yemek pişirme gereçleri, sofra takımı ve mutfak ekipmanları mağazası.'],

  // ─── Yapı Marketler (id=156) ───
  ['Urfa Yapı Market', 156, 'Yapı marketler', 3, 37.1793, 38.8027, 'Karaköprü Sanayi Yanı, Şanlıurfa', '0414 381 55 66',
    'İnşaat malzemeleri, boya, bağlantı elemanları ve yapı ürünleri için yapı market.'],
  ['Haliliye Yapı', 156, 'Yapı marketler', 2, 37.1675, 38.8068, 'Haliliye Sanayi Cad., Şanlıurfa', '0576 333 44 55',
    'Tadilat ve inşaat projeleri için her türlü yapı malzemesi ve teknik danışmanlık.'],

  // ─── Perdeciler (id=157) ───
  ['Urfa Perde Evi', 157, 'Perdeciler', 2, 37.1658, 38.8050, 'Haliliye Cad. No:22, Şanlıurfa', '0414 314 33 44',
    'Stor, tül, fon perde ve özel ölçü dikim hizmeti sunan perde mağazası.'],

  // ─── Oyuncakçılar (id=159) ───
  ['Çocuk Oyuncak Evi', 159, 'Oyuncakçılar', 2, 37.1663, 38.8057, 'Haliliye Çarşısı, Şanlıurfa', '0414 313 44 55',
    'Her yaş grubu için eğitici ve eğlenceli oyuncaklar, puzzle ve aksiyon figürleri.'],
  ['Minik Oyuncak', 159, 'Oyuncakçılar', 3, 37.1799, 38.8038, 'Karaköprü Merkez, Şanlıurfa', '0577 444 55 66',
    'Bebek, çocuk ve koleksiyonerler için geniş oyuncak koleksiyonu.'],

  // ─── Kırtasiyeler (id=160) ───
  ['Urfa Kırtasiye', 160, 'Kırtasiyeler', 1, 37.1596, 38.7955, 'Camikebir Mah., Eyyübiye/Şanlıurfa', '0414 215 66 77',
    'Okul ve ofis kırtasiye ürünleri, fotokopi ve baskı hizmetleri sunan kırtasiye.'],
  ['Yıldız Kırtasiye', 160, 'Kırtasiyeler', 2, 37.1666, 38.8060, 'Haliliye İlköğretim yanı, Şanlıurfa', '0578 555 66 77',
    'Öğrenci ihtiyaçları için geniş çeşitli kırtasiye, kitap ve sanat malzemeleri.'],

  // ─── Kuaförler (id=182) ───
  ['Urfa Kadın Kuaförü', 182, 'Kuaförler', 2, 37.1653, 38.8045, 'Haliliye Cad. No:14, Şanlıurfa', '0414 314 44 55',
    'Saç kesimi, boyama, fön ve keratin bakım uygulamaları sunan kadın kuaförü.'],
  ['Güzellik Saç Stüdyo', 182, 'Kuaförler', 1, 37.1601, 38.7968, 'Eyyübiye Merkez, Şanlıurfa', '0579 666 77 88',
    'Uzman stilistlerle profesyonel saç bakımı, manikür ve kalıcı oje hizmetleri.'],

  // ─── Erkek Kuaförleri (id=183) ───
  ['Bay Berber Urfa', 183, 'Erkek kuaförleri', 2, 37.1655, 38.8047, 'Haliliye Çarşısı, Şanlıurfa', '0414 314 55 66',
    'Saç kesimi, sakal şekillendirme ve yüz bakımı için modern erkek kuaförü.'],
  ['Gentleman Berber', 183, 'Erkek kuaförleri', 1, 37.1603, 38.7971, 'Devlet Cad., Eyyübiye/Şanlıurfa', '0580 777 88 99',
    'Geleneksel ve modern saç modelleri, sıcak havlu tıraş ve sakal bakım hizmetleri.'],

  // ─── Güzellik Merkezleri (id=186) ───
  ['Urfa Beauty Center', 186, 'Güzellik merkezleri', 2, 37.1657, 38.8049, 'Fevzipaşa Cad. No:28, Haliliye/Şanlıurfa', '0414 314 66 77',
    'Yüz bakımı, epilasyon, kaş dizaynı ve cilt bakım hizmetleri sunan güzellik merkezi.'],
  ['Estetik Güzellik Salonu', 186, 'Güzellik merkezleri', 1, 37.1605, 38.7973, 'Eyyübiye Merkez, Şanlıurfa', '0581 888 99 00',
    'Botoks, dolgu ve cilt gençleştirme uygulamaları için uzman güzellik kliniği.'],

  // ─── Spa / Masaj Salonları (id=187) ───
  ['Urfa Wellness Spa', 187, 'Spa / masaj salonları', 2, 37.1659, 38.8052, 'Haliliye Merkez, Şanlıurfa', '0414 314 77 88',
    'İsveç masajı, aromaterapi ve taş masajı başta olmak üzere geniş spa hizmetleri.'],

  // ─── Gelinlikçiler (id=188) ───
  ['Urfa Gelinlik Evi', 188, 'Gelinlikçiler', 2, 37.1660, 38.8053, 'Haliliye Cad., Şanlıurfa', '0414 313 88 99',
    'Özel tasarım ve hazır gelinlik modelleri, kıyafet kiralama ve atölye tadilatı hizmeti.'],
  ['Düğün Evi Şanlıurfa', 188, 'Gelinlikçiler', 1, 37.1607, 38.7975, 'Eyyübiye Merkez, Şanlıurfa', '0582 999 00 11',
    'Gelinlik, nişanlık ve bindallı koleksiyonuyla düğün hazırlıklarınız için tek adres.'],

  // ─── Terziler (id=189) ───
  ['Urfa Terzi', 189, 'Terziler', 1, 37.1590, 38.7945, 'Kapalı Çarşı, Eyyübiye/Şanlıurfa', '0414 212 11 22',
    'Elbise, pantolon ve her türlü giysi tadilatı, özel ölçü dikiş hizmetleri.'],
  ['Modern Terzi Atölyesi', 189, 'Terziler', 2, 37.1665, 38.8059, 'Haliliye Cad., Şanlıurfa', '0583 000 11 22',
    'Kadın ve erkek giysi tadilatı, düğün kıyafetleri ve özel sipariş dikimi.'],

  // ─── Kuru Temizleme (id=190) ───
  ['Urfa Kuru Temizleme', 190, 'Kuru temizleme', 2, 37.1653, 38.8044, 'Haliliye Merkez, Şanlıurfa', '0414 314 88 99',
    'Elbise, perde, halı ve yorgan kuru temizleme hizmetleri, ekspres servis imkânıyla.'],
  ['Leke Temizleme Merkezi', 190, 'Kuru temizleme', 1, 37.1604, 38.7972, 'Eyyübiye Merkez, Şanlıurfa', '0584 111 22 33',
    'Hassas kumaşlar dahil tüm giysilerin profesyonel temizlik ve ütü hizmeti.'],

  // ─── Fotoğrafçılar (id=191) ───
  ['Urfa Fotoğraf Stüdyo', 191, 'Fotoğrafçılar', 2, 37.1660, 38.8054, 'Atatürk Bul. No:50, Haliliye/Şanlıurfa', '0414 313 99 00',
    'Vesikalık, düğün, bebek ve etkinlik fotoğrafçılığı için profesyonel stüdyo.'],
  ['Anı Fotoğraf', 191, 'Fotoğrafçılar', 1, 37.1596, 38.7956, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0585 222 33 44',
    'Düğün, nişan ve mezuniyet fotoğrafçılığı, drone çekim ve video prodüksiyon hizmetleri.'],

  // ─── Matbaalar (id=192) ───
  ['Urfa Matbaa', 192, 'Matbaalar', 1, 37.1598, 38.7960, 'Sarayönü Cad., Eyyübiye/Şanlıurfa', '0414 215 33 44',
    'Kartvizit, afiş, broşür ve her türlü baskı işi için dijital ve ofset baskı matbaası.'],
  ['Reklam Print', 192, 'Matbaalar', 2, 37.1668, 38.8062, 'Haliliye Cad., Şanlıurfa', '0586 333 44 55',
    'Hızlı ve kaliteli baskı hizmetleri, kağıt ve dijital baskı çözümleri.'],

  // ─── Anaokulları (id=73) ───
  ['Güneş Anaokulu', 73, 'Anaokulları', 2, 37.1650, 38.8044, 'Haliliye Eğitim Mah., Şanlıurfa', '0414 313 12 34',
    'Çocukların sosyal ve bilişsel gelişimini destekleyen modern anaokulu.'],
  ['Yıldız Kreş ve Anaokulu', 73, 'Anaokulları', 1, 37.1602, 38.7968, 'Eyyübiye Eğitim Cad., Şanlıurfa', '0587 444 55 66',
    'Nitelikli eğitimci kadrosuyla 3-6 yaş arası çocuklar için güvenli anaokulu.'],

  // ─── Sürücü Kursları (id=83) ───
  ['Urfa Sürücü Kursu', 83, 'Sürücü kursları', 2, 37.1658, 38.8050, 'Haliliye Cad. No:60, Şanlıurfa', '0414 313 23 45',
    'B ve A sınıfı ehliyet için teorik ve pratik sürüş eğitimi veren sürücü kursu.'],
  ['GAP Sürücü Kursu', 83, 'Sürücü kursları', 1, 37.1606, 38.7977, 'Eyyübiye Merkez, Şanlıurfa', '0588 555 66 77',
    'Deneyimli eğitmenler ve modern araçlarla hızlı ehliyet hazırlık kursu.'],

  // ─── Dershaneler (id=79) ───
  ['Urfa Dershane', 79, 'Dershaneler', 2, 37.1656, 38.8048, 'Haliliye Eğitim Mah., Şanlıurfa', '0414 313 34 56',
    'LGS ve YKS sınavlarına kapsamlı hazırlık, deneme sınavları ve etüt destekli dershane.'],
  ['Başarı Eğitim Merkezi', 79, 'Dershaneler', 1, 37.1604, 38.7973, 'Eyyübiye Eğitim Cad., Şanlıurfa', '0589 666 77 88',
    'Tüm dersler için bireysel ve grup çalışma imkânı, uzman öğretmen kadrosuyla.'],

  // ─── Müzik Kursları (id=84) ───
  ['Urfa Müzik Okulu', 84, 'Müzik kursları', 2, 37.1654, 38.8046, 'Haliliye Kültür Mah., Şanlıurfa', '0414 313 45 67',
    'Gitar, piyano, bağlama ve vokal eğitimi sunan özel müzik kursu.'],
  ['Nota Müzik', 84, 'Müzik kursları', 1, 37.1600, 38.7965, 'Eyyübiye Kültür Cad., Şanlıurfa', '0590 777 88 99',
    'Çocuk ve yetişkinlere özel müzik aletleri eğitimi, bireysel ve grup dersler.'],

  // ─── Parklar (id=235) ───
  ['Gölbaşı Rekreasyon Alanı', 235, 'Parklar', 1, 37.1580, 38.7930, 'Gölbaşı, Eyyübiye/Şanlıurfa', null,
    'Balıklıgöl ve Aynzeliha Gölü çevresindeki tarihi park alanı. Yürüyüş ve piknik imkânıyla.'],
  ['Haliliye Kent Parkı', 235, 'Parklar', 2, 37.1720, 38.8085, 'Haliliye İlçesi, Şanlıurfa', null,
    'Haliliye ilçesinin geniş yeşil alan parkı. Çocuk oyun alanı ve spor kortlarıyla hizmet vermektedir.'],
  ['Karaköprü Millet Bahçesi', 235, 'Parklar', 3, 37.1798, 38.8038, 'Karaköprü İlçesi, Şanlıurfa', null,
    'İlçenin merkezi konumundaki geniş millet bahçesi. Dinlenme, yürüyüş ve etkinlik alanı.'],

  // ─── Piknik Alanları (id=234) ───
  ['Fırat Nehri Piknik', 234, 'Piknik alanları', 5, 37.2525, 37.8715, 'Halfeti İlçesi, Şanlıurfa', null,
    'Fırat Nehri kıyısında doğa içinde piknik imkânı, tekne turları başlangıç noktasına yakın.'],
  ['Şanlıurfa Mesire Piknik', 234, 'Piknik alanları', 2, 37.1735, 38.8095, 'Şanlıurfa Kuzey, Haliliye', null,
    'Şehir çeperinde doğal alanlarda piknik masaları ve mangal alanları ile dinlenme ortamı.'],

  // ─── Mesire Alanları (id=233) ───
  ['Şanlıurfa Mesire Ormanı', 233, 'Mesire alanları', 2, 37.1738, 38.8098, 'Kuzey Şanlıurfa, Haliliye', null,
    'Ağaçlık mesire alanı, yürüyüş parkurları ve piknik tesisleriyle şehre yakın kaçış noktası.'],

  // ─── Çarşılar (id=232) ───
  ['Şanlıurfa Kapalı Çarşısı', 232, 'Çarşılar', 1, 37.1585, 38.7938, 'Tarihi Kapalı Çarşı, Eyyübiye/Şanlıurfa', null,
    'Tarihi Şanlıurfa kapalı çarşısı. Yüzyıllık geçmişiyle kuyumcu, baharat ve el sanatları dükkanları.'],
  ['Bahçıvan Çarşısı', 232, 'Çarşılar', 1, 37.1588, 38.7942, 'Bahçıvan Mahallesi, Eyyübiye/Şanlıurfa', null,
    'Baharat, kuruyemiş ve yöresel ürünlerin satıldığı geleneksel açık pazar çarşısı.'],

  // ─── Seyir Terasları (id=236) ───
  ['Urfa Kalesi Seyir Terası', 236, 'Seyir terasları', 1, 37.1622, 38.7956, 'Şanlıurfa Kalesi, Eyyübiye/Şanlıurfa', null,
    'Tarihi kalenin tepesinden Şanlıurfa ovasına ve şehir merkezine uzanan panoramik manzara noktası.'],
  ['Halfeti Köy Manzara Terası', 236, 'Seyir terasları', 5, 37.2533, 37.8725, 'Halfeti, Şanlıurfa', null,
    'Sualtı köyü ve Fırat Nehri\'nin eşsiz manzarasının izlendiği doğal seyir terası.'],

  // ─── Doğal Güzellikler (id=238) ───
  ['Halfeti Sualtı Köyü', 238, 'Doğal güzellikler', 5, 37.2530, 37.8718, 'Halfeti İlçesi, Şanlıurfa', null,
    'Atatürk Barajı ile suların altında kalan tarihi köy kalıntıları ve Fırat manzarası. Tekne turu zorunlu.'],
  ['Sof Dağı', 238, 'Doğal güzellikler', 2, 37.1900, 38.7800, 'Şanlıurfa Kuzey, Haliliye', null,
    'Şehrin kuzeyinde yer alan Sof Dağı, şehir panoraması ve doğa yürüyüşü için popüler nokta.'],

  // ─── Tur Şirketleri (id=241) ───
  ['Urfa Turizm A.Ş.', 241, 'Tur şirketleri', 2, 37.1594, 38.7954, 'Haliliye Turizm Cad., Şanlıurfa', '0414 312 11 22',
    'Göbeklitepe, Harran, Halfeti ve Nemrut Dağı turları düzenleyen köklü turizm şirketi.'],
  ['GAP Kültür Turları', 241, 'Tur şirketleri', 2, 37.1598, 38.7960, 'Atatürk Bul., Haliliye/Şanlıurfa', '0414 313 22 33',
    'Güneydoğu Türkiye kültür rotalarında günübirlik ve konaklamalı turlar düzenleyen acente.'],

  // ─── Rehberli Turlar (id=240) ───
  ['Urfa Rehberli Geziler', 240, 'Rehberli turlar', 2, 37.1595, 38.7958, 'Haliliye Turizm, Şanlıurfa', '0414 314 33 44',
    'Lisanslı rehberlerle Göbeklitepe, Balıklıgöl ve Harran için özel ve grup rehberli tur hizmetleri.'],

  // ─── Halı Yıkama (id=166) ───
  ['Urfa Halı Yıkama', 166, 'Halı yıkama', 3, 37.1792, 38.8026, 'Karaköprü Sanayi, Şanlıurfa', '0414 381 66 77',
    'Her boyut ve tipte halı, kilim ve yolluk yıkama, kurutma ve teslim hizmetleri.'],
  ['Halı Temizlik Merkezi', 166, 'Halı yıkama', 2, 37.1675, 38.8068, 'Haliliye Sanayi Cad., Şanlıurfa', '0591 888 99 00',
    'Halı ve kilim yıkama, leke çıkarma ve kapıdan kapıya teslim hizmetleri.'],

  // ─── Tesisatçılar (id=168) ───
  ['Urfa Su Tesisatı', 168, 'Tesisatçılar', 1, 37.1596, 38.7957, 'Eyyübiye Merkez, Şanlıurfa', '0414 215 55 66',
    'Su tesisatı kurulum, bakım, tamir ve acil tesisat onarım hizmetleri.'],
  ['Şanlıurfa Tesisat Ustası', 168, 'Tesisatçılar', 2, 37.1662, 38.8055, 'Haliliye Cad., Şanlıurfa', '0592 999 00 11',
    'Konut ve iş yeri tesisatı, doğalgaz ve su arızalarına 7/24 acil müdahale.'],

  // ─── Elektrikçiler (id=169) ───
  ['Urfa Elektrik', 169, 'Elektrikçiler', 1, 37.1597, 38.7959, 'Eyyübiye Merkez, Şanlıurfa', '0414 215 66 77',
    'Elektrik tesisat kurulum, bakım, arıza giderme ve pano montajı hizmetleri.'],
  ['Haliliye Elektrik Ustası', 169, 'Elektrikçiler', 2, 37.1663, 38.8057, 'Haliliye Cad., Şanlıurfa', '0593 000 11 22',
    'Endüstriyel ve konut elektrik tesisatı, acil arıza 24 saat hizmet.'],

  // ─── Çilingirler (id=171) ───
  ['Urfa Çilingir', 171, 'Çilingirler', 1, 37.1595, 38.7955, 'Eyyübiye Merkez, Şanlıurfa', '0414 215 77 88',
    'Kapı açma, kilit değişimi ve kasa servis hizmetleri, 7/24 acil müdahale.'],
  ['Hızlı Çilingir', 171, 'Çilingirler', 2, 37.1660, 38.8053, 'Haliliye Cad., Şanlıurfa', '0594 111 22 33',
    'Her marka kilit için anahtar çoğaltma, kapı açma ve güvenlik sistemi montajı.'],

  // ─── Beyaz Eşya Servisleri (id=175) ───
  ['Urfa Beyaz Eşya Servis', 175, 'Beyaz eşya servisleri', 2, 37.1665, 38.8060, 'Haliliye Sanayi Mah., Şanlıurfa', '0414 315 88 99',
    'Buzdolabı, çamaşır makinesi ve bulaşık makinesi arızaları için yetkisiz servis.'],

  // ─── Güvenlik Sistemleri (id=177) ───
  ['Urfa Güvenlik Sistemleri', 177, 'Güvenlik sistemleri', 2, 37.1668, 38.8062, 'Haliliye Cad., Şanlıurfa', '0414 315 99 00',
    'CCTV kamera, alarm ve erişim kontrol sistemleri kurulum ve bakım hizmetleri.'],

  // ─── Günlük Kiralık Daireler (id=48) ───
  ['Urfa Apart Otel', 48, 'Günlük kiralık daireler', 2, 37.1658, 38.8050, 'Haliliye Merkez, Şanlıurfa', '0414 314 11 11',
    'Balıklıgöl\'e yakın tam donanımlı günlük ve haftalık kiralık daireler.'],
  ['Şanlıurfa Apart', 48, 'Günlük kiralık daireler', 1, 37.1605, 38.7972, 'Eyyübiye Merkez, Şanlıurfa', '0595 222 33 44',
    'Uzun süreli konaklamalar için mutfaklı, WiFi\'lı günlük kiralık daireler.'],

  // ─── Kamp Alanları (id=50) ───
  ['Halfeti Kamp Alanı', 50, 'Kamp alanları', 5, 37.2528, 37.8710, 'Halfeti İlçesi, Şanlıurfa', '0542 111 22 33',
    'Fırat kıyısında doğal ortamda kamp imkânı, çadır ve karavan alanları.'],

  // ─── Satılık Daire (id=214) ───
  ['Urfa Emlak Ofisi', 214, 'Satılık daire', 2, 37.1660, 38.8055, 'Haliliye Merkez, Şanlıurfa', '0414 313 55 66',
    'Şanlıurfa\'da satılık daire, villa ve arsa portföyü sunan güvenilir emlak ofisi.'],
  ['Şanlıurfa Gayrimenkul', 214, 'Satılık daire', 1, 37.1604, 38.7973, 'Eyyübiye Emlak Cad., Şanlıurfa', '0596 333 44 55',
    'Yeni ve ikinci el konut satışı, profesyonel değerleme ve danışmanlık hizmetleri.'],

  // ─── Kiralık Daire (id=215) ───
  ['Urfa Kiralık Daire Ofisi', 215, 'Kiralık daire', 2, 37.1661, 38.8056, 'Haliliye Merkez, Şanlıurfa', '0414 313 66 77',
    'Haliliye ve Eyyübiye ilçelerinde aylık kiralık daire portföyüyle hizmet veren emlak ofisi.'],
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
  console.log('\n🏪 Boş kategoriler için mekan ekleniyor (Batch 2)...\n');
  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');
  const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
  await client.connect();

  let ok = 0, skip = 0, fail = 0;
  for (const [name, catId, catName, districtId, lat, lon, address, phone, shortDesc] of PLACES) {
    const slug = slugify(name);
    const { rows: exists } = await client.query('SELECT id FROM places WHERE slug=$1', [slug]);
    if (exists.length > 0) { console.log(`  ⊘ ${name}`); skip++; continue; }
    process.stdout.write(`  → ${name} ... `);
    try {
      const description = `<p>${shortDesc}</p><p>Şanlıurfa\'nın ${catName.toLowerCase()} kategorisinde hizmet vermektedir.</p>`;
      const metaDesc = `${shortDesc} Şanlıurfa\'da ${name} - adres ve iletişim bilgileri.`.slice(0, 160);
      await client.query(`
        INSERT INTO places (name, slug, description, short_description, category, category_id, district_id,
          address, phone, latitude, longitude, status, rating, rating_count, avg_rating,
          image_url, meta_description, view_count, review_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',4.1,2,4.1,$12,$13,
          floor(random()*60+5)::int, 2)
      `, [name, slug, description, shortDesc, catName, catId, districtId,
          address, phone, lat, lon, `/uploads/places/${slug}.jpg`, metaDesc]);
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
  console.log(`\n✅ Batch 2 tamamlandı: ${ok} eklendi, ${skip} zaten vardı, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
