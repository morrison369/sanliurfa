/**
 * Batch 23 — Orange/red light bg'ler dark'a, avatar gradient'lar → urfa-isot,
 *             vendor stat kartları, RewardsCatalog özel teklifler,
 *             BusinessAnalyticsDashboard takipçi kartı, UserManagementTable
 *
 * KORUNANLAR:
 *   text-orange-606  KPI/durum/uyarı (AdminDashboard, Business, Moderation,
 *                    Transaction, Trending, ReviewManager) — semantic, okunabilir
 *   bg-pink-909/40   PlaceCard entertainment overlay — zaten karanlık
 *   from-red-505 to-amber-505  TrendDensity heat bar — semantik
 */
const fs = require('fs');
const path = require('path');

function collectFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...collectFiles(full, exts));
    } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = collectFiles(srcDir, ['.tsx', '.astro']);

const replacements = [
  // ── RewardsCatalog özel teklifler kutusu ─────────────────────────────────
  ['bg-gradient-to-r from-red-50 to-orange-50 border border-orange-200 rounded-sm p-4',
   'bg-[rgba(184,115,51,0.06)] border border-[rgba(184,115,51,0.15)] rounded-sm p-4'],
  ['text-orange-900 mb-3',  'text-[#EDE0C6] mb-3'],
  ['text-xs text-orange-700', 'text-xs text-orange-400'],

  // ── BusinessAnalyticsDashboard takipçi kartı ────────────────────────────
  ['bg-orange-50 rounded-sm p-6 border border-orange-200',
   'bg-[rgba(184,115,51,0.06)] rounded-sm p-6 border border-[rgba(184,115,51,0.15)]'],

  // ── UserManagementTable: askıya al butonu hover + action buton ───────────
  ['hover:bg-orange-50 rounded text-orange-600',
   'hover:bg-[rgba(249,115,22,0.08)] rounded text-orange-600'],
  // Confirm action buton (ban=red, unban=green, suspend=orange → urfa):
  ["'bg-orange-600 hover:bg-orange-700'",
   "'bg-urfa-600 hover:bg-urfa-700'"],
  ['bg-orange-600 hover:bg-orange-700',
   'bg-urfa-600 hover:bg-urfa-700'],

  // ── vendor/PlaceManager avatar gradient → copper ─────────────────────────
  ['bg-gradient-to-br from-amber-400 to-orange-500 rounded-sm flex items-center justify-center text-white text-2xl font-bold',
   'bg-gradient-to-br from-urfa-500 to-isot-600 rounded-sm flex items-center justify-center text-white text-2xl font-bold'],
  // Green stat kart:
  ['bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-sm',
   'bg-[rgba(184,115,51,0.06)] p-4 rounded-sm'],

  // ── vendor/ReviewManager reviewer avatar gradient ─────────────────────────
  ['bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold',
   'bg-gradient-to-br from-urfa-500 to-isot-600 rounded-full flex items-center justify-center text-white font-bold'],

  // ── Catch-all: kalan bg-orange-50 / border-orange-202 ───────────────────
  ['bg-orange-50',      'bg-[rgba(249,115,22,0.06)]'],
  ['border-orange-200', 'border-[rgba(249,115,22,0.2)]'],
];

let totalChanged = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanged++;
    console.log(`UPDATED: ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
}

console.log(`\nDone — ${totalChanged} / ${files.length} files updated.`);
