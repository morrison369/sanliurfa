/**
 * Static lock — HARD RULE #51
 * Bulk update must validate column names against an allowlist before SQL interpolation.
 * Without this, a caller can inject arbitrary SQL column names: { "'; DROP TABLE users;--": 1 }.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('HARD RULE #51 — Column Allowlist for Bulk Update', () => {
  it('bulk/index.ts must define ALLOWED_UPDATE_COLUMNS and filter before SQL', () => {
    const content = readFileSync(
      resolve(process.cwd(), 'src/lib/bulk/index.ts'),
      'utf-8'
    );
    expect(content, 'ALLOWED_UPDATE_COLUMNS constant must exist').toMatch(/ALLOWED_UPDATE_COLUMNS/);
    expect(content, 'entries must be filtered through allowlist').toMatch(/allowedColumns\.has\(key\)|allowedEntries/);
  });
});
