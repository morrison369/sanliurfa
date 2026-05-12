/**
 * Unit Tests — search/elasticsearch.ts ElasticsearchClient placeholder
 *
 * Şu anda @elastic/elasticsearch yüklü değil — stub implementation kullanıyor.
 * Test'ler placeholder davranışı lock'lar; gerçek ES client eklenince güncellenmeli.
 *
 * - search returns empty hits (placeholder)
 * - bulkIndex/createIndex/deleteDocument no-op (placeholder)
 * - suggest empty array
 * - reindexFromPostgres logger only
 */

import { describe, it, expect } from 'vitest';
import esClient, { esClient as namedClient } from '../search/elasticsearch';

describe('ElasticsearchClient (placeholder stub)', () => {
  it('default export = named export (singleton)', () => {
    expect(esClient).toBe(namedClient);
  });

  it('search — empty hits (placeholder)', async () => {
    const r = await esClient.search<any>('places', { page: 1, limit: 10 });
    expect(r.hits).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(10);
  });

  it('search — page/limit passthrough', async () => {
    const r = await esClient.search<any>('places', { page: 5, limit: 50 });
    expect(r.page).toBe(5);
    expect(r.limit).toBe(50);
  });

  it('suggest — empty array (placeholder)', async () => {
    const r = await esClient.suggest('places', 'kebap');
    expect(r).toEqual([]);
  });

  it('connect — no throw + warning log', async () => {
    await expect(esClient.connect()).resolves.toBeUndefined();
  });

  it('createIndex — no-op no throw', async () => {
    await expect(esClient.createIndex('places', {})).resolves.toBeUndefined();
  });

  it('indexDocument — no-op no throw', async () => {
    await expect(esClient.indexDocument('places', '1', {})).resolves.toBeUndefined();
  });

  it('bulkIndex — no-op no throw', async () => {
    await expect(esClient.bulkIndex('places', [])).resolves.toBeUndefined();
  });

  it('deleteDocument — no-op no throw', async () => {
    await expect(esClient.deleteDocument('places', '1')).resolves.toBeUndefined();
  });

  it('reindexFromPostgres — no-op + logger info', async () => {
    await expect(esClient.reindexFromPostgres()).resolves.toBeUndefined();
  });
});
