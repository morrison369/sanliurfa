#!/usr/bin/env node
/**
 * Batch 3 — 15 yeni Ollama blog yazısı (mevsim, solo, kültür, gastronomi, ilçe konuları).
 * Kullanım: node scripts/ollama-generate-batch3-blogs.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';
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

const ollamaCfg = getOllamaConfig();
const MODEL     = ollamaCfg.MODEL;
const AUTHOR_ID = '7a2816aa-d85a-481e-aa41-c89380f47d8f';

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15439;

const DRY = process.argv.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS)      { console.error('SSH_PASS eksik (.env.scripts)'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(text) {
  return text.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);
const SYSTEM = SYSTEM_TR;

const BLOG_TOPICS = [
  {
    title: 'Şanlıurfa Mevsimler Rehberi: Hangi Ayda Gidilmeli?',
    keywords: ['Şanlıurfa ne zaman gidilir', 'Şanlıurfa hangi mevsim', 'Şanlıurfa en iyi ay'],
    category: 'gezi-rehberi',
    tags: ['mevsim', 'gezi-planlama', 'sanliurfa-rehberi', 'iklim'],
    prompt: `"Şanlıurfa Mevsimler Rehberi: Hangi Ayda Gidilmeli?" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'yı ziyaret için en uygun mevsim ve ayların detaylı rehberi.
Öne çıkan konular: İlkbahar (Mart-Mayıs) avantajları (hafif hava, Halfeti gülü, Göbeklitepe), Yaz (Haziran-Ağustos) dezavantajları (45°C+) ve kapalı mekan stratejileri, Sonbahar (Eylül-Kasım) ideal dönem (hava ılıman, az turist), Kış (Aralık-Şubat) avantajları (Göbeklitepe kalabalıksız, kış lezzetleri). Aylık ortalama sıcaklık ve yağış bilgileri. Festivaller ve özel dönemler.
Anahtar kelimeler: Şanlıurfa ne zaman gidilir, Şanlıurfa hangi ayda gidilir, Şanlıurfa mevsim rehberi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Halfeti Rumkale: Fırat'ın Derinliklerindeki Tarihi Kale",
    keywords: ['Halfeti Rumkale', 'Rumkale tekne turu', 'Halfeti sualtı kale'],
    category: 'gezi-rehberi',
    tags: ['halfeti', 'rumkale', 'tekne-turu', 'tarihi-kale'],
    prompt: `"Halfeti Rumkale: Fırat'ın Derinliklerindeki Tarihi Kale" başlıklı kapsamlı blog yazısı yaz.
Konu: Atatürk Barajı'nın suları altında kısmen kalan Rumkale, Halfeti'den tekne ile ulaşılan eşsiz bir tarihi kale.
Öne çıkan konular: Rumkale'nin tarihi (Bizans, Haçlı dönemleri), Baraj sularıyla yükselen Fırat ve yarı batık kale manzarası, Halfeti iskelesinden tekne turu detayları (süre, fiyat, güzergah), en iyi fotoğraf açıları, sualtında kalan köyler ve Şenyurt, ziyaret saatleri.
Anahtar kelimeler: Halfeti Rumkale, Rumkale tekne turu, Halfeti tarihi kale, Şanlıurfa Rumkale
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Solo Seyahat: Yalnız Gezginin Tam Rehberi",
    keywords: ['Şanlıurfa solo seyahat', 'Urfa yalnız gezi', 'Şanlıurfa güvenli mi'],
    category: 'gezi-rehberi',
    tags: ['solo-seyahat', 'yalniz-gezi', 'butce-seyahat', 'guvenlik'],
    prompt: `"Şanlıurfa'da Solo Seyahat: Yalnız Gezginin Tam Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'ya yalnız seyahat edecek gezginlere pratik ve güvenlik rehberi.
Öne çıkan konular: Şanlıurfa'nın güvenli ilçeleri ve merkezi (Balıklıgöl çevresi), solo gezgin için uygun bütçe pansiyonları ve hosteller, yalnız yemek kültürü (rahat mekânlar), kalabalık yerlerde sosyalleşme fırsatları (çay ocakları, kahvehaneler), kadın gezginler için ipuçları, ulaşım önerileri (minibüs, taksi güvenilirliği).
Anahtar kelimeler: Şanlıurfa solo seyahat, Urfa yalnız gezi rehberi, Şanlıurfa güvenli mi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa Usulü Katmer: Şanlıurfa'nın Gizli Tatlısı",
    keywords: ['Urfa katmeri', 'Şanlıurfa katmer nedir', 'Urfa tatlıları katmer'],
    category: 'gastronomi',
    tags: ['katmer', 'tatli', 'urfa-mutfagi', 'yoresel-lezzetler'],
    prompt: `"Urfa Usulü Katmer: Şanlıurfa'nın Gizli Tatlısı" başlıklı kapsamlı blog yazısı yaz.
Konu: Şanlıurfa mutfağının az bilinen ama çok sevilen tatlısı katmer.
Öne çıkan konular: Katmer nedir (çıtır hamur, içi fıstık veya peynir, yağda pişirme), Gaziantep katmeriyle farkı (Urfa usulü daha kalın ve ağırlıklı tuzlu), nasıl yapılır (temel tarif adımları), Şanlıurfa'da katmer yenecek mekanlar, sabah kahvaltısında mı tatlı olarak mı tercih edilir.
Anahtar kelimeler: Urfa katmeri nedir, Şanlıurfa katmer tarifi, Urfa usulü katmer mekanları
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Kuyumcular Çarşısı: Telkari ve Gümüş Takı Rehberi",
    keywords: ['Şanlıurfa kuyumcular', 'Urfa telkari', 'Şanlıurfa gümüş takı'],
    category: 'alisveris',
    tags: ['kuyumcular', 'telkari', 'gumus-taki', 'altin', 'alisveris'],
    prompt: `"Şanlıurfa Kuyumcular Çarşısı: Telkari ve Gümüş Takı Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın tarihi kuyumcular çarşısı ve telkari el sanatı.
Öne çıkan konular: Şanlıurfa kuyumcular çarşısının konumu (tarihi çarşı yakını), telkari nedir (gümüş tel işleme sanatı, Osmanlı mirası), Şanlıurfa'ya özgü takı desenleri ve sembolleri, altın takı vs. gümüş takı fiyat karşılaştırması, nereden alınır (güvenilir ustalar vs. turistik dükkanlar), pazarlık kültürü, hediyelik için en iyi telkari ürünler.
Anahtar kelimeler: Şanlıurfa kuyumcular çarşısı, Urfa telkari nerede satılır, Şanlıurfa gümüş takı rehberi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Düğün Gelenekleri ve Kına Gecesi Kültürü",
    keywords: ['Şanlıurfa düğün geleneği', 'Urfa kına gecesi', 'Şanlıurfa düğün müziği'],
    category: 'kultur-ve-etkinlik',
    tags: ['dugun-gelenegI', 'kina-gecesi', 'yoresel-kultur', 'muzik'],
    prompt: `"Şanlıurfa'da Düğün Gelenekleri ve Kına Gecesi Kültürü" başlıklı kapsamlı blog yazısı yaz.
Konu: Şanlıurfa'nın zengin düğün gelenekleri ve yöresel müzik kültürü.
Öne çıkan konular: Şanlıurfa düğününün aşamaları (söz, nişan, kına, düğün), kına gecesinin önemi ve gelenekleri, düğünlerde kullanılan yöresel müzik enstrümanları (bağlama, zurna, davul), düğün yemekleri (bulamaç, tandır kebabı, mıhlama), Sıra Gecesi ile düğün müziği arasındaki bağ, turistler bu gelenekleri nasıl deneyimleyebilir.
Anahtar kelimeler: Şanlıurfa düğün geleneği nasıl, Urfa kına gecesi kültürü, Şanlıurfa yöresel düğün müziği
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da İklim ve Hava: 4 Mevsim Detaylı Bilgi",
    keywords: ['Şanlıurfa hava durumu', 'Şanlıurfa iklim', 'Şanlıurfa yazın kaç derece'],
    category: 'gezi-rehberi',
    tags: ['iklim', 'hava-durumu', 'mevsim', 'gezi-planlama'],
    prompt: `"Şanlıurfa'da İklim ve Hava: 4 Mevsim Detaylı Bilgi" başlıklı bilgi verici blog yazısı yaz.
Konu: Şanlıurfa'nın iklim yapısı ve 4 mevsim detaylı bilgi.
Öne çıkan konular: Şanlıurfa kıta iklimi (yaz ekstrem sıcak 45°C+, kış ılıman), aylık ortalama sıcaklıklar, yağış dönemleri (ilkbahar ve kış yağmurlu), nem oranı, yaz aylarında güneş koruma tavsiyeleri, en serin ve en sıcak ay ortalamaları, Halfeti ve Göbeklitepe'de iklim farkı, ziyaret planlaması için pratik takvim.
Anahtar kelimeler: Şanlıurfa iklim rehberi, Şanlıurfa yazın kaç derece, Şanlıurfa kışın hava
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa Mercimek Çorbası: Tarih, Tarif ve En İyi Mekanlar",
    keywords: ['Urfa mercimek çorbası', 'Şanlıurfa çorba kültürü', 'Urfa çorbacıları'],
    category: 'gastronomi',
    tags: ['mercimek-corbasi', 'corba', 'urfa-mutfagi', 'yoresel-lezzetler'],
    prompt: `"Urfa Mercimek Çorbası: Tarih, Tarif ve En İyi Mekanlar" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın kültür çorbası mercimek ve Urfa usulü pişirme geleneği.
Öne çıkan konular: Şanlıurfa'da mercimek tarımı ve sofrasındaki önemi, Urfa usulü mercimek çorbası nasıl yapılır (baharatlar: kimyon, isot; tereyağı terbiyesi), sabah kahvaltısında çorba kültürü, Şanlıurfa'nın ünlü çorbacıları ve mekanlar, mercimek çorbası ile ayran kombinasyonu, glutensiz ve vegan seçenekler.
Anahtar kelimeler: Urfa mercimek çorbası nasıl yapılır, Şanlıurfa çorbacıları, Urfa usulü çorba tarifi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Eyyübiye İlçe Rehberi: Balıklıgöl ve Tarihi Hanların Semti",
    keywords: ['Eyyübiye gezilecek yerler', 'Eyyübiye tarihi', 'Şanlıurfa Eyyübiye ilçesi'],
    category: 'gezi-rehberi',
    tags: ['eyyubiye', 'balikligol', 'tarihi-hanlar', 'sanliurfa-ilceleri'],
    prompt: `"Eyyübiye İlçe Rehberi: Balıklıgöl ve Tarihi Hanların Semti" başlıklı kapsamlı blog yazısı yaz.
Konu: Şanlıurfa'nın Eyyübiye ilçesi, Balıklıgöl ve tarihi çarşıların merkezi.
Öne çıkan konular: Eyyübiye'nin Balıklıgöl, Dergah, Gümrük Hanı, Kapalı Çarşı gibi merkezi alanları, ilçenin tarihi önemi (Hz. Eyyüp makamı), turistik mekanlar ve yerel restoranlar, ilçede yürüyüş rotaları, Haliliye ve Karaköprü ile farkı, pratik bilgiler (ulaşım, park, kafeler).
Anahtar kelimeler: Eyyübiye gezilecek yerler, Şanlıurfa Eyyübiye rehberi, Eyyübiye tarihi mekanlar
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'dan Gaziantep Günübirlik Gezi Rehberi",
    keywords: ['Şanlıurfa Gaziantep arası', 'Gaziantep günübirlik', 'Şanlıurfa Gaziantep ulaşım'],
    category: 'gezi-rehberi',
    tags: ['gaziantep', 'gunubirlik', 'komsu-sehir', 'gezi-rotasi'],
    prompt: `"Şanlıurfa'dan Gaziantep Günübirlik Gezi Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'dan Gaziantep'e günübirlik gezi planı ve karşılaştırma.
Öne çıkan konular: Şanlıurfa-Gaziantep arası mesafe ve ulaşım seçenekleri (otobüs ~2 saat, araç), Gaziantep'te mutlaka görülecek yerler (Zeugma Mozaik Müzesi, Bakırcılar Çarşısı, Dülük Antik Kenti), Gaziantep mutfağı vs. Şanlıurfa mutfağı karşılaştırması, günübirlik için ideal saat planı, iki şehrin birlikte gezi kombinasyonu.
Anahtar kelimeler: Şanlıurfa'dan Gaziantep nasıl gidilir, Gaziantep günübirlik rehberi, Şanlıurfa Gaziantep karşılaştırma
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Tren İstasyonu ve Demiryolu Tarihi",
    keywords: ['Şanlıurfa tren', 'Urfa gar', 'Şanlıurfa demiryolu tarihi'],
    category: 'kultur-ve-etkinlik',
    tags: ['tren', 'gar', 'demiryolu', 'tarihi'],
    prompt: `"Şanlıurfa Tren İstasyonu ve Demiryolu Tarihi" başlıklı kapsamlı blog yazısı yaz.
Konu: Şanlıurfa'nın tarihi tren garı ve demiryolu geçmişi.
Öne çıkan konular: Şanlıurfa Tren Garı'nın tarihi (Cumhuriyet döneminde inşa, Osmanlı'dan günümüze), istasyonun mimari özellikleri ve tarihi değeri, günümüzdeki tren seferleri (hangi şehirlere var), Şanlıurfa'dan İstanbul/Ankara trenle nasıl gidilir, tren istasyonunun çevresi ve ulaşım, demiryolu kültürü ve şehrin gelişimine etkisi.
Anahtar kelimeler: Şanlıurfa tren seferleri, Urfa gar tarihi, Şanlıurfa'dan trenle nereye gidilir
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Yerel Pazarları Rehberi: Çarşamba ve Cuma Semt Pazarları",
    keywords: ['Şanlıurfa semt pazarı', 'Urfa pazar günleri', 'Şanlıurfa Çarşamba pazarı'],
    category: 'alisveris',
    tags: ['semt-pazari', 'taze-urunler', 'yerel-pazar', 'haftalik-pazar'],
    prompt: `"Şanlıurfa Yerel Pazarları Rehberi: Çarşamba ve Cuma Semt Pazarları" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın haftalık semt pazarlarında yerel ürün alışverişi.
Öne çıkan konular: Şanlıurfa'nın hangi ilçelerinde hangi gün pazar kurulur (Eyyübiye, Haliliye, Karaköprü), pazarlarda satılan özgün ürünler (taze isot, kuru sebze, yöresel baharatlar, heybe ve kilim), pazarda alışveriş ipuçları (en taze ürünler sabah erken), fiyat ortalamaları, turist dostu pazarlar vs. yerel pazarlar, taşıma ve ambalaj önerileri.
Anahtar kelimeler: Şanlıurfa haftalık pazar rehberi, Urfa semt pazarı nerede, Şanlıurfa pazarda ne alınır
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Tarihi Kahvehaneleri: Osmanlı'dan Günümüze Çay Kültürü",
    keywords: ['Şanlıurfa kahvehane', 'Urfa tarihi çay evi', 'Şanlıurfa çay kültürü'],
    category: 'yeme-icme',
    tags: ['kahvehane', 'cay-kulturu', 'tarihi-mekanlar', 'sosyal-yasam'],
    prompt: `"Şanlıurfa Tarihi Kahvehaneleri: Osmanlı'dan Günümüze Çay Kültürü" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın tarihi kahvehaneleri ve çay içme kültürü.
Öne çıkan konular: Şanlıurfa'da kahvehane kültürünün tarihi (Osmanlı'dan günümüze), tarihi çarşı içindeki otantik kahvehaneler, nargile ve tavla kültürü, çay yerine mırra içilen kahvehaneler, Balıklıgöl çevresindeki modern kafe vs. geleneksel kahvehane farkı, kadınların kahvehane kullanımı, turistlerin bu ortamı nasıl deneyimleyebileceği.
Anahtar kelimeler: Şanlıurfa tarihi kahvehaneler nerede, Urfa çay kültürü, Şanlıurfa otantik kahvehane deneyimi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Piknik Yerleri ve Doğa Mekânları Rehberi",
    keywords: ['Şanlıurfa piknik yeri', 'Urfa doğa mekânları', 'Şanlıurfa yeşil alan'],
    category: 'gezi-rehberi',
    tags: ['piknik', 'doga', 'acik-alan', 'aile-aktivitesi'],
    prompt: `"Şanlıurfa'da Piknik Yerleri ve Doğa Mekânları Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa ve çevresinde piknik ve doğa aktiviteleri yapılacak en iyi mekanlar.
Öne çıkan konular: Şehir içi yeşil alanlar (Dergah parkı, Atatürk Parkı), Bozova Atatürk Barajı kıyısı piknik alanları, Halfeti'de Fırat kıyısı piknik, Harran ovasında bahar piknik kültürü, piknik malzemeleri nereden alınır, güvenli ve çocuk dostu piknik yerleri, sabah erkenden gitmek için ipuçları, ilkbahar vs. güz piknik kültürü.
Anahtar kelimeler: Şanlıurfa piknik yerleri, Urfa doğa mekânları, Şanlıurfa çevresi yeşil alan
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa Kaburga: Şanlıurfa'nın Efsanevi Et Lezzeti",
    keywords: ['Urfa kaburga', 'Şanlıurfa kaburga nerede yenir', 'Urfa et lezzetleri'],
    category: 'gastronomi',
    tags: ['kaburga', 'et-yemegi', 'urfa-mutfagi', 'yoresel-lezzetler'],
    prompt: `"Urfa Kaburga: Şanlıurfa'nın Efsanevi Et Lezzeti" başlıklı blog yazısı yaz.
Konu: Şanlıurfa mutfağının özel et yemeği kaburga ve pişirme geleneği.
Öne çıkan konular: Urfa kaburganın ne olduğu (tandırda veya fırında uzun süre pişirilen kuzu/dana kaburga), pişirme süreci ve baharat kullanımı (isot, kimyon, karabiber), kaburga hangi mevsimde daha çok tüketilir (özellikle kış), Şanlıurfa'nın en iyi kaburga mekanları ve hanları, tandır kültürüyle bağlantısı, Türkiye'nin diğer et yemekleriyle farkı.
Anahtar kelimeler: Urfa kaburga nerede yenir, Şanlıurfa kaburga yemek rehberi, Urfa tandır kaburga tarifi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
];

async function generateBlogPost(topic) {
  const content = await ollamaChat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: topic.prompt },
  ]);
  const firstP = content.match(/<p>(.*?)<\/p>/s);
  const excerpt = firstP
    ? firstP[1].replace(/<[^>]+>/g, '').slice(0, 200)
    : topic.title;
  return { content, excerpt };
}

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  process.stdout.write('SSH tünel açılıyor... ');
  const { ssh, server } = await openSshTunnel();
  console.log('✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();
  console.log(`\n📝 ${BLOG_TOPICS.length} blog yazısı üretilecek (model: ${MODEL})\n`);
  let ok = 0, skip = 0, fail = 0;

  for (const topic of BLOG_TOPICS) {
    const slug = slugify(topic.title);
    process.stdout.write(`  → "${topic.title.slice(0, 55)}..." `);

    const existing = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) { console.log('⊘ zaten var'); skip++; continue; }

    try {
      const { content, excerpt } = await generateBlogPost(topic);
      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;

      if (DRY) {
        console.log(`\n    [DRY] ${wordCount} kelime — ${excerpt.slice(0, 60)}...`);
      } else {
        const daysAgo = Math.floor(Math.random() * 10);
        const pubDate = new Date(Date.now() - daysAgo * 86400000);
        pubDate.setHours(Math.floor(Math.random() * 8) + 9, 0, 0, 0);

        await client.query(
          `INSERT INTO blog_posts
            (slug, title, content, excerpt, status, category,
             author_id, published_at, tags, reading_time, featured_image)
           VALUES ($1,$2,$3,$4,'published',$5,$6,$7,$8,$9,$10)
           ON CONFLICT (slug) DO NOTHING`,
          [
            slug, topic.title, content, excerpt, topic.category,
            AUTHOR_ID, pubDate.toISOString(), topic.tags,
            Math.ceil(wordCount / 200), `/uploads/blogs/${slug}.jpg`,
          ]
        );
        console.log(`✓ (${wordCount} kelime)`);
      }
      ok++;
      await sleep(2000);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(1000);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} yeni, ${skip} zaten var, ${fail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
