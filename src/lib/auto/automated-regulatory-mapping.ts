/**
 * Phase 183: Automated Regulatory Mapping
 */

import { logger } from '../logger';

export interface RegulatoryControl {
  controlId: string;
  title: string;
  tags: string[];
}

export interface RegulatoryClause {
  clauseId: string;
  framework: string;
  text: string;
  keywords: string[];
}

class RegulationCatalog {
  private clauses: RegulatoryClause[] = [];

  add(clause: RegulatoryClause): void {
    this.clauses.push(clause);
  }

  list(framework?: string): RegulatoryClause[] {
    return framework ? this.clauses.filter(c => c.framework === framework) : this.clauses;
  }
}

class ClauseControlMapper {
  map(clauses: RegulatoryClause[], controls: RegulatoryControl[]): Array<{ clauseId: string; controlId: string; confidence: number }> {
    const links: Array<{ clauseId: string; controlId: string; confidence: number }> = [];
    for (const clause of clauses) {
      for (const control of controls) {
        const overlap = clause.keywords.filter(k => control.tags.includes(k)).length;
        if (overlap > 0) {
          links.push({
            clauseId: clause.clauseId,
            controlId: control.controlId,
            confidence: Math.min(100, overlap * 35)
          });
        }
      }
    }
    return links;
  }
}

class MappingGapAnalyzer {
  findUnmapped(clauses: RegulatoryClause[], links: Array<{ clauseId: string }>): string[] {
    const mapped = new Set(links.map(l => l.clauseId));
    return clauses.filter(c => !mapped.has(c.clauseId)).map(c => c.clauseId);
  }
}

class RegulatoryUpdateWatcher {
  detectChanges(previous: RegulatoryClause[], current: RegulatoryClause[]): { added: number; removed: number } {
    const prevIds = new Set(previous.map(p => p.clauseId));
    const currIds = new Set(current.map(c => c.clauseId));
    const added = current.filter(c => !prevIds.has(c.clauseId)).length;
    const removed = previous.filter(p => !currIds.has(p.clauseId)).length;
    logger.debug('Regulatory change detection', { added, removed });
    return { added, removed };
  }
}

export const regulationCatalog = new RegulationCatalog();
export const clauseControlMapper = new ClauseControlMapper();
export const mappingGapAnalyzer = new MappingGapAnalyzer();
export const regulatoryUpdateWatcher = new RegulatoryUpdateWatcher();

export {
  RegulationCatalog,
  ClauseControlMapper,
  MappingGapAnalyzer,
  RegulatoryUpdateWatcher
};


