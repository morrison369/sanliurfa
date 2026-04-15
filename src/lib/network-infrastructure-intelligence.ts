/**
 * Phase 321: Network & Infrastructure Intelligence
 * Network topology, capacity planning, infrastructure health, bandwidth analytics
 */

import { logger } from './logger';

interface NetworkNodeRecord {
  nodeId: string;
  nodeName: string;
  nodeType: 'server' | 'router' | 'switch' | 'firewall' | 'load_balancer' | 'gateway' | 'endpoint';
  location: string;
  ipAddress: string;
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  cpuUsagePct: number;
  memoryUsagePct: number;
  diskUsagePct: number;
  networkInMbps: number;
  networkOutMbps: number;
  uptimePct: number;
  lastHeartbeatAt: number;
  alertCount: number;
  criticalAlertCount: number;
  healthScore: number;            // 0-100
  tags: string[];
  createdAt: number;
}

interface BandwidthRecord {
  bandwidthId: string;
  nodeId: string;
  nodeName: string;
  period: string;
  avgInboundMbps: number;
  avgOutboundMbps: number;
  peakInboundMbps: number;
  peakOutboundMbps: number;
  capacityMbps: number;
  utilizationPct: number;
  packetLossPct: number;
  latencyMs: number;
  jitterMs: number;
  errorRate: number;
  isCapacityBreached: boolean;    // utilization > 80%
  trend: 'growing' | 'stable' | 'decreasing';
  calculatedAt: number;
}

interface CapacityPlanningRecord {
  planId: string;
  resourceType: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'connections';
  currentCapacity: number;
  currentUsage: number;
  utilizationPct: number;
  projectedUsage90Days: number;
  projectedUsage180Days: number;
  daysToCapacityExhaustion: number;
  recommendedAction: 'monitor' | 'plan_expansion' | 'urgent_expansion' | 'immediate_action';
  recommendedCapacityIncrease: number;   // %
  estimatedCostUSD: number;
  priorityScore: number;
  calculatedAt: number;
}

interface InfrastructureAlertRecord {
  alertId: string;
  nodeId: string;
  nodeName: string;
  alertType: 'cpu_high' | 'memory_high' | 'disk_high' | 'network_congestion' | 'packet_loss' | 'node_down' | 'latency_spike' | 'bandwidth_exceeded';
  severity: 'critical' | 'warning' | 'info';
  metricName: string;
  currentValue: number;
  thresholdValue: number;
  message: string;
  impact: string;
  recommendedAction: string;
  isResolved: boolean;
  resolvedAt?: number;
  duration: number;               // ms since alert started
  triggeredAt: number;
}

class NetworkNodeManager {
  private nodes: Map<string, NetworkNodeRecord> = new Map();
  private counter = 0;

  register(name: string, type: NetworkNodeRecord['nodeType'], location: string, ip: string, tags: string[] = []): NetworkNodeRecord {
    const nodeId = `node-${Date.now()}-${++this.counter}`;
    const record: NetworkNodeRecord = {
      nodeId, nodeName: name, nodeType: type, location, ipAddress: ip,
      status: 'online', cpuUsagePct: 0, memoryUsagePct: 0, diskUsagePct: 0,
      networkInMbps: 0, networkOutMbps: 0, uptimePct: 100,
      lastHeartbeatAt: Date.now(), alertCount: 0, criticalAlertCount: 0,
      healthScore: 100, tags, createdAt: Date.now()
    };
    this.nodes.set(nodeId, record);
    logger.debug('Network node registered', { nodeId, name, type, location });
    return record;
  }

  updateMetrics(nodeId: string, cpu: number, memory: number, disk: number, netIn: number, netOut: number): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    node.cpuUsagePct = cpu;
    node.memoryUsagePct = memory;
    node.diskUsagePct = disk;
    node.networkInMbps = netIn;
    node.networkOutMbps = netOut;
    node.lastHeartbeatAt = Date.now();

    // Health score: penalize high resource usage
    const cpuPenalty = cpu > 90 ? 30 : cpu > 80 ? 15 : cpu > 70 ? 5 : 0;
    const memPenalty = memory > 90 ? 25 : memory > 80 ? 12 : memory > 70 ? 4 : 0;
    const diskPenalty = disk > 90 ? 20 : disk > 80 ? 10 : disk > 70 ? 3 : 0;
    node.healthScore = Math.max(0, 100 - cpuPenalty - memPenalty - diskPenalty);
    node.status = node.healthScore < 30 ? 'degraded' : node.status === 'offline' ? 'offline' : 'online';
    return true;
  }

  heartbeat(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    node.lastHeartbeatAt = Date.now();
    if (node.status === 'offline') node.status = 'online';
    return true;
  }

  getOfflineNodes(timeoutMs = 60000): NetworkNodeRecord[] {
    const cutoff = Date.now() - timeoutMs;
    return Array.from(this.nodes.values()).filter(n => n.lastHeartbeatAt < cutoff || n.status === 'offline');
  }

  getDegradedNodes(): NetworkNodeRecord[] {
    return Array.from(this.nodes.values()).filter(n => n.status === 'degraded' || n.healthScore < 60);
  }

  getAll(): NetworkNodeRecord[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): NetworkNodeRecord | undefined {
    return this.nodes.get(id);
  }
}

class BandwidthAnalyzer {
  private records: BandwidthRecord[] = [];
  private counter = 0;

  analyze(nodeId: string, nodeName: string, period: string, avgIn: number, avgOut: number, peakIn: number, peakOut: number, capacityMbps: number, packetLoss: number, latency: number, jitter: number, errorRate: number): BandwidthRecord {
    const bandwidthId = `bw-${Date.now()}-${++this.counter}`;
    const maxUsage = Math.max(avgIn, avgOut);
    const utilizationPct = capacityMbps > 0 ? Math.round((maxUsage / capacityMbps) * 100 * 10) / 10 : 0;

    const prev = this.records.filter(r => r.nodeId === nodeId).slice(-1)[0];
    const trend: BandwidthRecord['trend'] = prev
      ? (maxUsage > prev.avgInboundMbps * 1.1 ? 'growing' : maxUsage < prev.avgInboundMbps * 0.9 ? 'decreasing' : 'stable')
      : 'stable';

    const record: BandwidthRecord = {
      bandwidthId, nodeId, nodeName, period, avgInboundMbps: avgIn, avgOutboundMbps: avgOut,
      peakInboundMbps: peakIn, peakOutboundMbps: peakOut, capacityMbps, utilizationPct,
      packetLossPct: packetLoss, latencyMs: latency, jitterMs: jitter, errorRate,
      isCapacityBreached: utilizationPct > 80, trend, calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getCongestedNodes(): BandwidthRecord[] {
    return this.records.filter(r => r.isCapacityBreached);
  }

  getHighLatency(thresholdMs = 100): BandwidthRecord[] {
    return this.records.filter(r => r.latencyMs > thresholdMs);
  }
}

class CapacityPlanner {
  private plans: CapacityPlanningRecord[] = [];
  private counter = 0;

  plan(resourceType: CapacityPlanningRecord['resourceType'], currentCapacity: number, currentUsage: number, growthRateMonthlyPct: number, costPerUnitUSD: number): CapacityPlanningRecord {
    const planId = `capplan-${Date.now()}-${++this.counter}`;
    const utilizationPct = currentCapacity > 0 ? Math.round((currentUsage / currentCapacity) * 100 * 10) / 10 : 0;

    const growthFactor90 = Math.pow(1 + growthRateMonthlyPct / 100, 3);
    const growthFactor180 = Math.pow(1 + growthRateMonthlyPct / 100, 6);
    const projected90 = Math.round(currentUsage * growthFactor90);
    const projected180 = Math.round(currentUsage * growthFactor180);

    const daysToExhaustion = growthRateMonthlyPct > 0
      ? Math.round(Math.log(currentCapacity / currentUsage) / Math.log(1 + growthRateMonthlyPct / 100) * 30)
      : 9999;

    const action: CapacityPlanningRecord['recommendedAction'] =
      daysToExhaustion <= 30 ? 'immediate_action' :
      daysToExhaustion <= 60 ? 'urgent_expansion' :
      daysToExhaustion <= 90 ? 'plan_expansion' : 'monitor';

    const capacityIncrease = action === 'immediate_action' ? 100 : action === 'urgent_expansion' ? 50 : 25;
    const estimatedCost = Math.round((currentCapacity * capacityIncrease / 100) * costPerUnitUSD);
    const priorityScore = action === 'immediate_action' ? 100 : action === 'urgent_expansion' ? 75 : action === 'plan_expansion' ? 50 : 25;

    const record: CapacityPlanningRecord = {
      planId, resourceType, currentCapacity, currentUsage, utilizationPct,
      projectedUsage90Days: projected90, projectedUsage180Days: projected180,
      daysToCapacityExhaustion: daysToExhaustion, recommendedAction: action,
      recommendedCapacityIncrease: capacityIncrease, estimatedCostUSD: estimatedCost,
      priorityScore, calculatedAt: Date.now()
    };
    this.plans.push(record);
    logger.debug('Capacity plan calculated', { resourceType, utilizationPct, daysToExhaustion, action });
    return record;
  }

  getUrgentPlans(): CapacityPlanningRecord[] {
    return this.plans.filter(p => p.recommendedAction === 'urgent_expansion' || p.recommendedAction === 'immediate_action')
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  getTotalEstimatedCost(): number {
    return this.plans.reduce((s, p) => s + p.estimatedCostUSD, 0);
  }
}

class InfrastructureAlertManager {
  private alerts: InfrastructureAlertRecord[] = [];
  private counter = 0;

  trigger(nodeId: string, nodeName: string, type: InfrastructureAlertRecord['alertType'], severity: InfrastructureAlertRecord['severity'], metricName: string, currentValue: number, thresholdValue: number, impact: string, action: string): InfrastructureAlertRecord {
    const alertId = `infralert-${Date.now()}-${++this.counter}`;
    const messages: Record<string, string> = {
      cpu_high: `CPU usage at ${currentValue}% exceeds threshold ${thresholdValue}%`,
      memory_high: `Memory usage at ${currentValue}% exceeds threshold ${thresholdValue}%`,
      disk_high: `Disk usage at ${currentValue}% exceeds threshold ${thresholdValue}%`,
      network_congestion: `Network congestion: utilization ${currentValue}% of capacity`,
      packet_loss: `Packet loss rate ${currentValue}% exceeds acceptable threshold`,
      node_down: `Node ${nodeName} is unreachable`,
      latency_spike: `Latency spike: ${currentValue}ms exceeds threshold ${thresholdValue}ms`,
      bandwidth_exceeded: `Bandwidth usage ${currentValue}Mbps exceeds capacity ${thresholdValue}Mbps`
    };
    const record: InfrastructureAlertRecord = {
      alertId, nodeId, nodeName, alertType: type, severity, metricName,
      currentValue, thresholdValue, message: messages[type] || `${type} alert on ${nodeName}`,
      impact, recommendedAction: action, isResolved: false,
      duration: 0, triggeredAt: Date.now()
    };
    this.alerts.push(record);
    logger.debug('Infrastructure alert triggered', { alertId, nodeId, type, severity });
    return record;
  }

  resolve(alertId: string): boolean {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (!alert) return false;
    alert.isResolved = true;
    alert.resolvedAt = Date.now();
    alert.duration = alert.resolvedAt - alert.triggeredAt;
    return true;
  }

  getActiveAlerts(): InfrastructureAlertRecord[] {
    return this.alerts.filter(a => !a.isResolved).sort((a, b) => {
      const sev = { critical: 3, warning: 2, info: 1 };
      return sev[b.severity] - sev[a.severity];
    });
  }

  getCriticalAlerts(): InfrastructureAlertRecord[] {
    return this.alerts.filter(a => a.severity === 'critical' && !a.isResolved);
  }
}

export const networkNodeManager = new NetworkNodeManager();
export const bandwidthAnalyzer = new BandwidthAnalyzer();
export const capacityPlanner = new CapacityPlanner();
export const infrastructureAlertManager = new InfrastructureAlertManager();

export { NetworkNodeRecord, BandwidthRecord, CapacityPlanningRecord, InfrastructureAlertRecord };
