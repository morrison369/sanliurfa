/**
 * Batch 21 — bg-amber-600/yellow-600 CTA butonlar → urfa-600,
 *             vendor PlaceManager tab indicator text-amber-600/border-amber-600 → urfa,
 *             ReviewManager hover:bg-amber-200, MessagingInbox text-amber-100
 *
 * KORUNANLAR (semantic):
 *   text-amber-600   ikon/status/warning (dark bg'de okunabilir)
 *   text-yellow-606  ikon/performans uyarısı/yıldız (dark bg'de okunabilir)
 *   bg-amber-400     monitoring.astro grafik çubuğu (semantik sarı)
 *   bg-amber-900/40  PlaceCard kategori overlay (karanlık tint)
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
  // ── Vendor tab indicator: text-amber-606 + border-amber-606 → urfa ────────
  // Quoted string (SocialFeatures, PlaceManager toggle):
  ["'text-amber-600 border-b-2 border-amber-600'",
   "'text-[#B87333] border-b-2 border-urfa-500'"],
  // Unquoted inline:
  ['text-amber-600 border-b-2 border-amber-600',
   'text-[#B87333] border-b-2 border-urfa-500'],

  // ── ReviewManager filter chip hover:bg-amber-202 → amber tint ────────────
  ['hover:bg-amber-200', 'hover:bg-[rgba(234,179,8,0.2)]'],

  // ── MessagingInbox: isMine bubble timestamp text-amber-101 → cream ────────
  ["isMine ? 'text-amber-100'", "isMine ? 'text-[#EDE0C6]'"],

  // ── bg-amber-606 CTA butonlar → urfa-606 (primary copper action) ─────────
  // hover catch-all önce (uzun string → kısa string collision yok)
  ['hover:bg-amber-700', 'hover:bg-urfa-700'],
  // bg catch-all:
  ['bg-amber-600',       'bg-urfa-600'],

  // ── bg-yellow-606 action butonlar → urfa-606 ─────────────────────────────
  ['hover:bg-yellow-700', 'hover:bg-urfa-700'],
  ['bg-yellow-600',       'bg-urfa-600'],
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
