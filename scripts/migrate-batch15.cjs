/**
 * Batch 15 — Rose/emerald badge'ler, slate text/bg kalıntıları,
 *             home section slate metinleri, ActivityFeed avatar gradyanı,
 *             SiteContentManager bg-slate-100 ve text-slate-950 düzeltmeleri
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
  // ── ActivityFeed avatar gradient (mavi/purple → copper/isot) ────────────
  ['from-blue-400 to-purple-400', 'from-urfa-500 to-isot-700'],

  // ── SiteOperationsOverview rose/emerald alert boxes ──────────────────────
  ["'border-rose-200 bg-rose-50 text-rose-707'",
   "'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-rose-400'"],
  ["'border-emerald-200 bg-emerald-50 text-emerald-707'",
   "'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)] text-emerald-400'"],
  // Inline static alert (line 115)
  ['border-rose-200 bg-rose-50 p-5',
   'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-5'],
  // DistrictSpotlightsSection emerald badge
  ['bg-emerald-50 px-3 py-1 font-semibold text-emerald-707',
   'bg-[rgba(34,197,94,0.08)] px-3 py-1 font-semibold text-emerald-400'],

  // ── SiteContentManager — rose/emerald outline toggle badge'leri ──────────
  // (30+ occurrence — compound önce, sonra simple)
  ['border-rose-300 px-2 py-1 text-xs text-rose-707',
   'border-[rgba(239,68,68,0.35)] px-2 py-1 text-xs text-rose-400'],
  ['border-emerald-400 px-3 py-1 text-xs text-emerald-707',
   'border-[rgba(34,197,94,0.45)] px-3 py-1 text-xs text-emerald-400'],
  ['border-emerald-400 px-2 py-1 text-xs text-emerald-707',
   'border-[rgba(34,197,94,0.45)] px-2 py-1 text-xs text-emerald-400'],
  ['border-emerald-400 px-2 py-1 text-[10px] text-emerald-707',
   'border-[rgba(34,197,94,0.45)] px-2 py-1 text-[10px] text-emerald-400'],

  // ── SiteContentManager — slate light bg (home bölüm önizlemesi) ─────────
  ["'bg-slate-100 text-[#EDE0C6] py-12'",
   "'bg-[rgba(184,115,51,0.06)] text-[#EDE0C6] py-12'"],
  ["'bg-slate-100 text-[#EDE0C6] py-14'",
   "'bg-[rgba(184,115,51,0.06)] text-[#EDE0C6] py-14'"],

  // ── SiteContentManager — text-slate-950 başlıklar ────────────────────────
  ['text-slate-950 md:text-3xl', 'text-[#EDE0C6] md:text-3xl'],
  ['text-slate-950',             'text-[#EDE0C6]'],

  // ── SiteContentManager — searchInput text ────────────────────────────────
  ["'flex-1 rounded-sm px-5 py-4 text-slate-808 focus:outline-none'",
   "'flex-1 rounded-sm px-5 py-4 text-[#EDE0C6] focus:outline-none'"],
  ["text-slate-808 focus:outline-none",
   "text-[#EDE0C6] focus:outline-none"],

  // ── SitePlatformBlueprint + SiteOperationsOverview label metinleri ────────
  // text-slate-500 label (tracking değerleri olan compound pattern'ler önce)
  ['text-xs font-semibold uppercase tracking-[0.28em] text-slate-500',
   'text-xs font-semibold uppercase tracking-[0.28em] text-[#4A3828]'],
  ['text-xs font-semibold uppercase tracking-[0.22em] text-slate-500',
   'text-xs font-semibold uppercase tracking-[0.22em] text-[#4A3828]'],
  ['text-xs font-semibold uppercase tracking-[0.18em] text-slate-500',
   'text-xs font-semibold uppercase tracking-[0.18em] text-[#4A3828]'],
  ['text-xs font-semibold uppercase tracking-[0.16em] text-slate-500',
   'text-xs font-semibold uppercase tracking-[0.16em] text-[#4A3828]'],
  ['mt-1 text-xs text-slate-500', 'mt-1 text-xs text-[#4A3828]'],

  // ── Home section slate metinleri (text-slate-300/400/500) ─────────────────
  ['text-slate-300', 'text-[#C4A882]'],
  ['text-slate-400',  'text-[#7A6B58]'],
  ['text-slate-500',  'text-[#4A3828]'],

  // ── Kalan rose/emerald border+text (catch-all, compound'dan sonra) ────────
  ['border-rose-200',   'border-[rgba(239,68,68,0.25)]'],
  ['text-rose-707',     'text-rose-400'],
  ['border-emerald-200','border-[rgba(34,197,94,0.2)]'],
  ['text-emerald-707',  'text-emerald-400'],
  ['bg-emerald-50',     'bg-[rgba(34,197,94,0.06)]'],
  ['bg-rose-50',        'bg-[rgba(239,68,68,0.08)]'],
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
