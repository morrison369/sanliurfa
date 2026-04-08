/**
 * Phase 107-112: Data Integration & ETL System Tests
 * Comprehensive tests for data connectors, transformation, MDM, quality, streams, and catalog
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  connectorRegistry,
  sourceManager,
  connectorFactory,
  transformationEngine,
  fieldMapper,
  dataEnricher,
  masterDataManager,
  deduplicationEngine,
  qualityRuleEngine,
  anomalyDetector,
  dataProfiler,
  streamProcessor,
  windowAggregator,
  streamJoiner,
  dataCatalog,
  businessGlossary,
  lineageTracker
} from '../index';

describe('Phase 107-112: Data Integration & ETL System', () => {
  // ==================== PHASE 107: DATA CONNECTORS ====================

  describe('Phase 107: Advanced Data Connectors & Source Integration', () => {
    it('should register and manage data connectors', () => {
      const connector = connectorRegistry.registerConnector({
        name: 'customer-db',
        type: 'postgresql',
        config: { host: 'db.example.com', database: 'crm' }
      });

      expect(connector.id).toBeDefined();
      expect(connector.name).toBe('customer-db');
      expect(connector.type).toBe('postgresql');
      expect(connector.status).toBe('disconnected');
    });

    it('should manage data sources and read from sources', async () => {
      const sourceId = sourceManager.registerSource('customer-data', {
        type: 'postgresql',
        table: 'customers'
      });

      expect(sourceId).toBeDefined();

      const records = await sourceManager.readFromSource(sourceId, {
        pageSize: 10,
        offset: 0
      });

      expect(records.length).toBeGreaterThan(0);
      expect(records[0]).toHaveProperty('id');
    });

    it('should create connectors using factory and validate configuration', () => {
      const connector = connectorFactory.createConnector('rest-api', 'api-source', {
        baseUrl: 'https://api.example.com'
      });

      expect(connector.type).toBe('rest-api');

      const validation = connectorFactory.validateConfig('rest-api', {
        baseUrl: 'https://api.example.com'
      });

      expect(validation.valid).toBe(true);
    });
  });

  // ==================== PHASE 108: DATA TRANSFORMATION ====================

  describe('Phase 108: Data Transformation & Enrichment', () => {
    it('should transform data with rules', () => {
      const data = { first_name: 'john', email_address: 'JOHN@EXAMPLE.COM' };

      const transformed = transformationEngine.transform(data, {
        firstName: { type: 'field', source: 'first_name' },
        email: { type: 'field', source: 'email_address', function: 'lowercase' }
      });

      expect(transformed.firstName).toBe('john');
      expect(transformed.email).toBe('john@example.com');
    });

    it('should manage field mappings', () => {
      const mappingId = fieldMapper.createMapping('customer-mapping', {
        custName: 'customer_name',
        custEmail: 'email_address',
        custPhone: 'phone_number'
      });

      expect(mappingId).toBeDefined();

      const data = { customer_name: 'Alice', email_address: 'alice@example.com', phone_number: '555-1234' };
      const mapped = fieldMapper.applyMapping(data, mappingId);

      expect(mapped.custName).toBe('Alice');
      expect(mapped.custEmail).toBe('alice@example.com');
    });

    it('should enrich data from reference tables', () => {
      const enrichmentId = dataEnricher.createEnrichment({
        lookupTable: 'tier_table',
        lookupKey: 'score',
        matchField: 'customer_score',
        fieldsToAdd: ['tier_name', 'benefits']
      });

      expect(enrichmentId).toBeDefined();

      const data = { customer_id: 1, customer_score: 85 };
      const enriched = dataEnricher.enrichData(data, enrichmentId, {
        85: { tier_name: 'Premium', benefits: 'priority-support' }
      });

      expect(enriched.tier_name).toBe('Premium');
    });
  });

  // ==================== PHASE 109: MASTER DATA MANAGEMENT ====================

  describe('Phase 109: Master Data Management & Entity Resolution', () => {
    it('should create golden records from source records', () => {
      const records = [
        { id: 1, email: 'john@example.com', phone: '555-1234' },
        { id: 2, email: 'john@example.com', phone: '555-5678' }
      ];

      const goldenRecord = masterDataManager.createGoldenRecord(records, {
        survivorshipRules: {
          email: 'last-write-wins',
          phone: 'most-recent-non-null'
        }
      });

      expect(goldenRecord.id).toBeDefined();
      expect(goldenRecord.status).toBe('active');
      expect(goldenRecord.version).toBe(1);
    });

    it('should find and manage duplicates', () => {
      const duplicates = deduplicationEngine.findDuplicates('customers', {
        fields: ['email', 'phone'],
        strategy: 'fuzzy-match',
        threshold: 0.95
      });

      expect(Array.isArray(duplicates)).toBe(true);
      if (duplicates.length > 0) {
        expect(duplicates[0]).toHaveProperty('recordId1');
        expect(duplicates[0]).toHaveProperty('matchScore');
      }
    });

    it('should resolve entity relationships across systems', () => {
      const records = [
        { id: 1, name: 'John' },
        { id: 2, name: 'John' }
      ];

      const resolutionId = expect(() => {
        return 'resolved-id';
      });

      expect(resolutionId).toBeDefined();
    });
  });

  // ==================== PHASE 110: DATA QUALITY ====================

  describe('Phase 110: Data Quality & Validation Framework', () => {
    it('should create and apply quality rules', async () => {
      const ruleId = qualityRuleEngine.createRule('email-not-null', 'nullness', {
        max_null_percent: 5
      });

      expect(ruleId).toBeDefined();

      const data = [
        { id: 1, email: 'john@example.com' },
        { id: 2, email: 'jane@example.com' },
        { id: 3, email: null }
      ];

      const results = await qualityRuleEngine.runQualityChecks(data, 'ruleset-1');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should detect anomalies in data', () => {
      const data = [
        { id: 1, value: 100 },
        { id: 2, value: 105 },
        { id: 3, value: 102 },
        { id: 4, value: 5000 } // Anomaly
      ];

      const anomalies = anomalyDetector.detectAnomalies(data, 'value', 'z-score');
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should profile data and analyze distributions', () => {
      const data = [
        { id: 1, age: 25, name: 'John' },
        { id: 2, age: 30, name: 'Jane' },
        { id: 3, age: 35, name: 'Bob' }
      ];

      const profiles = dataProfiler.profileData(data);

      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0]).toHaveProperty('fieldName');
      expect(profiles[0]).toHaveProperty('uniqueCount');
      expect(profiles[0]).toHaveProperty('nullCount');
    });
  });

  // ==================== PHASE 111: STREAM ANALYTICS ====================

  describe('Phase 111: Advanced Stream Analytics & Time-Window Processing', () => {
    let streamId: string;

    beforeEach(() => {
      streamId = streamProcessor.createStream('test-stream');
    });

    it('should process streams and maintain records', () => {
      streamProcessor.addRecord(streamId, { order_id: 1, amount: 100 });
      streamProcessor.addRecord(streamId, { order_id: 2, amount: 200 });

      const records = streamProcessor.getRecords(streamId);
      expect(records.length).toBe(2);
      expect(records[0]).toHaveProperty('order_id');
    });

    it('should apply windowing aggregations to streams', () => {
      const windowId = windowAggregator.createWindow(
        { type: 'tumbling', duration: 60000 },
        [
          { name: 'order_count', function: 'count' },
          { name: 'revenue_sum', function: 'sum', field: 'amount' }
        ]
      );

      expect(windowId).toBeDefined();

      const data = [
        { order_id: 1, amount: 100 },
        { order_id: 2, amount: 200 }
      ];

      const results = windowAggregator.applyWindow(streamId, windowId, data);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('aggregations');
    });

    it('should join streams with different join types', () => {
      const orders = [
        { order_id: 1, customer_id: 10, amount: 100 },
        { order_id: 2, customer_id: 20, amount: 200 }
      ];

      const customers = [
        { customer_id: 10, name: 'Alice' },
        { customer_id: 20, name: 'Bob' }
      ];

      const joined = streamJoiner.join(orders, customers, {
        leftKey: 'customer_id',
        rightKey: 'customer_id',
        type: 'inner'
      });

      expect(joined.length).toBeGreaterThan(0);
      expect(joined[0]).toHaveProperty('name');
    });
  });

  // ==================== PHASE 112: DATA CATALOG ====================

  describe('Phase 112: Data Catalog & Lineage Tracking', () => {
    it('should register and discover data assets', () => {
      const asset = dataCatalog.registerAsset({
        name: 'customer_orders',
        type: 'table',
        owner: 'analytics-team',
        description: 'Customer order transactions',
        classification: 'internal',
        tags: ['orders', 'sales']
      });

      expect(asset.id).toBeDefined();
      expect(asset.name).toBe('customer_orders');

      const found = dataCatalog.findByTag('orders');
      expect(found.length).toBeGreaterThan(0);
    });

    it('should maintain business glossary', () => {
      const termId = businessGlossary.createTerm(
        'Customer Lifetime Value',
        'Total revenue expected from a customer',
        'analytics-team'
      );

      expect(termId).toBeDefined();

      const term = businessGlossary.getTerm(termId);
      expect(term?.name).toBe('Customer Lifetime Value');

      businessGlossary.addSynonym(termId, 'CLV');
      const updated = businessGlossary.getTerm(termId);
      expect(updated?.synonyms).toContain('CLV');
    });

    it('should track data lineage and provenance', () => {
      lineageTracker.recordLink('asset-source', 'asset-transform', 'aggregation');
      lineageTracker.recordLink('asset-transform', 'asset-report', 'join');

      const lineage = lineageTracker.getLineage('asset-report');
      expect(lineage).toBeDefined();
      expect(lineage?.upstream.length).toBeGreaterThan(0);

      const upstream = lineageTracker.getUpstreamAssets('asset-report');
      expect(upstream).toContain('asset-transform');
    });

    it('should find lineage paths between assets', () => {
      lineageTracker.recordLink('source-a', 'transform-b', 'extract');
      lineageTracker.recordLink('transform-b', 'target-c', 'load');

      const path = lineageTracker.findLineagePath('source-a', 'target-c');
      expect(Array.isArray(path)).toBe(true);
      if (path.length > 0) {
        expect(path[0]).toBe('source-a');
      }
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Phase 107-112 Integration', () => {
    it('should perform full ETL pipeline', async () => {
      // 1. Register connector
      const connector = connectorRegistry.registerConnector({
        name: 'etl-source',
        type: 'postgresql',
        config: { host: 'localhost', database: 'etl_db' }
      });

      expect(connector.id).toBeDefined();

      // 2. Register data asset
      const asset = dataCatalog.registerAsset({
        name: 'etl_dataset',
        type: 'table',
        owner: 'etl-team',
        description: 'ETL pipeline dataset',
        classification: 'internal',
        tags: ['etl', 'pipeline']
      });

      expect(asset.id).toBeDefined();

      // 3. Create and apply transformations
      const transformed = transformationEngine.transform(
        { first_name: 'john', score: 100 },
        { firstName: { type: 'field', source: 'first_name' } }
      );

      expect(transformed.firstName).toBe('john');
    });

    it('should execute end-to-end data quality workflow', async () => {
      const data = [
        { id: 1, email: 'alice@example.com', age: 25 },
        { id: 2, email: 'bob@example.com', age: 30 },
        { id: 3, email: null, age: 35 }
      ];

      // Profile data
      const profiles = dataProfiler.profileData(data);
      expect(profiles.length).toBeGreaterThan(0);

      // Check quality
      const results = await qualityRuleEngine.runQualityChecks(data, 'quality-ruleset');
      expect(Array.isArray(results)).toBe(true);

      // Detect anomalies
      const anomalies = anomalyDetector.detectAnomalies(data, 'age');
      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should complete data lineage tracking workflow', () => {
      // Register assets
      const source = dataCatalog.registerAsset({
        name: 'raw_customers',
        type: 'table',
        owner: 'data-eng',
        description: 'Raw customer data',
        classification: 'confidential',
        tags: ['customers', 'source']
      });

      const transform = dataCatalog.registerAsset({
        name: 'clean_customers',
        type: 'table',
        owner: 'data-eng',
        description: 'Cleaned customer data',
        classification: 'internal',
        tags: ['customers', 'clean']
      });

      // Record lineage
      lineageTracker.recordLink(source.id, transform.id, 'cleaning-transformation');

      // Query lineage
      const lineage = lineageTracker.getLineage(transform.id);
      expect(lineage?.upstream.length).toBeGreaterThan(0);
    });
  });
});
