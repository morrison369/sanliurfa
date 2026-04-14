/**
 * Phase 174: Control Evidence Workflow
 */

import { logger } from '../logger';

export interface ControlEvidence {
  evidenceId: string;
  controlId: string;
  ownerId: string;
  source: string;
  status: 'collected' | 'verified' | 'rejected' | 'archived';
  capturedAt: number;
}

class EvidenceCollector {
  private counter = 0;
  collect(controlId: string, ownerId: string, source: string): ControlEvidence {
    return {
      evidenceId: `ev-${Date.now()}-${++this.counter}`,
      controlId,
      ownerId,
      source,
      status: 'collected',
      capturedAt: Date.now()
    };
  }
}

class EvidenceVerifier {
  verify(evidence: ControlEvidence, checksPassed: boolean): ControlEvidence {
    return { ...evidence, status: checksPassed ? 'verified' : 'rejected' };
  }
}

class EvidenceLinker {
  private links = new Map<string, string[]>();

  linkToControl(controlId: string, evidenceId: string): string[] {
    const arr = this.links.get(controlId) || [];
    arr.push(evidenceId);
    this.links.set(controlId, arr);
    return arr;
  }

  getLinkedEvidence(controlId: string): string[] {
    return this.links.get(controlId) || [];
  }
}

class EvidenceRetentionManager {
  shouldArchive(capturedAt: number, retentionDays: number, now = Date.now()): boolean {
    const ageMs = now - capturedAt;
    return ageMs > retentionDays * 24 * 60 * 60 * 1000;
  }

  archive(evidence: ControlEvidence): ControlEvidence {
    logger.debug('Evidence archived', { evidenceId: evidence.evidenceId });
    return { ...evidence, status: 'archived' };
  }
}

export const evidenceCollector = new EvidenceCollector();
export const evidenceVerifier = new EvidenceVerifier();
export const evidenceLinker = new EvidenceLinker();
export const evidenceRetentionManager = new EvidenceRetentionManager();

export {
  EvidenceCollector,
  EvidenceVerifier,
  EvidenceLinker,
  EvidenceRetentionManager
};


