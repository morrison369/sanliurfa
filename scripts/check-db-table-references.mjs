#!/usr/bin/env node
/**
 * DB Table Reference Audit
 *
 * Yap-boz pattern'inin temeli: kodda farklı tablo isimleri kullanılırken
 * DB'de farklı tablolar var. Bu oturumda 3 bug bulundu:
 *   - favorites vs user_favorites
 *   - user_activity vs user_activities
 *   - followers vs user_follows
 *
 * Bu script:
 *  1. Codebase'den FROM/INTO/UPDATE/DELETE SQL pattern'leri çıkarır
 *  2. Tablo isimlerini extract eder
 *  3. Bilinen "wrong table" pattern'leri ile karşılaştırır
 *  4. CI'da çalıştırıldığında suspicious matches'i raporlar
 *
 * Kullanım:
 *   node scripts/check-db-table-references.mjs
 *   node scripts/check-db-table-references.mjs --strict  # exit 1 on any suspicious
 */
import fs from 'node:fs';
import path from 'node:path';

const STRICT = process.argv.includes('--strict');
const SCAN_DIRS = ['src/pages/api', 'src/lib', 'src/actions', 'src/pages/profil', 'src/pages/sosyal'];
const KNOWN_WRONG_TABLES = {
  'favorites': 'user_favorites',
  'user_activity': 'user_activities',
  'followers': 'user_follows',
  'activity_feed': 'activity_feeds',
};

/**
 * Column drift rules: tablo kullanımı varsa, eski/hayali kolon adı drift'tir.
 * Pattern: { tableHint, badColumns: [{ name, suggested }] }
 * tableHint dosyada herhangi bir yerde geçerse, badColumns drift kabul edilir.
 *
 * `user_activities` tablosu için legacy hayali kolonlar:
 *  - action_type → mevcut: type (mig 167) veya activity_type (mig 120)
 *  - reference_type → mevcut: entity_type (mig 167) veya object_type (mig 120)
 *  - reference_id → mevcut: entity_id (mig 167) veya object_id (mig 120)
 * Bunlar HİÇ tablonun parçası olmadı — eski kod yanlış varsayım.
 */
// SQL-context patterns sadece SQL alias'lı tablo prefix'lerini yakalar (ua., user_activities.).
// JS object access (row.action_type, r.action_type, data.action_type) drift değildir — atlanır.
const COLUMN_DRIFT_RULES = [
  {
    tableHint: 'user_activities',
    badColumns: [
      { pattern: /\b(?:ua|user_activities)\.action_type\b/g, name: 'action_type', suggested: 'COALESCE(type, activity_type) AS action_type' },
      { pattern: /\b(?:ua|user_activities)\.reference_type\b/g, name: 'reference_type', suggested: 'COALESCE(entity_type, object_type) AS reference_type' },
      { pattern: /\b(?:ua|user_activities)\.reference_id\b/g, name: 'reference_id', suggested: 'COALESCE(entity_id, object_id) AS reference_id' },
    ],
  },
];

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...walk(full));
    else if (/\.(ts|tsx|astro|mjs)$/.test(f.name)) results.push(full);
  }
  return results;
}

const SQL_PATTERNS = [
  /FROM\s+([a-z_][a-z0-9_]*)\b/gi,
  /INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\b/gi,
  /UPDATE\s+([a-z_][a-z0-9_]*)\b/gi,
  /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)\b/gi,
  /JOIN\s+([a-z_][a-z0-9_]*)\b/gi,
];

const violations = [];
const columnViolations = [];
const files = SCAN_DIRS.flatMap(walk);

for (const file of files) {
  // Skip migrations + tests (legacy schema definitions there are intentional)
  if (file.includes('migrations/') || file.includes('__tests__/') || file.endsWith('.test.ts')) continue;

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // 1) Table-level drift (existing logic)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pat of SQL_PATTERNS) {
      pat.lastIndex = 0;
      let match = pat.exec(line);
      while (match !== null) {
        const tbl = match[1].toLowerCase();
        if (KNOWN_WRONG_TABLES[tbl]) {
          violations.push({
            file: file.replace(/\\/g, '/'),
            line: i + 1,
            table: tbl,
            suggested: KNOWN_WRONG_TABLES[tbl],
            snippet: line.trim().slice(0, 120),
          });
        }
        match = pat.exec(line);
      }
    }
  }

  // 2) Column-level drift: tabloya dokunan dosyalarda hayali kolon adı bul
  for (const rule of COLUMN_DRIFT_RULES) {
    if (!content.includes(rule.tableHint)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // İçeride zaten "AS action_type" gibi alias varsa, bu COALESCE çıktısı — atla
      if (/\bAS\s+(action_type|reference_type|reference_id)\b/i.test(line)) continue;
      // COALESCE içindeki action_type/reference_type/reference_id da OK (alias building)
      if (/COALESCE\([^)]*(action_type|reference_type|reference_id)/i.test(line)) continue;
      for (const bad of rule.badColumns) {
        bad.pattern.lastIndex = 0;
        if (bad.pattern.test(line)) {
          columnViolations.push({
            file: file.replace(/\\/g, '/'),
            line: i + 1,
            table: rule.tableHint,
            column: bad.name,
            suggested: bad.suggested,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    }
  }
}

console.log(`\n🔍 DB Schema Reference Audit\n`);
console.log(`Scanned ${files.length} files`);
console.log(`Known wrong tables: ${Object.keys(KNOWN_WRONG_TABLES).join(', ')}`);
console.log(`Column drift rules: ${COLUMN_DRIFT_RULES.map(r => r.tableHint).join(', ')}\n`);

const totalViolations = violations.length + columnViolations.length;

if (totalViolations === 0) {
  console.log('✅ No suspicious references (table + column drift) found.\n');
  process.exit(0);
}

if (violations.length > 0) {
  console.log(`⚠️  TABLE drift — ${violations.length} reference(s):\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.snippet}`);
    console.log(`    "${v.table}" → suggested: "${v.suggested}"\n`);
  }
}

if (columnViolations.length > 0) {
  console.log(`⚠️  COLUMN drift — ${columnViolations.length} reference(s):\n`);
  for (const v of columnViolations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    ${v.snippet}`);
    console.log(`    table=${v.table} column="${v.column}" → suggested: "${v.suggested}"\n`);
  }
}

if (STRICT) {
  console.log('❌ STRICT mode: exiting with code 1.\n');
  process.exit(1);
}
console.log(`(Run with --strict to fail CI on suspicious refs.)\n`);
