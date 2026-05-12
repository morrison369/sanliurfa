#!/usr/bin/env node
/**
 * CDP Chrome'a bağlan, yeni Cloud Console /auth/overview sayfasında
 * test kullanıcısı ve kapsamları ayarla.
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir  = path.dirname(fileURLToPath(import.meta.url));
const PROJECT    = 'sanliurfa-com-2026';
const TEST_USER  = 'elginozoguz@gmail.com';
const CLIENT_ID  = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SEC = process.env.GOOGLE_CLIENT_SECRET || '';
if (!CLIENT_ID || !CLIENT_SEC) { console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET'); process.exit(1); }

// Yeni Cloud Console URL'leri
const AUTH_OVERVIEW = `https://console.cloud.google.com/auth/overview?project=${PROJECT}`;
const AUTH_CLIENTS  = `https://console.cloud.google.com/auth/clients?project=${PROJECT}`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ss(page, name) {
  await page.screenshot({ path: `scripts/${name}.png`, fullPage: false });
  console.log(`  📷 ${name}.png`);
}

async function clickText(page, text, timeout = 8000) {
  try {
    await page.getByText(text, { exact: false }).first().click({ timeout });
    console.log(`  ✓ "${text}" tıklandı`);
    return true;
  } catch { return false; }
}

async function clickBtn(page, label, timeout = 8000) {
  const sels = [
    `button:has-text("${label}")`,
    `[role="button"]:has-text("${label}")`,
    `[aria-label*="${label}"]`,
  ];
  for (const sel of sels) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click({ timeout });
        console.log(`  ✓ "${label}" tıklandı`);
        return true;
      }
    } catch { }
  }
  return false;
}

// CDP bağlantısı
console.log('Chrome CDP bağlanıyor (port 9222)...');
const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx     = browser.contexts()[0];
const page    = ctx.pages()[0] || await ctx.newPage();
page.setDefaultTimeout(15000);

// Yeni auth/overview sayfasına git
console.log('\nCloud Console auth/overview açılıyor...');
await page.goto(AUTH_OVERVIEW, { waitUntil: 'networkidle' });
await wait(3000);
console.log('URL:', page.url().slice(0, 100));
await ss(page, 'ss1-overview');

// Sayfa içeriğini oku
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('İçerik preview:', bodyText.slice(0, 300).replace(/\n+/g, ' '));

// ─── TEST KULLANICISI ─────────────────────────────────────────────────────────
console.log('\n[1/2] Test kullanıcısı ekleniyor...');

// Test users bölümünü bul — "Audience" sekmesinde
const audienceClicked =
  await clickBtn(page, 'Audience') ||
  await clickText(page, 'Audience') ||
  await clickBtn(page, 'Hedef kitle') ||
  await clickText(page, 'Hedef kitle');

if (audienceClicked) {
  await wait(2000);
  await ss(page, 'ss2-audience');
}

// "Test users" veya "Kullanıcı ekle"
const userAdded =
  await clickBtn(page, 'Add users') ||
  await clickBtn(page, 'Kullanıcı ekle') ||
  await clickBtn(page, '+ Add users') ||
  await clickText(page, 'Add users') ||
  await clickText(page, 'Kullanıcı ekle');

if (userAdded) {
  await wait(1500);
  await ss(page, 'ss3-adduser');

  // Email input — görünür input'u bul
  try {
    await page.locator('input').last().fill(TEST_USER, { timeout: 5000 });
    await page.keyboard.press('Enter');
    await wait(500);
    const saved =
      await clickBtn(page, 'Save') ||
      await clickBtn(page, 'Kaydet') ||
      await clickBtn(page, 'Add');
    if (saved) { console.log(`  ✓ ${TEST_USER} test kullanıcısı olarak eklendi`); }
    await wait(2000);
  } catch (e) {
    console.log('  ⚠️  Email girilemedi:', e.message?.slice(0, 60));
  }
} else {
  // Zaten var mı kontrol et
  const bt = await page.evaluate(() => document.body.innerText);
  if (bt.includes('elginozoguz@gmail.com')) {
    console.log('  ✓ elginozoguz@gmail.com zaten test kullanıcısı');
  } else {
    console.log('  ⚠️  Test kullanıcısı bölümü bulunamadı');
    // Tüm linkleri listele
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,[role=tab]'))
        .map(e => e.innerText?.trim() || e.getAttribute('aria-label') || '')
        .filter(Boolean).slice(0, 30)
    );
    console.log('  Elementler:', links.join(' | '));
  }
}

await ss(page, 'ss4-after-user');

// ─── KAPSAMLAR ────────────────────────────────────────────────────────────────
console.log('\n[2/2] Kapsamlar ekleniyor...');

// "Data Access" veya "Scopes" sekmesine git
const dataAccessClicked =
  await clickBtn(page, 'Data Access') ||
  await clickText(page, 'Data Access') ||
  await clickBtn(page, 'Veri erişimi') ||
  await clickText(page, 'Veri erişimi') ||
  await clickBtn(page, 'Scopes') ||
  await clickText(page, 'Scopes');

if (dataAccessClicked) {
  await wait(2000);
  await ss(page, 'ss5-dataaccess');
}

const scopeClicked =
  await clickBtn(page, 'Add or Remove Scopes') ||
  await clickBtn(page, 'Kapsam ekle veya kaldır') ||
  await clickText(page, 'Add or Remove Scopes') ||
  await clickText(page, 'Kapsam ekle');

if (scopeClicked) {
  await wait(2000);
  await ss(page, 'ss6-scopepanel');

  const scopeQueries = ['analytics.edit', 'webmasters', 'siteverification'];

  for (const q of scopeQueries) {
    try {
      // Filter kutusu
      const filter = page.locator('input[placeholder*="Filter"], input[placeholder*="Filtre"], input[type="search"]').first();
      if (await filter.isVisible({ timeout: 3000 })) {
        await filter.fill(q);
        await wait(1500);

        // Checkbox
        const cbs = await page.locator('input[type="checkbox"]').all();
        let added = false;
        for (const cb of cbs) {
          if (await cb.isVisible({ timeout: 1000 })) {
            if (!(await cb.isChecked())) await cb.click();
            console.log(`  ✓ ${q} seçildi`);
            added = true;
            break;
          }
        }
        if (!added) console.log(`  ⚠️  ${q} checkbox yok`);
        await filter.fill('');
        await wait(400);
      }
    } catch (e) { console.log(`  ⚠️  ${q}:`, e.message?.slice(0, 40)); }
  }

  await clickBtn(page, 'Update') || await clickBtn(page, 'Güncelle');
  await wait(2000);
}

// Kaydet
await clickBtn(page, 'Save') || await clickBtn(page, 'Kaydet');
await wait(2000);

await ss(page, 'ss7-done');
console.log('\n✅ Consent screen ayarlandı!');

await browser.close();

// ─── GA4 + GSC OAuth akışı ─────────────────────────────────────────────────
console.log('\nGA4 + GSC OAuth kurulumu başlatılıyor...\n');
const r = spawnSync(
  'node',
  [path.join(scriptDir, 'google-full-setup.mjs'), '--auto', CLIENT_ID, CLIENT_SEC],
  { stdio: 'inherit', shell: true }
);
process.exit(r.status ?? 0);
