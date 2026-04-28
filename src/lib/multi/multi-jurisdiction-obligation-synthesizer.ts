/**
 * Phase 237: Multi-Jurisdiction Obligation Synthesizer
 */

import { logger } from '../logger';

export interface JurisdictionObligation {
  jurisdiction: string;
  obligation: string;
  priority: number;
}

class ObligationIngestor {
  ingest(items: JurisdictionObligation[]): JurisdictionObligation[] {
    return items;
  }
}

class ObligationNormalizer {
  normalize(items: JurisdictionObligation[]): JurisdictionObligation[] {
    return items.map(i => ({ ...i, obligation: i.obligation.trim().toLowerCase() }));
  }
}

class CrossJurisdictionConflictFinder {
  conflicts(items: JurisdictionObligation[]): Array<{ obligation: string; jurisdictions: string[] }> {
    const grouped = new Map<string, Set<string>>();
    for (const item of items) {
      if (!grouped.has(item.obligation)) grouped.set(item.obligation, new Set());
      grouped.get(item.obligation)!.add(item.jurisdiction);
    }
    return Array.from(grouped.entries())
      .filter(([, jurisdictions]) => jurisdictions.size > 1)
      .map(([obligation, jurisdictions]) => ({ obligation, jurisdictions: Array.from(jurisdictions) }));
  }
}

class ObligationSynthesisReporter {
  report(total: number, conflicts: number): string {
    const text = `Synthesized ${total} obligations with ${conflicts} cross-jurisdiction overlaps.`;
    logger.debug('Obligation synthesis report', { total, conflicts });
    return text;
  }
}

export const obligationIngestor = new ObligationIngestor();
export const obligationNormalizer = new ObligationNormalizer();
export const crossJurisdictionConflictFinder = new CrossJurisdictionConflictFinder();
export const obligationSynthesisReporter = new ObligationSynthesisReporter();

export type {
  ObligationIngestor,
  ObligationNormalizer,
  CrossJurisdictionConflictFinder,
  ObligationSynthesisReporter
};