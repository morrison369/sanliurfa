/**
 * Static Lock — `astro:i18n` import + locale JSON dosyaları yasak (HARD RULE #25)
 *
 * Background: CLAUDE.md "Strict Prohibitions" — Türkçe-only proje. Multi-language
 * support, language selectors, hreflang tags, language preference APIs, locale
 * JSON files (en.json, ar.json, fr.json, vb.) FORBIDDEN.
 *
 * Allowed pattern:
 *   <!-- HTML: sadece Türkçe lang attribute -->
 *   <html lang="tr">
 *
 * Forbidden patterns:
 *   import { } from 'astro:i18n';                  // Astro i18n entry point
 *   astro.config.mjs i18n: { ... } block           // i18n routing config
 *   public/locales/en.json                          // locale JSON
 *   src/locales/ar.json                             // locale JSON
 *   src/i18n/en.ts                                  // i18n module
 *
 * Bu test hem source code import + hem dosya varlığı check'i yapar.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, sep } from 'node:path';

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = join(PROJECT_ROOT, 'src');
const PUBLIC_ROOT = join(PROJECT_ROOT, 'public');

// Forbidden locale codes — yeni eklenmesi yasak
const FORBIDDEN_LOCALE_CODES = [
  'en', 'ar', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'zh', 'ja',
  'ko', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'el', 'he', 'fa',
];

// File patterns that indicate i18n adoption
const LOCALE_FILE_PATTERN = new RegExp(
  `(?:^|[/\\\\])(${FORBIDDEN_LOCALE_CODES.join('|')})\\.(json|ts|tsx|mjs|cjs|js)$`,
  'i'
);

// astro:i18n import — Astro's official i18n entry point yasak
const ASTRO_I18N_IMPORT = /from\s*['"]astro:i18n['"]/;

function walk(dir: string, predicate?: (entry: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let stat;
    try { stat = statSync(p); } catch { continue; }
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__' || entry === 'dist') continue;
      out.push(...walk(p, predicate));
    } else if (stat.isFile()) {
      if (!predicate || predicate(entry)) out.push(p);
    }
  }
  return out;
}

describe('Static Lock — i18n adoption yasak (HARD RULE #25, Türkçe-only)', () => {
  it('no source file imports astro:i18n entry point', () => {
    const files = walk(SRC_ROOT, (e) => /\.(ts|tsx|astro|mjs)$/.test(e));
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (ASTRO_I18N_IMPORT.test(source)) {
        const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
        violations.push(rel);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `${violations.length} dosya astro:i18n import ediyor. Türkçe-only proje, ` +
        `multi-language support yasak (CLAUDE.md Strict Prohibitions):\n` +
        violations.map(v => `  - ${v}`).join('\n')
      );
    }
  });

  it('no locale JSON/TS files in src/ or public/ (en.json, ar.json, vb.)', () => {
    const allFiles = [...walk(SRC_ROOT), ...walk(PUBLIC_ROOT)];
    const localeFiles = allFiles.filter(f => LOCALE_FILE_PATTERN.test(f));
    if (localeFiles.length > 0) {
      const rels = localeFiles.map(f => {
        const idx = f.split(sep).findIndex(s => s === 'src' || s === 'public');
        return f.split(sep).slice(idx).join('/');
      });
      throw new Error(
        `${rels.length} locale dosyası bulundu. Türkçe-only proje, locale JSON/TS yasak:\n` +
        rels.map(r => `  - ${r}`).join('\n')
      );
    }
  });

  it('astro.config.mjs içinde i18n config block yok', () => {
    const configPath = join(PROJECT_ROOT, 'astro.config.mjs');
    if (!existsSync(configPath)) return;
    const config = readFileSync(configPath, 'utf8');
    // Match: `i18n: {` or `i18n:{` (top-level Astro i18n config)
    // But allow: 'i18n' string in comments or unrelated context
    const i18nConfig = /^\s+i18n\s*:\s*\{/m;
    if (i18nConfig.test(config)) {
      throw new Error(
        `astro.config.mjs içinde i18n config block bulundu. Türkçe-only proje, kaldır.`
      );
    }
  });
});
