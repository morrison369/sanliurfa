#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { query } from '../../src/lib/postgres.ts';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || !args.has('--apply');
const nowIso = new Date().toISOString();

const localImages = {
  gobeklitepe: '/images/places/gobeklitepe/hero-card.webp',
  balikligol: '/images/places/balikligol/main-card.webp',
  harran: '/images/tarihi-yerler/harran-kumbet-evleri.jpg',
  halfeti: '/images/blog/halfeti.jpg',
  muze: '/images/blog/mozaik-muzesi.jpg',
  kebap: '/images/foods/homepage/urfa-kebabi-card.png',
  cigKofte: '/images/foods/homepage/cig-kofte-card.png',
};

const sourceLinks = {
  kulturGobeklitepe: 'https://www.kulturportali.gov.tr/portal/gobeklitepe',
  unescoGobeklitepe: 'https://whc.unesco.org/en/list/1572',
  balikligol: 'https://kulturportali.gov.tr/turkiye/sanliurfa/gezilecekyer/balikligol',
  harran: 'https://www.kulturportali.gov.tr/turkiye/sanliurfa/gezilecekyer/harran-oren-yeri',
  harranEvleri: 'https://www.kulturportali.gov.tr/turkiye/sanliurfa/gezilecekyer/harran-kumbet-evleri',
  muze: 'https://www.kulturportali.gov.tr/turkiye/sanliurfa/gezilecekyer/sanliurfa-arkeoloji-muzesi-1',
  muzeGov: 'https://muze.gov.tr/muze-detay?DistId=SUM&SectionId=SUM02',
  urfaUlasim: 'https://www.urfaulasim.com.tr/',
};

const posts = [
  {
    slug: 'gobeklitepe-rehberi-ziyaret-bilgileri',
    title: 'Göbeklitepe Rehberi: Şanlıurfa’dan Ulaşım, Ziyaret Planı ve Yakın Rotalar',
    excerpt:
      'Göbeklitepe için hızlı cevap: Şanlıurfa merkezden ulaşım, ziyaret süresi, yakın gezi durakları ve kaynaklı planlama notları.',
    category: 'Gezi',
    tags: ['Göbeklitepe', 'Şanlıurfa gezi rehberi', 'UNESCO', 'tarihi yerler'],
    cover_image: localImages.gobeklitepe,
    seo_title: 'Göbeklitepe Rehberi 2026: Ulaşım, Ziyaret ve Rota',
    seo_description: 'Göbeklitepe gezi rehberi: Şanlıurfa merkezden ulaşım, ziyaret süresi, yakın rotalar ve kaynaklı pratik bilgiler.',
    content: `
<p><strong>Göbeklitepe rehberi</strong>, Şanlıurfa merkezden ören yerine gitmek isteyenler için ulaşım, ziyaret süresi, yakın rota ve hazırlık notlarını tek sayfada toplar. Bu yazı, Kültür Portalı ve UNESCO sayfasındaki doğrulanabilir bilgiler temel alınarak hazırlanmıştır.</p>
<h2>Hızlı cevap: Göbeklitepe’ye gitmeden önce ne bilinmeli?</h2>
<p>Göbeklitepe, Şanlıurfa kent merkezinin kuzeydoğusunda, Örencik Köyü yakınlarında yer alan arkeolojik alandır. Kültür Portalı, alanın kent merkezine yaklaşık 18 kilometre mesafede olduğunu belirtir. Ziyaret için yarım gün ayırmak, müze ve şehir merkezi rotasıyla birlikte en dengeli plandır.</p>
<h2>Göbeklitepe neden önemli?</h2>
<p>UNESCO Dünya Mirası Merkezi, Göbekli Tepe’yi Yukarı Mezopotamya’da erken tarım topluluklarının ortaya çıktığı bölgeyle ilişkilendirir. Kültür Portalı ise alanı Neolitik dönem için anıtsal yapılarıyla benzersiz bir kutsal alan olarak tanımlar.</p>
<table><thead><tr><th>Konu</th><th>Pratik bilgi</th></tr></thead><tbody><tr><td>Konum</td><td>Örencik Köyü yakınları, Şanlıurfa merkez kuzeydoğusu</td></tr><tr><td>Önerilen süre</td><td>2-3 saat; müze eklenirse yarım gün</td></tr><tr><td>Yakın rota</td><td>Şanlıurfa Arkeoloji Müzesi, Balıklıgöl, Harran</td></tr><tr><td>En iyi zaman</td><td>Sabah saatleri veya sıcak aylar dışında ilkbahar/sonbahar</td></tr></tbody></table>
<h2>Şanlıurfa merkezden Göbeklitepe’ye nasıl gidilir?</h2>
<p>Özel araçla gidenler şehir merkezinden kuzeydoğu yönündeki tabelaları takip eder. Toplu ulaşım kullanacak ziyaretçiler, sefer saatlerini gitmeden önce Şanlıurfa ulaşım kanallarından kontrol etmelidir; mevsimsel ve dönemsel saat değişiklikleri olabilir.</p>
<h2>Göbeklitepe ile aynı gün nereler gezilir?</h2>
<p>Sabah Göbeklitepe, öğleden sonra Şanlıurfa Arkeoloji Müzesi ve Balıklıgöl hattı mantıklı bir ilk gün rotasıdır. Harran aynı güne eklenebilir ancak daha rahat plan için ayrı yarım gün ayırmak daha doğrudur.</p>
<h2>Sık sorulan sorular</h2>
<h3>Göbeklitepe çocuklu aileler için uygun mu?</h3>
<p>Evet, ancak açık alan yürüyüşü olduğu için su, şapka ve rahat ayakkabı planı önemlidir. Yaz aylarında öğle saatlerinden kaçınmak daha konforludur.</p>
<h3>Göbeklitepe için rehber gerekir mi?</h3>
<p>Zorunlu değildir; fakat Neolitik dönem, T biçimli dikilitaşlar ve alanın arkeolojik bağlamını anlamak için rehberli anlatım deneyimi güçlendirir.</p>
<h2>Kaynaklar</h2>
<ul><li><a href="${sourceLinks.kulturGobeklitepe}" rel="nofollow noopener">Kültür Portalı: Göbeklitepe</a></li><li><a href="${sourceLinks.unescoGobeklitepe}" rel="nofollow noopener">UNESCO World Heritage Centre: Göbekli Tepe</a></li><li><a href="${sourceLinks.urfaUlasim}" rel="nofollow noopener">Urfa Ulaşım resmi sitesi</a></li></ul>
`,
  },
  {
    slug: 'sanliurfa-gezilecek-10-tarihi-yer',
    title: 'Şanlıurfa’da Gezilecek Tarihi Yerler: Balıklıgöl, Harran, Göbeklitepe ve Müze Rotası',
    excerpt:
      'Şanlıurfa’da tarihi gezi planı yapmak isteyenler için Balıklıgöl, Göbeklitepe, Harran ve müze eksenli kaynaklı rota.',
    category: 'Tarih',
    tags: ['Şanlıurfa tarihi yerler', 'Balıklıgöl', 'Harran', 'Şanlıurfa Arkeoloji Müzesi'],
    cover_image: '/images/blog/tarihi-yerler-rehberi.jpg',
    seo_title: 'Şanlıurfa Tarihi Yerler Rehberi: Kaynaklı Rota',
    seo_description: 'Şanlıurfa tarihi yerler rehberi: Balıklıgöl, Göbeklitepe, Harran ve müze için kaynaklı rota ve pratik notlar.',
    content: `
<p><strong>Şanlıurfa’da gezilecek tarihi yerler</strong> denildiğinde ilk rota Balıklıgöl, Göbeklitepe, Harran ve Şanlıurfa Arkeoloji Müzesi çevresinde şekillenir. Bu rehber, resmi kültür kaynaklarına dayalı kısa cevaplar ve uygulanabilir rota önerileri sunar.</p>
<h2>Hızlı cevap: İlk kez gelen biri nereden başlamalı?</h2>
<p>İlk kez Şanlıurfa’ya gelenler için en verimli sıra Göbeklitepe, Şanlıurfa Arkeoloji Müzesi, Balıklıgöl ve Harran’dır. Merkez içindeki Balıklıgöl ve çarşı hattı yürüyerek gezilebilir; Göbeklitepe ve Harran için ulaşım süresi ayrıca planlanmalıdır.</p>
<h2>Öne çıkan tarihi duraklar</h2>
<table><thead><tr><th>Durak</th><th>Neden gidilir?</th><th>Plan notu</th></tr></thead><tbody><tr><td>Balıklıgöl</td><td>İnanç ve şehir hafızası</td><td>Merkez yürüyüş rotasına uygundur</td></tr><tr><td>Göbeklitepe</td><td>UNESCO Dünya Mirası ve Neolitik dönem</td><td>Sabah saatleri daha konforludur</td></tr><tr><td>Harran Ören Yeri</td><td>Antik kent, höyük ve Harran mimarisi</td><td>Merkez dışı yarım gün rota</td></tr><tr><td>Şanlıurfa Arkeoloji Müzesi</td><td>Neolitik dönem eserleri ve bölge arkeolojisi</td><td>Göbeklitepe öncesi/sonrası anlam katar</td></tr></tbody></table>
<h2>Balıklıgöl çevresinde ne görülür?</h2>
<p>Kültür Portalı, Balıklıgöl’ü Şanlıurfa turizminin çekim alanlarından biri olarak konumlandırır. Balıklıgöl çevresinde Dergah bölgesi, Rızvaniye Camii, Aynzeliha Gölü ve çarşı hattı aynı yürüyüş planına alınabilir.</p>
<h2>Harran neden ayrı planlanmalı?</h2>
<p>Kültür Portalı’na göre Harran Ören Yeri, Şanlıurfa’nın yaklaşık 44 kilometre güneyindedir. Bu nedenle Harran, şehir merkezi yürüyüşünden ayrı düşünülmeli; Harran kümbet evleri ve Ulu Cami çevresiyle birlikte yarım gün olarak planlanmalıdır.</p>
<h2>Kaynaklar</h2>
<ul><li><a href="${sourceLinks.balikligol}" rel="nofollow noopener">Kültür Portalı: Balıklıgöl</a></li><li><a href="${sourceLinks.harran}" rel="nofollow noopener">Kültür Portalı: Harran Ören Yeri</a></li><li><a href="${sourceLinks.harranEvleri}" rel="nofollow noopener">Kültür Portalı: Harran Kümbet Evleri</a></li><li><a href="${sourceLinks.muze}" rel="nofollow noopener">Kültür Portalı: Şanlıurfa Arkeoloji Müzesi</a></li></ul>
`,
  },
  {
    slug: 'sanliurfa-otobus-saatleri-nasil-ogrenilir',
    title: 'Şanlıurfa Otobüs Saatleri Nasıl Öğrenilir? Urfa Kart ve Ulaşım Kontrol Rehberi',
    excerpt:
      'Şanlıurfa otobüs saatleri için resmi ulaşım kanallarını, hat kontrolünü ve seyahat öncesi pratik adımları özetleyen rehber.',
    category: 'Ulaşım',
    tags: ['Şanlıurfa otobüs saatleri', 'Urfa Kart', 'şehir içi ulaşım'],
    cover_image: '/images/blog/urfa-tarihi.webp',
    seo_title: 'Şanlıurfa Otobüs Saatleri: Resmi Kontrol Rehberi',
    seo_description: 'Şanlıurfa otobüs saatleri için resmi ulaşım kanalı, hat kontrolü ve seyahat öncesi pratik adımlar.',
    content: `
<p><strong>Şanlıurfa otobüs saatleri</strong> dönemsel düzenlemelerden etkilenebildiği için en sağlıklı kontrol resmi ulaşım kanalları üzerinden yapılmalıdır. Bu rehber, şehir içi hat arayan kullanıcıya hızlı ve güvenli kontrol adımları verir.</p>
<h2>Hızlı cevap: Otobüs saatini nereden kontrol etmeliyim?</h2>
<p>Otobüs saatleri için önce Urfa Ulaşım resmi sitesindeki hat ve terminal bilgileri kontrol edilmelidir. Bayram, Ramazan, okul dönemi veya yol çalışması gibi dönemlerde saatler değişebileceği için yola çıkmadan kısa süre önce yeniden kontrol yapmak gerekir.</p>
<h2>Seyahatten önce 4 adım</h2>
<ol><li>Gideceğiniz ilçe veya mahalle adını netleştirin.</li><li>Hat numarası veya güzergah adını resmi ulaşım kanalında arayın.</li><li>İlk/son sefer saatini ve dönüş saatini ayrı ayrı kontrol edin.</li><li>Aktarma gerekiyorsa ikinci hattın bekleme süresini hesaba katın.</li></ol>
<h2>Hangi durumlarda saatler değişebilir?</h2>
<p>Resmi tatiller, dini bayramlar, Ramazan düzenlemeleri, okul sezonu ve yoğun etkinlik günleri toplu taşıma saatlerini etkileyebilir. Bu nedenle eski ekran görüntülerine veya sosyal medya paylaşımlarına güvenmek yerine güncel resmi sayfayı kontrol etmek daha güvenlidir.</p>
<h2>Kaynaklar</h2>
<ul><li><a href="${sourceLinks.urfaUlasim}" rel="nofollow noopener">Urfa Ulaşım resmi sitesi</a></li></ul>
`,
  },
];

const places = [
  {
    slug: 'gobeklitepe-oren-yeri',
    name: 'Göbeklitepe Ören Yeri',
    short_description: 'UNESCO Dünya Mirası listesinde yer alan Neolitik dönem arkeolojik alanı.',
    description:
      'Göbeklitepe Ören Yeri, Şanlıurfa merkezden yaklaşık 18 kilometre kuzeydoğuda, Örencik Köyü yakınlarında yer alan arkeolojik alandır. Ziyaret planı için resmi saat ve ulaşım bilgileri gitmeden önce kontrol edilmelidir.',
    image_url: localImages.gobeklitepe,
    address: 'Örencik Köyü yakınları, Haliliye/Şanlıurfa',
    latitude: 37.2231,
    longitude: 38.9222,
  },
  {
    slug: 'balikligol',
    name: 'Balıklıgöl',
    short_description: 'Şanlıurfa merkezde inanç, tarih ve şehir hafızasını birleştiren simge rota.',
    description:
      'Balıklıgöl, Şanlıurfa merkezde Dergah bölgesi, Aynzeliha Gölü, Rızvaniye Camii ve tarihi çarşı rotasıyla birlikte yürüyerek gezilebilen ana duraklardan biridir.',
    image_url: localImages.balikligol,
    address: 'Balıklıgöl çevresi, Eyyübiye/Şanlıurfa',
    latitude: 37.1591,
    longitude: 38.7969,
  },
  {
    slug: 'harran-antik-kenti',
    name: 'Harran Antik Kenti',
    short_description: 'Kümbet evleri, höyük alanı ve antik kent dokusuyla Şanlıurfa’nın merkez dışı ana rotası.',
    description:
      'Harran Antik Kenti, Şanlıurfa’nın güneyinde yer alan ve ören yeri, kümbet evleri, höyük ve Ulu Cami çevresiyle yarım günlük gezi planı isteyen tarihi bölgedir.',
    image_url: localImages.harran,
    address: 'Harran/Şanlıurfa',
    latitude: 36.86,
    longitude: 39.03,
  },
];

function assertLocalImage(value) {
  if (!value || (!value.startsWith('/images/') && !value.startsWith('/uploads/'))) {
    throw new Error(`Dış görsel URL reddedildi: ${value}`);
  }
}

function pickColumns(columns, values) {
  const out = {};
  for (const [key, value] of Object.entries(values)) {
    if (columns.has(key) && value !== undefined) out[key] = value;
  }
  return out;
}

async function getColumns(table) {
  const result = await query(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = $1`,
    [table],
  );
  return new Map(result.rows.map((row) => [row.column_name, row]));
}

async function getAuthorId(blogColumns) {
  if (!blogColumns.has('author_id')) return null;
  const user = await query(`SELECT id FROM users ORDER BY created_at NULLS LAST LIMIT 1`).catch(() => ({ rows: [] }));
  return user.rows[0]?.id || null;
}

async function upsertBlogPost(blogColumns, authorId, post) {
  assertLocalImage(post.cover_image);
  const readTime = Math.max(2, Math.ceil(post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200));
  const values = pickColumns(blogColumns, {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    category: post.category,
    tags: post.tags,
    status: 'published',
    published: true,
    is_featured: true,
    cover_image: post.cover_image,
    featured_image: post.cover_image,
    thumbnail: post.cover_image,
    seo_title: post.seo_title,
    seo_description: post.seo_description,
    seo_keywords: post.tags.join(', '),
    read_time_minutes: readTime,
    published_at: nowIso,
    updated_at: nowIso,
    created_at: nowIso,
    author_id: authorId,
  });

  const updateKeys = Object.keys(values).filter((key) => key !== 'slug' && key !== 'created_at');
  const updateParams = updateKeys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const updateResult = await query(
    `UPDATE blog_posts SET ${updateParams} WHERE slug = $${updateKeys.length + 1}`,
    [...updateKeys.map((key) => values[key]), post.slug],
  );
  if (updateResult.rowCount > 0) return 'updated';

  const keys = Object.keys(values);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  await query(
    `INSERT INTO blog_posts (${keys.join(', ')}) VALUES (${placeholders})`,
    keys.map((key) => values[key]),
  );
  return 'inserted';
}

async function upsertPlace(placeColumns, place) {
  assertLocalImage(place.image_url);
  const existing = await query(`SELECT id FROM places WHERE slug = $1 LIMIT 1`, [place.slug]).catch(() => ({ rows: [] }));
  const baseValues = {
    name: place.name,
    slug: place.slug,
    short_description: place.short_description,
    description: place.description,
    image_url: place.image_url,
    cover_image: place.image_url,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    status: 'active',
    is_featured: true,
    is_verified: true,
    updated_at: nowIso,
  };
  if (existing.rows[0]?.id) {
    const values = pickColumns(placeColumns, baseValues);
    const keys = Object.keys(values).filter((key) => key !== 'slug');
    await query(
      `UPDATE places SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(', ')} WHERE slug = $${keys.length + 1}`,
      [...keys.map((key) => values[key]), place.slug],
    );
    return 'updated';
  }

  const values = pickColumns(placeColumns, {
    id: placeColumns.has('id') ? randomUUID() : undefined,
    ...baseValues,
    created_at: nowIso,
  });
  const keys = Object.keys(values);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  try {
    await query(
      `INSERT INTO places (${keys.join(', ')}) VALUES (${placeholders})`,
      keys.map((key) => values[key]),
    );
    return 'inserted';
  } catch (error) {
    return `skipped insert (${error instanceof Error ? error.message : String(error)})`;
  }
}

async function main() {
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      posts: posts.map((post) => ({ slug: post.slug, title: post.title, cover_image: post.cover_image })),
      places: places.map((place) => ({ slug: place.slug, name: place.name, image_url: place.image_url })),
    }, null, 2));
    return;
  }

  const blogColumns = await getColumns('blog_posts');
  const placeColumns = await getColumns('places');
  const authorId = await getAuthorId(blogColumns);
  if (blogColumns.has('author_id') && !authorId) {
    const meta = blogColumns.get('author_id');
    if (meta?.is_nullable === 'NO' && !meta?.column_default) {
      throw new Error('blog_posts.author_id zorunlu ama users tablosunda yazar bulunamadı');
    }
  }

  for (const post of posts) {
    const action = await upsertBlogPost(blogColumns, authorId, post);
    console.log(`blog ${action}: ${post.slug}`);
  }

  for (const place of places) {
    const action = await upsertPlace(placeColumns, place);
    console.log(`place ${action}: ${place.slug}`);
  }

  console.log('seed-local-seo-content: PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
