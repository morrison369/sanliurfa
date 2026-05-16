#!/usr/bin/env node
/**
 * Admin pages audit — her sayfayı admin session ile fetch et,
 * "Yükleniyor..." asılı kalan veya boş tablo gibi UI anomalilerini tespit et.
 *
 * Patterns:
 *   - "Yükleniyor..." / "Loading..." içeren elementler — script run etmemiş
 *   - Empty stat (id="..." text="-" veya "0")
 *   - 500/404 status
 *   - HTML body içinde "Error" / "Failed" / "Hata oluştu" mesajları
 *
 * Kullanım:
 *   node scripts/admin-pages-audit.mjs
 */
import https from 'node:https';
import { getAdminCredentials } from './lib/admin-script-auth.mjs';

const BASE = 'https://sanliurfa.com';
const { email: EMAIL, password: PASS } = getAdminCredentials();

const ROUTES = [
 '/admin', '/admin/analytics', '/admin/api-docs', '/admin/audit-logs',
 '/admin/blog', '/admin/blog/posts', '/admin/blog/new', '/admin/blog/add', '/admin/blog/analytics', '/admin/blog/comments', '/admin/blog/content-bot',
 '/admin/campaigns', '/admin/categories', '/admin/claims', '/admin/community-photos',
 '/admin/component-gallery', '/admin/content-agents', '/admin/content-generator', '/admin/dashboard',
 '/admin/events', '/admin/events/add', '/admin/export-tokens', '/admin/feature-flags',
 '/admin/governance', '/admin/historical-sites', '/admin/historical-sites/add', '/admin/import',
 '/admin/integrations', '/admin/loyalty', '/admin/manage', '/admin/messages',
 '/admin/moderation', '/admin/monitoring', '/admin/notifications', '/admin/performance',
 '/admin/pharmacies', '/admin/places', '/admin/places/add', '/admin/places/lifecycle',
 '/admin/quotas', '/admin/recipes', '/admin/release-readiness', '/admin/reports',
 '/admin/reservations', '/admin/revenue', '/admin/reviews', '/admin/settings/marketing',
 '/admin/site-audit', '/admin/site-content', '/admin/social-events', '/admin/social-policies',
 '/admin/social-risk', '/admin/subscriptions', '/admin/tickets', '/admin/ulasim',
 '/admin/user-deletions', '/admin/users', '/admin/vendor-approval', '/admin/verifications',
 '/admin/webhooks',
];

function login() {
 return new Promise((resolve, reject) => {
  const body = JSON.stringify({ email: EMAIL, password: PASS });
  const req = https.request({
   hostname: 'sanliurfa.com', path: '/api/auth/login', method: 'POST',
   headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
   let data = '';
   res.on('data', c => (data += c));
   res.on('end', () => {
    const cookies = res.headers['set-cookie'] || [];
    const authCookie = cookies.find(c => c.startsWith('auth-token=') || c.startsWith('session='));
    resolve({ status: res.statusCode, cookie: authCookie ? authCookie.split(';')[0] : null });
   });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
 });
}

function fetchPage(route, cookie) {
 return new Promise((resolve) => {
  const req = https.request({
   hostname: 'sanliurfa.com', path: route, method: 'GET',
   headers: { Cookie: cookie || '' },
  }, (res) => {
   let data = '';
   res.on('data', c => (data += c));
   res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.on('error', () => resolve({ status: 0, body: '' }));
  req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
  req.end();
 });
}

function analyze(route, status, html) {
 const issues = [];

 if (status !== 200) {
  issues.push(`HTTP ${status}`);
  return issues;
 }

 // 1. "Yükleniyor..." asılı kalmış (script DOMContentLoaded'da fetch yapacak, ama HTML'de placeholder)
 const loadingMatches = (html.match(/Yükleniyor\.\.\.|Loading\.\.\.|Yükleniyor/g) || []).length;
 if (loadingMatches > 1) {
  // 1 normal (header text vb), 2+ tablo cell'ler asılı placeholders
  issues.push(`${loadingMatches}x "Yükleniyor..." placeholder`);
 }

 // 2. Stat "-" veya "0" id ile gösteriliyor (DB veri çekmiyor)
 const statDashes = (html.match(/>-<\/(?:div|span|p)>/g) || []).length;
 if (statDashes >= 3) {
  issues.push(`${statDashes}x stat "-" (data fetch missing?)`);
 }

 // 3. Specific error patterns (toast/alert messages rendered, not just any "Error" text)
 if (/id="errorMsg"[^>]*>(?!\s*<\/)/.test(html) || /class="[^"]*error[^"]*"[^>]*>\s*Hata/.test(html)) {
  issues.push('visible error toast/alert');
 }

 // 4. Script presence kontrol — sayfada `<script>` var ama hiç fetch call yoksa
 const hasScript = /<script[^>]*>/.test(html);
 const hasFetch = /fetch\(['"`]\/api\//.test(html);
 const hasReact = /astro-island|client:/.test(html);

 // 5. Empty body content — gövde <main> içinde 200ch'den az text
 const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
 if (mainMatch) {
  const textOnly = mainMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (textOnly.length < 100) {
   issues.push(`empty main (${textOnly.length} chars)`);
  }
 }

 // 6. Sayfa-sayfa: "fetch('/api/...')" hiç yokken script var (suspicious)
 if (hasScript && !hasFetch && !hasReact && loadingMatches > 0) {
  issues.push('script tag yok ama Yükleniyor... var (broken fetch?)');
 }

 return issues;
}

(async () => {
 console.log('\n🔍 Admin Pages Audit\n');
 const auth = await login();
 if (!auth.cookie) {
  console.error('❌ Admin login başarısız. Şifre veya cookie eksik.');
  process.exit(1);
 }
 console.log(`✓ Login OK (${auth.status}). Cookie: ${auth.cookie.slice(0, 30)}...\n`);

 const results = [];
 let i = 0;
 for (const route of ROUTES) {
  const res = await fetchPage(route, auth.cookie);
  const issues = analyze(route, res.status, res.body);
  results.push({ route, status: res.status, issues, htmlSize: res.body.length });
  i++;
  if (issues.length === 0) {
   process.stdout.write('.');
  } else {
   process.stdout.write('!');
  }
  if (i % 10 === 0) process.stdout.write(` ${i}/${ROUTES.length}\n`);
 }
 console.log(`\n\n${results.length} sayfa tarandı\n`);

 const clean = results.filter(r => r.issues.length === 0);
 const dirty = results.filter(r => r.issues.length > 0);

 console.log(`✓ Temiz: ${clean.length}`);
 console.log(`✗ Sorunlu: ${dirty.length}\n`);

 if (dirty.length > 0) {
  console.log('=== SORUNLU SAYFALAR ===\n');
  dirty.sort((a, b) => b.issues.length - a.issues.length);
  for (const r of dirty) {
   console.log(`  ${r.route}  [HTTP ${r.status}, ${r.htmlSize}b]`);
   r.issues.forEach(i => console.log(`    • ${i}`));
   console.log('');
  }
 }
})();
