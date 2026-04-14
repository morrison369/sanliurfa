/**
 * Phase 195: Multi-Entity Governance Federation
 */

import { logger } from '../logger';

export interface FederationEntity {
  entityId: string;
  name: string;
  region: string;
  policyBaselineVersion: number;
}

class EntityRegistry {
  private entities = new Map<string, FederationEntity>();

  register(entity: FederationEntity): FederationEntity {
    this.entities.set(entity.entityId, entity);
    return entity;
  }

  list(): FederationEntity[] {
    return Array.from(this.entities.values());
  }
}

class FederationPolicySync {
  sync(entities: FederationEntity[], targetVersion: number): { updated: number; skipped: number } {
    let updated = 0;
    let skipped = 0;
    for (const e of entities) {
      if (e.policyBaselineVersion < targetVersion) {
        e.policyBaselineVersion = targetVersion;
        updated++;
      } else {
        skipped++;
      }
    }
    return { updated, skipped };
  }
}

class CrossEntityComplianceComparator {
  compare(scores: Array<{ entityId: string; score: number }>): { best?: string; worst?: string; spread: number } {
    if (scores.length === 0) return { spread: 0 };
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    return {
      best: sorted[0].entityId,
      worst: sorted[sorted.length - 1].entityId,
      spread: Math.round((sorted[0].score - sorted[sorted.length - 1].score) * 10) / 10
    };
  }
}

class FederationDisputeResolver {
  resolve(issue: string, entityA: string, entityB: string): { owner: string; action: string } {
    logger.debug('Federation dispute resolved', { issue, entityA, entityB });
    return { owner: entityA < entityB ? entityA : entityB, action: 'open-joint-review' };
  }
}

export const entityRegistry = new EntityRegistry();
export const federationPolicySync = new FederationPolicySync();
export const crossEntityComplianceComparator = new CrossEntityComplianceComparator();
export const federationDisputeResolver = new FederationDisputeResolver();

export {
  EntityRegistry,
  FederationPolicySync,
  CrossEntityComplianceComparator,
  FederationDisputeResolver
};


