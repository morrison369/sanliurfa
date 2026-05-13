/**
 * GSC auth helper: service account JSON varsa onu kullan, yoksa gcloud user token.
 *
 * Service account yolu (önerilir):
 *   1. scripts/.gsc-sa-key.json oluştur (gcloud iam service-accounts keys create)
 *   2. SA email'ini Search Console property'sine User olarak ekle
 *   3. Bu script otomatik SA token alır
 *
 * gcloud user yolu (fallback):
 *   gcloud auth application-default login --scopes=...,webmasters
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
 * Token al — SA önce, sonra gcloud user.
 * @param {string[]} scopes
 * @returns {{ token: string, source: string, email: string | null }}
 */
export async function getGscToken(scopes = ['https://www.googleapis.com/auth/webmasters']) {
  const sa = await getServiceAccountToken(scopes).catch(() => null);
  if (sa) return sa;
  const user = getGcloudUserToken();
  if (user) return user;
  throw new Error('Hiçbir auth yöntemi çalışmıyor. SA key oluştur veya gcloud auth login.');
}
