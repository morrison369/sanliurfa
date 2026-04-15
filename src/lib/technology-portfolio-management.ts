/**
 * Phase 245: Technology Portfolio Management
 * Tech asset inventory, lifecycle tracking, vendor dependency, technology roadmap
 */

import { logger } from './logger';

interface TechAsset {
  assetId: string;
  name: string;
  category: 'platform' | 'tool' | 'library' | 'infrastructure' | 'saas' | 'custom';
  vendor: string;
  version: string;
  licenseType: 'open_source' | 'commercial' | 'proprietary' | 'freemium';
  annualCost: number;
  usageCount: number;   // teams/services using it
  lifecycleStage: 'emerging' | 'growth' | 'mature' | 'declining' | 'end_of_life';
  strategicValue: 'critical' | 'important' | 'useful' | 'legacy';
  addedAt: number;
}

interface TechLifecycleEvent {
  eventId: string;
  assetId: string;
  eventType: 'adopted' | 'upgraded' | 'deprecated' | 'retired' | 'replaced' | 'evaluated';
  fromVersion?: string;
  toVersion?: string;
  notes: string;
  occurredAt: number;
}

interface VendorDependency {
  dependencyId: string;
  vendorName: string;
  assetIds: string[];
  totalSpend: number;
  contractExpiryDate: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  alternatives: string[];
  singleSourceRisk: boolean;
  createdAt: number;
}

interface TechRoadmapItem {
  roadmapId: string;
  title: string;
  type: 'adopt' | 'trial' | 'assess' | 'hold' | 'retire';
  technology: string;
  rationale: string;
  quarter: string;
  effort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: number;
}

class TechAssetInventory {
  private assets: Map<string, TechAsset> = new Map();
  private counter = 0;

  add(name: string, category: TechAsset['category'], vendor: string, version: string, licenseType: TechAsset['licenseType'], annualCost: number, usageCount: number, strategicValue: TechAsset['strategicValue']): TechAsset {
    const assetId = `techasset-${Date.now()}-${++this.counter}`;
    const lifecycleStage: TechAsset['lifecycleStage'] =
      strategicValue === 'critical' ? 'growth' :
      strategicValue === 'legacy' ? 'declining' : 'mature';
    const asset: TechAsset = {
      assetId, name, category, vendor, version, licenseType,
      annualCost, usageCount, lifecycleStage, strategicValue, addedAt: Date.now()
    };
    this.assets.set(assetId, asset);
    logger.debug('Tech asset added', { assetId, name, category, strategicValue });
    return asset;
  }

  updateLifecycle(assetId: string, stage: TechAsset['lifecycleStage']): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.lifecycleStage = stage;
    return true;
  }

  getByCategory(category: TechAsset['category']): TechAsset[] {
    return Array.from(this.assets.values()).filter(a => a.category === category);
  }

  getEndOfLife(): TechAsset[] {
    return Array.from(this.assets.values()).filter(a => a.lifecycleStage === 'end_of_life' || a.lifecycleStage === 'declining');
  }

  getTotalAnnualCost(): number {
    return Array.from(this.assets.values()).reduce((s, a) => s + a.annualCost, 0);
  }

  getAsset(assetId: string): TechAsset | undefined {
    return this.assets.get(assetId);
  }

  getAllAssets(): TechAsset[] {
    return Array.from(this.assets.values());
  }
}

class TechLifecycleTracker {
  private events: Map<string, TechLifecycleEvent[]> = new Map();
  private counter = 0;

  record(assetId: string, eventType: TechLifecycleEvent['eventType'], notes: string, fromVersion?: string, toVersion?: string): TechLifecycleEvent {
    const eventId = `techevt-${Date.now()}-${++this.counter}`;
    const event: TechLifecycleEvent = {
      eventId, assetId, eventType, fromVersion, toVersion, notes, occurredAt: Date.now()
    };
    const existing = this.events.get(assetId) || [];
    existing.push(event);
    this.events.set(assetId, existing);
    return event;
  }

  getAssetHistory(assetId: string): TechLifecycleEvent[] {
    return (this.events.get(assetId) || []).sort((a, b) => a.occurredAt - b.occurredAt);
  }

  getRecentEvents(days = 30): TechLifecycleEvent[] {
    const since = Date.now() - days * 86400 * 1000;
    return Array.from(this.events.values()).flat().filter(e => e.occurredAt >= since);
  }

  getDeprecationEvents(): TechLifecycleEvent[] {
    return Array.from(this.events.values()).flat().filter(e => e.eventType === 'deprecated' || e.eventType === 'retired');
  }
}

class VendorDependencyAnalyzer {
  private dependencies: Map<string, VendorDependency> = new Map();
  private counter = 0;

  analyze(vendorName: string, assetIds: string[], totalSpend: number, contractExpiry: number, alternatives: string[]): VendorDependency {
    const singleSourceRisk = alternatives.length === 0;
    const riskLevel: VendorDependency['riskLevel'] =
      singleSourceRisk && totalSpend > 100000 ? 'critical' :
      singleSourceRisk ? 'high' :
      totalSpend > 50000 ? 'medium' : 'low';
    const dependencyId = `vendordep-${Date.now()}-${++this.counter}`;
    const dep: VendorDependency = {
      dependencyId, vendorName, assetIds, totalSpend, contractExpiryDate: contractExpiry,
      riskLevel, alternatives, singleSourceRisk, createdAt: Date.now()
    };
    this.dependencies.set(vendorName, dep);
    logger.debug('Vendor dependency analyzed', { vendorName, riskLevel, singleSourceRisk });
    return dep;
  }

  getCriticalDependencies(): VendorDependency[] {
    return Array.from(this.dependencies.values())
      .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }

  getExpiringContracts(days = 90): VendorDependency[] {
    const horizon = Date.now() + days * 86400 * 1000;
    return Array.from(this.dependencies.values()).filter(d => d.contractExpiryDate <= horizon);
  }

  getDependency(vendorName: string): VendorDependency | undefined {
    return this.dependencies.get(vendorName);
  }
}

class TechRoadmapManager {
  private items: Map<string, TechRoadmapItem> = new Map();
  private counter = 0;

  add(title: string, type: TechRoadmapItem['type'], technology: string, rationale: string, quarter: string, effort: TechRoadmapItem['effort'], expectedBenefit: string): TechRoadmapItem {
    const roadmapId = `roadmap-${Date.now()}-${++this.counter}`;
    const item: TechRoadmapItem = {
      roadmapId, title, type, technology, rationale, quarter, effort,
      expectedBenefit, status: 'planned', createdAt: Date.now()
    };
    this.items.set(roadmapId, item);
    return item;
  }

  updateStatus(roadmapId: string, status: TechRoadmapItem['status']): boolean {
    const item = this.items.get(roadmapId);
    if (!item) return false;
    item.status = status;
    return true;
  }

  getByQuarter(quarter: string): TechRoadmapItem[] {
    return Array.from(this.items.values()).filter(i => i.quarter === quarter);
  }

  getByType(type: TechRoadmapItem['type']): TechRoadmapItem[] {
    return Array.from(this.items.values()).filter(i => i.type === type);
  }

  getItem(roadmapId: string): TechRoadmapItem | undefined {
    return this.items.get(roadmapId);
  }
}

export const techAssetInventory = new TechAssetInventory();
export const techLifecycleTracker = new TechLifecycleTracker();
export const vendorDependencyAnalyzer = new VendorDependencyAnalyzer();
export const techRoadmapManager = new TechRoadmapManager();

export { TechAsset, TechLifecycleEvent, VendorDependency, TechRoadmapItem };
