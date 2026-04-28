/**
 * Static Lock — `console.log` production code yasak (HARD RULE #23)
 *
 * Background: `console.log` production'da log seviyesi kontrolü yok, structured
 * field eklenemez, log aggregation görmez. Tüm logging `logger` (lib/logging veya
 * lib/logger) helper üzerinden yapılmalı: `logger.info`, `logger.warn`, `logger.error`,
 * `logger.debug`.
 *
 * Allowed:
 *   logger.info('Cache hit', { key });
 *   logger.error('Auth failed', err, { userId });
 *   console.warn(...) ve console.error(...) — exception handler last-resort
 *
 * Forbidden:
 *   console.log('debug', data)
 *   console.info('starting...')
 *
 * Whitelist: scripts/, dev tools, lib/logger, lib/logging zaten console kullanır.
 * .test/.spec dosyaları test setup'ta console kullanır.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// Whitelist (snapshot 2026-04-26):
const ALLOWED_FILES = new Set<string>([
  'src/lib/logger.ts',                          // logger implementation
  'src/lib/logging.ts',                         // logger implementation alternative
  'src/lib/logging/index.ts',                   // sub-folder
  'src/devtools/sanliurfa-toolbar.ts',          // dev toolbar
  'src/components/ErrorBoundary.astro',         // last-resort browser error log
  'src/components/PerformanceMonitor.tsx',      // dev-mode warnings
  'src/components/PerformanceMonitor.astro',    // PWA performance metrics debug
  'src/components/PWARegister.astro',           // SW registration lifecycle log
  'src/components/NotificationCenter.astro',    // notification debug
  'src/middleware.ts',                          // dev-mode requestId logs
  'src/lib/metrics.ts',                         // metrics dev log
]);

// Folder-based whitelist: tüm migration script'leri (one-time, console OK)
const ALLOWED_FOLDERS = ['src/migrations/', 'src/lib/security/__tests/'];

const FORBIDDEN_CONSOLE = /\bconsole\.(log|info|debug)\s*\(/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(p));
    } else if (stat.isFile() && /\.(ts|tsx|astro)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe('Static Lock — console.log production yasak (HARD RULE #23)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 100 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('no production source uses console.log/info/debug — use logger helper', () => {
    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const file of files) {
      const rel = file.split(sep).slice(file.split(sep).indexOf('src')).join('/');
      if (ALLOWED_FILES.has(rel)) continue;
      if (ALLOWED_FOLDERS.some(folder => rel.startsWith(folder))) continue;
      // Skip test files
      if (/\.(test|spec)\.(ts|tsx)$/.test(file)) continue;

      const source = readFileSync(file, 'utf8');
      if (!FORBIDDEN_CONSOLE.test(source)) continue;

      const lines = source.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (!FORBIDDEN_CONSOLE.test(line)) continue;
        // Allow eslint-disable comments
        if (/eslint-disable.*no-console/.test(source.split('\n')[i - 1] || '')) continue;
        violations.push({ file: rel, line: i + 1, snippet: trimmed.slice(0, 120) });
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `  ${v.file}:${v.line}\n    ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${violations.length} console.log/info/debug usage bulundu. ` +
        `Use logger.{info,warn,error,debug} from @/lib/logging:\n${msg}`
      );
    }
  });
});
