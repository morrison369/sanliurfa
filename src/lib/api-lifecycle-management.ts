/**
 * Phase 248: API Lifecycle Management
 * API inventory, version governance, deprecation tracking, API health monitoring
 */

import { logger } from './logger';

interface APIEndpoint {
  endpointId: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  version: string;
  service: string;
  status: 'active' | 'deprecated' | 'retired' | 'beta';
  authRequired: boolean;
  rateLimitPerMin: number;
  avgResponseMs: number;
  p99ResponseMs: number;
  errorRatePct: number;
  callsPerDay: number;
  registeredAt: number;
}

interface APIVersionRecord {
  versionId: string;
  apiName: string;
  version: string;
  releaseDate: number;
  deprecationDate?: number;
  retirementDate?: number;
  breakingChanges: string[];
  migrationGuide: string;
  activeConsumers: number;
  status: 'current' | 'supported' | 'deprecated' | 'retired';
  createdAt: number;
}

interface APIDeprecationNotice {
  noticeId: string;
  endpointId: string;
  apiName: string;
  currentVersion: string;
  replacementVersion: string;
  deprecationDate: number;
  retirementDate: number;
  affectedConsumers: string[];
  migrationSteps: string[];
  createdAt: number;
}

interface APIHealthReport {
  reportId: string;
  period: string;
  totalEndpoints: number;
  activeEndpoints: number;
  deprecatedEndpoints: number;
  avgErrorRate: number;
  avgResponseMs: number;
  slaBreaches: number;
  topCalledEndpoints: string[];
  generatedAt: number;
}

class APIInventoryManager {
  private endpoints: Map<string, APIEndpoint> = new Map();
  private counter = 0;

  register(path: string, method: APIEndpoint['method'], version: string, service: string, authRequired: boolean, rateLimit: number): APIEndpoint {
    const endpointId = `api-${Date.now()}-${++this.counter}`;
    const endpoint: APIEndpoint = {
      endpointId, path, method, version, service, status: 'active', authRequired,
      rateLimitPerMin: rateLimit, avgResponseMs: 0, p99ResponseMs: 0,
      errorRatePct: 0, callsPerDay: 0, registeredAt: Date.now()
    };
    this.endpoints.set(endpointId, endpoint);
    logger.debug('API endpoint registered', { endpointId, path, method, version });
    return endpoint;
  }

  updateMetrics(endpointId: string, avgMs: number, p99Ms: number, errorRate: number, callsPerDay: number): boolean {
    const ep = this.endpoints.get(endpointId);
    if (!ep) return false;
    ep.avgResponseMs = avgMs;
    ep.p99ResponseMs = p99Ms;
    ep.errorRatePct = errorRate;
    ep.callsPerDay = callsPerDay;
    return true;
  }

  deprecate(endpointId: string): boolean {
    const ep = this.endpoints.get(endpointId);
    if (!ep) return false;
    ep.status = 'deprecated';
    return true;
  }

  getHighError(threshold = 1): APIEndpoint[] {
    return Array.from(this.endpoints.values())
      .filter(ep => ep.status === 'active' && ep.errorRatePct >= threshold)
      .sort((a, b) => b.errorRatePct - a.errorRatePct);
  }

  getByService(service: string): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter(ep => ep.service === service);
  }

  getAllEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values());
  }
}

class APIVersionGovernor {
  private versions: Map<string, APIVersionRecord[]> = new Map();
  private counter = 0;

  register(apiName: string, version: string, breakingChanges: string[], migrationGuide: string, activeConsumers: number): APIVersionRecord {
    const versionId = `apiver-${Date.now()}-${++this.counter}`;
    const record: APIVersionRecord = {
      versionId, apiName, version, releaseDate: Date.now(),
      breakingChanges, migrationGuide, activeConsumers, status: 'current', createdAt: Date.now()
    };
    const existing = this.versions.get(apiName) || [];
    // Mark older versions as supported
    for (const v of existing) if (v.status === 'current') v.status = 'supported';
    existing.push(record);
    this.versions.set(apiName, existing);
    return record;
  }

  deprecateVersion(apiName: string, version: string, retirementDate: number): boolean {
    const history = this.versions.get(apiName) || [];
    const rec = history.find(v => v.version === version);
    if (!rec) return false;
    rec.status = 'deprecated';
    rec.deprecationDate = Date.now();
    rec.retirementDate = retirementDate;
    return true;
  }

  getVersionsWithConsumers(): APIVersionRecord[] {
    return Array.from(this.versions.values()).flat()
      .filter(v => v.status === 'deprecated' && v.activeConsumers > 0);
  }

  getVersionHistory(apiName: string): APIVersionRecord[] {
    return this.versions.get(apiName) || [];
  }
}

class APIDeprecationManager {
  private notices: Map<string, APIDeprecationNotice> = new Map();
  private counter = 0;

  notify(endpointId: string, apiName: string, currentVersion: string, replacementVersion: string, deprecationDate: number, retirementDate: number, consumers: string[], migrationSteps: string[]): APIDeprecationNotice {
    const noticeId = `deprnotice-${Date.now()}-${++this.counter}`;
    const notice: APIDeprecationNotice = {
      noticeId, endpointId, apiName, currentVersion, replacementVersion,
      deprecationDate, retirementDate, affectedConsumers: consumers, migrationSteps, createdAt: Date.now()
    };
    this.notices.set(endpointId, notice);
    logger.debug('API deprecation notice created', { noticeId, apiName, currentVersion, consumers: consumers.length });
    return notice;
  }

  getUpcomingRetirements(days = 90): APIDeprecationNotice[] {
    const horizon = Date.now() + days * 86400 * 1000;
    return Array.from(this.notices.values()).filter(n => n.retirementDate <= horizon);
  }

  getNotice(endpointId: string): APIDeprecationNotice | undefined {
    return this.notices.get(endpointId);
  }

  getTotalAffectedConsumers(): number {
    const allConsumers = new Set(Array.from(this.notices.values()).flatMap(n => n.affectedConsumers));
    return allConsumers.size;
  }
}

class APIHealthReporter {
  private reports: APIHealthReport[] = [];
  private counter = 0;

  generate(period: string, endpoints: APIEndpoint[]): APIHealthReport {
    const active = endpoints.filter(e => e.status === 'active');
    const deprecated = endpoints.filter(e => e.status === 'deprecated');
    const withCalls = active.filter(e => e.callsPerDay > 0);
    const avgError = withCalls.length > 0 ? withCalls.reduce((s, e) => s + e.errorRatePct, 0) / withCalls.length : 0;
    const avgResponse = withCalls.length > 0 ? withCalls.reduce((s, e) => s + e.avgResponseMs, 0) / withCalls.length : 0;
    const slaBreaches = active.filter(e => e.p99ResponseMs > 2000).length;
    const topCalled = [...active].sort((a, b) => b.callsPerDay - a.callsPerDay).slice(0, 5).map(e => e.endpointId);

    const reportId = `apirep-${Date.now()}-${++this.counter}`;
    const report: APIHealthReport = {
      reportId, period, totalEndpoints: endpoints.length, activeEndpoints: active.length,
      deprecatedEndpoints: deprecated.length, avgErrorRate: avgError,
      avgResponseMs: avgResponse, slaBreaches, topCalledEndpoints: topCalled, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): APIHealthReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

export const apiInventoryManager = new APIInventoryManager();
export const apiVersionGovernor = new APIVersionGovernor();
export const apiDeprecationManager = new APIDeprecationManager();
export const apiHealthReporter = new APIHealthReporter();

export { APIEndpoint, APIVersionRecord, APIDeprecationNotice, APIHealthReport };
