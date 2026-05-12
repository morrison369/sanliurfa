const fs = require('fs');
const path = require('path');

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (entry.name.endsWith('.tsx')) result.push(full);
  }
  return result;
}

const compDir = path.join(__dirname, '../src/components');
const files = walk(compDir);

const replacements = [
  // --- Compound container patterns (most specific first) ---
  ['bg-[var(--bg-card)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]', 'bg-[var(--bg-card)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]'], // idempotent guard
  ['bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700', 'bg-[var(--bg-card)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]'],
  ['bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6'],
  ['bg-white dark:bg-gray-800 rounded-lg shadow p-6', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6'],
  ['bg-white dark:bg-gray-800 p-6 rounded-lg shadow', 'bg-[var(--bg-card)] p-6 rounded-sm border border-[rgba(184,115,51,0.14)]'],
  ['bg-white dark:bg-gray-800 rounded-lg p-6 shadow', 'bg-[var(--bg-card)] rounded-sm p-6 border border-[rgba(184,115,51,0.14)]'],
  ['bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700', 'bg-[var(--bg-card)] p-4 rounded-sm border border-[rgba(184,115,51,0.14)]'],
  ['rounded-xl border border-gray-200 bg-white p-6', 'rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-6'],
  ['rounded-xl border border-gray-200 bg-white p-5', 'rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-5'],
  ['rounded-xl border border-gray-200 bg-white p-4', 'rounded-sm border border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] p-4'],
  ['bg-white border border-gray-200 rounded-xl p-6', 'bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-6'],
  ['bg-white border border-gray-200 rounded-xl p-5', 'bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-5'],
  ['bg-white border border-gray-200 rounded-xl p-4', 'bg-[var(--bg-card)] border border-[rgba(184,115,51,0.14)] rounded-sm p-4'],
  ['bg-white rounded-lg shadow p-6', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6'],
  ['bg-white rounded-lg shadow-sm p-6', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6'],
  ['bg-white rounded-xl p-6', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-6'],
  ['bg-white rounded-xl p-5', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-5'],
  ['bg-white rounded-xl p-4', 'bg-[var(--bg-card)] rounded-sm border border-[rgba(184,115,51,0.14)] p-4'],

  // --- Form input compound patterns ---
  ['w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white', 'w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700', 'w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white', 'w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700', 'w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white', 'px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-urfa-500', 'w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm font-mono text-[#EDE0C6] bg-[var(--bg-card)] focus:outline-none focus:border-[rgba(184,115,51,0.6)]'],
  ['flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-urfa-500', 'flex-1 rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm font-mono text-[#EDE0C6] bg-[var(--bg-card)] focus:outline-none focus:border-[rgba(184,115,51,0.6)]'],
  ['w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-urfa-500', 'w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm text-[#EDE0C6] bg-[var(--bg-card)] focus:outline-none focus:border-[rgba(184,115,51,0.6)]'],
  ['w-full rounded-lg border border-gray-300 px-3 py-2 text-sm', 'w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['mt-1 w-full rounded-lg border border-gray-300 px-3 py-2', 'mt-1 w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm', 'mt-1 w-full rounded-sm border border-[rgba(184,115,51,0.25)] px-2 py-1 text-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['rounded-lg border border-gray-300 px-3 py-2 text-sm', 'rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 text-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['rounded-lg border border-gray-300 px-3 py-2', 'rounded-sm border border-[rgba(184,115,51,0.25)] px-3 py-2 bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2', 'rounded-sm border border-[rgba(184,115,51,0.25)] px-2 py-1 text-sm md:col-span-2 bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['rounded border border-gray-300 px-2 py-1 text-sm', 'rounded-sm border border-[rgba(184,115,51,0.25)] px-2 py-1 text-sm bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['rounded border border-gray-300 px-2 py-1 text-xs', 'rounded-sm border border-[rgba(184,115,51,0.25)] px-2 py-1 text-xs bg-[var(--bg-card)] text-[#EDE0C6]'],
  ['w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500', 'w-full px-3 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6] focus:outline-none focus:border-[rgba(184,115,51,0.6)]'],
  ['w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500', 'w-full px-4 py-2 border border-[rgba(184,115,51,0.25)] rounded-sm bg-[var(--bg-card)] text-[#EDE0C6] focus:outline-none focus:border-[rgba(184,115,51,0.6)]'],
  ['grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-2', 'grid gap-2 rounded-sm border border-[rgba(184,115,51,0.14)] p-3 md:grid-cols-2'],

  // --- Tab/button compound patterns ---
  ['border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300', 'border-transparent text-[#7A6B58] hover:text-[#EDE0C6]'],
  ['bg-gray-200 text-gray-700 hover:bg-gray-300', 'bg-[rgba(184,115,51,0.1)] text-[#C4A882] hover:bg-[rgba(184,115,51,0.18)]'],
  ['px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50', 'px-4 py-2 bg-[rgba(184,115,51,0.08)] text-[#C4A882] text-sm font-medium rounded-sm hover:bg-[rgba(184,115,51,0.15)] disabled:opacity-50'],
  ['px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50', 'px-3 py-2 text-sm text-[#7A6B58] border border-[rgba(184,115,51,0.25)] rounded-sm hover:bg-[rgba(184,115,51,0.06)]'],

  // --- Divider patterns ---
  ['divide-y divide-gray-200 dark:divide-gray-700', 'divide-y divide-[rgba(184,115,51,0.14)]'],
  ['divide-y divide-gray-200', 'divide-y divide-[rgba(184,115,51,0.14)]'],
  ['divide-y divide-gray-700', 'divide-y divide-[rgba(184,115,51,0.14)]'],

  // --- Label patterns ---
  ['block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2', 'block text-sm font-medium text-[#C4A882] mb-2'],
  ['block text-sm font-medium text-gray-700 mb-2', 'block text-sm font-medium text-[#C4A882] mb-2'],
  ['block text-sm font-medium text-gray-700 mb-1', 'block text-sm font-medium text-[#C4A882] mb-1'],
  ['block text-sm font-medium text-gray-700', 'block text-sm font-medium text-[#C4A882]'],
  ['text-xs font-semibold uppercase tracking-wide text-gray-500', 'text-xs font-semibold uppercase tracking-wide text-[#7A6B58]'],

  // --- Combined text+dark patterns ---
  ['text-gray-900 dark:text-white', 'text-[#EDE0C6]'],
  ['text-gray-900 dark:text-gray-100', 'text-[#EDE0C6]'],
  ['text-gray-800 dark:text-white', 'text-[#EDE0C6]'],
  ['text-gray-800 dark:text-gray-100', 'text-[#EDE0C6]'],
  ['text-gray-700 dark:text-gray-300', 'text-[#C4A882]'],
  ['text-gray-700 dark:text-gray-200', 'text-[#C4A882]'],
  ['text-gray-600 dark:text-gray-400', 'text-[#7A6B58]'],
  ['text-gray-600 dark:text-gray-300', 'text-[#7A6B58]'],
  ['text-gray-500 dark:text-gray-400', 'text-[#7A6B58]'],
  ['text-gray-400 dark:text-gray-500', 'text-[#4A3828]'],

  // --- bg+dark patterns ---
  ['bg-white dark:bg-gray-800', 'bg-[var(--bg-card)]'],
  ['bg-white dark:bg-gray-700', 'bg-[var(--bg-card)]'],
  ['bg-gray-50 dark:bg-gray-900', 'bg-[rgba(184,115,51,0.04)]'],
  ['bg-gray-100 dark:bg-gray-800', 'bg-[rgba(184,115,51,0.06)]'],

  // --- border+dark patterns ---
  ['border-gray-200 dark:border-gray-700', 'border-[rgba(184,115,51,0.14)]'],
  ['border-gray-300 dark:border-gray-600', 'border-[rgba(184,115,51,0.25)]'],
  ['border-gray-200 dark:border-gray-600', 'border-[rgba(184,115,51,0.14)]'],

  // --- Simple single-class replacements ---
  ['text-gray-400', 'text-[#4A3828]'],
  ['text-gray-500', 'text-[#7A6B58]'],
  ['text-gray-600', 'text-[#7A6B58]'],
  ['text-gray-700', 'text-[#C4A882]'],
  ['text-gray-800', 'text-[#EDE0C6]'],
  ['text-gray-900', 'text-[#EDE0C6]'],
  ['bg-white', 'bg-[var(--bg-card)]'],
  ['bg-gray-50', 'bg-[rgba(184,115,51,0.04)]'],
  ['bg-gray-100', 'bg-[rgba(184,115,51,0.06)]'],
  ['bg-gray-200', 'bg-[rgba(184,115,51,0.08)]'],
  ['bg-gray-300', 'bg-[rgba(184,115,51,0.12)]'],
  ['bg-gray-700', 'bg-[var(--bg-card)]'],
  ['bg-gray-800', 'bg-[var(--bg-card)]'],
  ['border-gray-200', 'border-[rgba(184,115,51,0.14)]'],
  ['border-gray-300', 'border-[rgba(184,115,51,0.25)]'],
  ['border-gray-600', 'border-[rgba(184,115,51,0.25)]'],
  ['border-gray-700', 'border-[rgba(184,115,51,0.14)]'],
  ['rgba(200,160,100', 'rgba(184,115,51'],
];

let updated = 0;
const log = [];
for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  // Remove remaining dark: class tokens
  content = content.replace(/\bdark:[a-zA-Z0-9/_:[\]().,%-]+/g, '').replace(/[ \t]{2,}/g, ' ');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    updated++;
    log.push(path.relative(compDir, filePath));
  }
}
log.forEach(f => console.log('Updated:', f));
console.log('\nTotal updated:', updated, '/', files.length);
