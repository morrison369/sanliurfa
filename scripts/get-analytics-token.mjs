#!/usr/bin/env node
/**
 * Analitik Token Alma — GA4 + GSC için auth
 * Yerel HTTP sunucusu başlatır, OAuth URL açar, kodu yakalar.
 * Kullanım: node scripts/get-analytics-token.mjs
 */
import http from 'node:http';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_ID = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
const CLIENT_SECRET = 'd-FL95Q19q7MQmFpd7hHD0Ty';
const REDIRECT_URI = 'http://localhost:8085/';
const PORT = 8085;

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/analytics.edit',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/siteverification',
].join(' ');

const params = new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: SCOPES,
  access_type: 'offline',
  prompt: 'consent',
});

const authUrl = `https://accounts.google.com/o/oauth2/auth?${params}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>Hata: ${error}</h2><p>Sayfayı kapatabilirsiniz.</p>`);
    console.error('\nOAuth hatası:', error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Bekliyor...</h2>');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h2>Yetkilendirme alindi! Terminale donebilirsiniz.</h2>');
  server.close();

  console.log('\nKod alindi, token degistiriliyor...');

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResp.json();
  if (tokens.error) {
    console.error('Token hatasi:', tokens.error, tokens.error_description);
    process.exit(1);
  }

  // Test GA4 API
  const ga4 = await fetch('https://analyticsadmin.googleapis.com/v1beta/accounts', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then(r => r.json());

  if (ga4.error?.code === 403) {
    console.log('\nGA4 scope engellendi:', ga4.error.message);
    console.log('Cozum: Cloud Console\'da OAuth client olusturun, google-full-setup.mjs kullanin.');
  } else {
    console.log('GA4 erisimi var! Hesaplar:', ga4.accounts?.length || 0);
    fs.writeFileSync(path.join(scriptDir, '.analytics-token.json'), JSON.stringify(tokens, null, 2));
    console.log('Token kaydedildi. Simdi: node scripts/setup-ga4-gsc.mjs');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\nOAuth sunucusu baslatildi (port ${PORT})`);
  console.log('\nSu URL tarayicida aciliyor...');

  // Open browser safely - hardcoded URL, no user input
  execFile('cmd.exe', ['/c', 'start', '', authUrl], (err) => {
    if (err) {
      console.log('\nTarayici otomatik acilmadi. Su URL\'i acin:');
      console.log(authUrl);
    } else {
      console.log('Tarayici acildi. elginozoguz@gmail.com ile giris yapin ve izinleri onayin.');
    }
  });
});
