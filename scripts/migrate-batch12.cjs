/**
 * Batch 12 — Kalan mavi butonlar, prefix-match bug'ları, indigo/violet,
 *             progress bar renkleri, divide/ring utility'ler
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
  // ── Prefix-match bug düzeltmeleri (batch 11'den kalan) ──────────────────
  // CollectionDetail.tsx / CollectionsManager.tsx'te bg-blue-500 → bg-[rgba(59,130,246,0.1)] bug'u
  ["'bg-[rgba(59,130,246,0.1)]0 text-white hover:bg-blue-600'",
   "'bg-urfa-600 text-white hover:bg-urfa-700'"],
  ['bg-[rgba(59,130,246,0.1)]0 text-white py-2 rounded font-medium hover:bg-blue-600',
   'bg-urfa-600 text-white py-2 rounded-sm font-medium hover:bg-urfa-700'],
  ['bg-[rgba(59,130,246,0.1)]0', 'bg-urfa-600'],  // kalan her türlü variant

  // ── Progress bar fill'leri (h-2 / h-full ile birlikte, butonlardan önce) ──
  ['bg-blue-600 h-2 rounded-full', 'bg-[#B87333] h-2 rounded-full'],
  ['bg-blue-600 h-2',              'bg-[#B87333] h-2'],
  ['h-full bg-blue-600 rounded-full', 'h-full bg-[#B87333] rounded-full'],
  ['h-full bg-blue-600',           'h-full bg-[#B87333]'],

  // ── Kalan mavi primary butonlar ─────────────────────────────────────────
  ['bg-blue-600',       'bg-urfa-600'],
  ['hover:bg-blue-600', 'hover:bg-urfa-600'],

  // ── Indigo butonlar → copper ─────────────────────────────────────────────
  ['bg-indigo-700',       'bg-urfa-700'],
  ['bg-indigo-600',       'bg-urfa-600'],
  ['hover:bg-indigo-800', 'hover:bg-urfa-700'],
  ['hover:bg-indigo-700', 'hover:bg-urfa-700'],

  // ── Violet butonlar → copper ─────────────────────────────────────────────
  ['bg-violet-700',       'bg-urfa-700'],
  ['bg-violet-600',       'bg-urfa-600'],
  ['hover:bg-violet-700', 'hover:bg-urfa-700'],

  // ── RewardsCatalog yükleme durumu (loading → copper) ────────────────────
  ['bg-blue-400 text-white cursor-wait', 'bg-urfa-500 text-white cursor-wait'],

  // ── Tablo / liste ayırıcılar ─────────────────────────────────────────────
  ['divide-gray-100',  'divide-[rgba(184,115,51,0.1)]'],
  ['divide-gray-200',  'divide-[rgba(184,115,51,0.14)]'],
  ['divide-slate-200', 'divide-[rgba(184,115,51,0.14)]'],

  // ── Ring utility ─────────────────────────────────────────────────────────
  ['ring-gray-900/5',   'ring-[rgba(184,115,51,0.1)]'],
  ['ring-gray-200',     'ring-[rgba(184,115,51,0.14)]'],
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
  }
}

console.log(`Done — ${totalChanged} / ${files.length} files updated.`);
