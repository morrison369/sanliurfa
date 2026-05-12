#!/usr/bin/env node
/**
 * Batch 4 — 15 yeni Ollama blog yazısı (pratik rehber, gastronomi, kültür, komşu şehirler).
 * Kullanım: node scripts/ollama-generate-batch4-blogs.mjs [--dry-run]
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
const LOCAL_TUNNEL_PORT = 15450;

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
    title: "Şanlıurfa Arabayla Gezi Rehberi: Kiralık Araç, Rotalar ve Pratik Bilgiler",
    keywords: ['Şanlıurfa araç kiralama', 'Şanlıurfa arabayla gezi', 'Urfa rent a car'],
    category: 'gezi-rehberi',
    tags: ['arac-kiralama', 'gezi-rotasi', 'pratik-bilgiler', 'ulasim'],
    prompt: `"Şanlıurfa Arabayla Gezi Rehberi" başlıklı kapsamlı blog yazısı yaz.
Konu: Şanlıurfa'da araç kiralayarak gezi planlamak isteyen turistler için pratik rehber.
Öne çıkan konular: Şanlıurfa'da araç kiralama firmaları ve fiyatlar, havalimanı vs. şehir merkezi kiralama, önerilen günlük rotalar (Göbeklitepe–Harran–Halfeti), Şanlıurfa'nın trafik yapısı ve park durumu, yakıt istasyonları, ilçe arası mesafeler, kış ve yaz sürüş koşulları, ayna/yol kuralları.
Anahtar kelimeler: Şanlıurfa araç kiralama, Şanlıurfa arabayla gezi rotası, Urfa rent a car
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Harran'dan Göbeklitepe'ye: Neolitik Medeniyet Turu Rotası",
    keywords: ['Harran Göbeklitepe turu', 'Neolitik medeniyet rotası', 'Şanlıurfa tarih turu'],
    category: 'gezi-rehberi',
    tags: ['harran', 'gobeklitepe', 'neolitik', 'arkeoloji-turu'],
    prompt: `"Harran'dan Göbeklitepe'ye: Neolitik Medeniyet Turu Rotası" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın iki önemli arkeolojik alanını (Harran ve Göbeklitepe) birleştiren günlük tur rotası.
Öne çıkan konular: Harran ve Göbeklitepe arasındaki coğrafi ilişki (M.Ö. 10.000'den bugüne insanlık tarihi), ideal tur sırası (sabah Göbeklitepe, öğleden sonra Harran), her iki alanın ziyaret süresi, taşıt önerileri, öğle yemeği seçenekleri, fotoğraf çekme zamanı, çocuklar ve yaşlılar için erişilebilirlik.
Anahtar kelimeler: Harran Göbeklitepe aynı gün tur, Şanlıurfa arkeoloji rotası, Neolitik medeniyet turu
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Türk Hamamı: Tarihi Hamamlar Deneyim Rehberi",
    keywords: ['Şanlıurfa hamam', 'Urfa tarihi hamam', 'Şanlıurfa kese köpük'],
    category: 'kultur-ve-etkinlik',
    tags: ['hamam', 'tarihi-hamam', 'kese-kopuk', 'geleneksel-banyo'],
    prompt: `"Şanlıurfa'da Türk Hamamı: Tarihi Hamamlar Deneyim Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın tarihi Türk hamamları ve geleneksel hamam deneyimi rehberi.
Öne çıkan konular: Şanlıurfa'da aktif tarihi hamamlar (Hacı Mustafa Hamamı, Vakıf Hamamı gibi), Osmanlı dönemi hamam mimarisi, hamam süreçleri (kese, köpük, masaj, terlelik-soğukluk-ılıklık), fiyat aralıkları, ziyaret saatleri ve rezervasyon, kadın-erkek ayrımı, turistlere hamam ipuçları, yöresel sabun ve kil ürünleri.
Anahtar kelimeler: Şanlıurfa hamam nerede, Urfa tarihi hamam deneyimi, Şanlıurfa kese köpük fiyat
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa'da Vegan ve Vejetaryen Yemek Rehberi: Et Olmadan Urfa Mutfağı",
    keywords: ['Şanlıurfa vegan', 'Urfa vejetaryen yemek', 'Şanlıurfa etsiz yemek'],
    category: 'gastronomi',
    tags: ['vegan', 'vejetaryen', 'etsiz', 'urfa-mutfagi'],
    prompt: `"Urfa'da Vegan ve Vejetaryen Yemek Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'da vegan ve vejetaryen beslenen gezginlere yönelik yemek rehberi.
Öne çıkan konular: Urfa mutfağının doğal vegan yemekleri (çiğ köfte vegan mı?, mercimek çorbası, hummus, fasulye yemekleri, peynirli pide), hangi restoranlarda etsiz seçenek var, meze kültürü ve zeytinyağlı mezeler, baklava ve tatlılar (vegan dostu hangiler), marketten alınabilecek vegan ürünler, dikkat edilecek gizli et içerikleri.
Anahtar kelimeler: Şanlıurfa vegan rehberi, Urfa vejetaryen yemekler neler, Şanlıurfa etsiz restoran
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Sokak Lezzetleri Rehberi: Tezgahtan Tabağa Yerel Tatlar",
    keywords: ['Şanlıurfa sokak yemekleri', 'Urfa sokak lezzetleri', 'Şanlıurfa seyyar satıcı'],
    category: 'gastronomi',
    tags: ['sokak-yemekleri', 'yerel-lezzetler', 'seyyar-satici', 'ucuz-yemek'],
    prompt: `"Şanlıurfa Sokak Lezzetleri Rehberi" başlıklı blog yazısı yaz.
Konu: Şanlıurfa sokaklarında bulunabilecek otantik yerel lezzetler ve seyyar satıcı rehberi.
Öne çıkan konular: Şanlıurfa'ya özgü sokak yemekleri (mısır, simit, çiğ köfte büfe, susamlı açma, fıstıklı simit), hangi mahallelerde hangi sokak lezzetleri var, Kapalı Çarşı çevresindeki tezgahlar, saat bazlı sokak yemekleri (sabah pazar çorbası, öğlen ciğer, akşam kadayıf), fiyat ortalamaları, hijyen dikkat noktaları.
Anahtar kelimeler: Şanlıurfa sokak yemekleri neler, Urfa sokak lezzetleri rehberi, Şanlıurfa ucuz yeme-içme
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Halfeti'de Yemek Rehberi: Fırat Balıkları ve Yerel Lokanta Tavsiyeleri",
    keywords: ['Halfeti restoran', 'Halfeti sazan balığı', 'Halfeti ne yenir'],
    category: 'gastronomi',
    tags: ['halfeti', 'balik-restorani', 'fırat-mutfagi', 'yerel-lezzetler'],
    prompt: `"Halfeti'de Yemek Rehberi: Fırat Balıkları ve Yerel Lokantalar" başlıklı blog yazısı yaz.
Konu: Halfeti'de yemek seçenekleri, Fırat nehir balıklarının önemine odaklanarak.
Öne çıkan konular: Halfeti'de taze Fırat balıkları (sazan, yayın, levrek), kıyı lokantaları ve fiyat aralıkları, balık yemek için en iyi mevsim, Halfeti'de vejetaryen seçenekler, tekne turlarında balık yeme imkanları, yerel mezeler ve pide, kapalı sezonda restoran durumu, ulaşım sonrası açlık için pratik çözümler.
Anahtar kelimeler: Halfeti balık nerede yenir, Halfeti restoran tavsiyeleri, Halfeti Fırat balığı fiyatı
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Çay Bahçeleri ve Nargile Mekanları: Yerel Oturma Kültürü",
    keywords: ['Şanlıurfa çay bahçesi', 'Urfa nargile', 'Şanlıurfa keyif mekanları'],
    category: 'yeme-icme',
    tags: ['cay-bahcesi', 'nargile', 'oturma-kulturu', 'sosyal-yasam'],
    prompt: `"Şanlıurfa'da Çay Bahçeleri ve Nargile Mekanları" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın çay bahçesi ve nargile kültürü ve yerel oturma mekanları rehberi.
Öne çıkan konular: Balıklıgöl çevresindeki çay bahçeleri (manzaralı, tarihi atmosfer), tarihi çarşı içi küçük kahvehaneler, Karaköprü ve modern semtlerdeki nargile kafeler, Türk çayı kültürü (ne sipariş edilir, nasıl içilir), çay fiyatları ve ziyaret saatleri, erkekler vs. karma mekanlar, yaz mevsimi vs. kış mevsimi en iyi çay bahçeleri.
Anahtar kelimeler: Şanlıurfa çay bahçesi nerede, Urfa nargile mekanları, Şanlıurfa oturma yerleri
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Göbeklitepe Neden Bu Kadar Önemli? Dünya Tarihini Değiştiren Keşif",
    keywords: ['Göbeklitepe önemi', 'Göbeklitepe neden önemli', 'Göbeklitepe tarih'],
    category: 'kultur-ve-etkinlik',
    tags: ['gobeklitepe', 'neolitik', 'arkeoloji', 'insanlik-tarihi'],
    prompt: `"Göbeklitepe Neden Bu Kadar Önemli? Dünya Tarihini Değiştiren Keşif" başlıklı kapsamlı blog yazısı yaz.
Konu: Göbeklitepe'nin arkeolojik önemi ve dünya tarihini nasıl yeniden yazdığı.
Öne çıkan konular: Göbeklitepe'nin keşif hikayesi (Klaus Schmidt 1994), M.Ö. 10.000 tarihleme ve Stonehenge'den 6.000 yıl eski olması, "önce tapınak mı, sonra tarım mı?" teorisi ve bunun önemi, T sütunları ve oymalı hayvan kabartmalar, Göbeklitepe'nin UNESCO Dünya Mirası süreci, kazı çalışmaları ve henüz ortaya çıkarılmayan alanlar, insanlık medeniyetini nasıl yeniden tanımladı.
Anahtar kelimeler: Göbeklitepe neden önemli, Göbeklitepe tarihi önemi, Göbeklitepe dünya medeniyeti
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'dan Nemrut Dağı: Adıyaman Günübirlik Turu Rehberi",
    keywords: ['Şanlıurfa Nemrut Dağı', 'Nemrut günübirlik turu', 'Adıyaman Nemrut ulaşım'],
    category: 'gezi-rehberi',
    tags: ['nemrut-dagi', 'adiyaman', 'gunubirlik', 'komsu-sehir'],
    prompt: `"Şanlıurfa'dan Nemrut Dağı: Adıyaman Günübirlik Turu" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'dan Adıyaman'daki Nemrut Dağı'na günübirlik gezi planı.
Öne çıkan konular: Şanlıurfa-Adıyaman arası mesafe (~130 km, ~2 saat) ve ulaşım seçenekleri (otobüs, araç), Nemrut Dağı'nın tarihi (Kommagene Krallığı, dev heykel başlar), gün doğumu ve gün batımı görüşü (hangisi daha iyi), zirveye çıkış (1 km yürüyüş, 2206m), soğuk hava uyarısı (yıl boyunca soğuk), en iyi ziyaret mevsimi, giriş ücretleri 2026, Kahta kasabasında öğle yemeği.
Anahtar kelimeler: Şanlıurfa'dan Nemrut Dağı nasıl gidilir, Nemrut Dağı günübirlik turu, Adıyaman Nemrut ziyaret rehberi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da El Sanatları Atölyeleri: Kurs, Deneyim ve Alışveriş",
    keywords: ['Şanlıurfa el sanatları kursu', 'Urfa bakır atölyesi', 'Şanlıurfa kilim yapımı'],
    category: 'kultur-ve-etkinlik',
    tags: ['el-sanatlari', 'atolye', 'kurs', 'geleneksel-zanaat'],
    prompt: `"Şanlıurfa'da El Sanatları Atölyeleri: Kurs ve Deneyimler" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın geleneksel el sanatları atölyeleri ve turistlerin nasıl deneyimleyebileceği.
Öne çıkan konular: Şanlıurfa'nın ana el sanatları (bakır işlemeciliği, kilim dokumacılığı, telkari gümüş, hasır örgüsü), Bakırcılar Çarşısı'nda usta ziyaretleri ve gözlem imkânı, kısa süreli kurs ve atölye seçenekleri, sanatçı evleri ve kooperatifler, ne kadar sürede ne öğrenilir, ürün satın alma vs. yapım deneyimi, fiyat rehberi, en uygun ziyaret saatleri.
Anahtar kelimeler: Şanlıurfa el sanatları atölyesi, Urfa bakır işçiliği kursu, Şanlıurfa kilim dokuma deneyimi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa'da Ramazan: Oruç Ayında Şehrin Ruhu ve Gelenek",
    keywords: ['Şanlıurfa Ramazan', 'Urfa iftar geleneği', 'Şanlıurfa Ramazan etkinlikleri'],
    category: 'kultur-ve-etkinlik',
    tags: ['ramazan', 'iftar', 'gelenek', 'dini-kultur'],
    prompt: `"Urfa'da Ramazan: Oruç Ayında Şehrin Ruhu ve Gelenek" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'da Ramazan ayının kültürel ve dini atmosferi.
Öne çıkan konular: Ramazan ayında Şanlıurfa'nın değişen ritmi (iftar topları, davul sesleri), Balıklıgöl ve Dergah çevresinin iftarda kalabalık görünümü, iftarın en iyi yapıldığı mekanlar (belediye iftar çadırları, restoranlar), sahur kültürü ve sahur yemekleri, Ramazan gecesi sıra geceleri, Kapalı Çarşı'da Ramazan alışverişi, turistler için Ramazan döneminde dikkat edilecekler, Ramazan konserler ve etkinlikler.
Anahtar kelimeler: Şanlıurfa Ramazan atmosferi, Urfa iftar nerede yapılır, Şanlıurfa Ramazan kültürü
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Havuz ve Doğal Yüzme Yerleri: Yazın Serin Kalma Rehberi",
    keywords: ['Şanlıurfa yüzme yeri', 'Urfa havuz', 'Şanlıurfa yazın serinlemek'],
    category: 'gezi-rehberi',
    tags: ['havuz', 'yuzme', 'yaz', 'serin-mekanlar'],
    prompt: `"Şanlıurfa'da Havuz ve Doğal Yüzme Yerleri" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın aşırı sıcağında serinleme seçenekleri — havuzlar ve doğal yüzme alanları.
Öne çıkan konular: Otel havuzları ve günlük bilet imkânları, Bozova Atatürk Barajı kıyısında yüzme, Hilvan kaplıcaları su parkı seçenekleri, Halfeti'de Fırat kenarı ve tekne tenezzühü, şehir içi kapalı yüzme havuzları, giriş fiyatları ve saatleri, çocuklar için güvenli seçenekler, yazın Şanlıurfa'da spor aktiviteleri.
Anahtar kelimeler: Şanlıurfa yüzme nerede, Urfa yazın serinleme yerleri, Şanlıurfa havuz günlük bilet
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'dan Mardin'e: İki Tarihi Şehri Birleştiren Gezi Rotası",
    keywords: ['Şanlıurfa Mardin arası', 'Mardin günübirlik', 'Güneydoğu Türkiye turu'],
    category: 'gezi-rehberi',
    tags: ['mardin', 'gunubirlik', 'komsu-sehir', 'tarihi-sehirler'],
    prompt: `"Şanlıurfa'dan Mardin'e: İki Tarihi Şehri Birleştiren Gezi Rotası" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'dan Mardin'e gezi planı ve iki şehrin karşılaştırması.
Öne çıkan konular: Şanlıurfa-Mardin arası mesafe (~175 km, ~2.5 saat) ve ulaşım, Mardin'de mutlaka görülecek yerler (taş evler, Deyrulzafaran Manastırı, Zinciriye Medresesi), Mardin mutfağı vs. Urfa mutfağı karşılaştırması, tek gün yeterli mi yoksa 2 gün mü, güzergah üzerindeki alternatif duraklar, Midyat ve Hasankeyf kombinasyonu, Güneydoğu Türkiye bölge turu önerileri.
Anahtar kelimeler: Şanlıurfa'dan Mardin nasıl gidilir, Mardin günübirlik rehberi, Şanlıurfa Mardin tur
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa İsot Festivali ve Biber Kültürü: Kapsamlı Rehber",
    keywords: ['Şanlıurfa isot festivali', 'Urfa biber festivali', 'Şanlıurfa isot hasadı'],
    category: 'kultur-ve-etkinlik',
    tags: ['isot-festivali', 'biber-kulturu', 'harvest', 'yerel-etkinlik'],
    prompt: `"Şanlıurfa İsot Festivali ve Biber Kültürü" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın simgesi isot biberinin kültürel önemi ve hasadı.
Öne çıkan konular: İsot nedir ve neden Şanlıurfa'ya özgüldür (toprak, iklim, kurutma yöntemi), isot hasadı mevsimi (Ağustos-Ekim), biber kurutma gelenekleri ve çatı manzaraları, Şanlıurfa'da isot festivali (düzenleniyorsa tarihleri ve program), iscot satın alma yerleri (taze, kurutulmuş, toz), isot mutfakta nasıl kullanılır, ihracat ve markalaşma süreci, turist olarak hasada katılma imkânı.
Anahtar kelimeler: Şanlıurfa isot festivali ne zaman, Urfa biber hasadı görme, Şanlıurfa isot satın alma
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Üniversite Şehri: Harran Üniversitesi ve Öğrenci Yaşamı Rehberi",
    keywords: ['Harran Üniversitesi', 'Şanlıurfa üniversite', 'Şanlıurfa öğrenci yaşamı'],
    category: 'gezi-rehberi',
    tags: ['harran-universitesi', 'ogrenci-yasami', 'universite-sehri', 'egitim'],
    prompt: `"Şanlıurfa Üniversite Şehri: Harran Üniversitesi ve Öğrenci Yaşamı" başlıklı blog yazısı yaz.
Konu: Şanlıurfa'nın üniversite kenti kimliği ve Harran Üniversitesi'nin şehre katkısı.
Öne çıkan konular: Harran Üniversitesi tarihçesi ve kampüsleri, Şanlıurfa'da öğrenci nüfusunun şehri nasıl dönüştürdüğü, üniversite çevresindeki uygun fiyatlı kafeler ve mekanlar, öğrenci bütçesiyle Şanlıurfa'da yaşam maliyeti, Karaköprü ilçesinin öğrenci semti olması, üniversite kültür etkinlikleri ve öğrenci toplulukları, yurt ve konaklama seçenekleri, Harran ovasında kampüs manzarası.
Anahtar kelimeler: Harran Üniversitesi hakkında bilgi, Şanlıurfa'da üniversite hayatı, Şanlıurfa öğrenci şehri
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
