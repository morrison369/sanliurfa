/**
 * Phase 129: Knowledge Graph & Entity Linking
 * Graph-based knowledge representation with entity extraction and relationship modeling
 */

import { logger } from './logger';
import { redis } from './cache';

interface Entity {
  id: string;
  name: string;
  type: string;
  canonical?: string;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: number;
}

interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: number;
}

interface Triple {
  subject: Entity;
  predicate: string;
  object: Entity;
  confidence: number;
}

interface EntityLink {
  mention: string;
  entity: Entity;
  position: { start: number; end: number };
  confidence: number;
}

interface GraphTraversal {
  startEntity: Entity;
  path: Entity[];
  relationships: Relationship[];
  depth: number;
}

class KnowledgeGraph {
  private entities = new Map<string, Entity>();
  private relationships = new Map<string, Relationship>();
  private triples: Triple[] = [];
  private entityCounter = 0;
  private relationshipCounter = 0;

  addEntity(entity: {
    name: string;
    type: string;
    canonical?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }): Entity {
    const id = `entity-${Date.now()}-${++this.entityCounter}`;
    const newEntity: Entity = {
      id,
      name: entity.name,
      type: entity.type,
      canonical: entity.canonical,
      confidence: entity.confidence || 0.95,
      metadata: entity.metadata || {},
      createdAt: Date.now()
    };

    this.entities.set(id, newEntity);

    const cacheKey = `sanliurfa:entity:${id}`;
    redis.setex(cacheKey, 86400, JSON.stringify(newEntity));

    logger.debug('Entity added', { id, name: entity.name, type: entity.type });
    return newEntity;
  }

  addRelationship(config: {
    sourceEntityId: string;
    targetEntityId: string;
    type: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }): Relationship | null {
    const source = this.entities.get(config.sourceEntityId);
    const target = this.entities.get(config.targetEntityId);

    if (!source || !target) {
      logger.warn('Cannot add relationship - entities not found', {
        source: config.sourceEntityId,
        target: config.targetEntityId
      });
      return null;
    }

    const id = `rel-${Date.now()}-${++this.relationshipCounter}`;
    const relationship: Relationship = {
      id,
      sourceEntityId: config.sourceEntityId,
      targetEntityId: config.targetEntityId,
      type: config.type,
      confidence: config.confidence || 0.9,
      metadata: config.metadata || {},
      createdAt: Date.now()
    };

    this.relationships.set(id, relationship);

    const cacheKey = `sanliurfa:relationship:${id}`;
    redis.setex(cacheKey, 86400, JSON.stringify(relationship));

    logger.debug('Relationship added', {
      id,
      source: source.name,
      target: target.name,
      type: config.type
    });

    return relationship;
  }

  addTriple(subject: Entity, predicate: string, object: Entity, confidence: number = 0.95): void {
    const triple: Triple = { subject, predicate, object, confidence };
    this.triples.push(triple);

    this.addRelationship({
      sourceEntityId: subject.id,
      targetEntityId: object.id,
      type: predicate,
      confidence
    });

    logger.debug('Triple added', {
      subject: subject.name,
      predicate,
      object: object.name
    });
  }

  getEntity(id: string): Entity | null {
    return this.entities.get(id) || null;
  }

  findEntitiesByName(name: string): Entity[] {
    const nameLower = name.toLowerCase();
    return Array.from(this.entities.values()).filter(e =>
      e.name.toLowerCase().includes(nameLower) ||
      (e.canonical && e.canonical.toLowerCase().includes(nameLower))
    );
  }

  findRelationships(sourceId?: string, targetId?: string, type?: string): Relationship[] {
    return Array.from(this.relationships.values()).filter(r =>
      (!sourceId || r.sourceEntityId === sourceId) &&
      (!targetId || r.targetEntityId === targetId) &&
      (!type || r.type === type)
    );
  }

  traverse(startEntityId: string, depth: number = 2): Entity[] {
    const visited = new Set<string>();
    const queue: Array<{ entityId: string; currentDepth: number }> = [
      { entityId: startEntityId, currentDepth: 0 }
    ];
    const result: Entity[] = [];

    while (queue.length > 0) {
      const { entityId, currentDepth } = queue.shift()!;

      if (visited.has(entityId) || currentDepth > depth) continue;

      visited.add(entityId);
      const entity = this.entities.get(entityId);
      if (entity) {
        result.push(entity);

        if (currentDepth < depth) {
          const rels = this.findRelationships(entityId);
          for (const rel of rels) {
            if (!visited.has(rel.targetEntityId)) {
              queue.push({ entityId: rel.targetEntityId, currentDepth: currentDepth + 1 });
            }
          }
        }
      }
    }

    return result;
  }

  findRelated(entityId: string, depth: number = 1): Entity[] {
    return this.traverse(entityId, depth);
  }

  getGraphStats(): {
    entityCount: number;
    relationshipCount: number;
    tripleCount: number;
    averageDegree: number;
  } {
    let totalDegree = 0;
    for (const entity of this.entities.values()) {
      const outgoing = this.findRelationships(entity.id).length;
      const incoming = this.findRelationships(undefined, entity.id).length;
      totalDegree += outgoing + incoming;
    }

    return {
      entityCount: this.entities.size,
      relationshipCount: this.relationships.size,
      tripleCount: this.triples.length,
      averageDegree: this.entities.size > 0 ? totalDegree / this.entities.size : 0
    };
  }

  listTriples(): Triple[] {
    return this.triples;
  }

  listAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
}

class EntityLinker {
  private entityCache = new Map<string, Entity>();
  private counter = 0;

  linkEntities(text: string, entities: Entity[]): EntityLink[] {
    const links: EntityLink[] = [];

    for (const entity of entities) {
      const regex = new RegExp(`\\b${entity.name}\\b`, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        links.push({
          mention: match[0],
          entity,
          position: { start: match.index, end: match.index + match[0].length },
          confidence: entity.confidence
        });
      }
    }

    return links.sort((a, b) => a.position.start - b.position.start);
  }

  disambiguate(mention: string, entities: Entity[]): Entity | null {
    const exactMatch = entities.find(e => e.name.toLowerCase() === mention.toLowerCase());
    if (exactMatch) return exactMatch;

    let best: Entity | null = null;
    let bestLength = 0;

    for (const entity of entities) {
      if (entity.canonical && entity.canonical.toLowerCase().includes(mention.toLowerCase())) {
        if (entity.canonical.length > bestLength) {
          best = entity;
          bestLength = entity.canonical.length;
        }
      }
    }

    return best;
  }

  mergeEntities(primaryId: string, secondaryId: string, graph: KnowledgeGraph): void {
    const primary = graph.getEntity(primaryId);
    const secondary = graph.getEntity(secondaryId);

    if (!primary || !secondary) return;

    if (!primary.canonical) {
      primary.canonical = secondary.name;
    }

    logger.info('Entities merged', {
      primary: primary.name,
      secondary: secondary.name
    });
  }

  extractMentions(text: string): string[] {
    const words = text.split(/\s+/);
    const entities: string[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[^\w]/g, '');
      if (word.length > 3) {
        entities.push(word);

        if (i < words.length - 1) {
          const twoWord = (word + ' ' + words[i + 1].toLowerCase().replace(/[^\w]/g, '')).trim();
          if (twoWord.split(/\s+/).length === 2) {
            entities.push(twoWord);
          }
        }
      }
    }

    return Array.from(new Set(entities));
  }
}

class RelationshipExtractor {
  private counter = 0;

  extract(text: string, entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      const entityMentions = this.findEntityMentions(sentence, entities);

      for (let i = 0; i < entityMentions.length; i++) {
        for (let j = i + 1; j < entityMentions.length; j++) {
          const rel: Relationship = {
            id: `rel-${Date.now()}-${++this.counter}`,
            sourceEntityId: entityMentions[i].id,
            targetEntityId: entityMentions[j].id,
            type: this.inferRelationType(sentence, entityMentions[i], entityMentions[j]),
            confidence: 0.8,
            metadata: { source: 'extraction', sentence },
            createdAt: Date.now()
          };
          relationships.push(rel);
        }
      }
    }

    return relationships;
  }

  private findEntityMentions(text: string, entities: Entity[]): Entity[] {
    const mentions: Entity[] = [];
    const textLower = text.toLowerCase();

    for (const entity of entities) {
      if (textLower.includes(entity.name.toLowerCase())) {
        mentions.push(entity);
      }
    }

    return mentions;
  }

  private inferRelationType(sentence: string, source: Entity, target: Entity): string {
    const textLower = sentence.toLowerCase();

    if (textLower.includes('is') || textLower.includes('are')) {
      return 'is_a';
    } else if (textLower.includes('has') || textLower.includes('have')) {
      return 'has';
    } else if (textLower.includes('related') || textLower.includes('associated')) {
      return 'related_to';
    } else if (textLower.includes('created') || textLower.includes('founded')) {
      return 'created';
    }

    return 'related_to';
  }
}

class GraphReasoner {
  reason(graph: KnowledgeGraph, query: string): Entity[] {
    const results = graph.listAllEntities().filter(e =>
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.type.toLowerCase().includes(query.toLowerCase())
    );

    return results;
  }

  findCommonNeighbors(
    entityId1: string,
    entityId2: string,
    graph: KnowledgeGraph
  ): Entity[] {
    const neighbors1 = graph.findRelated(entityId1, 1);
    const neighbors2 = graph.findRelated(entityId2, 1);

    const set1 = new Set(neighbors1.map(e => e.id));
    return neighbors2.filter(e => set1.has(e.id));
  }

  calculateEntityImportance(entityId: string, graph: KnowledgeGraph): number {
    const outgoing = graph.findRelationships(entityId).length;
    const incoming = graph.findRelationships(undefined, entityId).length;

    return (outgoing + incoming) / 2;
  }
}

export const knowledgeGraph = new KnowledgeGraph();
export const entityLinker = new EntityLinker();
export const relationshipExtractor = new RelationshipExtractor();
export const graphReasoner = new GraphReasoner();

export { Entity, Relationship, Triple, EntityLink, GraphTraversal };
