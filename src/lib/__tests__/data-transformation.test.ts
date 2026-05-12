/**
 * Unit Tests — data/data-transformation.ts singleton class managers
 *
 * - TransformationEngine (transform with field/condition/lookup; applyFunction uppercase/lowercase/trim/substring/date-parse/age-from-date)
 * - FieldMapper (createMapping + applyMapping + coerceType string/number/boolean/date/array)
 * - DataEnricher (createEnrichment + enrichData lookup + addCalculatedField)
 * - RulesEngine (createRuleSet + evaluateRules condition/custom-function/aggregate)
 */

import { describe, it, expect } from 'vitest';
import {
  transformationEngine,
  fieldMapper,
  dataEnricher,
  rulesEngine,
} from '../data/data-transformation';

describe('TransformationEngine', () => {
  it('transform — field rule (source → target)', () => {
    const result = transformationEngine.transform(
      { name: 'Ali' },
      { full_name: { type: 'field', source: 'name' } },
    );
    expect(result.full_name).toBe('Ali');
  });

  it('transform — uppercase function', () => {
    const result = transformationEngine.transform(
      { name: 'sanliurfa' },
      { name: { type: 'field', source: 'name', function: 'uppercase' } },
    );
    expect(result.name).toBe('SANLIURFA');
  });

  it('transform — lowercase function', () => {
    const result = transformationEngine.transform(
      { x: 'HELLO' },
      { x: { type: 'field', source: 'x', function: 'lowercase' } },
    );
    expect(result.x).toBe('hello');
  });

  it('transform — trim function', () => {
    const result = transformationEngine.transform(
      { x: '  spaced  ' },
      { x: { type: 'field', source: 'x', function: 'trim' } },
    );
    expect(result.x).toBe('spaced');
  });

  it('transform — substring (max 10 char)', () => {
    const result = transformationEngine.transform(
      { x: 'this is a long string' },
      { x: { type: 'field', source: 'x', function: 'substring' } },
    );
    expect(result.x).toBe('this is a ');
    expect(result.x.length).toBe(10);
  });

  it('transform — date-parse function', () => {
    const result = transformationEngine.transform(
      { date: '2026-01-01' },
      { date: { type: 'field', source: 'date', function: 'date-parse' } },
    );
    expect(typeof result.date).toBe('number');
  });

  it('transform — bilinmeyen function → value olduğu gibi', () => {
    const result = transformationEngine.transform(
      { x: 'value' },
      { x: { type: 'field', source: 'x', function: 'unknown-function' } },
    );
    expect(result.x).toBe('value');
  });

  it('transform — condition rule', () => {
    const result = transformationEngine.transform(
      { x: 1 },
      { isValid: { type: 'condition', rule: true } },
    );
    expect(result.isValid).toBe('true');
  });

  it('transform — lookup rule', () => {
    const result = transformationEngine.transform(
      { x: 1 },
      { city: { type: 'lookup', lookup: 'sanliurfa' } },
    );
    expect(result.city).toBe('lookup_sanliurfa');
  });

  it('applyTemplate — bilinmeyen template → data olduğu gibi', () => {
    const data = { x: 1 };
    expect(transformationEngine.applyTemplate(data, 'non-existent')).toEqual(data);
  });

  it('getMetrics — totalTransformations + averageTransformTime + successRate', () => {
    const m = transformationEngine.getMetrics();
    expect(m).toHaveProperty('totalTransformations');
    expect(m.successRate).toBe(0.98);
  });
});

describe('FieldMapper', () => {
  it('createMapping — id `mapping-` prefix', () => {
    const id = fieldMapper.createMapping('Test Mapping', { newField: 'oldField' });
    expect(id).toMatch(/^mapping-\d+-\d+$/);
  });

  it('applyMapping — sourceField → targetField', () => {
    const id = fieldMapper.createMapping('Map1', { full_name: 'name', email_addr: 'email' });
    const result = fieldMapper.applyMapping({ name: 'Ali', email: 'a@b.com' }, id);
    expect(result.full_name).toBe('Ali');
    expect(result.email_addr).toBe('a@b.com');
  });

  it('applyMapping — bilinmeyen mappingId → data olduğu gibi', () => {
    const data = { x: 1 };
    expect(fieldMapper.applyMapping(data, 'non-existent')).toEqual(data);
  });

  it('getMapping — bilinmeyen → null', () => {
    expect(fieldMapper.getMapping('non-existent')).toBeNull();
  });

  it('listMappings — array', () => {
    expect(Array.isArray(fieldMapper.listMappings())).toBe(true);
  });

  it('coerceType — string/number/boolean/date/array', () => {
    expect(fieldMapper.coerceType(123, 'string')).toBe('123');
    expect(fieldMapper.coerceType('456', 'number')).toBe(456);
    expect(fieldMapper.coerceType(1, 'boolean')).toBe(true);
    expect(fieldMapper.coerceType('2026-01-01', 'date')).toBeInstanceOf(Date);
    expect(fieldMapper.coerceType('x', 'array')).toEqual(['x']);
  });

  it('coerceType — array zaten array → wrap yok', () => {
    expect(fieldMapper.coerceType([1, 2], 'array')).toEqual([1, 2]);
  });

  it('coerceType — bilinmeyen type → value olduğu gibi', () => {
    expect(fieldMapper.coerceType('x', 'unknown-type')).toBe('x');
  });
});

describe('DataEnricher', () => {
  it('createEnrichment — id `enrichment-` prefix', () => {
    const id = dataEnricher.createEnrichment({
      lookupTable: 'users', matchField: 'userId', fieldsToAdd: ['name'],
    } as any);
    expect(id).toMatch(/^enrichment-\d+-\d+$/);
  });

  it('enrichData — lookup match → field eklenir', () => {
    const id = dataEnricher.createEnrichment({
      lookupTable: 'users', matchField: 'userId', fieldsToAdd: ['name', 'city'],
    } as any);
    const result = dataEnricher.enrichData(
      { userId: 'u1', amount: 100 },
      id,
      { u1: { name: 'Ali', city: 'Şanlıurfa' } },
    );
    expect(result.name).toBe('Ali');
    expect(result.city).toBe('Şanlıurfa');
    expect(result.amount).toBe(100); // original preserve
  });

  it('enrichData — lookup miss → original data', () => {
    const id = dataEnricher.createEnrichment({
      lookupTable: 'x', matchField: 'id', fieldsToAdd: ['extra'],
    } as any);
    const result = dataEnricher.enrichData({ id: 'unknown' }, id, {});
    expect(result.extra).toBeUndefined();
  });

  it('enrichData — bilinmeyen enrichmentId → data olduğu gibi', () => {
    const data = { x: 1 };
    expect(dataEnricher.enrichData(data, 'non-existent', {})).toEqual(data);
  });

  it('addCalculatedField — age_from_date formula → 30 (placeholder)', () => {
    const result = dataEnricher.addCalculatedField({ birthDate: '1990' }, 'age', 'age_from_date(birthDate)');
    expect(result.age).toBe(30);
  });

  it('addCalculatedField — concat formula → join values', () => {
    const result = dataEnricher.addCalculatedField({ a: 'X', b: 'Y' }, 'combined', 'concat(a, b)');
    expect(result.combined).toBe('X Y');
  });

  it('addCalculatedField — bilinmeyen formula → 0', () => {
    const result = dataEnricher.addCalculatedField({}, 'x', 'unknown-formula');
    expect(result.x).toBe(0);
  });

  it('getEnrichment — bilinmeyen → null', () => {
    expect(dataEnricher.getEnrichment('non-existent')).toBeNull();
  });
});

describe('RulesEngine', () => {
  it('createRuleSet — id `ruleset-` prefix', () => {
    const id = rulesEngine.createRuleSet('Test Rules', [
      { id: 'r1', type: 'condition', condition: 'x > 0', target: 'positive' } as any,
    ]);
    expect(id).toMatch(/^ruleset-\d+-\d+$/);
  });

  it('evaluateRules — condition rule (true)', () => {
    const id = rulesEngine.createRuleSet('Cond', [
      { id: 'r', type: 'condition', condition: 'x === true', target: 'isTrue' } as any,
    ]);
    const result = rulesEngine.evaluateRules({ x: 1 }, id);
    expect(result.isTrue).toBe(true);
  });

  it('evaluateRules — condition rule (false)', () => {
    const id = rulesEngine.createRuleSet('Cond2', [
      { id: 'r', type: 'condition', condition: 'x === false', target: 'isFalse' } as any,
    ]);
    const result = rulesEngine.evaluateRules({ x: 1 }, id);
    expect(result.isFalse).toBe(false);
  });

  it('evaluateRules — custom-function → "function_<name>_result"', () => {
    const id = rulesEngine.createRuleSet('Custom', [
      { id: 'r', type: 'custom-function', function: 'myFunc', target: 'result' } as any,
    ]);
    const result = rulesEngine.evaluateRules({}, id);
    expect(result.result).toBe('function_myFunc_result');
  });

  it('evaluateRules — bilinmeyen ruleSetId → boş object', () => {
    expect(rulesEngine.evaluateRules({}, 'non-existent')).toEqual({});
  });
});
