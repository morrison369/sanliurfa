#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const legacyDarkColors = [
  '#ede0c6',
  '#c4a882',
  '#7a6b58',
  '#b87333',
  '#9a8470',
];

const legacyPublicPageColors = [
  ...legacyDarkColors,
  '#4a3828',
  '#5a4030',
];

const publicPageColorContractFiles = new Set([
  'src/pages/blog/index.astro',
  'src/pages/blog/[slug].astro',
  'src/pages/tarihi-yerler/index.astro',
  'src/pages/tarihi-yerler/[slug].astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/gezilecek-yerler/[slug].astro',
  'src/pages/yemek-tarifleri/index.astro',
  'src/pages/yemek-tarifleri/[slug].astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/mekanlar/[kategori].astro',
  'src/pages/ilceler/index.astro',
  'src/pages/ilceler/[ilce]/index.astro',
  'src/pages/ilceler/[ilce]/[kategori].astro',
  'src/pages/etkinlikler/index.astro',
  'src/pages/etkinlikler/[slug].astro',
  'src/pages/isletme/index.astro',
  'src/pages/isletme/analytics.astro',
  'src/pages/isletme/panel.astro',
  'src/pages/isletme/pazarlama.astro',
  'src/pages/en-iyi-kebapcilar.astro',
  'src/pages/en-iyi-cigerciler.astro',
  'src/pages/bugun-sanliurfada-ne-yapilir.astro',
  'src/pages/hizmetler/index.astro',
  'src/pages/hizmetler/[kategori].astro',
  'src/pages/alisveris/index.astro',
  'src/pages/alisveris/[kategori].astro',
  'src/pages/giris.astro',
  'src/pages/abonelik.astro',
  'src/pages/icerik.astro',
  'src/pages/icerik-rehberi.astro',
  'src/pages/eslesme.astro',
  'src/pages/gizlilik-politikasi.astro',
  'src/pages/akis.astro',
  'src/pages/ayarlar.astro',
  'src/pages/aktivitelerim/index.astro',
  'src/pages/404.astro',
  'src/pages/500.astro',
  'src/pages/hakkimizda.astro',
  'src/pages/hakkinda.astro',
  'src/pages/iletisim.astro',
  'src/pages/sss.astro',
  'src/pages/gizlilik.astro',
  'src/pages/kvkk.astro',
  'src/pages/kullanim-kosullari.astro',
  'src/pages/cerez-politikasi.astro',
  'src/pages/ulasim/index.astro',
  'src/pages/ulasim/otobus-hatlari.astro',
  'src/pages/ulasim/otobus-saatleri.astro',
  'src/pages/ulasim/ucak-saatleri.astro',
  'src/pages/ulasim/[kategori].astro',
  'src/pages/saglik/index.astro',
  'src/pages/saglik/[kategori].astro',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/egitim/index.astro',
  'src/pages/egitim/[kategori].astro',
  'src/pages/emlak/index.astro',
  'src/pages/emlak/[kategori].astro',
  'src/pages/konaklama/index.astro',
  'src/pages/konaklama/[kategori].astro',
  'src/pages/gastronomi/index.astro',
  'src/pages/yeme-icme/index.astro',
  'src/pages/yeme-icme/[kategori].astro',
  'src/pages/mahalleler/index.astro',
  'src/pages/mahalleler/[ilce]/index.astro',
  'src/pages/mahalleler/[ilce]/[mahalle].astro',
  'src/pages/harita.astro',
  'src/pages/ara.astro',
  'src/pages/kayit.astro',
  'src/pages/sifremi-unuttum.astro',
  'src/pages/sifre-sifirla.astro',
  'src/pages/topluluk.astro',
  'src/pages/takipciler.astro',
  'src/pages/takip-edilenler.astro',
  'src/pages/trend/index.astro',
  'src/pages/kullanicilar.astro',
  'src/pages/oneriler.astro',
  'src/pages/liderlik-tablosu.astro',
  'src/pages/bildirimler/index.astro',
  'src/pages/bildirim-tercihleri.astro',
  'src/pages/mesajlar/index.astro',
  'src/pages/koleksiyonlar/index.astro',
  'src/pages/koleksiyonlar/[id].astro',
  'src/pages/profil/index.astro',
  'src/pages/profil/favoriler.astro',
  'src/pages/profil/yorumlar.astro',
  'src/pages/profil/aktivite.astro',
  'src/pages/profil/bildirimler.astro',
  'src/pages/profil/ayarlar/index.astro',
  'src/pages/profile.astro',
]);

const inlineStyleAllowlist = new Set([
  'src/layouts/Layout.astro',
  'src/pages/404.astro',
  'src/pages/500.astro',
  // Baseline debt: existing public pages that still own legacy page-local CSS.
  // The gate blocks new inline-style expansion while these routes are migrated to templates.
  'src/pages/mekanlar/[kategori].astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/etkinlikler/[slug].astro',
  'src/pages/isletme/index.astro',
  'src/pages/isletme/pazarlama.astro',
  'src/pages/gezilecek-yerler/index.astro',
  'src/pages/isletme/analytics.astro',
  'src/pages/isletme/[slug].astro',
  'src/pages/gezilecek-yerler/[slug].astro',
  'src/pages/isletme/panel.astro',
  'src/pages/etkinlikler/index.astro',
  'src/pages/blog/index.astro',
  'src/pages/ilceler/index.astro',
  'src/pages/tarihi-yerler/index.astro',
  'src/pages/yemek-tarifleri/index.astro',
  'src/pages/tarihi-yerler/[slug].astro',
  'src/pages/yemek-tarifleri/[slug].astro',
  'src/pages/blog/[slug].astro',
  'src/pages/ilceler/[ilce]/[kategori].astro',
  'src/pages/ilceler/[ilce]/index.astro',
  'src/pages/en-iyi-kebapcilar.astro',
  'src/pages/en-iyi-cigerciler.astro',
  'src/pages/bugun-sanliurfada-ne-yapilir.astro',
  'src/pages/hizmetler/index.astro',
  'src/pages/hizmetler/[kategori].astro',
  'src/pages/alisveris/index.astro',
  'src/pages/alisveris/[kategori].astro',
  'src/pages/giris.astro',
  'src/pages/abonelik.astro',
  'src/pages/icerik.astro',
  'src/pages/icerik-rehberi.astro',
  'src/pages/eslesme.astro',
  'src/pages/gizlilik-politikasi.astro',
  'src/pages/akis.astro',
  'src/pages/ayarlar.astro',
  'src/pages/aktivitelerim/index.astro',
  'src/pages/hakkimizda.astro',
  'src/pages/hakkinda.astro',
  'src/pages/iletisim.astro',
  'src/pages/sss.astro',
  'src/pages/gizlilik.astro',
  'src/pages/kvkk.astro',
  'src/pages/kullanim-kosullari.astro',
  'src/pages/cerez-politikasi.astro',
  'src/pages/ulasim/index.astro',
  'src/pages/ulasim/otobus-hatlari.astro',
  'src/pages/ulasim/otobus-saatleri.astro',
  'src/pages/ulasim/ucak-saatleri.astro',
  'src/pages/ulasim/[kategori].astro',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/yeme-icme/index.astro',
  'src/pages/yeme-icme/[kategori].astro',
  'src/pages/mahalleler/index.astro',
  'src/pages/mahalleler/[ilce]/index.astro',
  'src/pages/mahalleler/[ilce]/[mahalle].astro',
  'src/pages/harita.astro',
  'src/pages/gastronomi/index.astro',
  'src/pages/ara.astro',
  'src/pages/kayit.astro',
  'src/pages/sifremi-unuttum.astro',
  'src/pages/sifre-sifirla.astro',
  'src/pages/topluluk.astro',
  'src/pages/takipciler.astro',
  'src/pages/takip-edilenler.astro',
]);

const pageRoots = [
  'src/pages/index.astro',
  'src/pages/blog',
  'src/pages/yemek-tarifleri',
  'src/pages/gezilecek-yerler',
  'src/pages/tarihi-yerler',
  'src/pages/etkinlikler',
  'src/pages/isletme',
  'src/pages/mekanlar',
  'src/pages/ilceler',
  'src/pages/en-iyi-kebapcilar.astro',
  'src/pages/en-iyi-cigerciler.astro',
  'src/pages/bugun-sanliurfada-ne-yapilir.astro',
  'src/pages/hizmetler',
  'src/pages/alisveris',
  'src/pages/giris.astro',
  'src/pages/abonelik.astro',
  'src/pages/icerik.astro',
  'src/pages/icerik-rehberi.astro',
  'src/pages/eslesme.astro',
  'src/pages/gizlilik-politikasi.astro',
  'src/pages/akis.astro',
  'src/pages/ayarlar.astro',
  'src/pages/aktivitelerim',
  'src/pages/404.astro',
  'src/pages/500.astro',
  'src/pages/hakkimizda.astro',
  'src/pages/hakkinda.astro',
  'src/pages/iletisim.astro',
  'src/pages/sss.astro',
  'src/pages/gizlilik.astro',
  'src/pages/kvkk.astro',
  'src/pages/kullanim-kosullari.astro',
  'src/pages/cerez-politikasi.astro',
  'src/pages/ulasim',
  'src/pages/mahalleler',
  'src/pages/saglik/index.astro',
  'src/pages/saglik/[kategori].astro',
  'src/pages/egitim/index.astro',
  'src/pages/egitim/[kategori].astro',
  'src/pages/emlak/index.astro',
  'src/pages/emlak/[kategori].astro',
  'src/pages/konaklama/index.astro',
  'src/pages/konaklama/[kategori].astro',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/gastronomi/index.astro',
  'src/pages/ara.astro',
  'src/pages/kayit.astro',
  'src/pages/sifremi-unuttum.astro',
  'src/pages/sifre-sifirla.astro',
  'src/pages/topluluk.astro',
  'src/pages/takipciler.astro',
  'src/pages/takip-edilenler.astro',
  'src/pages/trend',
  'src/pages/kullanicilar.astro',
  'src/pages/oneriler.astro',
  'src/pages/liderlik-tablosu.astro',
  'src/pages/bildirimler',
  'src/pages/bildirim-tercihleri.astro',
  'src/pages/mesajlar',
  'src/pages/koleksiyonlar',
  'src/pages/profil',
  'src/pages/profile.astro',
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(target) {
  const abs = path.join(root, target);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [target.replace(/\\/g, '/')];

  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(target, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) out.push(...walk(child));
    else if (entry.isFile() && child.endsWith('.astro')) out.push(child);
  }
  return out;
}

const failures = [];

const publicComponents = walk('src/components/public');
for (const rel of publicComponents) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`missing required public component: ${rel}`);
    continue;
  }
  const raw = read(rel).toLowerCase();
  for (const color of legacyDarkColors) {
    if (raw.includes(color)) {
      failures.push(`${rel} uses legacy hard-coded color ${color}; use --public-* tokens`);
    }
  }
}

const globalCss = read('src/styles/global.css');
for (const token of ['--public-bg', '--public-surface', '--public-text', '--public-muted', '--public-accent']) {
  if (!globalCss.includes(token)) {
    failures.push(`src/styles/global.css missing required public token ${token}`);
  }
}

const publicPageFiles = [...new Set(pageRoots.flatMap(walk))];
for (const rel of publicPageFiles) {
  const rawLower = read(rel).toLowerCase();
  if (publicPageColorContractFiles.has(rel)) {
    for (const color of legacyPublicPageColors) {
      if (rawLower.includes(color)) {
        failures.push(`${rel} uses legacy hard-coded color ${color}; use --public-* tokens`);
      }
    }
  }

  if (inlineStyleAllowlist.has(rel)) continue;
  if (rawLower.includes('<style is:inline')) {
    failures.push(`${rel} contains <style is:inline>; move styling to scoped component CSS or shared primitives`);
  }
}

if (failures.length > 0) {
  console.error('public-design-contract-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('public-design-contract-gate: PASS');
