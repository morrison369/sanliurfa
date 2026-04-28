/**
 * Security Regression Lock — `error.message` Direct Leak Detection
 *
 * Bu test gelecek code change'ler için STATIC GUARD:
 * Bir geliştirici `detail: error instanceof Error ? error.message : ...` pattern'ini
 * yeni bir endpoint'e eklerse bu test kırılır → CI/code review'da yakalanır.
 *
 * `safeErrorDetail()` helper'ını kullanmaları gerekir (CLAUDE.md HARD RULE #9).
 *
 * **Whitelist**: Sadece auth/login, auth/logout, auth/social/* kasıtlı user-facing
 * Türkçe error mesajları kullanır (UX). Bu 3 dosya istisna olarak kabul edilir.
 *
 * Yeni dosya whitelist'e eklenirse mutlaka YORUM ile gerekçe yaz: hangi user-facing
 * Türkçe error fırlatılıyor, hangi lib fonksiyonu source.
 */

import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const API_DIR = join(process.cwd(), 'src', 'pages', 'api');

// İntentional user-facing Turkish error messages — explicit istisna
const ALLOWED_LEAKS = new Set([
  'src/pages/api/auth/login.ts',           // runLoginFlow throws "E-posta veya şifre hatalı" etc
  'src/pages/api/auth/logout.ts',          // signOut error → user-facing "Çıkış işlemi sırasında bir hata oluştu"
  'src/pages/api/auth/social/facebook.ts', // OAuth provider errors → user-facing
]);

const LEAK_PATTERNS = [
  /detail:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/,
  /detail:\s*err\s+instanceof\s+Error\s*\?\s*err\.message/,
];

async function* walkTsFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTsFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      yield fullPath;
    }
  }
}

function relativeFromRepoRoot(absolutePath: string): string {
  return absolutePath.replace(process.cwd() + (process.cwd().includes('\\') ? '\\' : '/'), '').replace(/\\/g, '/');
}

describe('Security Regression Lock — error.message direct leak', () => {
  it('no API endpoint leaks error.message in problemJson detail (except whitelisted auth)', async () => {
    const violations: { file: string; line: number; content: string }[] = [];

    for await (const filePath of walkTsFiles(API_DIR)) {
      const relPath = relativeFromRepoRoot(filePath);
      if (ALLOWED_LEAKS.has(relPath)) continue;

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of LEAK_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({ file: relPath, line: idx + 1, content: line.trim() });
          }
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations.map(v => `  ${v.file}:${v.line}\n    ${v.content}`).join('\n');
      throw new Error(
        `Found ${violations.length} error.message leak(s) — use safeErrorDetail() instead:\n${summary}\n\n` +
        `If this is intentional user-facing Turkish error, add path to ALLOWED_LEAKS in ` +
        `src/lib/__tests__/security-no-error-message-leak.test.ts with comment explaining the source throw.`
      );
    }

    expect(violations).toEqual([]);
  });

  it('whitelist contains only known intentional user-facing endpoints', () => {
    // Bu test ALLOWED_LEAKS listesinin sürünmesini önler.
    // Yeni whitelist eklenmesi PR review'da explicit gerekçe gerektirir.
    expect(ALLOWED_LEAKS.size).toBeLessThanOrEqual(5);
    for (const path of ALLOWED_LEAKS) {
      expect(path).toMatch(/^src\/pages\/api\/auth\//);
    }
  });
});
