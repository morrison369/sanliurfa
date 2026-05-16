import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const taxonomy = read('src/data/city-taxonomy.ts');
const categoryHub = read('src/components/public/CategoryHub.astro');
const homepage = read('src/components/home/CityGuideLanding.astro');
const header = read('src/components/Header.astro');
const footer = read('src/components/Footer.astro');
const eslesme = read('src/pages/eslesme.astro');
const topluluk = read('src/pages/topluluk.astro');
const middleware = read('src/middleware.ts');

for (const token of [
  'Yeme İçme',
  'Konaklama',
  'Sağlık',
  'Eğitim',
  'Resmi Kurumlar',
  'Ulaşım',
  'Otomotiv',
  'Alışveriş',
  'Ev ve Yaşam',
  'Hizmetler',
  'Hukuk ve Finans',
  'Emlak',
  'Turizm ve Gezilecek Yerler',
  'Eğlence ve Sosyal Yaşam',
  'Spor ve Fitness',
  'Aile ve Çocuk',
  'Dini ve Kültürel Yerler',
  'İş Dünyası ve Sanayi',
  'Tarım ve Hayvancılık',
  'Acil Durum',
  'Medya ve İletişim',
  'Topluluk',
]) {
  assert(taxonomy.includes(token), `taxonomy ana kategori eksik: ${token}`);
}

for (const district of [
  'eyyubiye',
  'haliliye',
  'karakopru',
  'siverek',
  'viransehir',
  'suruc',
  'birecik',
  'akcakale',
  'ceylanpinar',
  'hilvan',
  'bozova',
  'halfeti',
  'harran',
]) {
  assert(taxonomy.includes(`'${district}'`), `taxonomy ilçe eksik: ${district}`);
}

for (const rel of [
  'src/pages/otomotiv.astro',
  'src/pages/acil-durum.astro',
  'src/pages/hukuk-ve-finans.astro',
  'src/pages/ev-ve-yasam.astro',
  'src/pages/spor-ve-fitness.astro',
  'src/pages/aile-ve-cocuk.astro',
  'src/pages/tarim-ve-hayvancilik.astro',
  'src/pages/medya-ve-iletisim.astro',
  'src/pages/dini-ve-kulturel-yerler.astro',
  'src/pages/is-dunyasi-ve-sanayi.astro',
]) {
  assert(exists(rel), `kategori hub sayfası eksik: ${rel}`);
  if (exists(rel)) {
    assert(read(rel).includes('CategoryHub'), `${rel} CategoryHub kullanmıyor`);
  }
  const publicPath = `/${path.basename(rel, '.astro')}`;
  assert(middleware.includes(`'${publicPath}'`), `middleware public whitelist eksik: ${publicPath}`);
}

assert(categoryHub.includes('FAQ') || categoryHub.includes('Hızlı Cevap'), 'CategoryHub hızlı cevap bloğu eksik');
assert(homepage.includes('getSiteSetting'), 'Ana sayfa admin/site-content fallback sistemine bağlı değil');
assert(homepage.includes('getPrimaryCityTaxonomyCategories'), 'Ana sayfa merkezi taxonomy kullanmıyor');
assert(homepage.includes('/images/home/collage/balikligol.webp'), 'Ana sayfa Balıklıgöl gerçek local görselini kullanmıyor');
assert(homepage.includes('/images/home/collage/gobeklitepe.webp'), 'Ana sayfa Göbeklitepe gerçek local görselini kullanmıyor');
assert(!homepage.includes('/images/blog/balikligol.jpg'), 'Ana sayfa alakasız Balıklıgöl blog görselini kullanıyor');
assert(header.includes('/yeme-icme') && header.includes('/saglik') && header.includes('/konaklama'), 'Header kategori omurgası eksik');
assert(header.includes('/topluluk') && header.includes('/eslesme'), 'Header sosyal/eşleşme girişleri eksik');
assert(footer.includes('/eslesme') && footer.includes('/topluluk'), 'Footer sosyal/eşleşme girişleri eksik');
assert(eslesme.includes('SwipeMatchExperience') && eslesme.includes('Şanlıurfa’da Eşleş'), '/eslesme premium sosyal yüzeyi eksik');
assert(topluluk.includes('SocialFeatures') && topluluk.includes('/eslesme'), '/topluluk sosyal girişleri eksik');

if (failures.length > 0) {
  console.error('public-city-structure-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('public-city-structure-gate: PASS');
