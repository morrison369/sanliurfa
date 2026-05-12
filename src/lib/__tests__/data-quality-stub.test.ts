/**
 * Unit Tests — data/quality.ts (stub DataQualityEngine)
 *
 * Note: data/data-quality.ts (Batch #255) zengin 4-manager ayrı module.
 * Bu küçük stub: addRule + validate (alan varlığı kontrolü).
 */

import { describe, it, expect } from 'vitest';
import { DataQualityEngine, dataQualityEngine } from '../data/quality';

describe('DataQualityEngine stub', () => {
  it('addRule — id 12-hex', () => {
    const e = new DataQualityEngine();
    const rule = e.addRule({ field: 'email', rule: 'required', threshold: 1 });
    expect(rule.id).toMatch(/^[0-9a-f]{12}$/);
    expect(rule.field).toBe('email');
  });

  it('validate — boş rules → score 100 (total=0 fallback)', () => {
    const e = new DataQualityEngine();
    const report = e.validate({ x: 1 });
    expect(report.score).toBe(100);
    expect(report.passed).toBe(0);
    expect(report.failed).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it('validate — alan mevcut → passed++', () => {
    const e = new DataQualityEngine();
    e.addRule({ field: 'email', rule: 'required', threshold: 1 });
    const report = e.validate({ email: 'a@b.com' });
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(0);
    expect(report.score).toBe(100);
  });

  it('validate — alan eksik → failed++ + issues', () => {
    const e = new DataQualityEngine();
    e.addRule({ field: 'name', rule: 'required', threshold: 1 });
    const report = e.validate({});
    expect(report.failed).toBe(1);
    expect(report.score).toBe(0);
    expect(report.issues[0]).toContain('Missing field: name');
  });

  it('validate — yarı geçer/yarı kalır → score 50', () => {
    const e = new DataQualityEngine();
    e.addRule({ field: 'a', rule: 'r', threshold: 1 });
    e.addRule({ field: 'b', rule: 'r', threshold: 1 });
    const report = e.validate({ a: 1 }); // a var, b yok
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.score).toBe(50);
  });

  it('validate — undefined value → failed (alan tanımlı değil)', () => {
    const e = new DataQualityEngine();
    e.addRule({ field: 'x', rule: 'r', threshold: 1 });
    const report = e.validate({ x: undefined });
    expect(report.failed).toBe(1);
  });

  it('validate — null value → passed (undefined check, null tanımlı sayılır)', () => {
    const e = new DataQualityEngine();
    e.addRule({ field: 'x', rule: 'r', threshold: 1 });
    const report = e.validate({ x: null });
    // null !== undefined → passed
    expect(report.passed).toBe(1);
  });

  it('singleton dataQualityEngine exported', () => {
    expect(dataQualityEngine).toBeInstanceOf(DataQualityEngine);
  });
});
