/**
 * Unit Tests — data/catalog.ts DataCatalog class (stub)
 *
 * - register (id randomBytes hex 12-char + Map storage + createdAt)
 * - search (name/description includes case-sensitive)
 * - get (Map.get + undefined)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import { DataCatalog, dataCatalog } from '../data/catalog';

describe('DataCatalog', () => {
  it('register — id 12-char hex + createdAt + Map storage', () => {
    const ds = dataCatalog.register({
      name: 'users-dataset',
      description: 'User profile data',
      schema: { id: 'uuid', email: 'string' },
    });
    expect(ds.id.length).toBe(12); // randomBytes(6).toString('hex')
    expect(ds.createdAt).toBeInstanceOf(Date);
    expect(ds.name).toBe('users-dataset');
  });

  it('register — her çağrı unique id', () => {
    const a = dataCatalog.register({ name: 'a', description: 'd', schema: {} });
    const b = dataCatalog.register({ name: 'b', description: 'd', schema: {} });
    expect(a.id).not.toBe(b.id);
  });

  it('search — name match', () => {
    const ds = dataCatalog.register({ name: 'unique-search-name-xyz', description: 'x', schema: {} });
    const r = dataCatalog.search('unique-search-name-xyz');
    expect(r.some((d) => d.id === ds.id)).toBe(true);
  });

  it('search — description match', () => {
    const ds = dataCatalog.register({ name: 'a', description: 'unique-description-match-text-zzz', schema: {} });
    const r = dataCatalog.search('unique-description-match-text-zzz');
    expect(r.some((d) => d.id === ds.id)).toBe(true);
  });

  it('get — kayıtlı id → dataset', () => {
    const ds = dataCatalog.register({ name: 'g', description: 'd', schema: {} });
    expect(dataCatalog.get(ds.id)?.id).toBe(ds.id);
  });

  it('get — bilinmeyen id → undefined', () => {
    expect(dataCatalog.get('non-existent')).toBeUndefined();
  });

  it('new DataCatalog() — fresh instance ayrı state', () => {
    const fresh = new DataCatalog();
    expect(fresh.search('anything')).toEqual([]);
  });
});
