#!/usr/bin/env node
/**
 * GSC OAuth Bootstrap — refresh_token alır (one-time setup).
 *
 * 2026-05 Bağlam:
 *   Google'ın "service account email not found" bug'ı (CONFIRMED, Apr 23'ten beri,
 *   tamir tarihi yok) nedeniyle yeni service account'lar GSC'ye eklenemiyor.
 *   Çözüm: OAuth user flow ile elginozoguz@gmail.com için refresh_token al.
 *   Bu refresh_token prod'da scripts/lib/gsc-auth.mjs tarafından access_token
 *   yenilemek için kullanılır.
 *
 * Önkoşul (Console UI'da bir kez):
 *   APIs & Services → Credentials → OAuth Client (GOOGLE_CLIENT_ID)
 *   → Authorized redirect URIs → http://localhost:8080/oauth2callback EKLE
 *
 * Önkoşul 2 (OAuth app Production mode):
 *   APIs & Services → OAuth consent screen → PUBLISH APP
 *   Testing mode'da kalırsa refresh_token 7 gün sonra expire eder.
 *
 * Kullanım:
 *   node scripts/gsc-oauth-bootstrap.mjs
 *
 * Çıktı:
 *   Refresh token konsola yazılır. Sonra:
 *   1. Local: .env'e GSC_REFRESH_TOKEN=xxx ekle
 *   2. Prod: SSH ile /home/sanliur/public_html/.env'e ekle + pm2 restart
 */
import http from 'node:http';
import https from 'node:https';
import { execFile } from 'node:child_process';
import { URL, URLSearchParams } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
loadEnv(path.join(projectRoot, '.env'));
loadEnv(path.join(scriptDir, '.env.scripts'));

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
  'https://www.googleapis.com/auth/indexing',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('GOOGLE_CLIENT_ID veya GOOGLE_CLIENT_SECRET eksik (.env)');
  process.exit(1);
}

function buildAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function openBrowser(url) {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const cmd = isWindows ? 'cmd' : isMac ? 'open' : 'xdg-open';
  const args = isWindows ? ['/c', 'start', '""', url] : [url];
  try { execFile(cmd, args, () => {}); } catch { /* ignore */ }
}

const authUrl = buildAuthUrl();

console.log('\n🔐 GSC OAuth Bootstrap — refresh_token alımı\n');
console.log('  Client ID:    ' + CLIENT_ID.substring(0, 30) + '...');
console.log('  Redirect URI: ' + REDIRECT_URI);
console.log('  Scopes:       ' + SCOPES.split(' ').length + ' adet\n');
console.log('───────────────────────────────────────────────');
console.log('1) Console UI Önkoşul: OAuth Client → Authorized redirect URIs:');
console.log('   ' + REDIRECT_URI);
console.log('2) Browser otomatik açılır (açmazsa aşağıdaki URL\'yi kopyala):');
console.log('   ' + authUrl);
console.log('3) elginozoguz@gmail.com ile giriş yap, tüm scope\'ları onayla.\n');

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404).end();
    return;
  }
  const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
  const code = params.get('code');
  const err = params.get('error');

  if (err) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>OAuth Hata</h1><pre>${err}</pre><p>Terminal'i kontrol et.</p>`);
    console.error('\n❌ OAuth error:', err);
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400).end('No code');
    return;
  }

  try {
    console.log('🔄 Code alındı, token exchange...');
    const tokens = await exchangeCode(code);
    if (tokens.error) {
      throw new Error(tokens.error + ': ' + (tokens.error_description || ''));
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html><head><title>OAuth Success</title>
      <style>body{font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;background:#0d0a08;color:#e8e0d8}
      h1{color:#ce8e38}code{background:#1a1410;padding:4px 8px;border-radius:4px;color:#a8d4a8}</style></head><body>
      <h1>✅ Refresh Token Alındı</h1>
      <p>Terminal'e dön — refresh_token konsola yazıldı.</p>
      <p>Sonraki adım: <code>.env</code>'e <code>GSC_REFRESH_TOKEN=...</code> ekle.</p>
      <p>Bu sekmeyi kapatabilirsin.</p>
      </body></html>
    `);

    console.log('\n✅ Token Exchange başarılı!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('REFRESH_TOKEN (bu DEĞERİ .env\'e GSC_REFRESH_TOKEN olarak ekle):\n');
    console.log(tokens.refresh_token);
    console.log('═══════════════════════════════════════════════════\n');
    console.log('  Access token expires in: ' + tokens.expires_in + 's');
    console.log('  Token type: ' + tokens.token_type);
    console.log('  Scope: ' + tokens.scope);
    console.log('\nSonraki adımlar:');
    console.log('  1) Local: echo "GSC_REFRESH_TOKEN=' + tokens.refresh_token + '" >> .env');
    console.log('  2) Prod:  SSH ile /home/sanliur/public_html/.env\'e ekle + pm2 restart');
    console.log('  3) Test:  npm run gsc:test (veya node scripts/gsc-search-analytics.mjs)\n');

    server.close();
  } catch (e) {
    res.writeHead(500).end('Token exchange failed: ' + e.message);
    console.error('\n❌ Token exchange error:', e.message);
    server.close();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 Local callback server: ${REDIRECT_URI}\n`);
  setTimeout(() => openBrowser(authUrl), 500);
});

// Auto-shutdown after 5 dakika idle
setTimeout(() => {
  console.log('\n⏱  5 dk timeout — server kapatıldı.');
  server.close();
  process.exit(1);
}, 300000);
