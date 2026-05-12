#!/usr/bin/env node
/**
 * Playwright ile Google Cloud Console OAuth consent screen otomasyonu:
 * 1. Test kullanıcısı ekle (elginozoguz@gmail.com)
 * 2. Scopes ekle (analytics.edit, webmasters, siteverification)
 *
 * Kullanıcının mevcut Chrome oturumunu kullanır (zaten login).
 */
import { chromium } from 'playwright';
import path from 'node:path';

const PROJECT = 'sanliurfa-com-2026';
const TEST_USER = 'elginozoguz@gmail.com';
const CONSENT_URL = `https://console.cloud.google.com/apis/credentials/consent?project=${PROJECT}`;

const SCOPES_TO_ADD = [
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
];

// Chrome kullanıcı profil yolu
const CHROME_PROFILE = 'C:\\Users\\Oguz\\AppData\\Local\\Google\\Chrome\\User Data';
const EDGE_PROFILE   = 'C:\\Users\\Oguz\\AppData\\Local\\Microsoft\\Edge\\User Data';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function tryClickText(page, text, timeout = 5000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    return true;
  } catch { return false; }
}

async function tryClickRole(page, role, name, timeout = 5000) {
  try {
    await page.getByRole(role, { name, exact: false }).first().click({ timeout });
    return true;
  } catch { return false; }
}

let context;
try {
  console.log('Chrome profili ile açılıyor...');
  context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel: 'chrome',
    headless: false,
    args: ['--no-first-run', '--no-default-browser-check'],
    ignoreDefaultArgs: ['--enable-automation'],
  });
} catch (e) {
  console.log('Chrome başarısız, Edge deneniyor...');
  try {
    context = await chromium.launchPersistentContext(EDGE_PROFILE, {
      channel: 'msedge',
      headless: false,
      args: ['--no-first-run', '--no-default-browser-check'],
      ignoreDefaultArgs: ['--enable-automation'],
    });
  } catch (e2) {
    console.log('Profil ile açılamadı, fresh browser deneniyor...');
    const browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
  }
}

const page = await context.newPage();
page.setDefaultTimeout(15000);

console.log('\nOAuth consent screen yükleniyor...');
await page.goto(CONSENT_URL, { waitUntil: 'domcontentloaded' });
await wait(3000);

// Login kontrolü
const currentUrl = page.url();
if (currentUrl.includes('accounts.google.com') || currentUrl.includes('/signin')) {
  console.log('\n⚠️  Google login gerekiyor. Tarayıcıda elginozoguz@gmail.com ile giriş yapın.');
  await page.waitForURL(/console\.cloud\.google\.com/, { timeout: 120000 });
  await wait(3000);
}

console.log('Sayfa yüklendi:', page.url().slice(0, 80));
await wait(2000);

// ─── 1. Test Kullanıcısı Ekle ────────────────────────────────────────────────
console.log('\n[1/3] Test kullanıcısı aranıyor...');

// Sayfayı aşağı kaydır
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await wait(1000);

// "Test kullanıcıları" / "Test users" bölümü
let addUserClicked = false;

// Çeşitli buton selektörleri dene
const addUserSelectors = [
  'button:has-text("Kullanıcı ekle")',
  'button:has-text("Add users")',
  'button:has-text("+ Add Users")',
  '[aria-label*="Add users"]',
  '[aria-label*="kullanıcı"]',
  'button:has-text("Ekle")',
];

for (const sel of addUserSelectors) {
  try {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      addUserClicked = true;
      console.log('  ✓ "Kullanıcı ekle" butonu tıklandı');
      break;
    }
  } catch { }
}

if (!addUserClicked) {
  // Metin arama ile bul
  const found = await tryClickText(page, 'Kullanıcı ekle') ||
                await tryClickText(page, 'Add users') ||
                await tryClickText(page, '+ Add Users');
  if (found) {
    addUserClicked = true;
    console.log('  ✓ Kullanıcı ekle (text match)');
  }
}

if (addUserClicked) {
  await wait(1500);

  // Email input
  const emailInputSels = [
    'input[type="email"]',
    'input[placeholder*="email"]',
    'input[placeholder*="Email"]',
    'input[aria-label*="email"]',
    'mat-chip-input',
    '.mat-chip-input',
  ];

  let emailInputFilled = false;
  for (const sel of emailInputSels) {
    try {
      const inp = page.locator(sel).first();
      if (await inp.isVisible({ timeout: 2000 })) {
        await inp.fill(TEST_USER);
        await page.keyboard.press('Enter');
        emailInputFilled = true;
        console.log(`  ✓ Email girildi: ${TEST_USER}`);
        break;
      }
    } catch { }
  }

  if (emailInputFilled) {
    await wait(1000);
    // Kaydet
    const saved = await tryClickRole(page, 'button', 'Kaydet') ||
                  await tryClickRole(page, 'button', 'Save') ||
                  await tryClickText(page, 'Kaydet') ||
                  await tryClickText(page, 'Save');
    if (saved) console.log('  ✓ Test kullanıcısı kaydedildi');
    await wait(2000);
  } else {
    console.log('  ⚠️  Email input bulunamadı — manuel ekleyin');
  }
} else {
  console.log('  ⚠️  "Kullanıcı ekle" butonu bulunamadı — belki zaten eklenmiş?');
}

// ─── 2. Scopes Ekle ──────────────────────────────────────────────────────────
console.log('\n[2/3] Kapsam ekleme...');

const scopeSelectors = [
  'button:has-text("Kapsam ekle veya kaldır")',
  'button:has-text("Add or Remove Scopes")',
  'button:has-text("Kapsam")',
  'button:has-text("Scopes")',
  '[aria-label*="kapsam"]',
  '[aria-label*="scope"]',
];

let scopeClicked = false;
for (const sel of scopeSelectors) {
  try {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      scopeClicked = true;
      console.log('  ✓ Kapsam butonu tıklandı');
      break;
    }
  } catch { }
}

if (!scopeClicked) {
  scopeClicked = await tryClickText(page, 'Kapsam ekle') ||
                 await tryClickText(page, 'Add or Remove Scopes') ||
                 await tryClickText(page, 'Scopes');
}

if (scopeClicked) {
  await wait(2000);

  // Scope arama kutusuna yaz
  const searchInputSels = [
    'input[placeholder*="ara"]',
    'input[placeholder*="Filter"]',
    'input[placeholder*="Search"]',
    'input[type="search"]',
    '.filter-input input',
    'mat-form-field input',
  ];

  for (const scope of SCOPES_TO_ADD) {
    const scopeName = scope.split('/').pop(); // analytics.edit, webmasters, siteverification
    console.log(`  Scope aranıyor: ${scopeName}`);

    let searchFilled = false;
    for (const sel of searchInputSels) {
      try {
        const inp = page.locator(sel).first();
        if (await inp.isVisible({ timeout: 2000 })) {
          await inp.fill(scopeName);
          await wait(1500);
          searchFilled = true;
          break;
        }
      } catch { }
    }

    if (searchFilled) {
      // Checkbox'ı bul ve tıkla
      try {
        const checkbox = page.locator(`tr:has-text("${scope}") input[type="checkbox"]`).first();
        if (await checkbox.isVisible({ timeout: 3000 })) {
          const checked = await checkbox.isChecked();
          if (!checked) {
            await checkbox.click();
            console.log(`  ✓ ${scopeName} seçildi`);
          } else {
            console.log(`  ✓ ${scopeName} zaten seçili`);
          }
        } else {
          // Genel checkbox
          const cb = page.locator('input[type="checkbox"]').first();
          if (await cb.isVisible({ timeout: 2000 })) {
            await cb.click();
            console.log(`  ✓ ${scopeName} seçildi (genel)`);
          }
        }
      } catch (e) {
        console.log(`  ⚠️  ${scopeName} checkbox bulunamadı`);
      }
      await wait(500);
    }
  }

  // "Güncelle" / Update butonu
  const updated = await tryClickRole(page, 'button', 'Güncelle') ||
                  await tryClickRole(page, 'button', 'Update') ||
                  await tryClickText(page, 'Güncelle') ||
                  await tryClickText(page, 'Update');
  if (updated) {
    console.log('  ✓ Kapsamlar güncellendi');
    await wait(2000);
  }
} else {
  console.log('  ⚠️  Kapsam butonu bulunamadı');
}

// ─── 3. Kaydet ───────────────────────────────────────────────────────────────
console.log('\n[3/3] Kaydediliyor...');
await tryClickRole(page, 'button', 'Kaydet') ||
await tryClickRole(page, 'button', 'Save') ||
await tryClickText(page, 'Kaydet ve devam et') ||
await tryClickText(page, 'Save and continue');
await wait(2000);

console.log('\n✅ Playwright otomasyonu tamamlandı.');
console.log('   Tarayıcı açık kalıyor — kontrol edin, sonra kapatabilirsiniz.');
console.log('\n   Şimdi şu komutu çalıştırın:');
console.log('   node scripts/google-full-setup.mjs --auto $GOOGLE_CLIENT_ID $GOOGLE_CLIENT_SECRET');

// 30 saniye bekle, kullanıcı kontrol edebilsin
await wait(30000);
await context.close();
