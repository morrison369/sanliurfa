/**
 * Phase 300: Asset Lifecycle Intelligence
 * Asset tracking, depreciation, maintenance scheduling, disposal management
 */

import { logger } from './logger';

interface AssetRecord {
  assetId: string;
  assetTag: string;
  name: string;
  category: 'hardware' | 'software' | 'vehicle' | 'machinery' | 'furniture' | 'real_estate' | 'other';
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  department: string;
  assignedTo?: string;
  purchaseDate: number;
  purchaseCostUSD: number;
  currentValueUSD: number;
  salvageValueUSD: number;
  usefulLifeYears: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'units_of_production';
  annualDepreciationUSD: number;
  accumulatedDepreciationUSD: number;
  warrantyExpiryDate?: number;
  status: 'active' | 'maintenance' | 'retired' | 'disposed' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  nextMaintenanceDate?: number;
  createdAt: number;
}

interface MaintenanceRecord {
  maintenanceId: string;
  assetId: string;
  maintenanceType: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  scheduledDate: number;
  completedDate?: number;
  technician: string;
  description: string;
  costUSD: number;
  downtimeHours: number;
  partsReplaced: string[];
  nextMaintenanceDue?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface DepreciationRecord {
  recordId: string;
  assetId: string;
  period: string;
  openingValueUSD: number;
  depreciationChargeUSD: number;
  closingValueUSD: number;
  accumulatedDepreciationUSD: number;
  bookValuePct: number;           // book value as % of purchase cost
  calculatedAt: number;
}

interface AssetDisposalRecord {
  disposalId: string;
  assetId: string;
  disposalMethod: 'sale' | 'scrap' | 'donation' | 'write_off' | 'trade_in';
  disposalDate: number;
  saleValueUSD: number;
  bookValueAtDisposalUSD: number;
  gainLossUSD: number;
  approvedBy: string;
  notes: string;
}

class AssetTracker {
  private assets: Map<string, AssetRecord> = new Map();
  private counter = 0;
  private tagCounter = 1000;

  register(name: string, category: AssetRecord['category'], manufacturer: string, model: string, serial: string, location: string, dept: string, purchaseDate: number, cost: number, salvage: number, usefulLife: number, method: AssetRecord['depreciationMethod']): AssetRecord {
    const assetId = `asset-${Date.now()}-${++this.counter}`;
    const assetTag = `AST-${++this.tagCounter}`;
    const annualDepr = method === 'straight_line'
      ? (cost - salvage) / usefulLife
      : (cost - salvage) * (2 / usefulLife);   // 200% declining balance approx

    const yearsOwned = (Date.now() - purchaseDate) / (365.25 * 86400000);
    const accumulated = Math.min(cost - salvage, annualDepr * yearsOwned);
    const currentValue = Math.max(salvage, cost - accumulated);

    const record: AssetRecord = {
      assetId, assetTag, name, category, manufacturer, model, serialNumber: serial,
      location, department: dept, purchaseDate, purchaseCostUSD: cost, currentValueUSD: currentValue,
      salvageValueUSD: salvage, usefulLifeYears: usefulLife, depreciationMethod: method,
      annualDepreciationUSD: Math.round(annualDepr), accumulatedDepreciationUSD: Math.round(accumulated),
      status: 'active', condition: 'good', createdAt: Date.now()
    };
    this.assets.set(assetId, record);
    logger.debug('Asset registered', { assetId, assetTag, name, category });
    return record;
  }

  updateCondition(assetId: string, condition: AssetRecord['condition'], status?: AssetRecord['status']): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    asset.condition = condition;
    if (status) asset.status = status;
    return true;
  }

  getByCategory(category: AssetRecord['category']): AssetRecord[] {
    return Array.from(this.assets.values()).filter(a => a.category === category);
  }

  getWarrantyExpiringSoon(daysAhead = 90): AssetRecord[] {
    const cutoff = Date.now() + daysAhead * 86400000;
    return Array.from(this.assets.values())
      .filter(a => a.warrantyExpiryDate && a.warrantyExpiryDate <= cutoff && a.warrantyExpiryDate > Date.now());
  }

  getTotalAssetValue(): number {
    return Array.from(this.assets.values())
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + a.currentValueUSD, 0);
  }

  getAsset(id: string): AssetRecord | undefined {
    return this.assets.get(id);
  }
}

class MaintenanceScheduler {
  private records: MaintenanceRecord[] = [];
  private counter = 0;

  schedule(assetId: string, type: MaintenanceRecord['maintenanceType'], scheduledDate: number, technician: string, description: string, estimatedCost: number): MaintenanceRecord {
    const maintenanceId = `maint-${Date.now()}-${++this.counter}`;
    const record: MaintenanceRecord = {
      maintenanceId, assetId, maintenanceType: type, scheduledDate,
      technician, description, costUSD: estimatedCost, downtimeHours: 0,
      partsReplaced: [], status: 'scheduled'
    };
    this.records.push(record);
    return record;
  }

  complete(maintenanceId: string, downtimeHours: number, actualCost: number, parts: string[], nextDue?: number): boolean {
    const record = this.records.find(r => r.maintenanceId === maintenanceId);
    if (!record) return false;
    record.completedDate = Date.now();
    record.downtimeHours = downtimeHours;
    record.costUSD = actualCost;
    record.partsReplaced = parts;
    record.nextMaintenanceDue = nextDue;
    record.status = 'completed';
    return true;
  }

  getUpcoming(daysAhead = 30): MaintenanceRecord[] {
    const cutoff = Date.now() + daysAhead * 86400000;
    return this.records
      .filter(r => r.status === 'scheduled' && r.scheduledDate <= cutoff)
      .sort((a, b) => a.scheduledDate - b.scheduledDate);
  }

  getTotalMaintenanceCost(): number {
    return this.records.filter(r => r.status === 'completed').reduce((s, r) => s + r.costUSD, 0);
  }

  getAvgDowntime(): number {
    const completed = this.records.filter(r => r.status === 'completed');
    if (!completed.length) return 0;
    return completed.reduce((s, r) => s + r.downtimeHours, 0) / completed.length;
  }
}

class DepreciationEngine {
  private records: DepreciationRecord[] = [];
  private counter = 0;

  calculate(assetId: string, period: string, openingValue: number, purchaseCost: number, annualDepr: number, accumulated: number): DepreciationRecord {
    const charge = Math.min(annualDepr / 4, openingValue);   // quarterly charge
    const closing = Math.max(0, openingValue - charge);
    const newAccumulated = accumulated + charge;

    const recordId = `depr-${Date.now()}-${++this.counter}`;
    const record: DepreciationRecord = {
      recordId, assetId, period, openingValueUSD: openingValue,
      depreciationChargeUSD: Math.round(charge), closingValueUSD: Math.round(closing),
      accumulatedDepreciationUSD: Math.round(newAccumulated),
      bookValuePct: purchaseCost > 0 ? Math.round((closing / purchaseCost) * 100) : 0,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTotalDepreciationCharge(period: string): number {
    return this.records.filter(r => r.period === period).reduce((s, r) => s + r.depreciationChargeUSD, 0);
  }

  getByAsset(assetId: string): DepreciationRecord[] {
    return this.records.filter(r => r.assetId === assetId);
  }
}

class AssetDisposalManager {
  private disposals: AssetDisposalRecord[] = [];
  private counter = 0;

  dispose(assetId: string, method: AssetDisposalRecord['disposalMethod'], saleValue: number, bookValue: number, approvedBy: string, notes: string): AssetDisposalRecord {
    const disposalId = `disposal-${Date.now()}-${++this.counter}`;
    const record: AssetDisposalRecord = {
      disposalId, assetId, disposalMethod: method, disposalDate: Date.now(),
      saleValueUSD: saleValue, bookValueAtDisposalUSD: bookValue,
      gainLossUSD: saleValue - bookValue, approvedBy, notes
    };
    this.disposals.push(record);
    logger.debug('Asset disposed', { disposalId, assetId, method, gainLoss: record.gainLossUSD });
    return record;
  }

  getTotalGainLoss(): number {
    return this.disposals.reduce((s, d) => s + d.gainLossUSD, 0);
  }

  getDisposalsByMethod(method: AssetDisposalRecord['disposalMethod']): AssetDisposalRecord[] {
    return this.disposals.filter(d => d.disposalMethod === method);
  }

  getTotalDisposalProceeds(): number {
    return this.disposals.reduce((s, d) => s + d.saleValueUSD, 0);
  }
}

export const assetTracker = new AssetTracker();
export const maintenanceScheduler = new MaintenanceScheduler();
export const depreciationEngine = new DepreciationEngine();
export const assetDisposalManager = new AssetDisposalManager();

export { AssetRecord, MaintenanceRecord, DepreciationRecord, AssetDisposalRecord };
