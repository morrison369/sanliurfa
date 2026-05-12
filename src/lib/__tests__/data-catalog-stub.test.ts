/**
 * Unit Tests — data/catalog.ts (stub DataCatalog)
 *
 * Note: data/data-catalog.ts (Batch #253) zengin DataCatalog ayrı module.
 * Bu küçük stub: register/search/get + 12-hex id.
 */

import { describe, it, expect } from 'vitest';
import { DataCatalog, dataCatalog, type Dataset } from '../data/catalog';

describe('DataCatalog stub', () => {
  it('register — id 12-hex auto + createdAt Date', () => {
    const ds = new DataCatalog();
    const dataset = ds.register({ name: 'Test', description: 'D', schema: {} });
    expect(dataset.id).toMatch(/^[0-9a-f]{12}$/);
    expect(dataset.createdAt).toBeInstanceOf(Date);
  });

  it('register — input field preserve', () => {
    const ds = new DataCatalog();
    const dataset = ds.register({
      name: 'Sales', description: 'Q1 sales data', schema: { id: 'int', amount: 'decimal' },
    });
    expect(dataset.name).toBe('Sales');
    expect(dataset.schema.amount).toBe('decimal');
  });

  it('search — name match', () => {
    const ds = new DataCatalog();
    ds.register({ name: 'UniqueSearchName', description: '', schema: {} });
    expect(ds.search('UniqueSearchName')).toHaveLength(1);
  });

  it('search — description match', () => {
    const ds = new DataCatalog();
    ds.register({ name: 'X', description: 'unique-desc-test', schema: {} });
    expect(ds.search('unique-desc-test').length).toBeGreaterThan(0);
  });

  it('search — eşleşme yok → boş array', () => {
    const ds = new DataCatalog();
    ds.register({ name: 'X', description: 'Y', schema: {} });
    expect(ds.search('non-existent-query')).toEqual([]);
  });

  it('search — case-sensitive (substring includes)', () => {
    const ds = new DataCatalog();
    ds.register({ name: 'CaseTest', description: '', schema: {} });
    expect(ds.search('casetest')).toEqual([]); // case-sensitive
  });

  it('get — registered → dataset', () => {
    const ds = new DataCatalog();
    const dataset = ds.register({ name: 'X', description: '', schema: {} });
    expect(ds.get(dataset.id)?.name).toBe('X');
  });

  it('get — bilinmeyen → undefined', () => {
    expect(new DataCatalog().get('non-existent')).toBeUndefined();
  });

  it('singleton dataCatalog exported', () => {
    expect(dataCatalog).toBeInstanceOf(DataCatalog);
  });

  it('register — iki çağrı farklı id (random)', () => {
    const ds = new DataCatalog();
    const d1 = ds.register({ name: 'A', description: '', schema: {} });
    const d2 = ds.register({ name: 'B', description: '', schema: {} });
    expect(d1.id).not.toBe(d2.id);
  });
});
