/**
 * Phase 262: Intelligent Automation & RPA Analytics
 * Bot performance monitoring, automation ROI, process automation coverage, exception handling analytics
 */

import { logger } from './logger';

interface AutomationBot {
  botId: string;
  name: string;
  processName: string;
  botType: 'rpa' | 'ai_agent' | 'workflow' | 'integration' | 'attended' | 'unattended';
  team: string;
  transactionsPerDay: number;
  avgHandleTimeMin: number;        // bot time per transaction
  humanHandleTimeMin: number;      // human time per transaction (baseline)
  successRatePct: number;
  exceptionRatePct: number;
  status: 'active' | 'paused' | 'maintenance' | 'retired';
  deployedAt: number;
}

interface AutomationROIRecord {
  recordId: string;
  botId: string;
  period: string;
  transactionsProcessed: number;
  hoursAutomated: number;          // transactionsProcessed × humanHandleTimeMin / 60
  hourlyLaborRate: number;
  laborCostSaved: number;          // hoursAutomated × hourlyLaborRate
  infrastructureCost: number;
  netSavings: number;              // laborCostSaved - infrastructureCost
  roi: number;                     // netSavings / infrastructureCost × 100
  calculatedAt: number;
}

interface ProcessAutomationCoverage {
  coverageId: string;
  department: string;
  period: string;
  totalProcessCount: number;
  automatedProcessCount: number;
  partiallyAutomatedCount: number;
  automationCoveragePct: number;
  automationCandidates: string[];   // identified but not yet automated
  estimatedAdditionalSavings: number;
  calculatedAt: number;
}

interface ExceptionHandlingReport {
  reportId: string;
  botId: string;
  period: string;
  totalExceptions: number;
  handledByBot: number;
  escalatedToHuman: number;
  exceptionTypes: Record<string, number>;   // type → count
  avgResolutionTimeMin: number;
  unhandledPct: number;
  generatedAt: number;
}

class AutomationBotRegistry {
  private bots: Map<string, AutomationBot> = new Map();
  private counter = 0;

  register(name: string, processName: string, botType: AutomationBot['botType'], team: string, humanHandleTimeMin: number): AutomationBot {
    const botId = `bot-${Date.now()}-${++this.counter}`;
    const bot: AutomationBot = {
      botId, name, processName, botType, team, transactionsPerDay: 0,
      avgHandleTimeMin: 0, humanHandleTimeMin, successRatePct: 0,
      exceptionRatePct: 0, status: 'active', deployedAt: Date.now()
    };
    this.bots.set(botId, bot);
    logger.debug('Automation bot registered', { botId, name, botType });
    return bot;
  }

  updateMetrics(botId: string, transactionsPerDay: number, avgHandleTimeMin: number, successRatePct: number, exceptionRatePct: number): boolean {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    bot.transactionsPerDay = transactionsPerDay;
    bot.avgHandleTimeMin = avgHandleTimeMin;
    bot.successRatePct = successRatePct;
    bot.exceptionRatePct = exceptionRatePct;
    return true;
  }

  getHighException(threshold = 10): AutomationBot[] {
    return Array.from(this.bots.values())
      .filter(b => b.status === 'active' && b.exceptionRatePct >= threshold)
      .sort((a, b) => b.exceptionRatePct - a.exceptionRatePct);
  }

  getByTeam(team: string): AutomationBot[] {
    return Array.from(this.bots.values()).filter(b => b.team === team);
  }

  getTotalDailyTransactions(): number {
    return Array.from(this.bots.values())
      .filter(b => b.status === 'active')
      .reduce((s, b) => s + b.transactionsPerDay, 0);
  }

  getBot(botId: string): AutomationBot | undefined {
    return this.bots.get(botId);
  }
}

class AutomationROICalculator {
  private records: Map<string, AutomationROIRecord[]> = new Map();
  private counter = 0;

  calculate(botId: string, period: string, transactionsProcessed: number, humanHandleTimeMin: number, hourlyLaborRate: number, infrastructureCost: number): AutomationROIRecord {
    const hoursAutomated = (transactionsProcessed * humanHandleTimeMin) / 60;
    const laborCostSaved = hoursAutomated * hourlyLaborRate;
    const netSavings = laborCostSaved - infrastructureCost;
    const roi = infrastructureCost > 0 ? (netSavings / infrastructureCost) * 100 : 0;

    const recordId = `automROI-${Date.now()}-${++this.counter}`;
    const record: AutomationROIRecord = {
      recordId, botId, period, transactionsProcessed, hoursAutomated,
      hourlyLaborRate, laborCostSaved, infrastructureCost, netSavings, roi, calculatedAt: Date.now()
    };
    const existing = this.records.get(botId) || [];
    existing.push(record);
    this.records.set(botId, existing);
    return record;
  }

  getTotalSavings(period: string): number {
    return Array.from(this.records.values()).flat()
      .filter(r => r.period === period)
      .reduce((s, r) => s + r.netSavings, 0);
  }

  getLatest(botId: string): AutomationROIRecord | undefined {
    const history = this.records.get(botId) || [];
    return history[history.length - 1];
  }

  getPortfolioROI(period: string): number {
    const periodRecords = Array.from(this.records.values()).flat().filter(r => r.period === period);
    const totalInfra = periodRecords.reduce((s, r) => s + r.infrastructureCost, 0);
    const totalSavings = periodRecords.reduce((s, r) => s + r.netSavings, 0);
    return totalInfra > 0 ? (totalSavings / totalInfra) * 100 : 0;
  }
}

class ProcessAutomationCoverageTracker {
  private coverage: Map<string, ProcessAutomationCoverage[]> = new Map();
  private counter = 0;

  record(department: string, period: string, totalProcesses: number, automatedCount: number, partialCount: number, candidates: string[], additionalSavings: number): ProcessAutomationCoverage {
    const automationCoveragePct = totalProcesses > 0 ? ((automatedCount + partialCount * 0.5) / totalProcesses) * 100 : 0;

    const coverageId = `automcov-${Date.now()}-${++this.counter}`;
    const record: ProcessAutomationCoverage = {
      coverageId, department, period, totalProcessCount: totalProcesses,
      automatedProcessCount: automatedCount, partiallyAutomatedCount: partialCount,
      automationCoveragePct: Math.max(0, Math.min(100, automationCoveragePct)),
      automationCandidates: candidates, estimatedAdditionalSavings: additionalSavings,
      calculatedAt: Date.now()
    };
    const history = this.coverage.get(department) || [];
    history.push(record);
    this.coverage.set(department, history);
    return record;
  }

  getLowCoverage(threshold = 30): ProcessAutomationCoverage[] {
    return Array.from(this.coverage.values())
      .map(h => h[h.length - 1])
      .filter((r): r is ProcessAutomationCoverage => !!r && r.automationCoveragePct < threshold)
      .sort((a, b) => a.automationCoveragePct - b.automationCoveragePct);
  }

  getLatest(department: string): ProcessAutomationCoverage | undefined {
    const history = this.coverage.get(department) || [];
    return history[history.length - 1];
  }
}

class ExceptionAnalyzer {
  private reports: ExceptionHandlingReport[] = [];
  private counter = 0;

  analyze(botId: string, period: string, totalExceptions: number, handledByBot: number, exceptionTypes: Record<string, number>, avgResolutionTimeMin: number): ExceptionHandlingReport {
    const escalatedToHuman = totalExceptions - handledByBot;
    const unhandledPct = totalExceptions > 0 ? (escalatedToHuman / totalExceptions) * 100 : 0;

    const reportId = `excreport-${Date.now()}-${++this.counter}`;
    const report: ExceptionHandlingReport = {
      reportId, botId, period, totalExceptions, handledByBot, escalatedToHuman,
      exceptionTypes, avgResolutionTimeMin, unhandledPct, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getTopExceptionTypes(): { type: string; count: number }[] {
    const totals: Record<string, number> = {};
    for (const r of this.reports) {
      for (const [type, count] of Object.entries(r.exceptionTypes)) {
        totals[type] = (totals[type] || 0) + count;
      }
    }
    return Object.entries(totals)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  getHighEscalation(threshold = 30): ExceptionHandlingReport[] {
    return this.reports.filter(r => r.unhandledPct >= threshold);
  }
}

export const automationBotRegistry = new AutomationBotRegistry();
export const automationROICalculator = new AutomationROICalculator();
export const processAutomationCoverageTracker = new ProcessAutomationCoverageTracker();
export const exceptionAnalyzer = new ExceptionAnalyzer();

export { AutomationBot, AutomationROIRecord, ProcessAutomationCoverage, ExceptionHandlingReport };
