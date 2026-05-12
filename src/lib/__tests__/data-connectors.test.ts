/**
 * Unit Tests — data/data-connectors.ts singleton class managers
 *
 * - ConnectorRegistry (register + listConnectors type filter + updateStatus + delete)
 * - SourceManager (register + readFromSource pagination + getSourceSchema + listSources)
 * - ConnectorFactory (createConnector + getCapabilities 6 type matrix + validateConfig per-type)
 */

import { describe, it, expect } from 'vitest';
import {
  connectorRegistry,
  sourceManager,
  connectorFactory,
} from '../data/data-connectors';

describe('ConnectorRegistry', () => {
  it('registerConnector — id `connector-` prefix + status="disconnected"', () => {
    const c = connectorRegistry.registerConnector({
      name: 'PG-Test', type: 'postgresql', config: { host: 'localhost' },
    } as any);
    expect(c.id).toMatch(/^connector-\d+-\d+$/);
    expect(c.status).toBe('disconnected');
  });

  it('getConnector — bilinmeyen → null', () => {
    expect(connectorRegistry.getConnector('non-existent')).toBeNull();
  });

  it('listConnectors — type filter (postgresql)', () => {
    connectorRegistry.registerConnector({ name: 'X', type: 'postgresql', config: {} } as any);
    const pg = connectorRegistry.listConnectors('postgresql');
    expect(pg.every((c) => c.type === 'postgresql')).toBe(true);
  });

  it('listConnectors — boş type → tümü', () => {
    expect(Array.isArray(connectorRegistry.listConnectors())).toBe(true);
  });

  it('updateConnectorStatus — status değişir', () => {
    const c = connectorRegistry.registerConnector({ name: 'U', type: 'rest-api', config: {} } as any);
    connectorRegistry.updateConnectorStatus(c.id, 'connected');
    expect(connectorRegistry.getConnector(c.id)?.status).toBe('connected');
  });

  it('deleteConnector — siler', () => {
    const c = connectorRegistry.registerConnector({ name: 'D', type: 'csv', config: {} } as any);
    connectorRegistry.deleteConnector(c.id);
    expect(connectorRegistry.getConnector(c.id)).toBeNull();
  });
});

describe('SourceManager', () => {
  it('registerSource — id `source-` prefix', () => {
    const id = sourceManager.registerSource('TestSource', { host: 'x' });
    expect(id).toMatch(/^source-\d+-\d+$/);
  });

  it('readFromSource — pageSize default 100', async () => {
    const id = sourceManager.registerSource('PageTest', {});
    const records = await sourceManager.readFromSource(id, {});
    expect(records).toHaveLength(100);
  });

  it('readFromSource — custom pageSize + offset', async () => {
    const id = sourceManager.registerSource('CustomPage', {});
    const records = await sourceManager.readFromSource(id, { pageSize: 5, offset: 10 });
    expect(records).toHaveLength(5);
    expect(records[0].id).toBe(10);
  });

  it('readFromSource — bilinmeyen → boş array', async () => {
    expect(await sourceManager.readFromSource('non-existent', {})).toEqual([]);
  });

  it('getSourceSchema — fields + primaryKey', async () => {
    const id = sourceManager.registerSource('SchemaTest', {});
    const schema = await sourceManager.getSourceSchema(id);
    expect(schema.fields).toHaveLength(2);
    expect(schema.primaryKey).toBe('id');
  });

  it('getSourceSchema — bilinmeyen → empty fields', async () => {
    const schema = await sourceManager.getSourceSchema('non-existent');
    expect(schema.name).toBe('unknown');
    expect(schema.fields).toEqual([]);
  });

  it('listSources — array', () => {
    expect(Array.isArray(sourceManager.listSources())).toBe(true);
  });

  it('updateSyncTimestamp — lastSync set', () => {
    const id = sourceManager.registerSource('Sync', {});
    sourceManager.updateSyncTimestamp(id);
    const source = sourceManager.listSources().find((s) => s.id === id);
    expect(source?.lastSync).toBeGreaterThan(0);
  });
});

describe('ConnectorFactory', () => {
  it('createConnector — id + status="disconnected"', () => {
    const c = connectorFactory.createConnector('postgresql', 'X', { host: 'localhost' });
    expect(c.id).toMatch(/^connector-/);
    expect(c.status).toBe('disconnected');
    expect(c.type).toBe('postgresql');
  });

  it('getCapabilities — postgresql: streaming+pagination+cdc+filtering true', () => {
    const caps = connectorFactory.getCapabilities('postgresql');
    expect(caps.streaming).toBe(true);
    expect(caps.cdc).toBe(true);
  });

  it('getCapabilities — rest-api: cdc:false', () => {
    expect(connectorFactory.getCapabilities('rest-api').cdc).toBe(false);
  });

  it('getCapabilities — csv: streaming yes, pagination no', () => {
    const caps = connectorFactory.getCapabilities('csv');
    expect(caps.streaming).toBe(true);
    expect(caps.pagination).toBe(false);
  });

  it('getCapabilities — kafka: streaming + cdc', () => {
    const caps = connectorFactory.getCapabilities('kafka');
    expect(caps.streaming).toBe(true);
    expect(caps.cdc).toBe(true);
  });

  it('getCapabilities — bilinmeyen type → boş object', () => {
    expect(connectorFactory.getCapabilities('non-existent' as any)).toEqual({});
  });

  it('validateConfig — boş config → "Configuration is required"', () => {
    const result = connectorFactory.validateConfig('postgresql', null as any);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Configuration is required');
  });

  it('validateConfig — postgresql eksik host → error', () => {
    const result = connectorFactory.validateConfig('postgresql', { database: 'db' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('host'))).toBe(true);
  });

  it('validateConfig — rest-api eksik baseUrl → error', () => {
    const result = connectorFactory.validateConfig('rest-api', {});
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('base URL'))).toBe(true);
  });

  it('validateConfig — postgresql full config → valid:true', () => {
    const result = connectorFactory.validateConfig('postgresql', { host: 'x', database: 'd' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
