/**
 * Phase 226: Competitive Intelligence
 * Competitor profiling, market positioning, win/loss analysis, competitive alert tracking
 */

import { logger } from './logger';

interface CompetitorProfile {
  competitorId: string;
  name: string;
  tier: 'primary' | 'secondary' | 'emerging' | 'niche';
  marketShare: number;    // percentage
  strengthAreas: string[];
  weaknessAreas: string[];
  recentMoves: string[];
  pricingTier: 'premium' | 'mid_market' | 'value' | 'freemium';
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  lastUpdated: number;
}

interface MarketPositionAnalysis {
  analysisId: string;
  dimension: string;
  ourScore: number;        // 0-100
  competitorScores: Record<string, number>;
  industryAvg: number;
  ourRank: number;
  totalCompetitors: number;
  analyzedAt: number;
}

interface WinLossRecord {
  recordId: string;
  opportunityId: string;
  outcome: 'win' | 'loss' | 'no_decision';
  competitorId?: string;
  primaryReason: string;
  secondaryReasons: string[];
  dealSize: number;
  salesCycledays: number;
  productArea: string;
  recordedAt: number;
}

interface CompetitiveAlert {
  alertId: string;
  type: 'pricing_change' | 'product_launch' | 'market_entry' | 'acquisition' | 'partnership' | 'leadership_change';
  competitorId: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  actionRequired: string;
  acknowledged: boolean;
  detectedAt: number;
}

class CompetitorProfileManager {
  private profiles: Map<string, CompetitorProfile> = new Map();
  private counter = 0;

  upsert(name: string, tier: CompetitorProfile['tier'], marketShare: number, strengthAreas: string[], weaknessAreas: string[], pricingTier: CompetitorProfile['pricingTier']): CompetitorProfile {
    const existing = Array.from(this.profiles.values()).find(p => p.name === name);
    const threatLevel: CompetitorProfile['threatLevel'] =
      tier === 'primary' && marketShare > 20 ? 'critical' :
      tier === 'primary' ? 'high' :
      tier === 'secondary' ? 'medium' : 'low';

    const profile: CompetitorProfile = {
      competitorId: existing?.competitorId || `comp-${Date.now()}-${++this.counter}`,
      name, tier, marketShare, strengthAreas, weaknessAreas,
      recentMoves: existing?.recentMoves || [], pricingTier, threatLevel,
      lastUpdated: Date.now()
    };
    this.profiles.set(profile.competitorId, profile);
    logger.debug('Competitor profile upserted', { competitorId: profile.competitorId, name, tier, threatLevel });
    return profile;
  }

  addRecentMove(competitorId: string, move: string): boolean {
    const profile = this.profiles.get(competitorId);
    if (!profile) return false;
    profile.recentMoves.unshift(move);
    if (profile.recentMoves.length > 10) profile.recentMoves.pop();
    profile.lastUpdated = Date.now();
    return true;
  }

  getByThreatLevel(threatLevel: CompetitorProfile['threatLevel']): CompetitorProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.threatLevel === threatLevel);
  }

  getProfile(competitorId: string): CompetitorProfile | undefined {
    return this.profiles.get(competitorId);
  }

  getAllProfiles(): CompetitorProfile[] {
    return Array.from(this.profiles.values()).sort((a, b) => b.marketShare - a.marketShare);
  }
}

class MarketPositionAnalyzer {
  private analyses: Map<string, MarketPositionAnalysis> = new Map();
  private counter = 0;

  analyze(dimension: string, ourScore: number, competitorScores: Record<string, number>, industryAvg: number): MarketPositionAnalysis {
    const allScores = [ourScore, ...Object.values(competitorScores)].sort((a, b) => b - a);
    const ourRank = allScores.indexOf(ourScore) + 1;
    const analysisId = `mktpos-${Date.now()}-${++this.counter}`;
    const analysis: MarketPositionAnalysis = {
      analysisId, dimension, ourScore, competitorScores, industryAvg,
      ourRank, totalCompetitors: Object.keys(competitorScores).length + 1,
      analyzedAt: Date.now()
    };
    this.analyses.set(dimension, analysis);
    return analysis;
  }

  getLeadingDimensions(): MarketPositionAnalysis[] {
    return Array.from(this.analyses.values()).filter(a => a.ourRank === 1);
  }

  getLaggingDimensions(maxRank = 3): MarketPositionAnalysis[] {
    return Array.from(this.analyses.values())
      .filter(a => a.ourRank > maxRank)
      .sort((a, b) => b.ourRank - a.ourRank);
  }

  getAnalysis(dimension: string): MarketPositionAnalysis | undefined {
    return this.analyses.get(dimension);
  }
}

class WinLossAnalyzer {
  private records: WinLossRecord[] = [];
  private counter = 0;

  record(opportunityId: string, outcome: WinLossRecord['outcome'], primaryReason: string, dealSize: number, salesCycleDays: number, productArea: string, competitorId?: string, secondaryReasons: string[] = []): WinLossRecord {
    const recordId = `wl-${Date.now()}-${++this.counter}`;
    const rec: WinLossRecord = {
      recordId, opportunityId, outcome, competitorId, primaryReason,
      secondaryReasons, dealSize, salesCycledays: salesCycleDays,
      productArea, recordedAt: Date.now()
    };
    this.records.push(rec);
    return rec;
  }

  getWinRate(): number {
    if (!this.records.length) return 0;
    const decided = this.records.filter(r => r.outcome !== 'no_decision');
    if (!decided.length) return 0;
    return (decided.filter(r => r.outcome === 'win').length / decided.length) * 100;
  }

  getTopLossReasons(limit = 5): Array<{ reason: string; count: number }> {
    const reasonMap = new Map<string, number>();
    for (const rec of this.records.filter(r => r.outcome === 'loss')) {
      reasonMap.set(rec.primaryReason, (reasonMap.get(rec.primaryReason) || 0) + 1);
    }
    return Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getWinRateByCompetitor(): Record<string, number> {
    const byComp: Record<string, { wins: number; total: number }> = {};
    for (const rec of this.records.filter(r => r.competitorId && r.outcome !== 'no_decision')) {
      const id = rec.competitorId!;
      if (!byComp[id]) byComp[id] = { wins: 0, total: 0 };
      byComp[id].total++;
      if (rec.outcome === 'win') byComp[id].wins++;
    }
    return Object.fromEntries(Object.entries(byComp).map(([id, { wins, total }]) => [id, total > 0 ? (wins / total) * 100 : 0]));
  }
}

class CompetitiveAlertManager {
  private alerts: Map<string, CompetitiveAlert> = new Map();
  private counter = 0;

  raise(type: CompetitiveAlert['type'], competitorId: string, description: string, severity: CompetitiveAlert['severity'], actionRequired: string): CompetitiveAlert {
    const alertId = `compalt-${Date.now()}-${++this.counter}`;
    const alert: CompetitiveAlert = {
      alertId, type, competitorId, description, severity,
      actionRequired, acknowledged: false, detectedAt: Date.now()
    };
    this.alerts.set(alertId, alert);
    logger.debug('Competitive alert raised', { alertId, type, competitorId, severity });
    return alert;
  }

  acknowledge(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.acknowledged = true;
    return true;
  }

  getUnacknowledged(severity?: CompetitiveAlert['severity']): CompetitiveAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.acknowledged && (!severity || a.severity === severity))
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      });
  }

  getRecentAlerts(days = 30): CompetitiveAlert[] {
    const since = Date.now() - days * 86400 * 1000;
    return Array.from(this.alerts.values()).filter(a => a.detectedAt >= since);
  }
}

export const competitorProfileManager = new CompetitorProfileManager();
export const marketPositionAnalyzer = new MarketPositionAnalyzer();
export const winLossAnalyzer = new WinLossAnalyzer();
export const competitiveAlertManager = new CompetitiveAlertManager();

export { CompetitorProfile, MarketPositionAnalysis, WinLossRecord, CompetitiveAlert };
