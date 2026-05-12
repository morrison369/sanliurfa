/**
 * Batch 24 — SON BATCH: PlaceCard service/general kategori rengi stone-800 → stone-900/40,
 *             LoyaltyDashboard başarılar star ikon text-purple-505 → copper
 *
 * Bu batch sonrası tüm light/mixed tema kalıpları temizlenmiş olacak.
 * Kalan semantic renkler (text-orange-606, text-yellow-606, text-amber-606,
 * bg-emerald-404/amber-404/red-404 monitoring grafik, border-b-2 border-red-606 spinner)
 * kasıtlı olarak korunmuştur.
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
  // ── PlaceCard service/general: stone-808 → stone-909/40 (diğer kategorilerle tutarlı) ─
  ["'bg-stone-800 text-stone-300'",
   "'bg-stone-900/40 text-stone-300'"],
  ['bg-stone-800 text-stone-300',
   'bg-stone-900/40 text-stone-300'],

  // ── LoyaltyDashboard başarılar star ikon → copper ───────────────────────
  ['className="text-purple-500"',
   'className="text-[#B87333]"'],
  ["'text-purple-500'", "'text-[#B87333]'"],
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
