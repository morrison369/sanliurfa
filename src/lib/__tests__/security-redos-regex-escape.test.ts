/**
 * Security Regression Lock — ReDoS via Unescaped Dynamic Regex
 *
 * 2026-04-26 audit'inde 4 dosyada `new RegExp(userInput)` pattern'i meta-char
 * escape yapmıyordu. Attacker `(.+)+` veya benzer catastrophic backtracking
 * pattern'i göndererek tek request'te CPU'yu 30+ saniye kilitleyebilirdi (ReDoS).
 *
 * Bu test STATIC GUARD: `new RegExp(VAR)` pattern'i kullanan dosyalarda
 * `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` escape pattern'inin de bulunduğunu
 * doğrular. Aksi halde ReDoS antipattern flagged.
 *
 * Whitelist: regex string'inin hardcoded literal olduğu kullanımlar (ör.
 * template kalıbı sabit, sadece varName escape gereksinimi farklı yerden geliyor).
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SRC_DIR = join(process.cwd(), 'src');

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTsFiles(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      yield fullPath;
    }
  }
}

function relativeFromRepoRoot(absolutePath: string): string {
  const sep = process.cwd().includes('\\') ? '\\' : '/';
  return absolutePath.replace(process.cwd() + sep, '').replace(/\\/g, '/');
}

// Allowlist: regex pattern hardcoded literal kullananlar (caller-controlled değil)
const ALLOWED_FILES = new Set<string>([
  'src/lib/cache/redis-cache.ts',         // pattern.replace ile pre-escape ediliyor
  'src/lib/multi/multi-level-cache.ts',   // pattern hardcoded glob '*' replace
  'src/lib/marketing/marketing-automation.ts', // variable hardcoded literal
  'src/lib/sanitize.ts',                  // allowedTags whitelist'ten geliyor
  'src/lib/seo/seo-utils.ts',             // pattern internal
  'src/lib/voice-search/index.ts',        // VOICE_COMMANDS array hardcoded
  'src/lib/validation.ts',                // RegExp passes through type check
]);

describe('Security Regression Lock — ReDoS via dynamic RegExp', () => {
  it('all dynamic new RegExp(VAR) usages have meta-char escape', async () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for await (const filePath of walkTsFiles(SRC_DIR)) {
      const relPath = relativeFromRepoRoot(filePath);
      if (ALLOWED_FILES.has(relPath)) continue;

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Pattern: `new RegExp(varName,...)` veya `new RegExp(\`...${varName}...\`,...)`
        // Skip RegExp literals (e.g. /foo/g) and string literals (e.g. new RegExp('foo'))
        const dynamicRegexMatch = line.match(/new\s+RegExp\(\s*[\w.]+\s*[,)]/);
        const templateRegexMatch = line.match(/new\s+RegExp\(\s*[`'"]\\?[^`'"]*\$\{[\w.]+\}/);

        if (dynamicRegexMatch || templateRegexMatch) {
          // 5 satırlık bağlamda escape pattern var mı?
          const contextStart = Math.max(0, idx - 5);
          const contextEnd = Math.min(lines.length, idx + 2);
          const context = lines.slice(contextStart, contextEnd).join('\n');

          // Escape pattern: `replace(/[.*+?^${}()|[\]\\]/g,` benzeri
          const hasEscape = /replace\(\s*\/\[[.*+?\^${}()|[\]\\\\]+\]\/g/.test(context);

          if (!hasEscape) {
            violations.push({ file: relPath, line: idx + 1, content: line.trim().slice(0, 120) });
          }
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations.map(v => `  ${v.file}:${v.line}\n    ${v.content}`).join('\n');
      throw new Error(
        `Found ${violations.length} potential ReDoS vector(s) — escape regex meta-chars before new RegExp(userInput):\n${summary}\n\n` +
        `Pattern:\n` +
        `  ❌ new RegExp(userInput, 'g')\n` +
        `  ✅ const escaped = userInput.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');\n` +
        `     new RegExp(escaped, 'g')\n\n` +
        `If pattern is hardcoded literal (not user input), add path to ALLOWED_FILES.`
      );
    }

    expect(violations).toEqual([]);
  });
});
