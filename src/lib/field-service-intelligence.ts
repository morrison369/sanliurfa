/**
 * Phase 274: Field Service Intelligence
 * Technician scheduling, SLA compliance, first-time-fix rates, service cost analytics
 */

import { logger } from './logger';

interface ServiceWorkOrder {
  workOrderId: string;
  customerId: string;
  serviceType: 'installation' | 'maintenance' | 'repair' | 'inspection' | 'emergency';
  priority: 'p1_emergency' | 'p2_urgent' | 'p3_standard' | 'p4_low';
  assignedTechnicianId?: string;
  scheduledAt?: number;
  dispatchedAt?: number;
  arrivedAt?: number;
  completedAt?: number;
  slaDeadline: number;
  slaStatus: 'within_sla' | 'at_risk' | 'breached';
  firstAttemptResolved: boolean;
  partsUsed: string[];
  travelTimeMin: number;
  serviceTimeMin: number;
  customerRating?: number;    // 1-5
  status: 'open' | 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: number;
}

interface TechnicianPerformanceRecord {
  recordId: string;
  technicianId: string;
  technicianName: string;
  period: string;
  workOrdersCompleted: number;
  firstTimeFixRatePct: number;    // completed on first visit
  avgServiceTimeMin: number;
  avgTravelTimeMin: number;
  customerSatisfactionScore: number;  // avg rating 0-100
  slaComplianceRatePct: number;
  utilizationRatePct: number;    // productive time / available time
  performanceScore: number;
  calculatedAt: number;
}

interface SLAPerformanceReport {
  reportId: string;
  period: string;
  serviceType: string;
  totalWorkOrders: number;
  withinSLA: number;
  atRisk: number;
  breached: number;
  slaComplianceRatePct: number;
  avgResponseTimeMin: number;
  avgResolutionTimeMin: number;
  penaltyRisk: number;    // estimated financial exposure from breaches
  generatedAt: number;
}

interface FieldServiceCostRecord {
  costId: string;
  period: string;
  laborCost: number;
  travelCost: number;
  partsCost: number;
  overheadCost: number;
  totalCost: number;
  costPerWorkOrder: number;
  costPerHour: number;
  revenueGenerated: number;
  grossMarginPct: number;
  calculatedAt: number;
}

class WorkOrderManager {
  private orders: Map<string, ServiceWorkOrder> = new Map();
  private counter = 0;

  create(customerId: string, serviceType: ServiceWorkOrder['serviceType'], priority: ServiceWorkOrder['priority']): ServiceWorkOrder {
    const slaHours = { p1_emergency: 4, p2_urgent: 24, p3_standard: 72, p4_low: 168 }[priority];
    const workOrderId = `wo-${Date.now()}-${++this.counter}`;
    const order: ServiceWorkOrder = {
      workOrderId, customerId, serviceType, priority,
      slaDeadline: Date.now() + slaHours * 3600000,
      slaStatus: 'within_sla', firstAttemptResolved: false,
      partsUsed: [], travelTimeMin: 0, serviceTimeMin: 0, status: 'open', createdAt: Date.now()
    };
    this.orders.set(workOrderId, order);
    logger.debug('Work order created', { workOrderId, serviceType, priority });
    return order;
  }

  assign(workOrderId: string, technicianId: string, scheduledAt: number): boolean {
    const order = this.orders.get(workOrderId);
    if (!order) return false;
    order.assignedTechnicianId = technicianId;
    order.scheduledAt = scheduledAt;
    order.status = 'scheduled';
    return true;
  }

  complete(workOrderId: string, travelTimeMin: number, serviceTimeMin: number, firstAttemptResolved: boolean, rating?: number): boolean {
    const order = this.orders.get(workOrderId);
    if (!order) return false;
    order.completedAt = Date.now();
    order.travelTimeMin = travelTimeMin;
    order.serviceTimeMin = serviceTimeMin;
    order.firstAttemptResolved = firstAttemptResolved;
    order.customerRating = rating;
    order.status = 'completed';
    order.slaStatus = Date.now() <= order.slaDeadline ? 'within_sla' : 'breached';
    return true;
  }

  getSLABreached(): ServiceWorkOrder[] {
    return Array.from(this.orders.values()).filter(o => o.slaStatus === 'breached');
  }

  getOpen(): ServiceWorkOrder[] {
    return Array.from(this.orders.values())
      .filter(o => o.status === 'open' || o.status === 'scheduled' || o.status === 'dispatched')
      .sort((a, b) => {
        const p = { p1_emergency: 0, p2_urgent: 1, p3_standard: 2, p4_low: 3 };
        return p[a.priority] - p[b.priority];
      });
  }

  getFirstTimeFixRate(): number {
    const completed = Array.from(this.orders.values()).filter(o => o.status === 'completed');
    if (!completed.length) return 0;
    return (completed.filter(o => o.firstAttemptResolved).length / completed.length) * 100;
  }
}

class TechnicianPerformanceTracker {
  private records: Map<string, TechnicianPerformanceRecord[]> = new Map();
  private counter = 0;

  record(technicianId: string, technicianName: string, period: string, ordersCompleted: number, firstTimeFix: number, avgServiceMin: number, avgTravelMin: number, avgRating: number, slaComplianceRate: number, utilizationRate: number): TechnicianPerformanceRecord {
    const firstTimeFixRatePct = ordersCompleted > 0 ? (firstTimeFix / ordersCompleted) * 100 : 0;
    const satisfactionScore = avgRating * 20;  // 5-scale → 100-scale
    const performanceScore =
      firstTimeFixRatePct * 0.3 +
      satisfactionScore * 0.25 +
      slaComplianceRate * 0.25 +
      utilizationRate * 0.2;

    const recordId = `techperf-${Date.now()}-${++this.counter}`;
    const record: TechnicianPerformanceRecord = {
      recordId, technicianId, technicianName, period, workOrdersCompleted: ordersCompleted,
      firstTimeFixRatePct, avgServiceTimeMin: avgServiceMin, avgTravelTimeMin: avgTravelMin,
      customerSatisfactionScore: satisfactionScore, slaComplianceRatePct: slaComplianceRate,
      utilizationRatePct: utilizationRate, performanceScore: Math.max(0, Math.min(100, performanceScore)),
      calculatedAt: Date.now()
    };
    const history = this.records.get(technicianId) || [];
    history.push(record);
    this.records.set(technicianId, history);
    return record;
  }

  getTopTechnicians(limit = 5): TechnicianPerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is TechnicianPerformanceRecord => !!r)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  getLatest(technicianId: string): TechnicianPerformanceRecord | undefined {
    const history = this.records.get(technicianId) || [];
    return history[history.length - 1];
  }
}

class SLAPerformanceAnalyzer {
  private reports: SLAPerformanceReport[] = [];
  private counter = 0;

  generate(period: string, serviceType: string, orders: ServiceWorkOrder[], penaltyPerBreach: number): SLAPerformanceReport {
    const total = orders.length;
    const within = orders.filter(o => o.slaStatus === 'within_sla').length;
    const atRisk = orders.filter(o => o.slaStatus === 'at_risk').length;
    const breached = orders.filter(o => o.slaStatus === 'breached').length;
    const completed = orders.filter(o => o.status === 'completed');
    const avgResponse = completed.length > 0
      ? completed.reduce((s, o) => s + (o.travelTimeMin || 0), 0) / completed.length : 0;
    const avgResolution = completed.length > 0
      ? completed.reduce((s, o) => s + (o.serviceTimeMin || 0) + (o.travelTimeMin || 0), 0) / completed.length : 0;

    const reportId = `slarep-${Date.now()}-${++this.counter}`;
    const report: SLAPerformanceReport = {
      reportId, period, serviceType, totalWorkOrders: total, withinSLA: within, atRisk, breached,
      slaComplianceRatePct: total > 0 ? (within / total) * 100 : 0,
      avgResponseTimeMin: avgResponse, avgResolutionTimeMin: avgResolution,
      penaltyRisk: breached * penaltyPerBreach, generatedAt: Date.now()
    };
    this.reports.push(report);
    return report;
  }

  getLatest(): SLAPerformanceReport | undefined {
    return this.reports[this.reports.length - 1];
  }
}

class FieldServiceCostTracker {
  private costs: FieldServiceCostRecord[] = [];
  private counter = 0;

  record(period: string, laborCost: number, travelCost: number, partsCost: number, overheadCost: number, workOrderCount: number, totalHours: number, revenueGenerated: number): FieldServiceCostRecord {
    const totalCost = laborCost + travelCost + partsCost + overheadCost;
    const costPerWorkOrder = workOrderCount > 0 ? totalCost / workOrderCount : 0;
    const costPerHour = totalHours > 0 ? totalCost / totalHours : 0;
    const grossMarginPct = revenueGenerated > 0 ? ((revenueGenerated - totalCost) / revenueGenerated) * 100 : 0;

    const costId = `fscost-${Date.now()}-${++this.counter}`;
    const record: FieldServiceCostRecord = {
      costId, period, laborCost, travelCost, partsCost, overheadCost, totalCost,
      costPerWorkOrder, costPerHour, revenueGenerated, grossMarginPct, calculatedAt: Date.now()
    };
    this.costs.push(record);
    return record;
  }

  getLatest(): FieldServiceCostRecord | undefined {
    return this.costs[this.costs.length - 1];
  }

  getAvgGrossMargin(): number {
    if (!this.costs.length) return 0;
    return this.costs.reduce((s, c) => s + c.grossMarginPct, 0) / this.costs.length;
  }
}

export const workOrderManager = new WorkOrderManager();
export const technicianPerformanceTracker = new TechnicianPerformanceTracker();
export const slaPerformanceAnalyzer = new SLAPerformanceAnalyzer();
export const fieldServiceCostTracker = new FieldServiceCostTracker();

export { ServiceWorkOrder, TechnicianPerformanceRecord, SLAPerformanceReport, FieldServiceCostRecord };
