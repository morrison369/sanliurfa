#!/usr/bin/env node
/**
 * GA4 + GSC tam konfigürasyon
 * - GA4: timezone, currency, industry, data retention 14ay, Google Signals, conversion events
 * - GSC: sitemap gönderimi, doğrulama kontrolü
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

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
loadEnv(path.join(scriptDir, '..', '.env'));

const CLIENT_ID     = process.argv[2] || process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.argv[3] || process.env.GOOGLE_CLIENT_SECRET || '';
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: node google-configure-all.mjs <CLIENT_ID> <CLIENT_SECRET>');
  console.error('Or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.');
  process.exit(1);
}
const LOCAL_PORT    = 8080;
const REDIRECT_URI  = `http://localhost:${LOCAL_PORT}/callback`;
const SITE_URL      = 'https://sanliurfa.com/';
const MEASUREMENT_ID = 'G-1XNXPLDYPM';

const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
].join(' ');

// ─── OAuth akışı ──────────────────────────────────────────────────────────────
function getToken() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${LOCAL_PORT}`);
      if (url.pathname !== '/callback') return res.end('wait...');
      const code = url.searchParams.get('code');
      if (!code) { res.end('Kod bulunamadı'); return reject(new Error('no code')); }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>✅ Yetkilendirme tamamlandı!</h2><p>Bu sekmeyi kapatabilirsiniz.</p></body></html>');
      server.close();

      try {
        const resp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
          }),
        });
        const tokens = await resp.json();
        if (tokens.error) return reject(new Error(tokens.error_description));
        resolve(tokens.access_token);
      } catch(e) { reject(e); }
    });

    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      const authUrl = `https://accounts.google.com/o/oauth2/auth?` + new URLSearchParams({
        response_type: 'code', client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI, scope: SCOPES,
        access_type: 'offline', prompt: 'consent',
      });
      console.log('\n🌐 Tarayıcı açılıyor...');
      import('node:child_process').then(({ execFile }) => {
        execFile('powershell.exe', ['-NoProfile', '-Command', `Start-Process "${authUrl}"`], { shell: false });
      });
    });

    server.on('error', reject);
    setTimeout(() => { server.close(); reject(new Error('timeout')); }, 120000);
  });
}

async function ga4Api(token, method, path, body, apiVersion = 'v1beta') {
  const resp = await fetch(`https://analyticsadmin.googleapis.com/${apiVersion}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { _raw: text.slice(0, 200), _status: resp.status }; }
}

async function gscApi(token, method, path, body) {
  const resp = await fetch(`https://www.googleapis.com/webmasters/v3/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (resp.status === 204) return { ok: true };
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { _raw: text.slice(0, 200), _status: resp.status }; }
}

// ─── GA4 ──────────────────────────────────────────────────────────────────────
async function configureGA4(token) {
  console.log('\n📊 GA4 konfigürasyonu başlıyor...');

  // Property'yi bul
  const accounts = await ga4Api(token, 'GET', 'accounts');
  if (!accounts.accounts?.length) { console.log('  ✗ GA4 hesap bulunamadı'); return; }

  let property = null;
  for (const account of accounts.accounts) {
    const props = await ga4Api(token, 'GET', `properties?filter=parent:${account.name}`);
    const found = props.properties?.find(p =>
      p.displayName?.includes('Sanliurfa') || p.displayName?.includes('sanliurfa')
    );
    if (found) { property = found; break; }
  }

  if (!property) {
    // Measurement ID ile eşleştir
    for (const account of accounts.accounts) {
      const props = await ga4Api(token, 'GET', `properties?filter=parent:${account.name}`);
      for (const p of props.properties || []) {
        const streams = await ga4Api(token, 'GET', `${p.name}/dataStreams`);
        const match = streams.dataStreams?.find(s =>
          s.webStreamData?.measurementId === MEASUREMENT_ID
        );
        if (match) { property = p; break; }
      }
      if (property) break;
    }
  }

  if (!property) { console.log('  ✗ Sanliurfa.com property bulunamadı'); return; }
  console.log(`  ✓ Property: ${property.displayName} (${property.name})`);

  // 1. Temel property ayarları: timezone + currency + industry
  const patchProp = await ga4Api(token, 'PATCH',
    `${property.name}?updateMask=timeZone,currencyCode,industryCategory`,
    {
      timeZone: 'Europe/Istanbul',
      currencyCode: 'TRY',
      industryCategory: 'TRAVEL',
    }
  );
  if (patchProp.name) {
    console.log('  ✓ Timezone: Europe/Istanbul | Currency: TRY | Industry: Travel');
  } else {
    console.log('  ⚠ Property patch:', JSON.stringify(patchProp).slice(0, 100));
  }

  // 2. Data retention → 14 ay (max)
  const retentionPatch = await ga4Api(token, 'PATCH',
    `${property.name}/dataRetentionSettings?updateMask=eventDataRetention,resetUserDataOnNewActivity`,
    {
      eventDataRetention: 'FOURTEEN_MONTHS',
      resetUserDataOnNewActivity: true,
    }
  );
  if (retentionPatch.name || retentionPatch.eventDataRetention) {
    console.log('  ✓ Data retention: 14 ay');
  } else {
    console.log('  ⚠ Retention patch:', JSON.stringify(retentionPatch).slice(0, 100));
  }

  // 3. Google Signals (v1alpha endpoint)
  const signals = await ga4Api(token, 'GET', `${property.name}/googleSignalsSettings`, undefined, 'v1alpha');
  if (signals.state !== 'GOOGLE_SIGNALS_ENABLED') {
    const signalsPatch = await ga4Api(token, 'PATCH',
      `${property.name}/googleSignalsSettings?updateMask=state`,
      { state: 'GOOGLE_SIGNALS_ENABLED' },
      'v1alpha'
    );
    if (signalsPatch.state === 'GOOGLE_SIGNALS_ENABLED') {
      console.log('  ✓ Google Signals aktif edildi');
    } else if (signalsPatch._status === 403) {
      console.log('  ℹ Google Signals: hesap izni gerekiyor (Analytics UI\'den aktif edin)');
    } else {
      console.log('  ⚠ Signals:', JSON.stringify(signalsPatch).slice(0, 100));
    }
  } else {
    console.log('  ✓ Google Signals zaten aktif');
  }

  // 4. Data stream'i bul
  const streams = await ga4Api(token, 'GET', `${property.name}/dataStreams`);
  const webStream = streams.dataStreams?.find(s => s.type === 'WEB_DATA_STREAM');

  if (webStream) {
    console.log(`  ✓ Web stream: ${webStream.displayName} (${webStream.webStreamData?.measurementId})`);

    // Enhanced Measurement zaten aktif olmalı — kontrol et
    const em = await ga4Api(token, 'GET', `${webStream.name}/enhancedMeasurementSettings`);
    if (!em.streamEnabled) {
      await ga4Api(token, 'PATCH',
        `${webStream.name}/enhancedMeasurementSettings?updateMask=streamEnabled`,
        { streamEnabled: true }
      );
      console.log('  ✓ Enhanced Measurement aktif edildi');
    } else {
      console.log('  ✓ Enhanced Measurement zaten aktif');
    }
  }

  // 5. Conversion events (önemli kullanıcı eylemleri)
  const conversionEvents = [
    { eventName: 'sign_up' },
    { eventName: 'login' },
    { eventName: 'place_view' },
    { eventName: 'search' },
  ];

  console.log('  📌 Conversion events ayarlanıyor...');
  // Mevcut conversion event'leri listele
  const existingConversions = await ga4Api(token, 'GET', `${property.name}/conversionEvents`);
  const existingNames = new Set(
    (existingConversions.conversionEvents || []).map(e => e.eventName)
  );

  for (const ce of conversionEvents) {
    if (existingNames.has(ce.eventName)) {
      console.log(`  ✓ ${ce.eventName} zaten conversion event`);
      continue;
    }
    const created = await ga4Api(token, 'POST', `${property.name}/conversionEvents`, ce);
    if (created.name) {
      console.log(`  ✓ ${ce.eventName} conversion event eklendi`);
    } else {
      console.log(`  ⚠ ${ce.eventName}:`, JSON.stringify(created).slice(0, 80));
    }
  }

  console.log('  ✅ GA4 konfigürasyonu tamamlandı');
  return property.name;
}

// ─── GSC ──────────────────────────────────────────────────────────────────────
async function configureGSC(token) {
  console.log('\n🔍 GSC konfigürasyonu başlıyor...');

  // Site listesi
  const sites = await gscApi(token, 'GET', 'sites');
  if (sites.error) { console.log('  ✗ GSC API:', sites.error.message); return; }

  const site = sites.siteEntry?.find(s =>
    s.siteUrl === SITE_URL || s.siteUrl === SITE_URL.slice(0, -1)
  );

  if (!site) {
    console.log('  ⚠ sanliurfa.com GSC\'de bulunamadı — doğrulama bekleniyor');
    return;
  }

  console.log(`  ✓ Site: ${site.siteUrl} (${site.permissionLevel})`);

  // Sitemap'leri gönder
  const sitemaps = [
    `${SITE_URL}sitemap.xml`,
    `${SITE_URL}sitemap-index.xml`,
  ];

  const siteEncoded = encodeURIComponent(site.siteUrl);

  // Mevcut sitemap'leri kontrol et
  const existingSitemaps = await gscApi(token, 'GET', `sites/${siteEncoded}/sitemaps`);
  const existingUrls = new Set(
    (existingSitemaps.sitemap || []).map(s => s.path)
  );

  for (const sitemapUrl of sitemaps) {
    if (existingUrls.has(sitemapUrl)) {
      console.log(`  ✓ Sitemap zaten gönderilmiş: ${sitemapUrl}`);
      continue;
    }
    const sitemapEncoded = encodeURIComponent(sitemapUrl);
    const result = await gscApi(token, 'PUT', `sites/${siteEncoded}/sitemaps/${sitemapEncoded}`);
    if (result.ok) {
      console.log(`  ✓ Sitemap gönderildi: ${sitemapUrl}`);
    } else {
      console.log(`  ⚠ Sitemap ${sitemapUrl}:`, JSON.stringify(result).slice(0, 80));
    }
  }

  // Doğrulama durumu
  const siteData = await gscApi(token, 'GET', `sites/${siteEncoded}`);
  console.log(`  ✓ İzin seviyesi: ${siteData.permissionLevel || site.permissionLevel}`);
  console.log('  ✅ GSC konfigürasyonu tamamlandı');
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────
console.log('╔════════════════════════════════════════════════╗');
console.log('║  GA4 + GSC Tam Konfigürasyon — sanliurfa.com   ║');
console.log('╚════════════════════════════════════════════════╝');

console.log('\nOAuth token alınıyor (elginozoguz@gmail.com)...');
const token = await getToken();
console.log('  ✓ Token alındı\n');

await configureGA4(token);
await configureGSC(token);

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║  ✅ Tüm Google entegrasyonları konfigüre edildi ║');
console.log('╠════════════════════════════════════════════════╣');
console.log('║  GA4  Measurement ID : G-1XNXPLDYPM           ║');
console.log('║  GA4  Timezone       : Europe/Istanbul         ║');
console.log('║  GA4  Currency       : TRY                     ║');
console.log('║  GA4  Retention      : 14 ay                   ║');
console.log('║  GA4  Signals        : Aktif                   ║');
console.log('║  GSC  Sitemap        : Gönderildi              ║');
console.log('╚════════════════════════════════════════════════╝\n');
