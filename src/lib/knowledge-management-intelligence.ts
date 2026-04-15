/**
 * Phase 263: Knowledge Management Intelligence
 * Knowledge asset tracking, expertise mapping, knowledge gap analysis, reuse analytics
 */

import { logger } from './logger';

interface KnowledgeAsset {
  assetId: string;
  title: string;
  type: 'document' | 'wiki' | 'runbook' | 'best_practice' | 'lesson_learned' | 'template' | 'training';
  domain: string;
  authors: string[];
  tags: string[];
  viewCount: number;
  reuseCount: number;
  qualityScore: number;   // 0-100
  freshnessScore: number; // 0-100, decreases over time
  status: 'draft' | 'published' | 'outdated' | 'archived';
  createdAt: number;
  lastUpdatedAt: number;
}

interface ExpertiseProfile {
  profileId: string;
  employeeId: string;
  domain: string;
  skills: Array<{ skill: string; level: 'novice' | 'proficient' | 'expert' | 'thought_leader'; endorsements: number }>;
  knowledgeContributions: number;
  menteeCount: number;
  expertiseScore: number;  // composite 0-100
  updatedAt: number;
}

interface KnowledgeGapReport {
  reportId: string;
  period: string;
  domain: string;
  criticalGaps: string[];    // high-demand topics with no coverage
  stalledTopics: string[];   // outdated assets in key areas
  coverageScore: number;     // 0-100 (higher = better coverage)
  urgency: 'critical' | 'high' | 'medium' | 'low';
  recommendedActions: string[];
  generatedAt: number;
}

interface KnowledgeReuseMetric {
  metricId: string;
  period: string;
  totalAssets: number;
  activelyReusedAssets: number;
  reuseRatePct: number;         // % of assets reused at least once
  avgReusesPerAsset: number;
  topReuseAssets: string[];
  estimatedTimeSavedHours: number;  // reuses × avg_creation_time
  calculatedAt: number;
}

class KnowledgeAssetManager {
  private assets: Map<string, KnowledgeAsset> = new Map();
  private counter = 0;

  create(title: string, type: KnowledgeAsset['type'], domain: string, authors: string[], tags: string[]): KnowledgeAsset {
    const assetId = `ka-${Date.now()}-${++this.counter}`;
    const asset: KnowledgeAsset = {
      assetId, title, type, domain, authors, tags,
      viewCount: 0, reuseCount: 0, qualityScore: 70, freshnessScore: 100,
      status: 'draft', createdAt: Date.now(), lastUpdatedAt: Date.now()
    };
    this.assets.set(assetId, asset);
    logger.debug('Knowledge asset created', { assetId, title, type });
    return asset;
  }

  publish(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.status = 'published';
    return true;
  }

  recordView(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.viewCount++;
    return true;
  }

  recordReuse(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.reuseCount++;
    return true;
  }

  decayFreshness(): void {
    const now = Date.now();
    for (const asset of this.assets.values()) {
      if (asset.status === 'published') {
        const daysSinceUpdate = (now - asset.lastUpdatedAt) / 86400000;
        asset.freshnessScore = Math.max(0, 100 - daysSinceUpdate * 0.5);
        if (asset.freshnessScore < 30) asset.status = 'outdated';
      }
    }
  }

  getOutdated(): KnowledgeAsset[] {
    return Array.from(this.assets.values()).filter(a => a.status === 'outdated');
  }

  getTopReused(limit = 10): KnowledgeAsset[] {
    return Array.from(this.assets.values())
      .filter(a => a.status === 'published')
      .sort((a, b) => b.reuseCount - a.reuseCount)
      .slice(0, limit);
  }

  getByDomain(domain: string): KnowledgeAsset[] {
    return Array.from(this.assets.values()).filter(a => a.domain === domain);
  }

  getAsset(assetId: string): KnowledgeAsset | undefined {
    return this.assets.get(assetId);
  }
}

class ExpertiseMappingEngine {
  private profiles: Map<string, ExpertiseProfile> = new Map();
  private counter = 0;

  upsert(employeeId: string, domain: string, skills: ExpertiseProfile['skills'], contributions: number, mentees: number): ExpertiseProfile {
    const expertScore =
      skills.reduce((s, sk) => s + ({ novice: 1, proficient: 2, expert: 3, thought_leader: 4 }[sk.level] * (1 + sk.endorsements * 0.1)), 0) * 5 +
      Math.min(30, contributions * 2) +
      Math.min(20, mentees * 5);

    const profileId = `expertise-${Date.now()}-${++this.counter}`;
    const profile: ExpertiseProfile = {
      profileId, employeeId, domain, skills, knowledgeContributions: contributions,
      menteeCount: mentees, expertiseScore: Math.max(0, Math.min(100, expertScore)), updatedAt: Date.now()
    };
    this.profiles.set(`${employeeId}-${domain}`, profile);
    return profile;
  }

  findExperts(domain: string, minScore = 70): ExpertiseProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.domain === domain && p.expertiseScore >= minScore)
      .sort((a, b) => b.expertiseScore - a.expertiseScore);
  }

  getSinglePointsOfFailure(): ExpertiseProfile[] {
    // Domains with only one expert
    const domainExperts: Record<string, number> = {};
    for (const p of this.profiles.values()) {
      if (p.expertiseScore >= 70) domainExperts[p.domain] = (domainExperts[p.domain] || 0) + 1;
    }
    return Array.from(this.profiles.values())
      .filter(p => p.expertiseScore >= 70 && domainExperts[p.domain] === 1);
  }
}

class KnowledgeGapAnalyzer {
  private reports: KnowledgeGapReport[] = [];
  private counter = 0;

  analyze(period: string, domain: string, criticalGaps: string[], stalledTopics: string[], assetCount: number, coveredTopics: number, totalTopics: number): KnowledgeGapReport {
    const coverageScore = totalTopics > 0 ? (coveredTopics / totalTopics) * 100 : 0;
    const urgency: KnowledgeGapReport['urgency'] =
      criticalGaps.length > 5 || coverageScore < 30 ? 'critical' :
      criticalGaps.length > 2 || coverageScore < 50 ? 'high' :
      criticalGaps.length > 0 ? 'medium' : 'low';

    const recommendedActions: string[] = [];
    if (criticalGaps.length > 0) recommendedActions.push(`Create knowledge assets for: ${criticalGaps.slice(0, 3).join(', ')}`);
    if (stalledTopics.length > 0) recommendedActions.push(`Update outdated content for: ${stalledTopics.slice(0, 2).join(', ')}`);

    const reportId = `kgap-${Date.now()}-${++this.counter}`;
    const report: KnowledgeGapReport = {
      reportId, period, domain, criticalGaps, stalledTopics,
      coverageScore: Math.max(0, Math.min(100, coverageScore)),
      urgency, recommendedActions, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getCriticalGaps(): KnowledgeGapReport[] {
    return this.reports.filter(r => r.urgency === 'critical' || r.urgency === 'high');
  }

  getLatest(): KnowledgeGapReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

class KnowledgeReuseAnalyzer {
  private metrics: KnowledgeReuseMetric[] = [];
  private counter = 0;

  calculate(period: string, assets: KnowledgeAsset[], avgCreationTimeHours = 4): KnowledgeReuseMetric {
    const published = assets.filter(a => a.status === 'published');
    const activelyReused = published.filter(a => a.reuseCount > 0);
    const reuseRatePct = published.length > 0 ? (activelyReused.length / published.length) * 100 : 0;
    const totalReuses = published.reduce((s, a) => s + a.reuseCount, 0);
    const avgReusesPerAsset = published.length > 0 ? totalReuses / published.length : 0;
    const topReuseAssets = [...published].sort((a, b) => b.reuseCount - a.reuseCount).slice(0, 5).map(a => a.assetId);
    const estimatedTimeSaved = totalReuses * avgCreationTimeHours;

    const metricId = `kreuse-${Date.now()}-${++this.counter}`;
    const metric: KnowledgeReuseMetric = {
      metricId, period, totalAssets: assets.length, activelyReusedAssets: activelyReused.length,
      reuseRatePct, avgReusesPerAsset, topReuseAssets, estimatedTimeSavedHours: estimatedTimeSaved,
      calculatedAt: Date.now()
    };
    this.metrics.push(metric);
    return metric;
  }

  getLatest(): KnowledgeReuseMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }
}

export const knowledgeAssetManager = new KnowledgeAssetManager();
export const expertiseMappingEngine = new ExpertiseMappingEngine();
export const knowledgeGapAnalyzer = new KnowledgeGapAnalyzer();
export const knowledgeReuseAnalyzer = new KnowledgeReuseAnalyzer();

export { KnowledgeAsset, ExpertiseProfile, KnowledgeGapReport, KnowledgeReuseMetric };
