#!/usr/bin/env node
/**
 * Batch 2 — 15 yeni blog yazısı: alışveriş, ulaşım, fotoğraf, gastronomi, kültür.
 * Kullanım: node scripts/ollama-generate-batch2-blogs.mjs [--dry-run]
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
const MODEL      = ollamaCfg.MODEL;
const AUTHOR_ID  = '7a2816aa-d85a-481e-aa41-c89380f47d8f';
const SSH_HOST   = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT   = parseInt(process.env.SSH_PORT || '77');
const SSH_USER   = process.env.SSH_USER || 'sanliur';
const SSH_PASS   = process.env.SSH_PASS || '';
const DB_USER    = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME    = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS    = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15435;

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

const SYSTEM = SYSTEM_TR;

const BLOG_TOPICS = [
  {
    title: "Şanlıurfa'da Alışveriş Rehberi: Kapalı Çarşıdan AVM'ye",
    keywords: ["Şanlıurfa alışveriş", "Urfa çarşı", "Şanlıurfa AVM"],
    category: 'alisveris',
    tags: ['alisveris', 'carsi', 'hediyelik', 'sanliurfa'],
    prompt: `"Şanlıurfa'da Alışveriş Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'da alışveriş deneyimi — tarihi çarşılardan modern AVM'lere.
Öne çıkan konular: Kapalı Çarşı ve Ayna Bedesteni (bakır işlemeciliği, kilim, baharatlı gıdalar), Gümrük Hanı, tarihi bit pazarı; Urfa'ya özgü hediyelik eşyalar (isot biberi, tahin-pekmez, el dokuması), yerel kuyumcular; Şanlıurfa AVM'leri (Urfa Park, Piazza). Alışverişte pazarlık kültürü ve dikkat edilecekler.
Anahtar kelimeler: Şanlıurfa alışveriş, Urfa kapalı çarşı, Şanlıurfa hediyelik eşya, Ayna Bedesteni
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Göbeklitepe'ye Nasıl Gidilir: Ulaşım Rehberi 2026",
    keywords: ["Göbeklitepe ulaşım", "Göbeklitepe servis", "Şanlıurfa Göbeklitepe minibüs"],
    category: 'gezi-rehberi',
    tags: ['gobeklitepe', 'ulasim', 'gezi-rehberi', 'pratik-bilgi'],
    prompt: `"Göbeklitepe'ye Nasıl Gidilir" başlıklı pratik bir ulaşım rehberi yaz.
Konu: Şanlıurfa şehir merkezinden Göbeklitepe arkeoloji alanına ulaşım seçenekleri.
Öne çıkan konular: Özel araçla ulaşım (mesafe ~18 km, yol koşulları), dolmuş/minibüs seçeneği (Eyyübiye terminali, sefer saatleri), tur araçları ve oteller arası servisler, taksi ve araç kiralama, bisiklet veya motosikletle gidiş; park alanı, yürüyüş mesafesi, ziyaret öncesi dikkat edilecekler.
Anahtar kelimeler: Göbeklitepe nasıl gidilir, Göbeklitepe ulaşım 2026, Şanlıurfa Göbeklitepe servis, Göbeklitepe taksi ücreti
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Fotoğraf Rehberi: En Güzel Çekim Noktaları",
    keywords: ["Şanlıurfa fotoğraf", "Urfa Instagram", "Şanlıurfa manzara noktaları"],
    category: 'kultur-ve-etkinlik',
    tags: ['fotograf', 'instagram', 'manzara', 'sanliurfa'],
    prompt: `"Şanlıurfa Fotoğraf Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın en fotojenik noktaları ve fotoğraf çekim rehberi.
Öne çıkan konular: Balıklıgöl ve Dergah panoraması (gün batımı altın ışık), Urfa Kalesi'nden şehir manzarası, Harran kümbet evleri (sabah erken ışığı), Kapalı Çarşı içi (doku ve renk), Halfeti'nin su üstü evleri, Atatürk Barajı gün batımı, Siverek Takoran Kanyonu, Göbeklitepe sütunları (büyük açı); en iyi çekim saatleri, izin gerektiren yerler.
Anahtar kelimeler: Şanlıurfa fotoğraf noktaları, Urfa Instagram, Şanlıurfa manzara, Balıklıgöl fotoğraf
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Bütçe Gezisi: Uygun Fiyatlı Tatil Rehberi",
    keywords: ["Şanlıurfa ucuz tatil", "Şanlıurfa bütçe gezi", "Urfa ekonomik seyahat"],
    category: 'gezi-rehberi',
    tags: ['butce-gezi', 'ekonomik', 'tatil-planlama', 'sanliurfa'],
    prompt: `"Şanlıurfa'da Bütçe Gezisi" başlıklı pratik bir blog yazısı yaz.
Konu: Şanlıurfa'yı en az para harcayarak nasıl gezeceğinizi anlatan kapsamlı rehber.
Öne çıkan konular: Ücretsiz gezilecek yerler (Balıklıgöl, Dergah bahçesi, Kaleiçi sokakları), uygun fiyatlı konaklama seçenekleri (pansiyonlar ~300 TL/gece), ucuza yemek (sokak lezzetleri: lahmacun, çiğ köfte, küçük kebapçılar), minibüs ve dolmuş kullanımı, Harran günübirlik dolmuş, ücretsiz müze günleri; 2 günlük örnek bütçe tablosu.
Anahtar kelimeler: Şanlıurfa bütçe gezi, Urfa ucuz tatil, Şanlıurfa ekonomik konaklama, Urfa uygun fiyatlı yemek
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Halfeti'ye Nasıl Gidilir: Ulaşım, Tekne Turu ve Pratik Bilgiler 2026",
    keywords: ["Halfeti ulaşım", "Halfeti tekne turu ücreti", "Şanlıurfa Halfeti nasıl gidilir"],
    category: 'gezi-rehberi',
    tags: ['halfeti', 'ulasim', 'tekne-turu', 'gezi-rehberi'],
    prompt: `"Halfeti'ye Nasıl Gidilir" başlıklı pratik bir blog yazısı yaz.
Konu: Şanlıurfa'dan Halfeti ilçesine ulaşım ve ziyaret rehberi.
Öne çıkan konular: Şanlıurfa şehir merkezinden Halfeti'ye mesafe (~80 km) ve ulaşım seçenekleri (minibüs Yeni Garaj'dan, özel araç, tur araçları); Halfeti'de tekne turu organizasyonu (Rum Kale, sular altı köy, ücret ~200-400 TL kişi başı, süre ~1-2 saat); günübirlik mi konaklamalı mı gitmeli; en iyi ziyaret mevsimi; siyah güller ne zaman açar (Mayıs-Haziran); giriş ücreti ve park yeri.
Anahtar kelimeler: Halfeti nasıl gidilir, Halfeti tekne turu 2026, Halfeti ulaşım, Şanlıurfa Halfeti minibüs
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa Çiğ Köftesi: Tarih, En İyi Mekanlar ve Evde Tarif",
    keywords: ["Urfa çiğ köfte", "Şanlıurfa çiğ köfte tarifi", "Urfa çiğ köfte nerede yenir"],
    category: 'gastronomi',
    tags: ['cig-kofte', 'gastronomi', 'urfa-mutfagi', 'tarif'],
    prompt: `"Urfa Çiğ Köftesi" başlıklı kapsamlı bir gastronomi blog yazısı yaz.
Konu: Şanlıurfa mutfağının simgesi çiğ köfte — tarihçesi, yapılışı ve en iyi yerleri.
Öne çıkan konular: Çiğ köftenin köken hikayesi (Hz. İbrahim efsanesi, Urfa versiyonu), otantik Urfa çiğ köftesinin geleneksel tarifi (bulgur, isot, domates salçası, baharatlar, uzun yoğurma süreci), soğan şalçası ve marul eşliği sunumu; bugün şehirde çiğ köfte bulunabilecek yerler, ev yapımı ile dükkan arasındaki fark; biber miktarı ve acılık düzeyinin yöre kültüründeki yeri.
Anahtar kelimeler: Urfa çiğ köfte tarifi, Şanlıurfa çiğ köfte, Urfa çiğ köfte nerede yenir, geleneksel çiğ köfte
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa Arkeoloji Müzesi Rehberi: Koleksiyonlar ve Ziyaret Bilgileri",
    keywords: ["Şanlıurfa Arkeoloji Müzesi", "Urfa müze ziyaret", "Göbeklitepe müze eserleri"],
    category: 'gezi-rehberi',
    tags: ['muze', 'arkeoloji', 'gobeklitepe', 'tarihi-eserler'],
    prompt: `"Şanlıurfa Arkeoloji Müzesi Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Türkiye'nin en önemli arkeoloji müzelerinden Şanlıurfa Arkeoloji Müzesi'nin eksiksiz ziyaret rehberi.
Öne çıkan konular: Müzenin tarihi ve yeri (Haliliye, Atatürk Bulvarı yakını), Göbeklitepe'ye ait T-şekilli dikilitaşlar ve Neolitik dönem eserleri, Karahantepe buluntuları, Urfa Adamı heykeli (dünyanın en eski doğal büyüklükte insan heykeli), Harran antik kenti eserleri, diğer Mezopotamya buluntuları; ziyaret saatleri, bilet fiyatları 2026, fotoğraf çekim kuralları, müze turu süresi.
Anahtar kelimeler: Şanlıurfa Arkeoloji Müzesi, Urfa Adamı heykeli, Göbeklitepe müze eserleri, Şanlıurfa müze ziyaret saatleri
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Karahantepe Arkeoloji Alanı Ziyaret Rehberi 2026",
    keywords: ["Karahantepe ziyaret", "Karahantepe nerede", "Göbeklitepe Karahantepe farkı"],
    category: 'gezi-rehberi',
    tags: ['karahantepe', 'arkeoloji', 'neolitik', 'gezi-rehberi'],
    prompt: `"Karahantepe Arkeoloji Alanı Ziyaret Rehberi 2026" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın yeni keşfedilen Neolitik tapınak alanı Karahantepe'nin eksiksiz ziyaret rehberi.
Öne çıkan konular: Karahantepe'nin konumu (Tektek Dağları, Şanlıurfa merkeze ~46 km), Göbeklitepe'den farkları ve benzerlikleri, MÖ 9.000-10.000 yıllarına ait buluntular (yüz rölyefleri, fallik sütunlar), kazılar ve devam eden çalışmalar; ziyaret koşulları (hâlâ kazı bölgesi, kısıtlı erişim), nasıl gidilir, rehberli tur seçenekleri, Göbeklitepe ile kombine gezi planı.
Anahtar kelimeler: Karahantepe nerede, Karahantepe ziyaret 2026, Karahantepe nasıl gidilir, Karahantepe Göbeklitepe farkı
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da El Sanatları: Bakır, Kilim ve Hediyelik Eşya Rehberi",
    keywords: ["Şanlıurfa el sanatları", "Urfa bakırcılar", "Şanlıurfa kilim nerede alınır"],
    category: 'kultur-ve-etkinlik',
    tags: ['el-sanatlari', 'bakir', 'kilim', 'hediyelik', 'sanliurfa'],
    prompt: `"Şanlıurfa'da El Sanatları" başlıklı kapsamlı bir kültür blog yazısı yaz.
Konu: Şanlıurfa'nın köklü el sanatları geleneği ve hediyelik eşya rehberi.
Öne çıkan konular: Bakır işlemeciliği ve kazıma sanatı (Kapalı Çarşı'nın bakırcılar çarşısı), Urfa kilimi ve halısı (geometrik motifler, doğal boyalar, fiyat aralıkları), isot biberi ve baharatlı gıdalar (en iyi nereden alınır), tahin-pekmez, hardaliye; Urfa'ya özgü takılar ve mücevher (gümüş işlemeli), el yapımı sabun; hediyelik eşya için en iyi çarşılar ve dükkanlar, ortalama fiyatlar.
Anahtar kelimeler: Şanlıurfa el sanatları, Urfa bakırcılar çarşısı, Şanlıurfa kilim, Urfa isot biberi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da 3 Günlük Gezi Rotası: Kapsamlı Planlama Rehberi",
    keywords: ["Şanlıurfa 3 günlük gezi", "Urfa hafta sonu tatili", "Şanlıurfa gezi planı"],
    category: 'gezi-rehberi',
    tags: ['gezi-plani', '3-gun', 'rota', 'sanliurfa'],
    prompt: `"Şanlıurfa'da 3 Günlük Gezi Rotası" başlıklı kapsamlı bir rehber yaz.
Konu: Şanlıurfa'yı 3 günde en verimli şekilde gezecekler için detaylı rota planı.
1. Gün: Şehir merkezi — Balıklıgöl, Dergah, Urfa Kalesi, Kapalı Çarşı, akşam sıra gecesi
2. Gün: Tarihi tur — Göbeklitepe sabah (erken saatte kalabalık az), öğleden sonra Harran (kümbet evler, Harran Kalesi)
3. Gün: Doğa ve nehir — Halfeti tekne turu ve Rum Kale, dönüşte Birecik (kelaynak kuşları)
Her gün için: önerilen saatler, öğle yemeği yerleri, ulaşım bilgisi, maliyet tahmini.
Anahtar kelimeler: Şanlıurfa 3 günlük gezi planı, Urfa 3 gün ne yapılır, Şanlıurfa hafta sonu rotası
Uzunluk: ~800 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Urfa Kebabı: Şanlıurfa'nın En İyi Kebapçıları 2026",
    keywords: ["Urfa kebabı nerede yenir", "Şanlıurfa en iyi kebapçı", "Urfa kebap restoranı"],
    category: 'gastronomi',
    tags: ['urfa-kebabi', 'kebap', 'gastronomi', 'restoran'],
    prompt: `"Urfa Kebabı: En İyi Kebapçılar 2026" başlıklı kapsamlı bir gastronomi blog yazısı yaz.
Konu: UNESCO Gastronomi Şehri adayı Şanlıurfa'da Urfa kebabı deneyimi ve en iyi mekanlar rehberi.
Öne çıkan konular: Urfa kebabının özellikleri (acısız ama aromatik, kuzu kıyma, isot ve baharatlar, ince uzun şekli), Adana kebabından farkı; şehrin en iyi kebap mahallesi (Kazım Karabekir ve çevresi), geleneksel ve modern mekanlar; pide, ayran ve cacık eşliği; ocakbaşı geleneği ve gece geç saate kadar açık yerler; kebap pişirme sırları.
Anahtar kelimeler: Urfa kebabı nerede yenir, Şanlıurfa kebap 2026, en iyi Urfa kebapçısı, Urfa kebap tarifi
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Kahve Kültürü: Mırra'dan Türk Kahvesine Rehber",
    keywords: ["Mırra kahve Şanlıurfa", "Urfa kahve kültürü", "Şanlıurfa mırra nedir"],
    category: 'yeme-icme',
    tags: ['mirra', 'kahve', 'kultur', 'sanliurfa'],
    prompt: `"Şanlıurfa'da Kahve Kültürü" başlıklı kapsamlı bir kültür blog yazısı yaz.
Konu: Şanlıurfa'nın kendine özgü kahve geleneği, özellikle mırra (acı Arap kahvesi) kültürü.
Öne çıkan konular: Mırra nedir (dibek kahvesi, baharatlı, acı, küçük fincanda içilir), nasıl yapılır (uzun pişirme süreci, kakule, zencefil), sosyal önemi (misafirperverlik sembolü, düğünlerde), mırra etiket kuralları (fincanı sallama geleneği); Şanlıurfa'da mırra içilebilecek otantik mekanlar ve kahvehaneler; Türk kahvesi ile farklılıkları; ne zaman içilir, ev ziyaretlerinde önemi.
Anahtar kelimeler: Mırra nedir, Şanlıurfa mırra kahvesi, Urfa kahve kültürü, mırra nasıl içilir
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Hz. İbrahim'in İzinde: Şanlıurfa'nın Kutsal Mekanları Rehberi",
    keywords: ["Şanlıurfa dini mekanlar", "Hz İbrahim Şanlıurfa", "Urfa kutsal yerler"],
    category: 'gezi-rehberi',
    tags: ['hz-ibrahim', 'dini-mekanlar', 'kutsal', 'sanliurfa'],
    prompt: `"Hz. İbrahim'in İzinde: Şanlıurfa'nın Kutsal Mekanları" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Hz. İbrahim ile özdeşleşen Şanlıurfa'nın dini ve kutsal mekanlarını kapsayan tam rehber.
Öne çıkan konular: Balıklıgöl (Hz. İbrahim'in ateşe atıldığı ve gölün oluştuğu efsane), Mevlid-i Halil Camii ve mağarası (Hz. İbrahim'in doğduğu yer), Halilür Rahman Camii; Dergah kompleksi ve camileri; Ayn-ı Zeliha gölü; Eyyüp Peygamber makamı; Hz. İbrahim ile ilgili halk anlatıları ve ziyaret adabı; hacı ve ziyaretçi profili; en sakin ziyaret saatleri.
Anahtar kelimeler: Şanlıurfa dini mekanlar, Hz İbrahim Şanlıurfa, Balıklıgöl efsanesi, Mevlid-i Halil mağarası
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Kış Gezisi: Kasım-Mart Arası Neler Yapılır?",
    keywords: ["Şanlıurfa kış tatili", "Urfa kışın gezilecek yerler", "Şanlıurfa Aralık Ocak"],
    category: 'gezi-rehberi',
    tags: ['kis-gezisi', 'kis-tatili', 'mevsimsel', 'sanliurfa'],
    prompt: `"Şanlıurfa'da Kış Gezisi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın kış aylarında ziyaret rehberi — neden iyi bir seçim olduğu ve ne yapılabileceği.
Öne çıkan konular: Kış iklimi (Kasım-Şubat, 5-15°C, nadiren kar, yazın aksine kalabalık yok), avantajlar (Göbeklitepe'de serin, Harran'da rahat yürüyüş, Halfeti sessiz); kışın öne çıkan aktiviteler (hamam deneyimi, kahvehane kültürü, sıra gecesi sezonları); kış yemekleri (işkembe, paça, sıcak çorbalar); kışın kapalı olan mekanlar; seyahat uyarıları; Harran Üniversitesi Kış Etkinlikleri; örnek kış hafta sonu programı.
Anahtar kelimeler: Şanlıurfa kışın gezilir mi, Urfa kış tatili, Şanlıurfa Aralık-Ocak, kışın Göbeklitepe
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Şanlıurfa'da Romantik Mekanlar: Çiftler İçin Özel Rehber",
    keywords: ["Şanlıurfa romantik mekanlar", "Urfa çiftler için", "Şanlıurfa balayı"],
    category: 'gezi-rehberi',
    tags: ['romantik', 'ciftler', 'balayı', 'sanliurfa'],
    prompt: `"Şanlıurfa'da Romantik Mekanlar" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'da çiftlerin keyifle vakit geçirebileceği romantik mekan ve aktivite rehberi.
Öne çıkan konular: Gün batımında Balıklıgöl kenarı yürüyüşü, Halfeti'de tekne turu (ikili paketler), Harran'da gece gök gözlemi (ışık kirliliği az), Urfa Kalesi'nden şehir manzarası (gece aydınlatması), butik otellerin bahçe caféleri; romantik yemek için uygun mekanlar (Dergah çevresi yüksek restoranlar); Siverek Takoran Kanyonu sabah yürüyüşü; Şanlıurfa'da balayı paketleri öneren oteller.
Anahtar kelimeler: Şanlıurfa romantik mekanlar, Urfa çiftler için gezi, Şanlıurfa balayı otel, Urfa romantik akşam yemeği
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
        const daysAgo = Math.floor(Math.random() * 21);
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
            AUTHOR_ID, pubDate.toISOString(), topic.keywords,
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
  console.log(`\nGörsel çekmek için:\n  node scripts/fetch-batch2-blog-images.mjs`);
}

main().catch(e => { console.error(e); process.exit(1); });
