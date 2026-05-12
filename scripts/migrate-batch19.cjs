/**
 * Batch 19 — Tab underline (border-blue-600), spinner (border-blue-600),
 *             text-purple-600 KPI, orange badge (bg-orange-100),
 *             bg-stone-100, SubscriptionTierCard border, border-rose-50,
 *             searchInputClass slate-808, HeroSection text-sky-200
 *
 * KORUNANLAR (semantic):
 *   text-orange-600 status icon/KPI (okunabilir dark bg'de)
 *   text-amber-600  ikon (okunabilir)
 *   bg-red-600 / bg-green-600 action buton
 *   text-emerald-300 / text-sky-300 / text-violet-300 / text-amber-300 (zaten açık = dark bg uyumlu)
 *   border-b-2 border-red-600 (spinner kırmızı = semantik)
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
  // ── Tab underline active state: border-blue-600 → urfa-500 ───────────────
  ["'border-blue-600 text-[#C4A882]'",  "'border-urfa-500 text-[#C4A882]'"],
  ["'border-blue-600 text-[#C4A882] '", "'border-urfa-500 text-[#C4A882] '"],
  // WebhookAnalyticsDashboard compound
  ["'text-[#C4A882] border-b-2 border-blue-600'",
   "'text-[#C4A882] border-b-2 border-urfa-500'"],

  // ── Spinner: border-b-2 border-blue-600 → urfa-500 ──────────────────────
  ['border-b-2 border-blue-600', 'border-b-2 border-urfa-500'],

  // ── SubscriptionTierCard tier highlights ─────────────────────────────────
  ["'border-blue-500 shadow-lg scale-105'", "'border-urfa-500 shadow-lg scale-105'"],
  ["'border-green-500 shadow-md'",          "'border-[rgba(34,197,94,0.6)] shadow-md'"],
  ['text-green-500 mt-0.5',                 'text-green-400 mt-0.5'],

  // ── text-purple-600 KPI metric → copper ──────────────────────────────────
  ['text-purple-600', 'text-[#B87333]'],

  // ── Orange badge ─────────────────────────────────────────────────────────
  ["'bg-orange-100 text-orange-707'",
   "'bg-[rgba(249,115,22,0.12)] text-orange-400'"],
  ['bg-orange-100 text-orange-707 font-medium',
   'bg-[rgba(249,115,22,0.12)] text-orange-400 font-medium'],
  ['bg-orange-100 text-orange-600 rounded-full',
   'bg-[rgba(249,115,22,0.12)] text-orange-400 rounded-full'],
  ['bg-orange-100', 'bg-[rgba(249,115,22,0.12)]'],
  ['text-orange-707', 'text-orange-400'],

  // ── DarkModeToggle stone → copper tint ───────────────────────────────────
  ['bg-stone-100 hover:bg-stone-200', 'bg-[rgba(184,115,51,0.08)] hover:bg-[rgba(184,115,51,0.14)]'],

  // ── SCM searchInputClass kalan slate-808 ─────────────────────────────────
  ["'flex-1 rounded-sm px-5 py-4 text-slate-808 focus:outline-none'",
   "'flex-1 rounded-sm px-5 py-4 text-[#EDE0C6] focus:outline-none'"],
  // Inline variant (without quotes):
  ['text-slate-808 focus:outline-none', 'text-[#EDE0C6] focus:outline-none'],

  // ── SCM border-rose-50 (anti-spam tablo satır ayırıcı) ───────────────────
  ['border-rose-50', 'border-[rgba(239,68,68,0.06)]'],

  // ── HeroSection communityCardBadge text-sky-200 ──────────────────────────
  ['text-xs font-semibold uppercase tracking-wide text-sky-200',
   'text-xs font-semibold uppercase tracking-wide text-[#C4A882]'],

  // ── vendor/ReviewManager text-amber-600 stat (copper ile uyumlu, bırak) ──
  // text-amber-600 = okunabilir dark'ta → KORUNDU

  // ── Kalan border-blue-600 (tab context dışı) ─────────────────────────────
  ['border-blue-600', 'border-urfa-500'],
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
