/**
 * Static lock — HARD RULE #48
 * All API endpoints (including admin) must use safeErrorDetail() in catch blocks.
 * Direct error.message exposure leaks DB schema, file paths, and internal details.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = join(process.cwd(), 'src/pages/api');

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

// Pattern: response field with raw error.message — the exact anti-pattern fixed in Batch #54
const LEAK_PATTERN = /(?:error|detail)\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/;

describe('HARD RULE #48: No raw error.message in API response fields', () => {
  it('all API endpoints use safeErrorDetail instead of raw error.message in catch blocks', () => {
    const files = collectTsFiles(API_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      if (LEAK_PATTERN.test(content)) {
        violations.push(file.replace(process.cwd() + '/', '').replace(/\\/g, '/'));
      }
    }

    expect(violations, `Files directly exposing error.message in response fields:\n${violations.join('\n')}`).toEqual([]);
  });
});
