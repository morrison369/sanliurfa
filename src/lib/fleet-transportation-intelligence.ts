/**
 * Phase 311: Fleet & Transportation Intelligence
 * Route optimization, driver performance, vehicle utilization, fuel analytics
 */

import { logger } from './logger';

interface VehicleRecord {
  vehicleId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  vehicleType: 'truck' | 'van' | 'car' | 'motorcycle' | 'heavy_equipment';
  fuelType: 'diesel' | 'petrol' | 'electric' | 'hybrid' | 'lpg';
  capacityKg: number;
  assignedDriverId?: string;
  currentOdometerKm: number;
  lastServiceOdometerKm: number;
  nextServiceDueKm: number;
  status: 'active' | 'maintenance' | 'idle' | 'retired';
  utilizationPct: number;
  avgFuelConsumptionLper100km: number;
  totalFuelCostUSD: number;
  totalMaintenanceCostUSD: number;
  costPerKmUSD: number;
  createdAt: number;
}

interface DriverPerformanceRecord {
  recordId: string;
  driverId: string;
  driverName: string;
  period: string;
  totalKmDriven: number;
  totalDeliveries: number;
  onTimeDeliveryRatePct: number;
  avgSpeedKmh: number;
  harshBrakingCount: number;
  harshAccelerationCount: number;
  speedingIncidents: number;
  idleTimeHours: number;
  fuelConsumptionLper100km: number;
  safetyScore: number;            // 0-100
  efficiencyScore: number;        // 0-100
  overallScore: number;           // weighted composite
  recordedAt: number;
}

interface RouteRecord {
  routeId: string;
  routeName: string;
  originCity: string;
  destinationCity: string;
  plannedDistanceKm: number;
  actualDistanceKm: number;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  vehicleId: string;
  driverId: string;
  stopsCount: number;
  deliveriesCompleted: number;
  fuelUsedLiters: number;
  fuelCostUSD: number;
  onTimeCompletionPct: number;
  deviationPct: number;            // (actual - planned) / planned × 100
  completedAt?: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: number;
}

interface FleetCostRecord {
  recordId: string;
  period: string;
  totalVehicles: number;
  totalKmDriven: number;
  totalFuelCostUSD: number;
  totalMaintenanceCostUSD: number;
  totalDriverCostUSD: number;
  totalInsuranceCostUSD: number;
  totalFleetCostUSD: number;
  costPerKmUSD: number;
  costPerDeliveryUSD: number;
  fleetUtilizationPct: number;
  fuelEfficiencyLper100km: number;
  calculatedAt: number;
}

class VehicleManager {
  private vehicles: Map<string, VehicleRecord> = new Map();
  private counter = 0;

  register(plate: string, make: string, model: string, year: number, type: VehicleRecord['vehicleType'], fuel: VehicleRecord['fuelType'], capacityKg: number, currentOdometer: number): VehicleRecord {
    const vehicleId = `veh-${Date.now()}-${++this.counter}`;
    const record: VehicleRecord = {
      vehicleId, licensePlate: plate, make, model, year, vehicleType: type,
      fuelType: fuel, capacityKg, currentOdometerKm: currentOdometer,
      lastServiceOdometerKm: currentOdometer, nextServiceDueKm: currentOdometer + 10000,
      status: 'active', utilizationPct: 0, avgFuelConsumptionLper100km: 0,
      totalFuelCostUSD: 0, totalMaintenanceCostUSD: 0, costPerKmUSD: 0,
      createdAt: Date.now()
    };
    this.vehicles.set(vehicleId, record);
    logger.debug('Vehicle registered', { vehicleId, plate, type });
    return record;
  }

  updateUsage(vehicleId: string, newOdometer: number, fuelCost: number, utilizationPct: number, avgConsumption: number): boolean {
    const v = this.vehicles.get(vehicleId);
    if (!v) return false;
    const kmDriven = newOdometer - v.currentOdometerKm;
    v.currentOdometerKm = newOdometer;
    v.totalFuelCostUSD += fuelCost;
    v.utilizationPct = utilizationPct;
    v.avgFuelConsumptionLper100km = avgConsumption;
    v.costPerKmUSD = kmDriven > 0 ? Math.round(((v.totalFuelCostUSD + v.totalMaintenanceCostUSD) / v.currentOdometerKm) * 100) / 100 : 0;
    if (v.currentOdometerKm >= v.nextServiceDueKm) v.status = 'maintenance';
    return true;
  }

  getDueForService(): VehicleRecord[] {
    return Array.from(this.vehicles.values())
      .filter(v => v.currentOdometerKm >= v.nextServiceDueKm - 500);
  }

  getIdleVehicles(): VehicleRecord[] {
    return Array.from(this.vehicles.values()).filter(v => v.status === 'idle' || v.utilizationPct < 30);
  }

  getTotalFleetValue(): number {
    return Array.from(this.vehicles.values()).reduce((s, v) => s + v.totalFuelCostUSD + v.totalMaintenanceCostUSD, 0);
  }

  getVehicle(id: string): VehicleRecord | undefined {
    return this.vehicles.get(id);
  }

  getAll(): VehicleRecord[] {
    return Array.from(this.vehicles.values());
  }
}

class DriverPerformanceTracker {
  private records: DriverPerformanceRecord[] = [];
  private counter = 0;

  record(driverId: string, name: string, period: string, km: number, deliveries: number, onTimeRate: number, avgSpeed: number, harshBraking: number, harshAcceleration: number, speeding: number, idleHours: number, fuelConsumption: number): DriverPerformanceRecord {
    const safetyScore = Math.max(0, 100 - harshBraking * 2 - harshAcceleration * 1.5 - speeding * 3);
    const efficiencyScore = Math.max(0, 100 - Math.max(0, fuelConsumption - 8) * 5 - idleHours * 2 + onTimeRate * 0.3);
    const overallScore = safetyScore * 0.5 + Math.min(100, efficiencyScore) * 0.3 + onTimeRate * 0.2;

    const recordId = `drvperf-${Date.now()}-${++this.counter}`;
    const rec: DriverPerformanceRecord = {
      recordId, driverId, driverName: name, period, totalKmDriven: km,
      totalDeliveries: deliveries, onTimeDeliveryRatePct: onTimeRate, avgSpeedKmh: avgSpeed,
      harshBrakingCount: harshBraking, harshAccelerationCount: harshAcceleration,
      speedingIncidents: speeding, idleTimeHours: idleHours,
      fuelConsumptionLper100km: fuelConsumption,
      safetyScore: Math.round(Math.max(0, Math.min(100, safetyScore)) * 10) / 10,
      efficiencyScore: Math.round(Math.max(0, Math.min(100, efficiencyScore)) * 10) / 10,
      overallScore: Math.round(Math.max(0, Math.min(100, overallScore)) * 10) / 10,
      recordedAt: Date.now()
    };
    this.records.push(rec);
    logger.debug('Driver performance recorded', { driverId, overallScore: rec.overallScore });
    return rec;
  }

  getTopDrivers(period: string, limit = 5): DriverPerformanceRecord[] {
    return this.records.filter(r => r.period === period)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  getHighRiskDrivers(safetyThreshold = 60): DriverPerformanceRecord[] {
    return this.records.filter(r => r.safetyScore < safetyThreshold);
  }
}

class RouteOptimizer {
  private routes: RouteRecord[] = [];
  private counter = 0;

  plan(name: string, origin: string, dest: string, plannedKm: number, plannedMinutes: number, vehicleId: string, driverId: string, stops: number): RouteRecord {
    const routeId = `route-${Date.now()}-${++this.counter}`;
    const record: RouteRecord = {
      routeId, routeName: name, originCity: origin, destinationCity: dest,
      plannedDistanceKm: plannedKm, actualDistanceKm: 0,
      plannedDurationMinutes: plannedMinutes, actualDurationMinutes: 0,
      vehicleId, driverId, stopsCount: stops, deliveriesCompleted: 0,
      fuelUsedLiters: 0, fuelCostUSD: 0, onTimeCompletionPct: 0,
      deviationPct: 0, status: 'planned', createdAt: Date.now()
    };
    this.routes.push(record);
    return record;
  }

  complete(routeId: string, actualKm: number, actualMinutes: number, deliveries: number, fuelLiters: number, fuelCostUSD: number): boolean {
    const route = this.routes.find(r => r.routeId === routeId);
    if (!route) return false;
    route.actualDistanceKm = actualKm;
    route.actualDurationMinutes = actualMinutes;
    route.deliveriesCompleted = deliveries;
    route.fuelUsedLiters = fuelLiters;
    route.fuelCostUSD = fuelCostUSD;
    route.onTimeCompletionPct = route.stopsCount > 0 ? Math.round((deliveries / route.stopsCount) * 100) : 0;
    route.deviationPct = route.plannedDistanceKm > 0
      ? Math.round(((actualKm - route.plannedDistanceKm) / route.plannedDistanceKm) * 100 * 10) / 10 : 0;
    route.completedAt = Date.now();
    route.status = 'completed';
    return true;
  }

  getAvgDeviationPct(): number {
    const completed = this.routes.filter(r => r.status === 'completed');
    if (!completed.length) return 0;
    return Math.round(completed.reduce((s, r) => s + Math.abs(r.deviationPct), 0) / completed.length * 10) / 10;
  }

  getTotalFuelCost(): number {
    return this.routes.filter(r => r.status === 'completed').reduce((s, r) => s + r.fuelCostUSD, 0);
  }
}

class FleetCostAnalyzer {
  private records: FleetCostRecord[] = [];
  private counter = 0;

  analyze(period: string, vehicles: VehicleRecord[], totalKm: number, driverCost: number, insurance: number, deliveries: number): FleetCostRecord {
    const active = vehicles.filter(v => v.status === 'active');
    const totalFuel = active.reduce((s, v) => s + v.totalFuelCostUSD, 0);
    const totalMaint = active.reduce((s, v) => s + v.totalMaintenanceCostUSD, 0);
    const totalCost = totalFuel + totalMaint + driverCost + insurance;
    const avgUtilization = active.length > 0 ? active.reduce((s, v) => s + v.utilizationPct, 0) / active.length : 0;
    const avgConsumption = active.length > 0 ? active.reduce((s, v) => s + v.avgFuelConsumptionLper100km, 0) / active.length : 0;

    const recordId = `fleetcost-${Date.now()}-${++this.counter}`;
    const record: FleetCostRecord = {
      recordId, period, totalVehicles: vehicles.length, totalKmDriven: totalKm,
      totalFuelCostUSD: totalFuel, totalMaintenanceCostUSD: totalMaint,
      totalDriverCostUSD: driverCost, totalInsuranceCostUSD: insurance,
      totalFleetCostUSD: totalCost,
      costPerKmUSD: totalKm > 0 ? Math.round((totalCost / totalKm) * 100) / 100 : 0,
      costPerDeliveryUSD: deliveries > 0 ? Math.round((totalCost / deliveries) * 100) / 100 : 0,
      fleetUtilizationPct: Math.round(avgUtilization * 10) / 10,
      fuelEfficiencyLper100km: Math.round(avgConsumption * 10) / 10,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getLatest(): FleetCostRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getCostTrend(): number[] {
    return this.records.map(r => r.totalFleetCostUSD);
  }
}

export const vehicleManager = new VehicleManager();
export const driverPerformanceTracker = new DriverPerformanceTracker();
export const routeOptimizer = new RouteOptimizer();
export const fleetCostAnalyzer = new FleetCostAnalyzer();

export { VehicleRecord, DriverPerformanceRecord, RouteRecord, FleetCostRecord };
