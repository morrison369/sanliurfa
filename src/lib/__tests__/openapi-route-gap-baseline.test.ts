import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('openapi route gap baseline', () => {
  it('is present and has normalized sorted unique entries', () => {
    const baselinePath = path.join(process.cwd(), 'docs', 'openapi-route-gap-baseline.json');
    expect(fs.existsSync(baselinePath)).toBe(true);

    const raw = fs.readFileSync(baselinePath, 'utf8');
    const parsed = JSON.parse(raw) as { generatedAt?: string; missingInSpec?: string[] };

    expect(typeof parsed.generatedAt).toBe('string');
    expect(Array.isArray(parsed.missingInSpec)).toBe(true);

    const routes = parsed.missingInSpec ?? [];
    for (const route of routes) {
      expect(route.startsWith('/')).toBe(true);
      expect(route).not.toContain('//');
    }

    const sorted = [...routes].sort();
    expect(routes).toEqual(sorted);

    const unique = new Set(routes);
    expect(unique.size).toBe(routes.length);
  });
});
