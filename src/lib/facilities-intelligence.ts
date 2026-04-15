/**
 * Phase 270: Real Estate & Facilities Intelligence
 * Space utilization, lease management, facilities cost, workplace optimization
 */

import { logger } from './logger';

interface SpaceUtilizationRecord {
  recordId: string;
  locationId: string;
  locationName: string;
  spaceType: 'office' | 'meeting_room' | 'collaboration' | 'desk' | 'lab' | 'storage';
  totalCapacity: number;
  averageOccupancyPct: number;
  peakOccupancyPct: number;
  bookingUtilizationPct: number;
  costPerSqFt: number;
  totalSqFt: number;
  monthlyCost: number;
  costPerHeadPerDay: number;
  period: string;
  recordedAt: number;
}

interface LeaseRecord {
  leaseId: string;
  propertyName: string;
  address: string;
  leasedSqFt: number;
  monthlyRent: number;
  annualRent: number;
  leaseStartDate: number;
  leaseEndDate: number;
  breakClauseDate?: number;
  escalationRatePct: number;   // annual rent increase
  landlordName: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'negotiating';
  daysUntilExpiry: number;
  createdAt: number;
}

interface FacilitiesCostRecord {
  costId: string;
  locationId: string;
  period: string;
  rentCost: number;
  utilitiesCost: number;
  maintenanceCost: number;
  securityCost: number;
  cleaningCost: number;
  totalCost: number;
  costPerEmployee: number;
  benchmarkCostPerEmployee: number;
  varianceVsBenchmarkPct: number;
  recordedAt: number;
}

interface WorkplaceOptimizationRecommendation {
  recommendationId: string;
  locationId: string;
  locationName: string;
  recommendationType: 'consolidate' | 'downsize' | 'hotdesking' | 'sublease' | 'renovate' | 'relocate';
  rationale: string;
  estimatedAnnualSavings: number;
  implementationCost: number;
  paybackMonths: number;
  affectedHeadcount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'proposed' | 'approved' | 'implementing' | 'completed';
  createdAt: number;
}

class SpaceUtilizationTracker {
  private records: Map<string, SpaceUtilizationRecord[]> = new Map();
  private counter = 0;

  record(locationId: string, locationName: string, spaceType: SpaceUtilizationRecord['spaceType'], totalCapacity: number, avgOccupancyPct: number, peakOccupancyPct: number, bookingPct: number, costPerSqFt: number, totalSqFt: number, period: string): SpaceUtilizationRecord {
    const monthlyCost = costPerSqFt * totalSqFt;
    const workdaysPerMonth = 22;
    const dailyOccupancy = Math.round(totalCapacity * avgOccupancyPct / 100);
    const costPerHeadPerDay = dailyOccupancy > 0 ? monthlyCost / (dailyOccupancy * workdaysPerMonth) : 0;

    const recordId = `spaceutilization-${Date.now()}-${++this.counter}`;
    const record: SpaceUtilizationRecord = {
      recordId, locationId, locationName, spaceType, totalCapacity, averageOccupancyPct: avgOccupancyPct,
      peakOccupancyPct, bookingUtilizationPct: bookingPct, costPerSqFt, totalSqFt, monthlyCost,
      costPerHeadPerDay, period, recordedAt: Date.now()
    };
    const history = this.records.get(locationId) || [];
    history.push(record);
    this.records.set(locationId, history);
    logger.debug('Space utilization recorded', { locationId, avgOccupancyPct, costPerHeadPerDay });
    return record;
  }

  getUnderutilized(threshold = 30): SpaceUtilizationRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is SpaceUtilizationRecord => !!r && r.averageOccupancyPct < threshold)
      .sort((a, b) => a.averageOccupancyPct - b.averageOccupancyPct);
  }

  getTotalMonthlyCost(): number {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is SpaceUtilizationRecord => !!r)
      .reduce((s, r) => s + r.monthlyCost, 0);
  }

  getLatest(locationId: string): SpaceUtilizationRecord | undefined {
    const history = this.records.get(locationId) || [];
    return history[history.length - 1];
  }
}

class LeaseManager {
  private leases: Map<string, LeaseRecord> = new Map();
  private counter = 0;

  add(propertyName: string, address: string, leasedSqFt: number, monthlyRent: number, leaseStartDate: number, leaseEndDate: number, escalationRatePct: number, landlordName: string, breakClauseDate?: number): LeaseRecord {
    const leaseId = `lease-${Date.now()}-${++this.counter}`;
    const daysUntilExpiry = Math.round((leaseEndDate - Date.now()) / 86400000);
    const status: LeaseRecord['status'] = daysUntilExpiry <= 0 ? 'expired' : daysUntilExpiry <= 180 ? 'expiring_soon' : 'active';
    const lease: LeaseRecord = {
      leaseId, propertyName, address, leasedSqFt, monthlyRent, annualRent: monthlyRent * 12,
      leaseStartDate, leaseEndDate, breakClauseDate, escalationRatePct, landlordName,
      status, daysUntilExpiry, createdAt: Date.now()
    };
    this.leases.set(leaseId, lease);
    return lease;
  }

  getExpiringSoon(days = 180): LeaseRecord[] {
    return Array.from(this.leases.values())
      .filter(l => l.daysUntilExpiry > 0 && l.daysUntilExpiry <= days)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  getTotalAnnualRent(): number {
    return Array.from(this.leases.values())
      .filter(l => l.status === 'active' || l.status === 'expiring_soon')
      .reduce((s, l) => s + l.annualRent, 0);
  }

  getLease(leaseId: string): LeaseRecord | undefined {
    return this.leases.get(leaseId);
  }
}

class FacilitiesCostAnalyzer {
  private costs: Map<string, FacilitiesCostRecord[]> = new Map();
  private counter = 0;

  record(locationId: string, period: string, rent: number, utilities: number, maintenance: number, security: number, cleaning: number, employeeCount: number, benchmarkPerEmployee: number): FacilitiesCostRecord {
    const totalCost = rent + utilities + maintenance + security + cleaning;
    const costPerEmployee = employeeCount > 0 ? totalCost / employeeCount : 0;
    const varianceVsBenchmarkPct = benchmarkPerEmployee > 0 ? ((costPerEmployee - benchmarkPerEmployee) / benchmarkPerEmployee) * 100 : 0;

    const costId = `facilitycost-${Date.now()}-${++this.counter}`;
    const record: FacilitiesCostRecord = {
      costId, locationId, period, rentCost: rent, utilitiesCost: utilities, maintenanceCost: maintenance,
      securityCost: security, cleaningCost: cleaning, totalCost, costPerEmployee,
      benchmarkCostPerEmployee: benchmarkPerEmployee, varianceVsBenchmarkPct, recordedAt: Date.now()
    };
    const history = this.costs.get(locationId) || [];
    history.push(record);
    this.costs.set(locationId, history);
    return record;
  }

  getOverBenchmark(threshold = 10): FacilitiesCostRecord[] {
    return Array.from(this.costs.values())
      .map(h => h[h.length - 1])
      .filter((r): r is FacilitiesCostRecord => !!r && r.varianceVsBenchmarkPct > threshold)
      .sort((a, b) => b.varianceVsBenchmarkPct - a.varianceVsBenchmarkPct);
  }

  getLatest(locationId: string): FacilitiesCostRecord | undefined {
    const history = this.costs.get(locationId) || [];
    return history[history.length - 1];
  }
}

class WorkplaceOptimizationAdvisor {
  private recommendations: Map<string, WorkplaceOptimizationRecommendation> = new Map();
  private counter = 0;

  recommend(locationId: string, locationName: string, type: WorkplaceOptimizationRecommendation['recommendationType'], rationale: string, annualSavings: number, implementationCost: number, affectedHeadcount: number): WorkplaceOptimizationRecommendation {
    const paybackMonths = annualSavings > 0 ? Math.round((implementationCost / annualSavings) * 12) : 999;
    const priority: WorkplaceOptimizationRecommendation['priority'] =
      annualSavings > 500000 ? 'critical' : annualSavings > 100000 ? 'high' :
      annualSavings > 25000 ? 'medium' : 'low';

    const recommendationId = `workplacerec-${Date.now()}-${++this.counter}`;
    const rec: WorkplaceOptimizationRecommendation = {
      recommendationId, locationId, locationName, recommendationType: type, rationale,
      estimatedAnnualSavings: annualSavings, implementationCost, paybackMonths, affectedHeadcount,
      priority, status: 'proposed', createdAt: Date.now()
    };
    this.recommendations.set(recommendationId, rec);
    return rec;
  }

  getTotalPotentialSavings(): number {
    return Array.from(this.recommendations.values())
      .filter(r => r.status === 'proposed' || r.status === 'approved')
      .reduce((s, r) => s + r.estimatedAnnualSavings, 0);
  }

  getQuickWins(): WorkplaceOptimizationRecommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.paybackMonths <= 12 && r.status === 'proposed')
      .sort((a, b) => a.paybackMonths - b.paybackMonths);
  }
}

export const spaceUtilizationTracker = new SpaceUtilizationTracker();
export const leaseManager = new LeaseManager();
export const facilitiesCostAnalyzer = new FacilitiesCostAnalyzer();
export const workplaceOptimizationAdvisor = new WorkplaceOptimizationAdvisor();

export { SpaceUtilizationRecord, LeaseRecord, FacilitiesCostRecord, WorkplaceOptimizationRecommendation };
