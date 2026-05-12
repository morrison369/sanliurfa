#!/usr/bin/env node
/**
 * OAuth Consent Screen yapılandırma + GA4 + GSC kurulumu.
 * 1. gcloud token ile test kullanıcısı eklemeyi dener
 * 2. Scope ekleme için Cloud Console URL gösterir, Enter bekler
 * 3. google-full-setup.mjs --auto başlatır
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const PROJECT        = 'sanliurfa-com-2026';
const PROJECT_NUMBER = '652938049971';
const CLIENT_ID      = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET  = process.env.GOOGLE_CLIENT_SECRET || '';
if (!CLIENT_ID || !CLIENT_SECRET) { console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'); process.exit(1); }
const TEST_USER      = 'elginozoguz@gmail.com';

// Gerekli OAuth scopes
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
];

function gcloud(args) {
  const r = spawnSync('gcloud', args, { encoding: 'utf8', shell: true });
  return { out: r.stdout?.trim() ?? '', err: r.stderr?.trim() ?? '', code: r.status ?? 1 };
}

function prompt(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(msg, ans => { rl.close(); resolve(ans); }));
}

// gcloud access token al
function getToken() {
  const r = gcloud(['auth', 'print-access-token']);
  if (r.code !== 0) throw new Error('gcloud token alinamadi: ' + r.err);
  return r.out;
}

// Test kullanicisi eklemeyi dene (IAP brands API)
async function tryAddTestUser(token) {
  // Brands listesi
  const listResp = await fetch(
    `https://iap.googleapis.com/v1/projects/${PROJECT_NUMBER}/brands`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listResp.json();

  if (listData.error) {
    console.log('  ℹ️  Brands API erişimi yok (beklenen). Manuel adım gerekiyor.');
    return false;
  }

  const brands = listData.brands ?? [];
  if (!brands.length) {
    console.log('  ℹ️  Brand bulunamadı — manuel consent screen ayarı gerekiyor.');
    return false;
  }

  const brandName = brands[0].name;
  console.log(`  Brand: ${brandName}`);

  // Test kullanicisi PATCH denemesi
  const patchResp = await fetch(
    `https://iap.googleapis.com/v1/${brandName}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ testUsers: [TEST_USER], supportEmail: TEST_USER }),
    }
  );
  const patchData = await patchResp.json();

  if (patchData.error) {
    console.log('  ℹ️  Test kullanicisi API ile eklenemedi:', patchData.error.message?.slice(0, 80));
    return false;
  }
  console.log('  ✓ Test kullanicisi API ile eklendi (veya zaten var).');
  return true;
}

// ─── Ana akış ───────────────────────────────────────────────────────────────

console.log('\n───────────────────────────────────────────────────');
console.log(' OAuth Consent Screen Yapılandırması');
console.log('───────────────────────────────────────────────────\n');

let token;
try {
  token = getToken();
  console.log('✓ gcloud token alındı.\n');
} catch (e) {
  console.error('✗', e.message);
  console.log('\nÇözüm: Google Cloud SDK Shell\'de şunu çalıştırın:');
  console.log('  gcloud auth login');
  process.exit(1);
}

// Test kullanıcısı ekleme denemesi
console.log('Test kullanıcısı ekleniyor...');
await tryAddTestUser(token);

// ─── Manuel adım: Scope ekleme ────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════');
console.log('  ZORUNLU MANUEL ADIM (yaklaşık 2 dakika)');
console.log('════════════════════════════════════════════════════');
console.log();
console.log('  Tarayıcıda şu URL\'yi açın:');
console.log();
console.log(`  https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT}`);
console.log();
console.log('  1. "Kapsam Ekle veya Kaldır" butonuna tıklayın');
console.log('  2. Arama kutusuna sırayla yazın ve ekleyin:');
console.log('     - "analytics.edit"  → Google Analytics API: analytics.edit');
console.log('     - "webmasters"      → Search Console API: webmasters');
console.log('     - "siteverification"→ Site Verification API: siteverification');
console.log('  3. "Güncelle" → "Kaydet ve Devam Et"');
console.log('  4. "Test Kullanıcıları" bölümüne şunu ekleyin:');
console.log(`     ${TEST_USER}`);
console.log('  5. "Kaydet ve Devam Et" → "Panele Dön"');
console.log();
console.log('════════════════════════════════════════════════════');

// Tarayiciyi aç
spawnSync('powershell.exe', [
  '-NoProfile', '-Command',
  `Start-Process "https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT}"`
], { shell: false });

await prompt('\n  Adımları tamamladıktan sonra ENTER\'a basın...');

// ─── GA4 + GSC OAuth kurulumu ────────────────────────────────────────────
console.log('\n✓ Devam ediliyor — Google OAuth + GA4 + GSC kurulumu başlatılıyor...\n');

const setupResult = spawnSync(
  'node',
  [path.join(scriptDir, 'google-full-setup.mjs'), '--auto', CLIENT_ID, CLIENT_SECRET],
  { stdio: 'inherit', shell: true }
);

process.exit(setupResult.status ?? 0);
