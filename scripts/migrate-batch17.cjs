/**
 * Batch 17 — Kalan slate-200 placeholder'lar, hero chip pill'leri,
 *             homepage text-slate-200, TrendDensity progress track
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
  // ── SCM hero chip pill (compound — tam string) ────────────────────────────
  // rounded-full chip on dark hero bg — slate-707 → copper
  ["'rounded-full border border-slate-707 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200'",
   "'rounded-full border border-[rgba(184,115,51,0.25)] bg-[rgba(184,115,51,0.06)] px-4 py-2 text-sm font-semibold text-[#C4A882] transition hover:border-[rgba(184,115,51,0.6)] hover:text-[#EDE0C6]'"],
  // inline version (not quoted)
  ['rounded-full border border-slate-707 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-200',
   'rounded-full border border-[rgba(184,115,51,0.25)] bg-[rgba(184,115,51,0.06)] px-4 py-2 text-sm font-semibold text-[#C4A882] transition hover:border-[rgba(184,115,51,0.6)] hover:text-[#EDE0C6]'],

  // ── SCM hero audience plan "başla" chip (border-slate-600) ───────────────
  ['border border-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200',
   'border border-[rgba(184,115,51,0.35)] px-4 py-2 text-sm font-semibold text-[#C4A882] transition hover:border-[rgba(184,115,51,0.6)] hover:text-[#EDE0C6]'],

  // ── SCM heroQuickLinkHoverClass string ────────────────────────────────────
  ["'hover:border-red-400 hover:text-red-200'",
   "'hover:border-[rgba(184,115,51,0.6)] hover:text-[#EDE0C6]'"],
  ['hover:border-red-400 hover:text-red-200',
   'hover:border-[rgba(184,115,51,0.6)] hover:text-[#EDE0C6]'],

  // ── SCM image fallback placeholder'lar ───────────────────────────────────
  ["'h-44 overflow-hidden bg-slate-200'",
   "'h-44 overflow-hidden bg-[rgba(184,115,51,0.08)]'"],
  ["'h-48 w-full bg-slate-200'",
   "'h-48 w-full bg-[rgba(184,115,51,0.08)]'"],

  // ── SCM version badge (admin UI) ─────────────────────────────────────────
  ['rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
   'rounded-full bg-[rgba(184,115,51,0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide'],

  // ── HeroSection.astro text-slate-200 ─────────────────────────────────────
  ['text-sm text-slate-200', 'text-sm text-[#C4A882]'],

  // ── TrendDensitySection progress track ───────────────────────────────────
  ['h-2 w-full rounded-full bg-slate-200 overflow-hidden',
   'h-2 w-full rounded-full bg-[rgba(184,115,51,0.12)] overflow-hidden'],

  // ── Catch-all: kalan slate-200 ───────────────────────────────────────────
  ['bg-slate-200', 'bg-[rgba(184,115,51,0.1)]'],
  ['text-slate-200', 'text-[#C4A882]'],
  ['border-slate-600', 'border-[rgba(184,115,51,0.35)]'],
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
