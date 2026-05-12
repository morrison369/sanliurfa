/**
 * Static lock — HARD RULE #49
 * Feature flag percentage checks must use deterministic SHA-256 hashing, not Math.random().
 * Math.random() causes non-deterministic UX: same user gets different feature experience per request.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const FEATURE_DIRS = [
  join(process.cwd(), 'src/lib/feature'),
  join(process.cwd(), 'src/lib/feature-flags'),
];

function collectTsFiles(dir: string): string[] {
  try {
    const files: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files.push(...collectTsFiles(full));
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
        files.push(full);
      }
    }
    return files;
  } catch {
    return [];
  }
}

const MATH_RANDOM_PATTERN = /Math\.random\(\)/;

describe('HARD RULE #49: No Math.random() in feature flag percentage checks', () => {
  it('feature flag modules use deterministic SHA-256 hashing for percentage rollout', () => {
    const files = FEATURE_DIRS.flatMap(collectTsFiles);
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      if (MATH_RANDOM_PATTERN.test(content)) {
        violations.push(file.replace(process.cwd() + '/', '').replace(/\\/g, '/'));
      }
    }

    expect(
      violations,
      `Feature flag files using Math.random() (non-deterministic UX):\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
