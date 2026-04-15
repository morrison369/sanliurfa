/**
 * Phase 221: Knowledge Graph Management
 * Entity management, relationship mapping, knowledge querying, graph analytics
 */

import { logger } from './logger';

interface KnowledgeEntity {
  entityId: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  tags: string[];
  confidence: number;  // 0-1
  createdAt: number;
  updatedAt: number;
}

interface EntityRelationship {
  relationshipId: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  strength: number;  // 0-1
  bidirectional: boolean;
  metadata: Record<string, any>;
  createdAt: number;
}

interface KnowledgeQuery {
  queryId: string;
  pattern: string;
  entityTypes: string[];
  relationshipTypes: string[];
  maxDepth: number;
  results: string[];  // entity IDs
  executionTimeMs: number;
  executedAt: number;
}

interface GraphAnalytics {
  analyticsId: string;
  totalEntities: number;
  totalRelationships: number;
  avgConnectionsPerEntity: number;
  mostConnectedEntityId: string;
  isolatedEntities: number;
  clusterCount: number;
  computedAt: number;
}

class KnowledgeEntityManager {
  private entities: Map<string, KnowledgeEntity> = new Map();
  private counter = 0;

  add(type: string, name: string, properties: Record<string, any> = {}, tags: string[] = [], confidence = 1): KnowledgeEntity {
    const entityId = `ent-${Date.now()}-${++this.counter}`;
    const entity: KnowledgeEntity = {
      entityId, type, name, properties, tags,
      confidence: Math.max(0, Math.min(1, confidence)),
      createdAt: Date.now(), updatedAt: Date.now()
    };
    this.entities.set(entityId, entity);
    logger.debug('Knowledge entity added', { entityId, type, name });
    return entity;
  }

  update(entityId: string, properties: Record<string, any>): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    entity.properties = { ...entity.properties, ...properties };
    entity.updatedAt = Date.now();
    return true;
  }

  getByType(type: string): KnowledgeEntity[] {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  search(query: string): KnowledgeEntity[] {
    const lower = query.toLowerCase();
    return Array.from(this.entities.values())
      .filter(e => e.name.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)));
  }

  getEntity(entityId: string): KnowledgeEntity | undefined {
    return this.entities.get(entityId);
  }

  getAllEntities(): KnowledgeEntity[] {
    return Array.from(this.entities.values());
  }
}

class RelationshipMapper {
  private relationships: Map<string, EntityRelationship> = new Map();
  private adjacency: Map<string, string[]> = new Map();
  private counter = 0;

  link(fromEntityId: string, toEntityId: string, type: string, strength = 0.5, bidirectional = false, metadata: Record<string, any> = {}): EntityRelationship {
    const relationshipId = `rel-${Date.now()}-${++this.counter}`;
    const rel: EntityRelationship = {
      relationshipId, fromEntityId, toEntityId, type,
      strength: Math.max(0, Math.min(1, strength)),
      bidirectional, metadata, createdAt: Date.now()
    };
    this.relationships.set(relationshipId, rel);
    const fromAdj = this.adjacency.get(fromEntityId) || [];
    fromAdj.push(toEntityId);
    this.adjacency.set(fromEntityId, fromAdj);
    if (bidirectional) {
      const toAdj = this.adjacency.get(toEntityId) || [];
      toAdj.push(fromEntityId);
      this.adjacency.set(toEntityId, toAdj);
    }
    return rel;
  }

  getRelationships(entityId: string): EntityRelationship[] {
    return Array.from(this.relationships.values())
      .filter(r => r.fromEntityId === entityId || (r.bidirectional && r.toEntityId === entityId));
  }

  getConnectedEntities(entityId: string): string[] {
    return this.adjacency.get(entityId) || [];
  }

  getConnectionCount(entityId: string): number {
    return (this.adjacency.get(entityId) || []).length;
  }

  getAllRelationships(): EntityRelationship[] {
    return Array.from(this.relationships.values());
  }
}

class KnowledgeQueryEngine {
  private queries: KnowledgeQuery[] = [];
  private counter = 0;

  execute(pattern: string, entityTypes: string[], relationshipTypes: string[], maxDepth: number, entityIds: string[]): KnowledgeQuery {
    const start = Date.now();
    const queryId = `kgq-${start}-${++this.counter}`;
    const query: KnowledgeQuery = {
      queryId, pattern, entityTypes, relationshipTypes, maxDepth,
      results: entityIds,
      executionTimeMs: Date.now() - start,
      executedAt: Date.now()
    };
    this.queries.push(query);
    return query;
  }

  getRecentQueries(limit = 10): KnowledgeQuery[] {
    return this.queries.slice(-limit).reverse();
  }

  getAvgExecutionTime(): number {
    if (!this.queries.length) return 0;
    return this.queries.reduce((s, q) => s + q.executionTimeMs, 0) / this.queries.length;
  }
}

class GraphAnalyticsEngine {
  private analytics: GraphAnalytics[] = [];
  private counter = 0;

  compute(entities: KnowledgeEntity[], relationships: EntityRelationship[]): GraphAnalytics {
    const connectionCounts = new Map<string, number>();
    for (const entity of entities) connectionCounts.set(entity.entityId, 0);
    for (const rel of relationships) {
      connectionCounts.set(rel.fromEntityId, (connectionCounts.get(rel.fromEntityId) || 0) + 1);
      if (rel.bidirectional) connectionCounts.set(rel.toEntityId, (connectionCounts.get(rel.toEntityId) || 0) + 1);
    }
    const totalConnections = Array.from(connectionCounts.values()).reduce((s, v) => s + v, 0);
    const avgConnections = entities.length > 0 ? totalConnections / entities.length : 0;
    let mostConnectedEntityId = '';
    let maxConn = 0;
    for (const [id, count] of connectionCounts.entries()) {
      if (count > maxConn) { maxConn = count; mostConnectedEntityId = id; }
    }
    const isolatedEntities = Array.from(connectionCounts.values()).filter(c => c === 0).length;

    const analyticsId = `graphanal-${Date.now()}-${++this.counter}`;
    const result: GraphAnalytics = {
      analyticsId,
      totalEntities: entities.length,
      totalRelationships: relationships.length,
      avgConnectionsPerEntity: avgConnections,
      mostConnectedEntityId,
      isolatedEntities,
      clusterCount: Math.max(1, Math.ceil(entities.length / 10)),
      computedAt: Date.now()
    };
    this.analytics.push(result);
    logger.debug('Graph analytics computed', { totalEntities: entities.length, totalRelationships: relationships.length });
    return result;
  }

  getLatest(): GraphAnalytics | undefined {
    return this.analytics[this.analytics.length - 1];
  }
}

export const knowledgeEntityManager = new KnowledgeEntityManager();
export const relationshipMapper = new RelationshipMapper();
export const knowledgeQueryEngine = new KnowledgeQueryEngine();
export const graphAnalyticsEngine = new GraphAnalyticsEngine();

export { KnowledgeEntity, EntityRelationship, KnowledgeQuery, GraphAnalytics };
