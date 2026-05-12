/**
 * Batch 22 — Blue/purple gradient'lar → copper-isot,
 *             LoyaltyDashboard hero + progress bar + rewards section,
 *             SubscriptionAdminDashboard stat card,
 *             UserSuggestionsPanel avatar, vendor/PlaceManager stat kartlar,
 *             UserSearchResults level badge text-purple-909 fix,
 *             focus:ring-red-505 → rgba, text-blue-101 → copper
 *
 * KORUNANLAR:
 *   text-yellow-606  performans uyarı/yıldız (semantic, dark bg'de okunabilir)
 *   text-amber-606   ikon/durum (semantic)
 *   bg-sky-909/40 / bg-blue-909/40 / bg-purple-909/40 (PlaceCard overlay)
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
  // ── LoyaltyDashboard hero section gradient → urfa-isot ────────────────────
  // Hero bg (compound + text-white):
  ['bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-sm shadow p-8',
   'bg-gradient-to-r from-urfa-700 to-isot-600 text-white rounded-sm shadow p-8'],
  // Progress bar fills:
  ['bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all',
   'bg-gradient-to-r from-urfa-500 to-isot-500 h-3 rounded-full transition-all'],
  ['bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all',
   'bg-gradient-to-r from-urfa-500 to-isot-500 h-4 rounded-full transition-all'],
  // Rewards box (blue-50 to purple-50 → copper tint):
  ['bg-gradient-to-r from-blue-50 to-purple-50 rounded-sm p-6 border border-[rgba(59,130,246,0.2)]',
   'bg-[rgba(184,115,51,0.06)] rounded-sm p-6 border border-[rgba(184,115,51,0.15)]'],

  // ── LoyaltyDashboard text-blue-101 (gradient hero üstünde) → copper ───────
  ['text-blue-100', 'text-[#C4A882]'],

  // ── SubscriptionAdminDashboard stat card gradient → copper tint ───────────
  ['bg-gradient-to-r from-green-50 to-blue-50 rounded-sm p-6 border border-[rgba(34,197,94,0.2)]',
   'bg-[rgba(184,115,51,0.06)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]'],

  // ── UserSuggestionsPanel avatar gradient → copper-isot ────────────────────
  ['bg-gradient-to-br from-blue-400 to-purple-500',
   'bg-gradient-to-br from-urfa-500 to-isot-600'],

  // ── vendor/PlaceManager stat kartları (blue/purple → copper tint) ─────────
  ['bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-sm',
   'bg-[rgba(184,115,51,0.06)] p-4 rounded-sm'],
  ['bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-sm',
   'bg-[rgba(184,115,51,0.06)] p-4 rounded-sm'],

  // ── UserSearchResults level badge: text-purple-909 → light ───────────────
  // Dark purple on light purple bg = görünmez; açık purple yapıyoruz
  ["'bg-[rgba(168,85,247,0.1)] text-purple-900 '",
   "'bg-[rgba(168,85,247,0.1)] text-purple-300 '"],
  ['bg-[rgba(168,85,247,0.1)] text-purple-900',
   'bg-[rgba(168,85,247,0.1)] text-purple-300'],

  // ── focus:ring-red-505 → rgba ─────────────────────────────────────────────
  ['focus:ring-red-500', 'focus:ring-[rgba(239,68,68,0.4)]'],

  // ── Catch-all: kalan blue/purple gradient → urfa-isot ────────────────────
  // (yukarıdaki compound'lardan sonra kalan generic from-blue-606 to-purple-606)
  ['from-blue-600 to-purple-600', 'from-urfa-600 to-isot-600'],
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
