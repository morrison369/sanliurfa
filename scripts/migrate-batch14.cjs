/**
 * Batch 14 — Sarı uyarı kutuları, kalan kırmızı açık bg'ler,
 *             karanlık bg'de görünmeyen -900/-800 text renkleri
 *
 * KAPSAM DIŞI (semantic olarak korunur):
 *   bg-green-600/bg-red-600/bg-yellow-600 action butonları
 *   text-red-600 / text-green-600 / text-yellow-600 status ikonları
 *   bg-yellow-500 / bg-green-600 h-2 progress bar fill'leri
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
  // ── Compound yellow warning boxes (önce) ─────────────────────────────────
  ['bg-yellow-50 border border-yellow-200 rounded-sm p-4 mb-4',
   'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4 mb-4'],
  ['bg-yellow-50 border border-yellow-200 rounded-sm p-4',
   'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4'],
  ['border-yellow-500 bg-yellow-50', 'border-[rgba(234,179,8,0.5)] bg-[rgba(234,179,8,0.08)]'],
  ['border-yellow-200 bg-yellow-50',  'border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)]'],

  // ── Compound yellow badge ─────────────────────────────────────────────────
  ['bg-yellow-100 text-yellow-900 border-yellow-300',
   'bg-[rgba(234,179,8,0.12)] text-yellow-300 border-[rgba(234,179,8,0.3)]'],
  ["'bg-yellow-100 text-yellow-800 '",  "'bg-[rgba(234,179,8,0.12)] text-yellow-400 '"],
  ["'bg-yellow-100 text-yellow-700 '",  "'bg-[rgba(234,179,8,0.12)] text-yellow-400 '"],
  ['bg-yellow-100 text-yellow-800',     'bg-[rgba(234,179,8,0.12)] text-yellow-400'],
  ['bg-yellow-100 text-yellow-700',     'bg-[rgba(234,179,8,0.12)] text-yellow-400'],

  // ── Simple yellow catch-all ───────────────────────────────────────────────
  ['bg-yellow-100',     'bg-[rgba(234,179,8,0.12)]'],
  ['bg-yellow-50',      'bg-[rgba(234,179,8,0.08)]'],
  ['border-yellow-300', 'border-[rgba(234,179,8,0.3)]'],
  ['border-yellow-200', 'border-[rgba(234,179,8,0.25)]'],
  ['hover:bg-yellow-50','hover:bg-[rgba(234,179,8,0.08)]'],

  // ── Yellow dark text (dark bg'de görünmez) ────────────────────────────────
  ['text-yellow-900', 'text-yellow-400'],
  ['text-yellow-800', 'text-yellow-400'],

  // ── Compound red light boxes (CollectionDetail / CollectionsManager) ─────
  ['bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded',
   'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 px-4 py-3 rounded-sm'],
  ['bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-200 transition',
   'bg-[rgba(239,68,68,0.1)] text-red-400 px-3 py-2 rounded-sm text-sm font-medium hover:bg-[rgba(239,68,68,0.18)] transition'],
  ['bg-red-100 text-red-707 px-3 py-2 rounded text-sm font-medium hover:bg-red-200 transition',
   'bg-[rgba(239,68,68,0.1)] text-red-400 px-3 py-2 rounded-sm text-sm font-medium hover:bg-[rgba(239,68,68,0.18)] transition'],
  ['bg-red-100 text-red-707 px-3 py-2 rounded text-center text-sm font-medium hover:bg-red-200 transition',
   'bg-[rgba(239,68,68,0.1)] text-red-400 px-3 py-2 rounded-sm text-center text-sm font-medium hover:bg-[rgba(239,68,68,0.18)] transition'],
  // WebVitalsCard "poor" case
  ["'bg-red-100 text-red-900 border-red-300 '",
   "'bg-[rgba(239,68,68,0.1)] text-red-400 border-[rgba(239,68,68,0.3)] '"],
  // LiveAnalyticsDashboard + AuditLogViewer compound badges
  ['bg-red-100 text-red-800',  'bg-[rgba(239,68,68,0.1)] text-red-300'],
  ['bg-red-100 text-red-707',  'bg-[rgba(239,68,68,0.1)] text-red-400'],
  ["'bg-red-100 text-red-808 '", "'bg-[rgba(239,68,68,0.1)] text-red-300 '"],
  ["'bg-red-100 text-red-707 '", "'bg-[rgba(239,68,68,0.1)] text-red-400 '"],
  ['bg-red-100',      'bg-[rgba(239,68,68,0.1)]'],   // catch-all
  ['border-red-300',  'border-[rgba(239,68,68,0.3)]'],
  ['hover:bg-red-200','hover:bg-[rgba(239,68,68,0.18)]'],

  // ── Red dark text (dark bg'de görünmez) ──────────────────────────────────
  ['text-red-900', 'text-red-400'],
  ['text-red-808', 'text-red-400'],

  // ── Green dark text ───────────────────────────────────────────────────────
  ['text-green-900', 'text-green-400'],

  // ── Quota card warning border (QuotaUsageDisplay) ────────────────────────
  ['border-yellow-200 bg-yellow-50', 'border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)]'],
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
