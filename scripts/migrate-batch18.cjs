/**
 * Batch 18 — Amber warning box'lar, text-amber/rose/indigo -900/-800 dark text,
 *             SCM tarihi site / tarif section bg, border-rose-100, monitoring.astro
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
  // ── Compound amber boxes (spesifik önce) ─────────────────────────────────
  ['mb-8 bg-amber-50 border border-amber-200 rounded-sm p-4',
   'mb-8 bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4'],
  ['bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-800',
   'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.25)] rounded-sm p-4 text-sm text-amber-400'],
  ['rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900',
   'rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-3 text-xs text-amber-400'],
  ['rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-900',
   'rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-4 text-amber-400'],
  // guidesCommunityPanelClass (×3 occurrence)
  ["'mb-6 rounded-sm border border-amber-200 bg-amber-50 p-5'",
   "'mb-6 rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-5'"],
  // SwipeMatchExperience amber box
  ['rounded-sm border border-amber-200 bg-amber-50 p-4',
   'rounded-sm border border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] p-4'],
  // SCM amber badge
  ['rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800',
   'rounded-full border border-[rgba(234,179,8,0.3)] bg-[rgba(234,179,8,0.1)] px-3 py-1 text-xs font-semibold text-amber-400'],
  // SiteOperationsOverview yellow case
  ["'border-amber-200 bg-amber-50 text-amber-400'",
   "'border-[rgba(234,179,8,0.25)] bg-[rgba(234,179,8,0.08)] text-amber-400'"],
  // monitoring.astro JS return string
  ["'bg-amber-50 text-amber-800'",
   "'bg-[rgba(234,179,8,0.08)] text-amber-400'"],

  // ── SCM tarihi site / tarif bölüm bg (amber50 → copper tint) ─────────────
  ["'bg-amber-50 text-[#EDE0C6] py-12'",
   "'bg-[rgba(184,115,51,0.06)] text-[#EDE0C6] py-12'"],

  // ── Catch-all amber ───────────────────────────────────────────────────────
  ['bg-amber-50',     'bg-[rgba(234,179,8,0.08)]'],
  ['border-amber-200','border-[rgba(234,179,8,0.25)]'],

  // ── Amber dark text ───────────────────────────────────────────────────────
  ['text-amber-900',       'text-amber-400'],
  ['text-amber-800 ',      'text-amber-400 '],   // trailing space preserved
  ['text-amber-800"',      'text-amber-400"'],   // closing quote variant
  ['hover:text-amber-800', 'hover:text-amber-300'],

  // ── Indigo dark text (inside converted rgba info boxes) ───────────────────
  ['text-indigo-900', 'text-[#EDE0C6]'],
  ['text-indigo-800', 'text-[#C4A882]'],

  // ── Rose dark text (anti-spam section) ────────────────────────────────────
  ['text-rose-900', 'text-rose-400'],
  ['text-rose-800', 'text-rose-400'],
  ['border-rose-100','border-[rgba(239,68,68,0.15)]'],

  // ── GuidesCommunitySection amber headings ─────────────────────────────────
  // (class değerleri text-amber-900 catch-all tarafından yakalanır)
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
