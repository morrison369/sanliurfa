/**
 * Static Lock — Inline `<svg viewBox="0 0 24 24">` snapshot lock (HARD RULE #21)
 *
 * Background: Yeni icon kullanımı için astro-icon helper (Iconify, 200K+ icon)
 * zorunlu. Inline SVG legacy pattern — maintenance burden + bundle bloat +
 * tutarsız stroke/fill convention. Yeni komponent inline SVG eklerse CI fail.
 *
 * Allowed pattern (yeni icon):
 *   <Icon name="lucide:home" />
 *   <Icon name="heroicons:bell" class="w-5 h-5" />
 *   <!-- veya backward-compat shim -->
 *   <Icon name="home" />  <!-- → lucide:home otomatik -->
 *
 * Forbidden pattern (yeni dosyada):
 *   <svg viewBox="0 0 24 24"><path d="..." /></svg>
 *
 * Snapshot strategy: 2026-04-26 codebase'de 50 dosya legacy inline SVG kullanıyor.
 * Bu test mevcut 50 dosyayı `ALLOWED_FILES` whitelist'inde tutar — yeni dosya
 * inline SVG eklerse CI fail. Backlog azaldıkça whitelist'ten dosya çıkarılır
 * (her migration sonrası).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Snapshot — 2026-04-26 SVG migration MILESTONE: tüm migrable dosyalar astro-icon'a geçirildi.
// Kalan 5 entry kalıcı istisna: 4 client-side template literal (Astro <Icon> SSR string'e
// dönmez) + 1 brand mark (Google OAuth multi-color logo, Iconify lucide/heroicons'ta yok).
// Floor state: bu set'e yeni dosya eklenmemeli — yeni inline SVG kullanımı CI'da yakalanır.
const ALLOWED_FILES = new Set<string>([
  'src/components/ErrorBoundary.astro',  // showError() client-side fallback render template literal — Astro <Icon> SSR string'e dönmez, raw HTML zorunlu
  'src/pages/giris.astro',  // Google OAuth brand logo (multi-color brand mark) — astro-icon lucide/heroicons collection'larında brand marka yok, brand mark exception
  'src/pages/admin/blog/index.astro',  // client-side dynamic table render template literal — Astro <Icon> SSR string'e dönmez, raw HTML zorunlu
  'src/components/Map.astro',  // copy-coords client-side feedback dynamic markup — Astro <Icon> SSR string'e dönmez, raw HTML zorunlu
  'src/lib/toast.ts',  // ToastManager.show() client-side dynamic toast markup template literal — Astro <Icon> SSR string'e dönmez, raw HTML zorunlu
]);

const INLINE_SVG_PATTERN = /<svg[^>]*viewBox="0 0 24 24"/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(astro|tsx?|jsx?|mdx?)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — Inline `<svg viewBox="0 0 24 24">` snapshot (HARD RULE #21)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no NEW file introduces inline `<svg viewBox="0 0 24 24">` — use astro-icon `<Icon>`', () => {
    const newViolations: string[] = [];
    const stillLegacyButAllowed: string[] = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      const source = readFileSync(file, 'utf8');
      if (!INLINE_SVG_PATTERN.test(source)) continue;

      if (ALLOWED_FILES.has(rel)) {
        stillLegacyButAllowed.push(rel);
      } else {
        newViolations.push(rel);
      }
    }

    if (newViolations.length > 0) {
      throw new Error(
        `${newViolations.length} YENİ dosya inline <svg viewBox="0 0 24 24"> kullanıyor. ` +
        `Use astro-icon: <Icon name="lucide:NAME" /> veya <Icon name="heroicons:NAME" />:\n` +
        newViolations.map(v => `  - ${v}`).join('\n')
      );
    }

    // Soft regression check: whitelist'ten dosya silinmedi mi (migration sırasında)?
    // Eğer bir whitelist dosyası artık inline SVG içermiyorsa, whitelist'ten çıkar (CI uyarısı).
    const removableFromWhitelist: string[] = [];
    for (const allowedRel of ALLOWED_FILES) {
      if (!stillLegacyButAllowed.includes(allowedRel)) {
        removableFromWhitelist.push(allowedRel);
      }
    }
    if (removableFromWhitelist.length > 0) {
      console.warn(
        `[lock-test] ${removableFromWhitelist.length} dosya migrate edildi, whitelist'ten çıkar:\n` +
        removableFromWhitelist.map(v => `  - ${v}`).join('\n')
      );
    }
  });
});
