/**
 * Phase 190: Integration Marketplace
 * Integration catalog, rating system, deployment management, health monitoring
 */

import { logger } from './logger';

interface Integration {
  integrationId: string;
  name: string;
  description: string;
  partnerId: string;
  category: 'crm' | 'erp' | 'analytics' | 'payments' | 'communication' | 'storage' | 'ai' | 'other';
  version: string;
  apiSpecs: { endpoint: string; authType: 'oauth2' | 'apikey' | 'jwt' };
  tags: string[];
  createdAt: number;
  status: 'pending_review' | 'published' | 'suspended' | 'deprecated';
  downloadCount: number;
}

interface IntegrationDeployment {
  deploymentId: string;
  integrationId: string;
  customerId: string;
  environment: 'sandbox' | 'production';
  deployedAt: number;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'failed';
}

interface IntegrationHealthCheck {
  checkId: string;
  integrationId: string;
  deploymentId: string;
  latencyMs: number;
  success: boolean;
  checkedAt: number;
  errorMessage?: string;
}

class IntegrationCatalogManager {
  private integrations: Map<string, Integration> = new Map();
  private counter = 0;

  submit(name: string, description: string, partnerId: string, category: Integration['category'], apiSpecs: Integration['apiSpecs'], tags: string[] = []): Integration {
    const integrationId = `integration-${Date.now()}-${++this.counter}`;
    const integration: Integration = {
      integrationId, name, description, partnerId, category,
      version: '1.0.0', apiSpecs, tags,
      createdAt: Date.now(), status: 'pending_review', downloadCount: 0
    };
    this.integrations.set(integrationId, integration);
    logger.debug('Integration submitted', { integrationId, name, category });
    return integration;
  }

  approve(integrationId: string): Integration | undefined {
    const integration = this.integrations.get(integrationId);
    if (integration) {
      integration.status = 'published';
      logger.debug('Integration approved', { integrationId });
      return integration;
    }
    return undefined;
  }

  recordDownload(integrationId: string): void {
    const integration = this.integrations.get(integrationId);
    if (integration) integration.downloadCount++;
  }

  search(query: string, category?: string): Integration[] {
    const q = query.toLowerCase();
    return Array.from(this.integrations.values()).filter(i =>
      i.status === 'published' &&
      (!category || i.category === category) &&
      (i.name.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  getByCategory(category: Integration['category']): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.category === category && i.status === 'published');
  }

  getPopular(limit: number): Integration[] {
    return Array.from(this.integrations.values())
      .filter(i => i.status === 'published')
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, limit);
  }

  getIntegration(integrationId: string): Integration | undefined {
    return this.integrations.get(integrationId);
  }
}

class IntegrationRatingSystem {
  private ratings: Map<string, Array<{ userId: string; score: number; review: string; createdAt: number }>> = new Map();

  rate(integrationId: string, userId: string, score: number, review: string): void {
    const existing = this.ratings.get(integrationId) || [];
    const idx = existing.findIndex(r => r.userId === userId);
    const entry = { userId, score: Math.max(1, Math.min(5, score)), review, createdAt: Date.now() };
    if (idx >= 0) existing[idx] = entry; else existing.push(entry);
    this.ratings.set(integrationId, existing);
  }

  getStats(integrationId: string): { avgScore: number; count: number; distribution: Record<number, number> } {
    const ratings = this.ratings.get(integrationId) || [];
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) distribution[r.score] = (distribution[r.score] || 0) + 1;
    const avgScore = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
    return { avgScore, count: ratings.length, distribution };
  }

  getTopRated(integrations: Integration[], limit: number): Array<Integration & { avgScore: number }> {
    return integrations
      .map(i => ({ ...i, avgScore: this.getStats(i.integrationId).avgScore }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);
  }

  getRecentReviews(integrationId: string, limit: number = 5): Array<{ score: number; review: string; createdAt: number }> {
    return (this.ratings.get(integrationId) || [])
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(({ score, review, createdAt }) => ({ score, review, createdAt }));
  }
}

class IntegrationDeploymentManager {
  private deployments: Map<string, IntegrationDeployment> = new Map();
  private counter = 0;

  deploy(integrationId: string, customerId: string, environment: 'sandbox' | 'production', config: Record<string, any> = {}): IntegrationDeployment {
    const deploymentId = `deploy-${Date.now()}-${++this.counter}`;
    const deployment: IntegrationDeployment = {
      deploymentId, integrationId, customerId, environment,
      deployedAt: Date.now(), config, status: 'active'
    };
    this.deployments.set(deploymentId, deployment);
    logger.debug('Integration deployed', { deploymentId, integrationId, customerId, environment });
    return deployment;
  }

  deactivate(deploymentId: string): boolean {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) { deployment.status = 'inactive'; return true; }
    return false;
  }

  getDeployment(deploymentId: string): IntegrationDeployment | undefined {
    return this.deployments.get(deploymentId);
  }

  getCustomerDeployments(customerId: string): IntegrationDeployment[] {
    return Array.from(this.deployments.values()).filter(d => d.customerId === customerId && d.status === 'active');
  }

  getIntegrationDeploymentCount(integrationId: string): number {
    return Array.from(this.deployments.values()).filter(d => d.integrationId === integrationId && d.status === 'active').length;
  }
}

class IntegrationHealthMonitor {
  private checks: Map<string, IntegrationHealthCheck[]> = new Map();
  private counter = 0;

  recordCheck(integrationId: string, deploymentId: string, latencyMs: number, success: boolean, errorMessage?: string): IntegrationHealthCheck {
    const checkId = `check-${Date.now()}-${++this.counter}`;
    const check: IntegrationHealthCheck = {
      checkId, integrationId, deploymentId, latencyMs, success,
      checkedAt: Date.now(), errorMessage
    };
    const existing = this.checks.get(deploymentId) || [];
    existing.push(check);
    if (existing.length > 100) existing.shift();
    this.checks.set(deploymentId, existing);
    return check;
  }

  getUptime(deploymentId: string, windowSize: number = 20): number {
    const recent = (this.checks.get(deploymentId) || []).slice(-windowSize);
    if (!recent.length) return 100;
    return (recent.filter(c => c.success).length / recent.length) * 100;
  }

  getAvgLatency(deploymentId: string, windowSize: number = 20): number {
    const recent = (this.checks.get(deploymentId) || []).slice(-windowSize).filter(c => c.success);
    if (!recent.length) return 0;
    return recent.reduce((sum, c) => sum + c.latencyMs, 0) / recent.length;
  }

  getUnhealthyDeployments(uptimeThreshold: number): string[] {
    return Array.from(this.checks.keys()).filter(deploymentId => this.getUptime(deploymentId) < uptimeThreshold);
  }

  getLastCheck(deploymentId: string): IntegrationHealthCheck | undefined {
    const checks = this.checks.get(deploymentId) || [];
    return checks[checks.length - 1];
  }
}

export const integrationCatalogManager = new IntegrationCatalogManager();
export const integrationRatingSystem = new IntegrationRatingSystem();
export const integrationDeploymentManager = new IntegrationDeploymentManager();
export const integrationHealthMonitor = new IntegrationHealthMonitor();

export { Integration, IntegrationDeployment, IntegrationHealthCheck };
