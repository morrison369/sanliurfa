/**
 * GSC auth helper — 3 yöntem öncelik sırası:
 *
 * 1. GSC_REFRESH_TOKEN env (önerilir, prod cron için):
 *      OAuth user flow ile alınmış refresh_token. GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *      kullanarak access_token elde eder. 2026-05 Google bug'ı (service account
 *      "email not found") nedeniyle GSC için en güvenli yol budur.
 *
 * 2. Service account JSON (scripts/.gsc-sa-key.json):
 *      Klasik yöntem — SA email'ini GSC property'sine User olarak ekle. 2026-05'te
 *      Google'da confirmed bug var, yeni SA'lar "email not found" alıyor. Mevcut
 *      SA'lar çalışıyorsa OK, yenisini kuramayız.
 *
 * 3. gcloud user fallback (local dev):
 *      `gcloud auth application-default login --scopes=...,webmasters`
 *      Local development için. Prod'a uygun değil (token 1h expire, refresh yok).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const SA_KEY_PATH = path.resolve(scriptDir, '..', '.gsc-sa-key.json');

function b64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : Buffer.from(JSON.stringify(input));
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getServiceAccountToken(scopes) {
  if (!fs.existsSync(SA_KEY_PATH)) return null;
  const sa = JSON.parse(fs.readFileSync(SA_KEY_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  });
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const sig = signer.sign(sa.private_key).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = header + '.' + claims + '.' + sig;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
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
        try {
          const parsed = JSON.parse(d);
          if (parsed.access_token) resolve({ token: parsed.access_token, source: 'service_account', email: sa.client_email });
          else reject(new Error('SA token error: ' + d));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getGcloudUserToken() {
  // Windows'ta `gcloud` aslında `gcloud.cmd`. Cross-platform için cmd/sh wrapper.
  const isWindows = process.platform === 'win32';
  const tryExec = (cmd, args) => {
    try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { return null; }
  };
  let token = null;
  if (isWindows) {
    token = tryExec('gcloud.cmd', ['auth', 'application-default', 'print-access-token'])
         || tryExec('cmd', ['/c', 'gcloud', 'auth', 'application-default', 'print-access-token']);
  } else {
    token = tryExec('gcloud', ['auth', 'application-default', 'print-access-token']);
  }
  return token ? { token, source: 'gcloud_user', email: null } : null;
}

/**
 * GSC_REFRESH_TOKEN ile access_token elde eder (OAuth user flow).
 * 2026-05 Google SA bug'ı için workaround — en güvenli production yöntemi.
 */
async function getRefreshTokenAccess(scopes) {
  const refreshToken = process.env.GSC_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
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
        try {
          const parsed = JSON.parse(d);
          if (parsed.access_token) {
            resolve({ token: parsed.access_token, source: 'oauth_refresh_token', email: 'elginozoguz@gmail.com (via refresh_token)' });
          } else {
            reject(new Error('refresh_token exchange failed: ' + d));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Token al — refresh_token (prod) > SA (legacy) > gcloud user (local).
 * @param {string[]} scopes
 * @returns {{ token: string, source: string, email: string | null }}
 */
export async function getGscToken(scopes = ['https://www.googleapis.com/auth/webmasters']) {
  // 1. Refresh token (2026 standart — SA bug workaround)
  const rt = await getRefreshTokenAccess(scopes).catch(() => null);
  if (rt) return rt;
  // 2. Service account (legacy, 2026-05 bug riski)
  const sa = await getServiceAccountToken(scopes).catch(() => null);
  if (sa) return sa;
  // 3. gcloud user (local dev fallback)
  const user = getGcloudUserToken();
  if (user) return user;
  throw new Error(
    'GSC auth yöntemleri başarısız.\n' +
    'Önerilen: scripts/gsc-oauth-bootstrap.mjs ile refresh_token al ve .env\'e GSC_REFRESH_TOKEN olarak ekle.\n' +
    'Bağlam: 2026-05 Google service account bug nedeniyle OAuth user flow gerekli.',
  );
}
