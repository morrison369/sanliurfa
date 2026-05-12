#!/usr/bin/env node
/**
 * PM2 restart sonrası public sayfalara istek atarak in-memory route cache'i ısıtır.
 * Kullanım: node scripts/cache-warm.mjs [--base-url=https://sanliurfa.com]
 */

const baseUrl = (() => {
  const arg = process.argv.find(a => a.startsWith('--base-url='));
  return arg ? arg.split('=')[1] : (process.env.PUBLIC_APP_URL || 'https://sanliurfa.com');
})();

const ROUTES = [
  '/',
  '/mekanlar',
  '/ilceler',
  '/ilceler/eyyubiye',
  '/ilceler/haliliye',
  '/ilceler/karakopru',
  '/ilceler/harran',
  '/ilceler/halfeti',
  '/ilceler/birecik',
  '/ilceler/siverek',
  '/blog',
  '/gezilecek-yerler',
  '/gastronomi',
  '/etkinlikler',
  '/yemek-tarifleri',
  '/harita',
  '/kesfet',
  '/konaklama',
  // Kategori hub sayfaları
  '/dini-ve-kulturel-yerler',
  '/aile-ve-cocuk',
  '/spor-ve-fitness',
  '/ev-ve-yasam',
  '/hukuk-ve-finans',
  '/otomotiv',
  '/tarim-ve-hayvancilik',
  '/medya-ve-iletisim',
  '/is-dunyasi-ve-sanayi',
  // SEO landing sayfaları
  '/bugun-sanliurfada-ne-yapilir',
  '/sanliurfa-kahvalti-mekanlari',
  '/en-iyi-kebapcilar',
  '/en-iyi-cigerciler',
  '/sanliurfa-gece-acik-mekanlar',
  '/sanliurfa-sira-gecesi-mekanlari',
  '/sanliurfada-ne-yenir',
  '/api/health',
];

async function warmRoute(path) {
  const url = baseUrl + path;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'cache-warm/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - start;
    const ok = res.ok ? '✓' : '✗';
    console.log(`  ${ok} ${res.status}  ${ms}ms  ${path}`);
    return res.ok;
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`  ✗ ERR  ${ms}ms  ${path}  (${err.message})`);
    return false;
  }
}

console.log(`Cache warming → ${baseUrl}`);
console.log(`Isıtılacak rota sayısı: ${ROUTES.length}\n`);

let ok = 0;
let fail = 0;
for (const route of ROUTES) {
  const success = await warmRoute(route);
  if (success) ok++; else fail++;
  // 100ms ara — aynı anda çok istek gönderme
  await new Promise(r => setTimeout(r, 100));
}

console.log(`\nTamamlandı: ${ok}/${ROUTES.length} başarılı${fail > 0 ? `, ${fail} hatalı` : ''}.`);
if (fail > 0) process.exit(1);
