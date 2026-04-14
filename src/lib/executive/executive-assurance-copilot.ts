/**
 * Phase 208: Executive Assurance Copilot
 */

import { logger } from '../logger';

export interface CopilotBrief {
  briefId: string;
  audience: 'board' | 'executive' | 'audit-committee';
  headline: string;
  confidence: number;
}

class AssuranceCopilotOrchestrator {
  private counter = 0;

  generateBrief(audience: CopilotBrief['audience'], headline: string, confidence: number): CopilotBrief {
    return {
      briefId: `brief-${Date.now()}-${++this.counter}`,
      audience,
      headline,
      confidence
    };
  }
}

class CopilotQuestionEngine {
  suggestFollowups(context: string): string[] {
    return [
      `Which controls most influence: ${context}?`,
      `What is the top mitigation for: ${context}?`
    ];
  }
}

class CopilotNarrativeSynthesizer {
  synthesize(brief: CopilotBrief, risks: string[]): string {
    return `${brief.headline}. Key risks: ${risks.join(', ') || 'none'}. Confidence: ${brief.confidence}.`;
  }
}

class CopilotGovernanceGuardrails {
  validateOutput(text: string): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (text.length < 20) reasons.push('insufficient-detail');
    if (/guarantee|certain/i.test(text)) reasons.push('overconfidence-language');
    const allowed = reasons.length === 0;
    logger.debug('Copilot output validated', { allowed, reasons: reasons.length });
    return { allowed, reasons };
  }
}

export const assuranceCopilotOrchestrator = new AssuranceCopilotOrchestrator();
export const copilotQuestionEngine = new CopilotQuestionEngine();
export const copilotNarrativeSynthesizer = new CopilotNarrativeSynthesizer();
export const copilotGovernanceGuardrails = new CopilotGovernanceGuardrails();

export {
  AssuranceCopilotOrchestrator,
  CopilotQuestionEngine,
  CopilotNarrativeSynthesizer,
  CopilotGovernanceGuardrails
};


