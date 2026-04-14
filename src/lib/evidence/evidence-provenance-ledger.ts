/**
 * Phase 211: Evidence Provenance Ledger
 */

import { logger } from '../logger';

export interface LedgerEntry {
  entryId: string;
  evidenceId: string;
  actor: string;
  action: string;
  hash: string;
  timestamp: number;
}

class ProvenanceLedger {
  private entries: LedgerEntry[] = [];
  private counter = 0;

  append(evidenceId: string, actor: string, action: string, hash: string): LedgerEntry {
    const entry: LedgerEntry = {
      entryId: `ledger-${Date.now()}-${++this.counter}`,
      evidenceId,
      actor,
      action,
      hash,
      timestamp: Date.now()
    };
    this.entries.push(entry);
    return entry;
  }

  list(evidenceId?: string): LedgerEntry[] {
    return evidenceId ? this.entries.filter(e => e.evidenceId === evidenceId) : this.entries;
  }
}

class ProvenanceIntegrityChecker {
  verifyChain(entries: LedgerEntry[]): { valid: boolean; issues: number } {
    let issues = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i - 1].timestamp > entries[i].timestamp) issues++;
    }
    return { valid: issues === 0, issues };
  }
}

class EvidenceLineageResolver {
  lineage(entries: LedgerEntry[]): string[] {
    return entries.map(e => `${e.actor}:${e.action}`);
  }
}

class LedgerExportService {
  exportJson(entries: LedgerEntry[]): string {
    logger.debug('Ledger exported', { count: entries.length });
    return JSON.stringify(entries, null, 2);
  }
}

export const provenanceLedger = new ProvenanceLedger();
export const provenanceIntegrityChecker = new ProvenanceIntegrityChecker();
export const evidenceLineageResolver = new EvidenceLineageResolver();
export const ledgerExportService = new LedgerExportService();

export {
  ProvenanceLedger,
  ProvenanceIntegrityChecker,
  EvidenceLineageResolver,
  LedgerExportService
};


