#!/usr/bin/env node
/**
 * Google Full Setup — GA4 + GSC + OAuth Login
 * Modes:
 *   --auto CLIENT_ID CLIENT_SECRET   : starts local server, opens browser, completes setup
 *   --url  CLIENT_ID                 : prints auth URL (manual code copy)
 *   --complete CLIENT_ID SECRET CODE : exchanges code + runs full setup
 */
import http from 'node:http';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';

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

const LOCAL_PORT = 8080;
const REDIRECT_URI = `http://localhost:${LOCAL_PORT}/callback`;
const SITE_URL = 'https://sanliurfa.com';
const LOCAL_TUNNEL_PORT = 15738;

const SCOPES = [
  'openid', 'email', 'profile',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
].join(' ');

function buildAuthUrl(clientId) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/auth?${params}`;
}

async function exchangeCode(clientId, clientSecret, code) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    }),
  });
  const tokens = await resp.json();
  if (tokens.error) throw new Error(`Token exchange failed: ${tokens.error} — ${tokens.error_description}`);
  return tokens;
}

async function createGA4Property(token) {
  console.log('\n📊 GA4 property oluşturuluyor...');

  const accountsResp = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const accounts = await accountsResp.json();

  if (accounts.error) {
    console.log('  ✗ GA4 API erişimi yok:', accounts.error.message);
    return null;
  }

  let accountName;
  if (!accounts.accounts?.length) {
    console.log('  Hesap bulunamadı, oluşturuluyor...');
    const accResp = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Sanliurfa.com', regionCode: 'TR' }),
    });
    const acc = await accResp.json();
    if (acc.error) { console.log('  ✗ Hesap oluşturulamadı:', acc.error.message); return null; }
    accountName = acc.name;
    console.log(`  ✓ Hesap oluşturuldu: ${acc.displayName}`);
  } else {
    accountName = accounts.accounts[0].name;
    console.log(`  ✓ Hesap: ${accounts.accounts[0].displayName} (${accountName})`);
  }

  const propsResp = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const props = await propsResp.json();
  let property = props.properties?.find(p =>
    p.displayName?.toLowerCase().includes('sanliurfa') || p.webDataStream?.defaultUri?.includes('sanliurfa.com')
  );

  if (property) {
    console.log(`  ✓ Mevcut property: ${property.displayName} (${property.name})`);
  } else {
    const createResp = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Sanliurfa.com',
        industryCategory: 'TRAVEL',
        timeZone: 'Europe/Istanbul',
        currencyCode: 'TRY',
        parent: accountName,
      }),
    });
    property = await createResp.json();
    if (property.error) { console.log('  ✗ Property oluşturulamadı:', property.error.message); return null; }
    console.log(`  ✓ Property oluşturuldu: ${property.displayName}`);
  }

  const streamsResp = await fetch(`https://analyticsadmin.googleapis.com/v1beta/${property.name}/dataStreams`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const streams = await streamsResp.json();
  let stream = streams.dataStreams?.find(s => s.webStreamData);

  if (!stream) {
    const streamResp = await fetch(`https://analyticsadmin.googleapis.com/v1beta/${property.name}/dataStreams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'WEB_DATA_STREAM',
        displayName: 'Sanliurfa.com Web',
        webStreamData: { defaultUri: SITE_URL },
      }),
    });
    stream = await streamResp.json();
    if (stream.error) { console.log('  ✗ Data stream oluşturulamadı:', stream.error.message); return null; }
    console.log('  ✓ Web data stream oluşturuldu');
  }

  const measurementId = stream?.webStreamData?.measurementId;
  if (measurementId) {
    console.log(`  ✓ Measurement ID: ${measurementId}`);
  } else {
    console.log('  ℹ️  Measurement ID henüz hazır değil (1-2 dk bekleyin, tekrar çalıştırın)');
  }
  return measurementId;
}

async function setupGSC(token) {
  console.log('\n🔍 Google Search Console kuruluyor...');

  const sitesResp = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sites = await sitesResp.json();

  if (sites.error) {
    console.log('  ✗ GSC API erişimi yok:', sites.error.message);
    return null;
  }

  const existing = sites.siteEntry?.find(s =>
    s.siteUrl === SITE_URL + '/' || s.siteUrl === SITE_URL
  );
  if (existing) {
    console.log(`  ✓ Mevcut GSC property: ${existing.siteUrl} (${existing.permissionLevel})`);
    return { alreadyVerified: true };
  }

  const addResp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL + '/')}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!addResp.ok && addResp.status !== 204) {
    const err = await addResp.text();
    console.log('  ✗ GSC property eklenemedi:', err.slice(0, 200));
    return null;
  }
  console.log(`  ✓ GSC property eklendi: ${SITE_URL}`);

  const verifyTokenResp = await fetch('https://www.googleapis.com/siteVerification/v1/token', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verificationMethod: 'FILE',
      site: { type: 'SITE', identifier: SITE_URL + '/' },
    }),
  });
  const verifyData = await verifyTokenResp.json();

  if (verifyData.token) {
    console.log(`  ℹ️  Doğrulama token'ı: ${verifyData.token}`);
    fs.writeFileSync(path.join(scriptDir, '.gsc-verify-token'), verifyData.token);
    return { token: verifyData.token };
  }

  return { ok: true };
}

async function uploadAndVerifyGSC(token, verifyToken) {
  console.log('\n📤 GSC doğrulama dosyası yükleniyor...');
  const fileContent = `google-site-verification: ${verifyToken}.html`;
  const remotePath = `/home/sanliur/public_html/${verifyToken}.html`;

  await new Promise((resolve, reject) => {
    const ssh = new SshClient();
    ssh.on('ready', () => {
      ssh.sftp((err, sftp) => {
        if (err) { ssh.end(); return reject(err); }
        const stream = sftp.createWriteStream(remotePath);
        stream.write(fileContent);
        stream.end();
        stream.on('close', () => { ssh.end(); resolve(); });
        stream.on('error', e => { ssh.end(); reject(e); });
      });
    }).on('error', reject).connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '77'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASS,
    });
  });
  console.log('  ✓ Doğrulama dosyası yüklendi');

  await new Promise(r => setTimeout(r, 2000));

  const verifyResp = await fetch('https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: { type: 'SITE', identifier: SITE_URL + '/' } }),
  });

  if (verifyResp.ok) {
    const result = await verifyResp.json();
    console.log(`  ✓ GSC doğrulandı: ${result.site?.identifier || SITE_URL}`);
    const tokenFile = path.join(scriptDir, '.gsc-verify-token');
    if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
    return true;
  } else {
    const errText = await verifyResp.text();
    console.log('  ⚠️  GSC API doğrulaması başarısız:', errText.slice(0, 200));
    console.log(`  💡 Manuel: https://search.google.com/search-console/ownership?siteUrl=${encodeURIComponent(SITE_URL + '/')}`);
    return false;
  }
}

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
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function configureDB(clientId, clientSecret, measurementId) {
  console.log('\n💾 Veritabanı yapılandırılıyor...');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  await db.query(
    `INSERT INTO oauth_providers
       (provider_name, provider_key, client_id, client_secret, auth_url, token_url, userinfo_url, scope, is_enabled)
     VALUES ('Google', 'google', $1, $2,
       'https://accounts.google.com/o/oauth2/v2/auth',
       'https://oauth2.googleapis.com/token',
       'https://www.googleapis.com/oauth2/v3/userinfo',
       'openid email profile', true)
     ON CONFLICT (provider_key) DO UPDATE SET
       client_id = $1, client_secret = $2, is_enabled = true, updated_at = NOW()`,
    [clientId, clientSecret]
  );
  console.log('  ✓ Google OAuth credentials kaydedildi (oauth_providers)');

  if (measurementId) {
    await db.query(
      `INSERT INTO site_settings (setting_key, setting_value, description, updated_by)
       VALUES ('integrations.analytics', $1::jsonb, 'Google Analytics Measurement ID', NULL)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1::jsonb, updated_at = NOW()`,
      [JSON.stringify({ ga_id: measurementId })]
    );
    console.log(`  ✓ GA4 Measurement ID kaydedildi: ${measurementId}`);
  }

  await db.end();
  server.close();
  ssh.end();
}

async function runComplete(clientId, clientSecret, code) {
  console.log('\n🔄 Token alınıyor...');
  const tokens = await exchangeCode(clientId, clientSecret, code);
  console.log('  ✓ Access token alındı');

  const ga4MeasurementId = await createGA4Property(tokens.access_token);
  const gscResult = await setupGSC(tokens.access_token);

  if (gscResult?.token) {
    await uploadAndVerifyGSC(tokens.access_token, gscResult.token);
  }

  await configureDB(clientId, clientSecret, ga4MeasurementId);

  console.log('\n✅ Kurulum tamamlandı!');
  if (ga4MeasurementId) console.log(`   GA4 Measurement ID: ${ga4MeasurementId}`);
  console.log('   Google Login: /giris sayfasında aktif');
  console.log('   GSC: https://search.google.com/search-console');
  console.log('\n   🚀 Değişikliklerin canlıya alınması için deploy gerekiyor.');
  console.log('      node scripts/prod-sync.mjs --deploy');
}

// ── Main ─────────────────────────────────────────────────────────────────────

const mode = process.argv[2];

if (mode === '--url') {
  const clientId = process.argv[3];
  if (!clientId) { console.error('Kullanım: node google-full-setup.mjs --url CLIENT_ID'); process.exit(1); }
  console.log('\nTarayıcınızda açın:\n');
  console.log(buildAuthUrl(clientId));
  console.log('\nKodu aldıktan sonra:');
  console.log(`node scripts/google-full-setup.mjs --complete ${clientId} CLIENT_SECRET KOD\n`);

} else if (mode === '--complete') {
  const [, , , clientId, clientSecret, code] = process.argv;
  if (!clientId || !clientSecret || !code) {
    console.error('Kullanım: node google-full-setup.mjs --complete CLIENT_ID CLIENT_SECRET CODE');
    process.exit(1);
  }
  await runComplete(clientId, clientSecret, code).catch(e => { console.error(e); process.exit(1); });

} else if (mode === '--auto') {
  const clientId = process.argv[3];
  const clientSecret = process.argv[4];
  if (!clientId || !clientSecret) {
    console.error('Kullanım: node google-full-setup.mjs --auto CLIENT_ID CLIENT_SECRET');
    process.exit(1);
  }

  const authUrl = buildAuthUrl(clientId);

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${LOCAL_PORT}`);
      if (!url.pathname.startsWith('/callback')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>Bekleniyor...</h2>');
        return;
      }

      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>Hata: ${error}</h2><p>Sayfayı kapatabilirsiniz.</p>`);
        server.close();
        return reject(new Error(`OAuth hatası: ${error}`));
      }

      if (!code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>Bekleniyor...</h2>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>✅ Yetkilendirme alındı! Terminale dönebilirsiniz.</h2>');
      server.close();
      resolve(code);
    });

    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      console.log(`\n🌐 OAuth sunucusu başlatıldı (port ${LOCAL_PORT})`);
      console.log('   Tarayıcı açılıyor — elginozoguz@gmail.com ile giriş yapın ve izinleri onaylayın...\n');
      // PowerShell ile aç — cmd.exe'nin & sorununu önler
      execFile('powershell.exe', ['-NoProfile', '-Command', `Start-Process "${authUrl}"`], err => {
        if (err) {
          execFile('cmd.exe', ['/c', 'start', '', '""', authUrl], err2 => {
            if (err2) console.log('Tarayıcı açılamadı. URL:\n' + authUrl);
          });
        }
      });
    });

    server.on('error', reject);
  }).then(async code => {
    await runComplete(clientId, clientSecret, code);
  }).catch(e => { console.error(e); process.exit(1); });

} else {
  console.log('Kullanım:');
  console.log('  node scripts/google-full-setup.mjs --auto CLIENT_ID CLIENT_SECRET');
  console.log('  node scripts/google-full-setup.mjs --url  CLIENT_ID');
  console.log('  node scripts/google-full-setup.mjs --complete CLIENT_ID SECRET CODE');
  process.exit(1);
}
