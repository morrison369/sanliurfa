/**
 * Batch 11 — Mavi butonlar, focus ring, alert bg'ler, slate renkleri, rounded köşeler
 * Hedef: tüm src/**\/*.tsx ve src/**\/*.astro
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

// ── Sıralı ikili geçiş: compound → simple ───────────────────────────────────
const pass1 = [
  // Spesifik gradient bg'ler (tam string)
  [
    'bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.08),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_35%),#ffffff]',
    'bg-[var(--bg-card)]',
  ],
  ['bg-[linear-gradient(180deg,#f8fafc,#ffffff)]', 'bg-[var(--bg-card)]'],

  // Custom radius → rounded-sm
  ['rounded-[2rem]', 'rounded-sm'],
  ['rounded-2xl', 'rounded-sm'],
  ['rounded-3xl', 'rounded-sm'],

  // ── Compound alert patterns (önce - prefix çakışmasını önler) ──────────────
  // Compound green alert (BusRouteManager / PharmacyManager pattern)
  ['bg-green-50 text-green-700 border border-green-200', 'bg-[rgba(34,197,94,0.08)] text-green-400 border border-[rgba(34,197,94,0.2)]'],
  // Compound red alert
  ['bg-red-50 text-red-700 border border-red-200', 'bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.25)]'],
  ['bg-red-50 border border-red-200 rounded-sm text-red-600', 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm text-red-400'],
  ['bg-red-50 border border-red-200 rounded-sm p-4 text-red-900', 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 text-red-300'],
  ['bg-red-50 border border-red-200 rounded-sm p-4 text-red-800', 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 text-red-300'],
  ['bg-red-50 text-red-900', 'bg-[rgba(239,68,68,0.1)] text-red-300'],
  // Compound blue info box
  ['bg-blue-50 border border-blue-200', 'bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]'],
  // Green check badge
  ['bg-green-100 text-green-700 rounded', 'bg-[rgba(34,197,94,0.12)] text-green-400 rounded-sm'],
  ['bg-green-100 text-green-700', 'bg-[rgba(34,197,94,0.12)] text-green-400'],
  // PharmacyManager active selection
  ['border-green-400 bg-green-50', 'border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.08)]'],
  // SiteContentManager badge
  ['bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-700',
   'bg-[rgba(239,68,68,0.12)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-red-400'],
  // SiteContentManager hover
  ['hover:border-red-300 hover:bg-red-50 hover:text-red-700', 'hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.08)] hover:text-red-400'],
  ['border-red-300 bg-red-50 text-red-700', 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-red-400'],
  // AdminVerificationQueue
  ['bg-red-50', 'bg-[rgba(239,68,68,0.1)]'],  // catch-all for remaining
  ['border-red-400 bg-red-50', 'border-red-400 bg-[rgba(239,68,68,0.1)]'],
];

const pass2 = [
  // ── Remaining simple alert backgrounds ────────────────────────────────────
  ['bg-green-50', 'bg-[rgba(34,197,94,0.08)]'],
  ['bg-blue-50', 'bg-[rgba(59,130,246,0.1)]'],
  ['bg-green-100', 'bg-[rgba(34,197,94,0.12)]'],
  ['border-red-200', 'border-[rgba(239,68,68,0.25)]'],
  ['border-green-200', 'border-[rgba(34,197,94,0.2)]'],
  ['border-blue-200', 'border-[rgba(59,130,246,0.2)]'],
  ['text-blue-900', 'text-blue-300'],

  // ── Mavi primary butonlar → copper ────────────────────────────────────────
  ['bg-blue-600 text-white', 'bg-urfa-600 text-white'],
  ['bg-blue-500 text-white', 'bg-urfa-600 text-white'],
  ['hover:bg-blue-700', 'hover:bg-urfa-700'],
  // active tab indicator (AdminAnalyticsDashboard bg-blue-500 pill)
  ["'bg-blue-500 text-white'", "'bg-urfa-600 text-white'"],

  // ── Focus ring / border ───────────────────────────────────────────────────
  ['focus:ring-blue-500', 'focus:ring-[rgba(184,115,51,0.5)]'],
  ['focus:ring-indigo-500', 'focus:ring-[rgba(184,115,51,0.5)]'],
  ['focus:border-blue-500', 'focus:border-[rgba(184,115,51,0.6)]'],

  // ── Placeholder ───────────────────────────────────────────────────────────
  ['placeholder-gray-500', 'placeholder:text-[#4A3828]'],
  ['placeholder:text-gray-500', 'placeholder:text-[#4A3828]'],
  ['placeholder:text-gray-400', 'placeholder:text-[#4A3828]'],

  // ── Slate: light backgrounds / borders / text ─────────────────────────────
  ['bg-slate-50', 'bg-[rgba(184,115,51,0.04)]'],
  ['border-slate-200', 'border-[rgba(184,115,51,0.14)]'],
  ['text-slate-900', 'text-[#EDE0C6]'],
  ['text-slate-700', 'text-[#C4A882]'],
  ['text-slate-600', 'text-[#7A6B58]'],

  // ── urfa-100 light badge ──────────────────────────────────────────────────
  ['bg-urfa-100', 'bg-[rgba(184,115,51,0.12)]'],
  ['text-urfa-700', 'text-[#C4A882]'],

  // ── SiteOperationsOverview slate badge ────────────────────────────────────
  // "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700"
  // Already handled by compound slate replacements above
];

let totalChanged = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const [from, to] of [...pass1, ...pass2]) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanged++;
  }
}

console.log(`Done — ${totalChanged} / ${files.length} files updated.`);
