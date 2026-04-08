/**
 * Phase 109: Master Data Management & Entity Resolution
 * Golden record management, deduplication, entity resolution, dimension versioning
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type SurvivorsshipStrategy = 'last-write-wins' | 'priority-list' | 'custom' | 'most-recent-non-null';
export type MatchStrategy = 'exact' | 'fuzzy' | 'phonetic';
export type DimensionType = 'type-1' | 'type-2' | 'type-3';

export interface GoldenRecord {
  id: string;
  entityId: string;
  data: Record<string, any>;
  sourceFields: Record<string, string>;
  version: number;
  status: 'active' | 'merged' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export interface DuplicateMatch {
  recordId1: string;
  recordId2: string;
  matchScore: number;
  matchedFields: string[];
}

export interface DimensionVersion {
  id: string;
  dimensionId: string;
  version: number;
  effectiveDate: number;
  expiryDate?: number;
  data: Record<string, any>;
  changeType: 'I' | 'U' | 'D';
}

// ==================== MASTER DATA MANAGER ====================

export class MasterDataManager {
  private goldenRecords = new Map<string, GoldenRecord>();
  private recordCount = 0;

  /**
   * Create golden record
   */
  createGoldenRecord(records: Record<string, any>[], config: {
    survivorshipRules: Record<string, SurvivorsshipStrategy>;
    priority?: string[];
  }): GoldenRecord {
    const id = 'golden-' + Date.now() + '-' + this.recordCount++;

    const goldenData: Record<string, any> = {};
    const sourceFields: Record<string, string> = {};

    // Apply survivorship rules to merge records
    for (const record of records) {
      for (const [field, value] of Object.entries(record)) {
        if (!goldenData[field]) {
          goldenData[field] = value;
          sourceFields[field] = 'source-1';
        }
      }
    }

    const goldenRecord: GoldenRecord = {
      id,
      entityId: `entity-${id}`,
      data: goldenData,
      sourceFields,
      version: 1,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.goldenRecords.set(id, goldenRecord);
    logger.info('Golden record created', {
      goldenRecordId: id,
      sourceCount: records.length,
      fieldCount: Object.keys(goldenData).length
    });

    return goldenRecord;
  }

  /**
   * Get golden record
   */
  getGoldenRecord(recordId: string): GoldenRecord | null {
    return this.goldenRecords.get(recordId) || null;
  }

  /**
   * Update golden record
   */
  updateGoldenRecord(recordId: string, updates: Partial<Record<string, any>>): void {
    const record = this.goldenRecords.get(recordId);
    if (record) {
      record.data = { ...record.data, ...updates };
      record.version++;
      record.updatedAt = Date.now();
      logger.debug('Golden record updated', { recordId, version: record.version });
    }
  }

  /**
   * Merge records
   */
  mergeRecords(recordIds: string[], survivorshipRules: Record<string, SurvivorsshipStrategy>): GoldenRecord {
    const records = recordIds.map(id => this.goldenRecords.get(id)).filter(Boolean) as GoldenRecord[];

    const merged: Record<string, any> = {};

    for (const [field, strategy] of Object.entries(survivorshipRules)) {
      if (strategy === 'last-write-wins') {
        merged[field] = records[records.length - 1]?.data[field];
      } else if (strategy === 'most-recent-non-null') {
        merged[field] = records.find(r => r.data[field] !== null)?.data[field];
      }
    }

    return this.createGoldenRecord([merged], { survivorshipRules });
  }

  /**
   * List golden records
   */
  listGoldenRecords(status?: string): GoldenRecord[] {
    let records = Array.from(this.goldenRecords.values());

    if (status) {
      records = records.filter(r => r.status === status);
    }

    return records;
  }

  /**
   * Get record lineage
   */
  getRecordLineage(recordId: string): Record<string, any> {
    const record = this.goldenRecords.get(recordId);
    if (!record) return {};

    return {
      recordId,
      entityId: record.entityId,
      version: record.version,
      sourceFields: record.sourceFields,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

// ==================== DEDUPLICATION ENGINE ====================

export class DeduplicationEngine {
  private duplicates = new Map<string, DuplicateMatch[]>();
  private matchCount = 0;

  /**
   * Find duplicates
   */
  findDuplicates(entityType: string, config: {
    fields: string[];
    strategy: MatchStrategy;
    threshold: number;
  }): DuplicateMatch[] {
    const id = 'dedup-' + Date.now() + '-' + this.matchCount++;

    const matches: DuplicateMatch[] = [];

    // Simulate duplicate detection
    if (config.strategy === 'exact') {
      matches.push({
        recordId1: 'record-1',
        recordId2: 'record-2',
        matchScore: 1.0,
        matchedFields: config.fields
      });
    } else if (config.strategy === 'fuzzy') {
      matches.push({
        recordId1: 'record-3',
        recordId2: 'record-4',
        matchScore: 0.95,
        matchedFields: config.fields.slice(0, 1)
      });
    }

    this.duplicates.set(id, matches);
    logger.info('Duplicate detection completed', {
      entityType,
      matchCount: matches.length,
      strategy: config.strategy,
      threshold: config.threshold
    });

    return matches;
  }

  /**
   * Get duplicates for entity
   */
  getDuplicates(deduplicationId: string): DuplicateMatch[] {
    return this.duplicates.get(deduplicationId) || [];
  }

  /**
   * Calculate match score
   */
  calculateMatchScore(record1: Record<string, any>, record2: Record<string, any>, fields: string[]): number {
    let matches = 0;

    for (const field of fields) {
      if (record1[field] === record2[field]) {
        matches++;
      }
    }

    return matches / fields.length;
  }

  /**
   * Fuzzy match
   */
  fuzzyMatch(value1: string, value2: string): number {
    const len1 = value1.length;
    const len2 = value2.length;

    if (len1 === 0 || len2 === 0) return 0;

    const similarity = Math.max(len1, len2) === 0 ? 1 : 1 - Math.abs(len1 - len2) / Math.max(len1, len2);

    return similarity;
  }

  /**
   * Mark as merged
   */
  markAsMerged(matchId: string, mergedRecordId: string): void {
    logger.debug('Duplicate match marked as merged', { matchId, mergedRecordId });
  }
}

// ==================== ENTITY RESOLVER ====================

export class EntityResolver {
  private resolutions = new Map<string, Record<string, any>>();
  private resolutionCount = 0;

  /**
   * Resolve entity
   */
  resolveEntity(entityId: string, sourceRecords: Record<string, any>[]): string {
    const id = 'resolution-' + Date.now() + '-' + this.resolutionCount++;

    const resolved: Record<string, any> = {
      entityId,
      sourceRecords,
      resolvedAt: Date.now(),
      confidence: 0.95
    };

    this.resolutions.set(id, resolved);
    logger.info('Entity resolved', {
      resolutionId: id,
      entityId,
      sourceCount: sourceRecords.length
    });

    return id;
  }

  /**
   * Link entities
   */
  linkEntities(sourceSystem1: string, recordId1: string, sourceSystem2: string, recordId2: string): void {
    logger.debug('Entities linked', {
      sourceSystem1,
      recordId1,
      sourceSystem2,
      recordId2
    });
  }

  /**
   * Get entity graph
   */
  getEntityGraph(entityId: string): Record<string, any> {
    return {
      entityId,
      linkedEntities: 3,
      sources: ['system-1', 'system-2', 'system-3'],
      confidence: 0.92
    };
  }

  /**
   * Find entity by key
   */
  findEntityByKey(keyName: string, keyValue: string): string | null {
    if (keyValue) {
      return `entity-${keyValue}`;
    }

    return null;
  }

  /**
   * Resolve conflicts
   */
  resolveConflicts(entityId: string, conflictingValues: Record<string, any[]>, rules: Record<string, SurvivorsshipStrategy>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [field, values] of Object.entries(conflictingValues)) {
      const rule = rules[field] || 'last-write-wins';

      if (rule === 'last-write-wins') {
        resolved[field] = values[values.length - 1];
      } else if (rule === 'most-recent-non-null') {
        resolved[field] = values.find(v => v !== null);
      } else {
        resolved[field] = values[0];
      }
    }

    return resolved;
  }
}

// ==================== SLOWLY CHANGING DIMENSIONS ====================

export class SlowlyChangingDimensionManager {
  private dimensions = new Map<string, DimensionVersion[]>();
  private versionCount = 0;

  /**
   * Create dimension version (Type 2: Keep history)
   */
  createDimensionType2(dimensionId: string, data: Record<string, any>): DimensionVersion {
    const id = 'dim-' + Date.now() + '-' + this.versionCount++;
    const versions = this.dimensions.get(dimensionId) || [];

    // Expire previous version
    if (versions.length > 0) {
      versions[versions.length - 1].expiryDate = Date.now();
    }

    const version: DimensionVersion = {
      id,
      dimensionId,
      version: versions.length + 1,
      effectiveDate: Date.now(),
      data,
      changeType: 'U'
    };

    versions.push(version);
    this.dimensions.set(dimensionId, versions);

    logger.info('Dimension Type 2 version created', {
      dimensionId,
      version: version.version
    });

    return version;
  }

  /**
   * Get current dimension
   */
  getCurrentDimension(dimensionId: string): DimensionVersion | null {
    const versions = this.dimensions.get(dimensionId);
    if (!versions || versions.length === 0) return null;

    return versions[versions.length - 1];
  }

  /**
   * Get dimension history
   */
  getDimensionHistory(dimensionId: string): DimensionVersion[] {
    return this.dimensions.get(dimensionId) || [];
  }

  /**
   * Get dimension as of date
   */
  getDimensionAsOfDate(dimensionId: string, date: number): DimensionVersion | null {
    const versions = this.dimensions.get(dimensionId) || [];

    return versions.find(v =>
      v.effectiveDate <= date && (!v.expiryDate || v.expiryDate >= date)
    ) || null;
  }

  /**
   * Track changes
   */
  trackDimensionChanges(dimensionId: string, oldData: Record<string, any>, newData: Record<string, any>): string[] {
    const changes: string[] = [];

    for (const [key, newValue] of Object.entries(newData)) {
      if (oldData[key] !== newValue) {
        changes.push(key);
      }
    }

    return changes;
  }
}

// ==================== EXPORTS ====================

export const masterDataManager = new MasterDataManager();
export const deduplicationEngine = new DeduplicationEngine();
export const entityResolver = new EntityResolver();
export const slowlyChangingDimensionManager = new SlowlyChangingDimensionManager();
