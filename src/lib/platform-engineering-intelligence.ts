/**
 * Phase 249: Platform Engineering Intelligence
 * Internal developer platform tracking, golden path adoption, platform reliability, DX metrics
 */

import { logger } from './logger';

interface PlatformService {
  serviceId: string;
  name: string;
  category: 'ci_cd' | 'observability' | 'deployment' | 'security' | 'data' | 'messaging' | 'storage';
  owner: string;
  version: string;
  adoptionCount: number;    // teams using this service
  availabilityPct: number;
  avgLatencyMs: number;
  status: 'stable' | 'beta' | 'deprecated' | 'maintenance';
  registeredAt: number;
}

interface GoldenPathTemplate {
  templateId: string;
  name: string;
  language: string;
  framework: string;
  includesCI: boolean;
  includesObservability: boolean;
  includesSecurity: boolean;
  adoptionCount: number;
  lastUsedAt: number;
  status: 'active' | 'deprecated';
  createdAt: number;
}

interface DeveloperExperienceMetric {
  metricId: string;
  team: string;
  period: string;
  buildSuccessRatePct: number;
  avgBuildTimeMin: number;
  deployFrequencyPerWeek: number;
  onboardingTimeDays: number;
  p2pDeployTimeMin: number;  // commit-to-prod
  dxScore: number;           // composite
  calculatedAt: number;
}

interface PlatformIncident {
  incidentId: string;
  serviceId: string;
  title: string;
  severity: 'p1' | 'p2' | 'p3' | 'p4';
  affectedTeams: string[];
  startedAt: number;
  resolvedAt?: number;
  mttrMin?: number;
  rootCause?: string;
  status: 'open' | 'investigating' | 'resolved';
}

class PlatformServiceRegistry {
  private services: Map<string, PlatformService> = new Map();
  private counter = 0;

  register(name: string, category: PlatformService['category'], owner: string, version: string): PlatformService {
    const serviceId = `platsvc-${Date.now()}-${++this.counter}`;
    const service: PlatformService = {
      serviceId, name, category, owner, version,
      adoptionCount: 0, availabilityPct: 100, avgLatencyMs: 0, status: 'beta', registeredAt: Date.now()
    };
    this.services.set(serviceId, service);
    logger.debug('Platform service registered', { serviceId, name, category });
    return service;
  }

  updateMetrics(serviceId: string, adoptionCount: number, availabilityPct: number, avgLatencyMs: number): boolean {
    const svc = this.services.get(serviceId);
    if (!svc) return false;
    svc.adoptionCount = adoptionCount;
    svc.availabilityPct = availabilityPct;
    svc.avgLatencyMs = avgLatencyMs;
    return true;
  }

  promoteToStable(serviceId: string): boolean {
    const svc = this.services.get(serviceId);
    if (!svc) return false;
    svc.status = 'stable';
    return true;
  }

  getByCategory(category: PlatformService['category']): PlatformService[] {
    return Array.from(this.services.values()).filter(s => s.category === category);
  }

  getLowAdoption(threshold = 3): PlatformService[] {
    return Array.from(this.services.values())
      .filter(s => s.status === 'stable' && s.adoptionCount < threshold)
      .sort((a, b) => a.adoptionCount - b.adoptionCount);
  }

  getAllServices(): PlatformService[] {
    return Array.from(this.services.values());
  }
}

class GoldenPathManager {
  private templates: Map<string, GoldenPathTemplate> = new Map();
  private counter = 0;

  create(name: string, language: string, framework: string, includesCI: boolean, includesObs: boolean, includesSec: boolean): GoldenPathTemplate {
    const templateId = `goldenpath-${Date.now()}-${++this.counter}`;
    const template: GoldenPathTemplate = {
      templateId, name, language, framework,
      includesCI, includesObservability: includesObs, includesSecurity: includesSec,
      adoptionCount: 0, lastUsedAt: Date.now(), status: 'active', createdAt: Date.now()
    };
    this.templates.set(templateId, template);
    logger.debug('Golden path template created', { templateId, name, language });
    return template;
  }

  recordUsage(templateId: string): boolean {
    const t = this.templates.get(templateId);
    if (!t) return false;
    t.adoptionCount++;
    t.lastUsedAt = Date.now();
    return true;
  }

  getTopTemplates(limit = 5): GoldenPathTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.status === 'active')
      .sort((a, b) => b.adoptionCount - a.adoptionCount)
      .slice(0, limit);
  }

  getComplianceRate(): number {
    const all = Array.from(this.templates.values()).filter(t => t.status === 'active');
    if (!all.length) return 0;
    const compliant = all.filter(t => t.includesCI && t.includesObservability && t.includesSecurity);
    return (compliant.length / all.length) * 100;
  }

  getTemplate(templateId: string): GoldenPathTemplate | undefined {
    return this.templates.get(templateId);
  }
}

class DeveloperExperienceTracker {
  private metrics: Map<string, DeveloperExperienceMetric[]> = new Map();
  private counter = 0;

  record(team: string, period: string, buildSuccessRate: number, avgBuildTimeMin: number, deployFreq: number, onboardingDays: number, p2pMin: number): DeveloperExperienceMetric {
    // DX score: higher build success, faster builds, more deploys, faster onboarding = better
    const buildScore = buildSuccessRate;                               // 0-100
    const speedScore = Math.max(0, 100 - avgBuildTimeMin * 2);        // faster = higher
    const deployScore = Math.min(100, deployFreq * 10);               // more = higher
    const onboardScore = Math.max(0, 100 - onboardingDays * 5);       // shorter = higher
    const dxScore = buildScore * 0.35 + speedScore * 0.25 + deployScore * 0.25 + onboardScore * 0.15;

    const metricId = `dxmetric-${Date.now()}-${++this.counter}`;
    const metric: DeveloperExperienceMetric = {
      metricId, team, period, buildSuccessRatePct: buildSuccessRate,
      avgBuildTimeMin, deployFrequencyPerWeek: deployFreq, onboardingTimeDays: onboardingDays,
      p2pDeployTimeMin: p2pMin, dxScore: Math.max(0, Math.min(100, dxScore)), calculatedAt: Date.now()
    };
    const history = this.metrics.get(team) || [];
    history.push(metric);
    this.metrics.set(team, history);
    return metric;
  }

  getTeamTrend(team: string): 'improving' | 'stable' | 'declining' {
    const history = this.metrics.get(team) || [];
    if (history.length < 2) return 'stable';
    const diff = history[history.length - 1].dxScore - history[history.length - 2].dxScore;
    return diff > 3 ? 'improving' : diff < -3 ? 'declining' : 'stable';
  }

  getLowestDXTeams(threshold = 50): DeveloperExperienceMetric[] {
    return Array.from(this.metrics.values())
      .map(h => h[h.length - 1])
      .filter((m): m is DeveloperExperienceMetric => !!m && m.dxScore < threshold)
      .sort((a, b) => a.dxScore - b.dxScore);
  }

  getLatest(team: string): DeveloperExperienceMetric | undefined {
    const history = this.metrics.get(team) || [];
    return history[history.length - 1];
  }
}

class PlatformIncidentTracker {
  private incidents: Map<string, PlatformIncident> = new Map();
  private counter = 0;

  open(serviceId: string, title: string, severity: PlatformIncident['severity'], affectedTeams: string[]): PlatformIncident {
    const incidentId = `platinc-${Date.now()}-${++this.counter}`;
    const incident: PlatformIncident = {
      incidentId, serviceId, title, severity, affectedTeams,
      startedAt: Date.now(), status: 'open'
    };
    this.incidents.set(incidentId, incident);
    logger.debug('Platform incident opened', { incidentId, serviceId, severity });
    return incident;
  }

  resolve(incidentId: string, rootCause: string): boolean {
    const inc = this.incidents.get(incidentId);
    if (!inc) return false;
    inc.resolvedAt = Date.now();
    inc.mttrMin = Math.round((inc.resolvedAt - inc.startedAt) / 60000);
    inc.rootCause = rootCause;
    inc.status = 'resolved';
    return true;
  }

  getOpenIncidents(): PlatformIncident[] {
    return Array.from(this.incidents.values())
      .filter(i => i.status !== 'resolved')
      .sort((a, b) => {
        const priority = { p1: 0, p2: 1, p3: 2, p4: 3 };
        return priority[a.severity] - priority[b.severity];
      });
  }

  getAvgMTTR(severity?: PlatformIncident['severity']): number {
    const resolved = Array.from(this.incidents.values())
      .filter(i => i.status === 'resolved' && i.mttrMin !== undefined)
      .filter(i => !severity || i.severity === severity);
    if (!resolved.length) return 0;
    return resolved.reduce((s, i) => s + (i.mttrMin || 0), 0) / resolved.length;
  }
}

export const platformServiceRegistry = new PlatformServiceRegistry();
export const goldenPathManager = new GoldenPathManager();
export const developerExperienceTracker = new DeveloperExperienceTracker();
export const platformIncidentTracker = new PlatformIncidentTracker();

export { PlatformService, GoldenPathTemplate, DeveloperExperienceMetric, PlatformIncident };
