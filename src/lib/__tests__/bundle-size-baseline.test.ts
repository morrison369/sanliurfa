/**
 * Bundle Size Baseline Lock
 *
 * Background: 2026-04-26 Tailwind 4 + modern theme + astro-icon migration sonrası
 * baseline bundle size'ları kaydedildi. Bu test build artifact'ları üzerinde
 * regression check yapar — beklenen budget aşıldıysa CI fail.
 *
 * Baseline (2026-05-13):
 *   • CSS: multi-chunk public/admin surface, ~349 KB raw total
 *   • JS: 91 chunk, ~826 KB raw total
 *
 * Budget (regression threshold):
 *   • CSS bundle ≤ 400 KB (current multi-surface baseline + moderate headroom)
 *   • JS total ≤ 1900 KB (raw route-split total; admin CMS chunks included)
 *   • JS chunk count ≤ 130 (route splitting growth tolerated)
 *
 * Test SSR build artifact'lara güvenir (`dist/client/_astro/`). Build yoksa
 * test SKIP (CI'da `npm run build` mutlaka önce çalışır).
 *
 * Budget aşılırsa: bundle analyze edip büyüme kaynağını tespit et — yeni
 * heavy npm dep, accidental inclusion, ya da unintentional class explosion.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ASTRO_DIR = join(process.cwd(), 'dist', 'client', '_astro');

const BUDGET = {
  cssMaxBytes: 400 * 1024,        // 400 KB
  jsMaxBytesTotal: 1900 * 1024,   // 1900 KB
  jsMaxChunks: 130,
};

function tryGetSizes() {
  if (!existsSync(ASTRO_DIR)) return null;

  const entries = readdirSync(ASTRO_DIR);
  const cssFiles = entries.filter(e => e.endsWith('.css'));
  const jsFiles = entries.filter(e => e.endsWith('.js'));

  const cssBytes = cssFiles.reduce(
    (sum, f) => sum + statSync(join(ASTRO_DIR, f)).size,
    0
  );
  const jsBytes = jsFiles.reduce(
    (sum, f) => sum + statSync(join(ASTRO_DIR, f)).size,
    0
  );

  return { cssBytes, jsBytes, jsCount: jsFiles.length, cssCount: cssFiles.length };
}

describe('Bundle Size Baseline Lock', () => {
  const sizes = tryGetSizes();

  it.skipIf(!sizes)('CSS bundle within budget (≤ 400 KB)', () => {
    expect(sizes!.cssBytes).toBeLessThanOrEqual(BUDGET.cssMaxBytes);
  });

  it.skipIf(!sizes)('JS bundle total within budget (≤ 1900 KB)', () => {
    expect(sizes!.jsBytes).toBeLessThanOrEqual(BUDGET.jsMaxBytesTotal);
  });

  it.skipIf(!sizes)('JS chunk count within budget (≤ 130)', () => {
    expect(sizes!.jsCount).toBeLessThanOrEqual(BUDGET.jsMaxChunks);
  });

  it.skipIf(!sizes)('reports current sizes (informational)', () => {
    console.info(
      `[bundle-baseline] CSS: ${(sizes!.cssBytes / 1024).toFixed(1)} KB ` +
      `(${sizes!.cssCount} file), JS: ${(sizes!.jsBytes / 1024).toFixed(1)} KB ` +
      `(${sizes!.jsCount} chunks)`
    );
    expect(sizes!.cssBytes).toBeGreaterThan(0);
  });
});
