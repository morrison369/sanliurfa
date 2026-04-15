/**
 * Phase 230: Process Mining
 * Process discovery, conformance checking, variant analysis, process improvement tracking
 */

import { logger } from './logger';

interface ProcessEvent {
  eventId: string;
  caseId: string;
  activity: string;
  timestamp: number;
  resource: string;
  durationMs: number;
  attributes: Record<string, any>;
}

interface DiscoveredProcess {
  processId: string;
  name: string;
  activities: string[];
  transitions: Array<{ from: string; to: string; frequency: number; avgDurationMs: number }>;
  avgCycleDurationMs: number;
  caseCount: number;
  discoveredAt: number;
}

interface ConformanceResult {
  conformanceId: string;
  processId: string;
  caseId: string;
  isConformant: boolean;
  deviations: Array<{ expected: string; actual: string; position: number }>;
  conformanceScore: number;  // 0-100
  checkedAt: number;
}

interface ProcessVariant {
  variantId: string;
  processId: string;
  activitySequence: string[];
  frequency: number;
  frequencyPct: number;
  avgDurationMs: number;
  isHappyPath: boolean;
  discoveredAt: number;
}

class ProcessEventLogger {
  private events: Map<string, ProcessEvent[]> = new Map();
  private counter = 0;

  log(caseId: string, activity: string, resource: string, durationMs: number, attributes: Record<string, any> = {}): ProcessEvent {
    const eventId = `pevt-${Date.now()}-${++this.counter}`;
    const event: ProcessEvent = {
      eventId, caseId, activity, timestamp: Date.now(), resource, durationMs, attributes
    };
    const existing = this.events.get(caseId) || [];
    existing.push(event);
    this.events.set(caseId, existing);
    return event;
  }

  getCaseEvents(caseId: string): ProcessEvent[] {
    return (this.events.get(caseId) || []).sort((a, b) => a.timestamp - b.timestamp);
  }

  getActivityStats(activity: string): { count: number; avgDurationMs: number } {
    const all = Array.from(this.events.values()).flat().filter(e => e.activity === activity);
    const count = all.length;
    const avgDurationMs = count > 0 ? all.reduce((s, e) => s + e.durationMs, 0) / count : 0;
    return { count, avgDurationMs };
  }

  getAllCaseIds(): string[] {
    return Array.from(this.events.keys());
  }
}

class ProcessDiscoveryEngine {
  private processes: Map<string, DiscoveredProcess> = new Map();
  private counter = 0;

  discover(name: string, caseEvents: Map<string, ProcessEvent[]>): DiscoveredProcess {
    const activitySet = new Set<string>();
    const transitionMap = new Map<string, { count: number; totalDurationMs: number }>();
    let totalCycleDuration = 0;
    let caseCount = 0;

    for (const events of caseEvents.values()) {
      const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
      if (sorted.length === 0) continue;
      caseCount++;
      totalCycleDuration += sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
      for (let i = 0; i < sorted.length; i++) {
        activitySet.add(sorted[i].activity);
        if (i < sorted.length - 1) {
          const key = `${sorted[i].activity}→${sorted[i + 1].activity}`;
          const existing = transitionMap.get(key) || { count: 0, totalDurationMs: 0 };
          existing.count++;
          existing.totalDurationMs += sorted[i].durationMs;
          transitionMap.set(key, existing);
        }
      }
    }

    const transitions = Array.from(transitionMap.entries()).map(([key, val]) => {
      const [from, to] = key.split('→');
      return { from, to, frequency: val.count, avgDurationMs: val.count > 0 ? val.totalDurationMs / val.count : 0 };
    });

    const processId = `proc-${Date.now()}-${++this.counter}`;
    const process: DiscoveredProcess = {
      processId, name, activities: Array.from(activitySet),
      transitions, avgCycleDurationMs: caseCount > 0 ? totalCycleDuration / caseCount : 0,
      caseCount, discoveredAt: Date.now()
    };
    this.processes.set(processId, process);
    logger.debug('Process discovered', { processId, name, activities: activitySet.size, caseCount });
    return process;
  }

  getProcess(processId: string): DiscoveredProcess | undefined {
    return this.processes.get(processId);
  }

  getAllProcesses(): DiscoveredProcess[] {
    return Array.from(this.processes.values());
  }
}

class ConformanceChecker {
  private results: ConformanceResult[] = [];
  private counter = 0;

  check(processId: string, caseId: string, expectedSequence: string[], actualSequence: string[]): ConformanceResult {
    const deviations: ConformanceResult['deviations'] = [];
    const maxLen = Math.max(expectedSequence.length, actualSequence.length);
    for (let i = 0; i < maxLen; i++) {
      const exp = expectedSequence[i];
      const act = actualSequence[i];
      if (exp !== act) deviations.push({ expected: exp || '(missing)', actual: act || '(missing)', position: i });
    }
    const conformanceScore = maxLen > 0 ? Math.max(0, ((maxLen - deviations.length) / maxLen) * 100) : 100;
    const conformanceId = `conform-${Date.now()}-${++this.counter}`;
    const result: ConformanceResult = {
      conformanceId, processId, caseId, isConformant: deviations.length === 0,
      deviations, conformanceScore, checkedAt: Date.now()
    };
    this.results.push(result);
    return result;
  }

  getConformanceRate(processId: string): number {
    const relevant = this.results.filter(r => r.processId === processId);
    if (!relevant.length) return 100;
    return (relevant.filter(r => r.isConformant).length / relevant.length) * 100;
  }

  getNonConformantCases(processId: string): ConformanceResult[] {
    return this.results.filter(r => r.processId === processId && !r.isConformant);
  }
}

class ProcessVariantAnalyzer {
  private variants: Map<string, ProcessVariant> = new Map();
  private counter = 0;

  analyze(processId: string, caseActivitySequences: string[][]): ProcessVariant[] {
    const variantMap = new Map<string, { count: number; totalDurationMs: number }>();
    const totalCases = caseActivitySequences.length;

    for (const seq of caseActivitySequences) {
      const key = seq.join('→');
      const existing = variantMap.get(key) || { count: 0, totalDurationMs: 0 };
      existing.count++;
      variantMap.set(key, existing);
    }

    const variants: ProcessVariant[] = [];
    let maxFreq = 0;
    for (const { count } of variantMap.values()) if (count > maxFreq) maxFreq = count;

    for (const [key, { count }] of variantMap.entries()) {
      const variantId = `variant-${Date.now()}-${++this.counter}`;
      const variant: ProcessVariant = {
        variantId, processId, activitySequence: key.split('→'),
        frequency: count, frequencyPct: totalCases > 0 ? (count / totalCases) * 100 : 0,
        avgDurationMs: 0, isHappyPath: count === maxFreq, discoveredAt: Date.now()
      };
      this.variants.set(variantId, variant);
      variants.push(variant);
    }
    return variants.sort((a, b) => b.frequency - a.frequency);
  }

  getHappyPath(processId: string): ProcessVariant | undefined {
    return Array.from(this.variants.values()).find(v => v.processId === processId && v.isHappyPath);
  }

  getRareVariants(threshold = 5): ProcessVariant[] {
    return Array.from(this.variants.values()).filter(v => v.frequencyPct < threshold);
  }
}

export const processEventLogger = new ProcessEventLogger();
export const processDiscoveryEngine = new ProcessDiscoveryEngine();
export const conformanceChecker = new ConformanceChecker();
export const processVariantAnalyzer = new ProcessVariantAnalyzer();

export { ProcessEvent, DiscoveredProcess, ConformanceResult, ProcessVariant };
