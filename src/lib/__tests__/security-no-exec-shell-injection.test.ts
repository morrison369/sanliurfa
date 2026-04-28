/**
 * Static Lock — Shell exec() from child_process (HARD RULE #36)
 *
 * child_process exec() spawns a shell; args interpolated into a command string
 * are interpreted by the shell. A DB-sourced path containing metacharacters
 * (;, &&, |, backtick) becomes a second shell command → command injection.
 *
 * All process execution MUST use execFileNoThrow() from src/lib/exec-file.ts
 * or bare execFile() with args as an array — no shell involved.
 *
 * Forbidden: import { exec } from 'child_process'  ← shell injection risk
 * Allowed:   import { execFile } from 'child_process'  ← no shell
 * Allowed:   execFileNoThrow() from src/lib/exec-file.ts  ← preferred
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

// exec-file.ts is the safe wrapper — it wraps execFile internally, not exec
const ALLOWED_FILES = new Set<string>(['src/lib/exec-file.ts']);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      out.push(...walk(p));
    } else if (s.isFile() && /\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function toRelative(absolute: string): string {
  const parts = absolute.split(sep);
  const idx = parts.indexOf('src');
  return parts.slice(idx).join('/');
}

// Detects: { exec } or { exec, ... } or { ..., exec } destructured from child_process.
// Does NOT flag: execFile, execFileSync, execSync (all array-based, no shell).
function hasBareExecImport(source: string): boolean {
  if (!source.includes('child_process')) return false;

  const lines = source.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (!line.includes('child_process')) continue;

    const braceMatch = line.match(/\{([^}]+)\}/);
    if (!braceMatch) continue;

    // Parse destructured names, stripping rename aliases: { exec as run } → exec
    const names = braceMatch[1]
      .split(',')
      .map(s => s.trim().split(/\s+as\s+/)[0].trim());

    if (names.some(n => n === 'exec')) return true;
  }
  return false;
}

describe('Static Lock — No bare exec() from child_process (HARD RULE #36)', () => {
  const files = walk(SRC_ROOT);

  it('finds at least 50 source files (sanity)', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no file imports bare exec from child_process — use execFileNoThrow()', () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = toRelative(file);
      if (ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      if (hasBareExecImport(source)) {
        violations.push(rel);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `${violations.length} dosya shell exec() kullanıyor (HARD RULE #36).\n` +
        `execFileNoThrow() from src/lib/exec-file.ts kullanın — no shell, args as array.\n\n` +
        `Affected files:\n` +
        violations.map(v => `  - ${v}`).join('\n'),
      );
    }
  });
});
