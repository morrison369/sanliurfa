import { describe, expect, it } from 'vitest';

import { analyzeVisibleText, summarizeFindings } from '../copy-hygiene';

describe('copy-hygiene', () => {
  it('finds banned raw labels', () => {
    const findings = analyzeVisibleText(`
      const loading = 'Yukleniyor...';
      const text = 'Konusma secilmedi';
    `);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((item) => item.text.includes('Yukleniyor'))).toBe(true);
  });

  it('summarizes clean results', () => {
    expect(summarizeFindings([])).toBe('Visible text audit: temiz');
  });
});
