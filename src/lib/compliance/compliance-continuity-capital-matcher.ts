/**
 * Phase 301: Compliance Continuity Capital Matcher
 */

import { logger } from '../logger';

export interface ContinuityCapitalInput {
  inputId: string;
  continuityNeed: number;
  capitalCapacity: number;
  friction: number;
}

class ContinuityCapitalBook {
  private inputs: ContinuityCapitalInput[] = [];

  add(input: ContinuityCapitalInput): ContinuityCapitalInput {
    this.inputs.push(input);
    return input;
  }

  list(): ContinuityCapitalInput[] {
    return this.inputs;
  }
}

class ContinuityCapitalMatcher {
  match(input: ContinuityCapitalInput): number {
    return Math.round((input.continuityNeed * 0.45 + input.capitalCapacity * 0.55 - input.friction) * 10) / 10;
  }
}

class ContinuityCapitalGuard {
  balanced(score: number, minScore: number): boolean {
    return score >= minScore;
  }
}

class ContinuityCapitalReporter {
  report(inputId: string, score: number): string {
    const text = `Continuity-capital ${inputId} score=${score}`;
    logger.debug('Continuity capital reported', { inputId, score });
    return text;
  }
}

export const continuityCapitalBook = new ContinuityCapitalBook();
export const continuityCapitalMatcher = new ContinuityCapitalMatcher();
export const continuityCapitalGuard = new ContinuityCapitalGuard();
export const continuityCapitalReporter = new ContinuityCapitalReporter();

export {
  ContinuityCapitalBook,
  ContinuityCapitalMatcher,
  ContinuityCapitalGuard,
  ContinuityCapitalReporter
};


