#!/usr/bin/env node
/**
 * GA4 + GSC Setup Script
 * Runs AFTER gcloud auth application-default login (with analytics + webmasters scopes).
 * - Creates GA4 property for sanliurfa.com
 * - Creates GA4 data stream + gets Measurement ID (G-XXXXXXXXXX)
 * - Stores Measurement ID in DB via site_settings
 * - Adds sanliurfa.com as GSC property (site verification)
 */
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
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15732;
const SITE_URL = 'https://sanliurfa.com';

async function getAccessToken() {
  const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(process.env.APPDATA || process.env.HOME, 'gcloud', 'application_default_credentials.json');

  if (!fs.existsSync(adcPath)) throw new Error(`ADC not found: ${adcPath}`);
  const adc = JSON.parse(fs.readFileSync(adcPath, 'utf8'));

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: adc.client_id,
      client_secret: adc.client_secret,
      refresh_token: adc.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function createGA4Property(token) {
  console.log('\n📊 GA4 property oluşturuluyor...');

  // List existing accounts
  const accountsResp = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const accounts = await accountsResp.json();

  if (accounts.error) {
    console.error('  ✗ Analytics API erişimi yok:', accounts.error.message);
    console.log('  ℹ️  Çözüm: gcloud auth application-default login --scopes=... ile yeniden giriş yapın');
    return null;
  }

  if (!accounts.accounts?.length) {
    console.log('  ℹ️  Mevcut GA4 hesabı yok. Yeni hesap oluşturuluyor...');
    // Create account first
    const accResp = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Sanliurfa.com', regionCode: 'TR' }),
    });
    const acc = await accResp.json();
    if (acc.error) {
      console.error('  ✗ Hesap oluşturulamadı:', acc.error.message);
      return null;
    }
    accounts.accounts = [acc];
  }

  const accountName = accounts.accounts[0].name;
  console.log(`  Hesap: ${accounts.accounts[0].displayName} (${accountName})`);

  // Check for existing sanliurfa.com property
  const propsResp = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const props = await propsResp.json();

  let property = props.properties?.find(p => p.displayName?.includes('sanliurfa') || p.displayName?.includes('Sanliurfa'));

  if (property) {
    console.log(`  ✓ Mevcut property bulundu: ${property.displayName} (${property.name})`);
  } else {
    // Create new property
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
    if (property.error) {
      console.error('  ✗ Property oluşturulamadı:', property.error.message);
      return null;
    }
    console.log(`  ✓ Property oluşturuldu: ${property.displayName}`);
  }

  // Create or get web data stream
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
    if (stream.error) {
      console.error('  ✗ Data stream oluşturulamadı:', stream.error.message);
    }
  }

  const measurementId = stream?.webStreamData?.measurementId;
  console.log(`  ✓ Measurement ID: ${measurementId || '(henüz hazır değil)'}`);

  return measurementId;
}

async function addGSCProperty(token) {
  console.log('\n🔍 Google Search Console property ekleniyor...');

  // List existing sites
  const sitesResp = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sites = await sitesResp.json();

  if (sites.error) {
    console.error('  ✗ GSC API erişimi yok:', sites.error.message);
    return false;
  }

  const existing = sites.siteEntry?.find(s => s.siteUrl === SITE_URL + '/' || s.siteUrl === SITE_URL);
  if (existing) {
    console.log(`  ✓ Mevcut GSC property: ${existing.siteUrl} (${existing.permissionLevel})`);
    return true;
  }

  // Add site
  const addResp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL + '/')}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (addResp.status === 204 || addResp.ok) {
    console.log(`  ✓ GSC property eklendi: ${SITE_URL}`);

    // Try domain verification via Site Verification API
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
      console.log(`  ℹ️  Doğrulama dosyası gerekiyor: ${verifyData.token}`);
      console.log(`      URL'si: ${SITE_URL}/${verifyData.token}.html`);
      // Save token to upload via SSH
      fs.writeFileSync(path.join(scriptDir, '.gsc-verify-token'), verifyData.token);
    }
    return true;
  }

  const err = await addResp.text();
  console.error('  ✗ GSC property eklenemedi:', err.slice(0, 200));
  return false;
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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function storeGA4InDB(measurementId) {
  console.log('\n💾 GA4 ID veritabanına kaydediliyor...');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  await db.query(
    `INSERT INTO site_settings (key, value, description, updated_by)
     VALUES ('integrations.analytics', $1::jsonb, 'Google Analytics Measurement ID', NULL)
     ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
    [JSON.stringify({ ga_id: measurementId })]
  );
  console.log(`  ✓ GA4 ID kaydedildi: ${measurementId}`);

  await db.end(); server.close(); ssh.end();
}

async function main() {
  console.log('🚀 Google Analytics + Search Console kurulumu başlıyor...');

  let token;
  try {
    token = await getAccessToken();
    console.log('  ✓ Access token alındı');
  } catch (e) {
    console.error('  ✗ Token alınamadı:', e.message);
    console.log('\n  📌 Önce şunu çalıştırın:');
    console.log('     gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/analytics.edit,https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/siteverification');
    process.exit(1);
  }

  const measurementId = await createGA4Property(token);
  const gscOk = await addGSCProperty(token);

  if (measurementId) {
    await storeGA4InDB(measurementId);
    console.log('\n✅ GA4 kurulumu tamamlandı!');
    console.log(`   Measurement ID: ${measurementId}`);
    console.log('   Site yeniden deploy edildiğinde tracking aktif olacak.');
  }

  if (gscOk) {
    console.log('\n✅ GSC property eklendi!');
    const verifyTokenFile = path.join(scriptDir, '.gsc-verify-token');
    if (fs.existsSync(verifyTokenFile)) {
      const vt = fs.readFileSync(verifyTokenFile, 'utf8').trim();
      console.log(`   Doğrulama dosyası yükleniyor: ${vt}.html`);
      console.log('   GSC doğrulama scripti ile devam edin: node scripts/verify-gsc.mjs');
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
