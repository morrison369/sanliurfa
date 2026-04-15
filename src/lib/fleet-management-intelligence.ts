/**
 * Phase 276: Fleet Management Intelligence
 * Vehicle lifecycle, maintenance scheduling, fuel analytics, driver performance
 */

import { logger } from './logger';

interface VehicleRecord {
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: 'sedan' | 'suv' | 'truck' | 'van' | 'heavy_truck' | 'motorcycle';
  status: 'active' | 'maintenance' | 'out_of_service' | 'retired';
  assignedDriverId?: string;
  totalMileage: number;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  acquisitionDate: number;
  acquisitionCost: number;
  estimatedResaleValue: number;
  nextMaintenanceMileage: number;
  nextMaintenanceDate: number;
  insuranceExpiryDate: number;
  createdAt: number;
}

interface MaintenanceRecord {
  maintenanceId: string;
  vehicleId: string;
  maintenanceType: 'oil_change' | 'tire_rotation' | 'brake_service' | 'engine_repair' | 'inspection' | 'recall';
  scheduledDate: number;
  completedDate?: number;
  mileageAtService: number;
  cost: number;
  vendor: string;
  notes: string;
  status: 'scheduled' | 'completed' | 'overdue' | 'cancelled';
  createdAt: number;
}

interface FuelConsumptionRecord {
  recordId: string;
  vehicleId: string;
  driverId: string;
  period: string;
  totalFuelLiters: number;
  totalDistanceKm: number;
  fuelEfficiencyKmPerL: number;
  totalFuelCost: number;
  costPerKm: number;
  idleTimeMinutes: number;
  recordedAt: number;
}

interface DriverPerformanceRecord {
  recordId: string;
  driverId: string;
  driverName: string;
  period: string;
  totalTrips: number;
  totalDistanceKm: number;
  avgSpeedKmh: number;
  hardBrakingEvents: number;
  hardAccelerationEvents: number;
  speedingEvents: number;
  idleTimeMinutes: number;
  fuelEfficiencyScore: number;    // 0-100
  safetyScore: number;            // 0-100
  overallScore: number;
  calculatedAt: number;
}

class VehicleFleetManager {
  private vehicles: Map<string, VehicleRecord> = new Map();
  private counter = 0;

  register(plateNumber: string, make: string, model: string, year: number, type: VehicleRecord['vehicleType'], fuelType: VehicleRecord['fuelType'], acquisitionCost: number): VehicleRecord {
    const vehicleId = `veh-${Date.now()}-${++this.counter}`;
    const vehicle: VehicleRecord = {
      vehicleId, plateNumber, make, model, year, vehicleType: type, status: 'active',
      totalMileage: 0, fuelType, acquisitionDate: Date.now(), acquisitionCost,
      estimatedResaleValue: acquisitionCost * 0.6, nextMaintenanceMileage: 5000,
      nextMaintenanceDate: Date.now() + 90 * 86400000,
      insuranceExpiryDate: Date.now() + 365 * 86400000, createdAt: Date.now()
    };
    this.vehicles.set(vehicleId, vehicle);
    logger.debug('Vehicle registered', { vehicleId, plateNumber, type });
    return vehicle;
  }

  updateMileage(vehicleId: string, mileage: number): boolean {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return false;
    vehicle.totalMileage = mileage;
    if (mileage >= vehicle.nextMaintenanceMileage) vehicle.status = 'maintenance';
    return true;
  }

  getMaintenanceDue(): VehicleRecord[] {
    return Array.from(this.vehicles.values())
      .filter(v => v.status === 'maintenance' || v.nextMaintenanceDate <= Date.now());
  }

  getInsuranceExpiringSoon(days = 30): VehicleRecord[] {
    const horizon = Date.now() + days * 86400000;
    return Array.from(this.vehicles.values())
      .filter(v => v.status !== 'retired' && v.insuranceExpiryDate <= horizon);
  }

  getFleetUtilizationPct(): number {
    const all = Array.from(this.vehicles.values()).filter(v => v.status !== 'retired');
    if (!all.length) return 0;
    return (all.filter(v => v.status === 'active').length / all.length) * 100;
  }

  getVehicle(vehicleId: string): VehicleRecord | undefined {
    return this.vehicles.get(vehicleId);
  }
}

class MaintenanceScheduler {
  private records: Map<string, MaintenanceRecord[]> = new Map();
  private counter = 0;

  schedule(vehicleId: string, type: MaintenanceRecord['maintenanceType'], scheduledDate: number, mileage: number, cost: number, vendor: string): MaintenanceRecord {
    const maintenanceId = `maint-${Date.now()}-${++this.counter}`;
    const record: MaintenanceRecord = {
      maintenanceId, vehicleId, maintenanceType: type, scheduledDate, mileageAtService: mileage,
      cost, vendor, notes: '', status: 'scheduled', createdAt: Date.now()
    };
    const existing = this.records.get(vehicleId) || [];
    existing.push(record);
    this.records.set(vehicleId, existing);
    return record;
  }

  complete(maintenanceId: string, vehicleId: string): boolean {
    const records = this.records.get(vehicleId) || [];
    const record = records.find(r => r.maintenanceId === maintenanceId);
    if (!record) return false;
    record.status = 'completed';
    record.completedDate = Date.now();
    return true;
  }

  getOverdue(): MaintenanceRecord[] {
    return Array.from(this.records.values())
      .flat()
      .filter(r => r.status === 'scheduled' && r.scheduledDate < Date.now())
      .map(r => ({ ...r, status: 'overdue' as const }));
  }

  getTotalMaintenanceCost(vehicleId: string): number {
    return (this.records.get(vehicleId) || [])
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + r.cost, 0);
  }

  getByVehicle(vehicleId: string): MaintenanceRecord[] {
    return this.records.get(vehicleId) || [];
  }
}

class FuelAnalyticsEngine {
  private records: FuelConsumptionRecord[] = [];
  private counter = 0;

  record(vehicleId: string, driverId: string, period: string, fuelLiters: number, distanceKm: number, fuelCost: number, idleMinutes: number): FuelConsumptionRecord {
    const efficiency = distanceKm > 0 ? distanceKm / fuelLiters : 0;
    const costPerKm = distanceKm > 0 ? fuelCost / distanceKm : 0;
    const recordId = `fuel-${Date.now()}-${++this.counter}`;
    const record: FuelConsumptionRecord = {
      recordId, vehicleId, driverId, period, totalFuelLiters: fuelLiters,
      totalDistanceKm: distanceKm, fuelEfficiencyKmPerL: efficiency,
      totalFuelCost: fuelCost, costPerKm, idleTimeMinutes: idleMinutes, recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getFleetAvgEfficiency(): number {
    if (!this.records.length) return 0;
    return this.records.reduce((s, r) => s + r.fuelEfficiencyKmPerL, 0) / this.records.length;
  }

  getTotalFuelCost(period?: string): number {
    const filtered = period ? this.records.filter(r => r.period === period) : this.records;
    return filtered.reduce((s, r) => s + r.totalFuelCost, 0);
  }

  getHighIdleVehicles(thresholdMinutes = 120): FuelConsumptionRecord[] {
    return this.records.filter(r => r.idleTimeMinutes >= thresholdMinutes)
      .sort((a, b) => b.idleTimeMinutes - a.idleTimeMinutes);
  }
}

class DriverPerformanceTracker {
  private records: Map<string, DriverPerformanceRecord[]> = new Map();
  private counter = 0;

  evaluate(driverId: string, driverName: string, period: string, trips: number, distanceKm: number, avgSpeed: number, hardBraking: number, hardAcceleration: number, speeding: number, idleMin: number, fuelEfficiency: number): DriverPerformanceRecord {
    const safetyDeductions = hardBraking * 2 + hardAcceleration * 1.5 + speeding * 3;
    const safetyScore = Math.max(0, 100 - safetyDeductions);
    const idlePenalty = Math.min(20, idleMin / 60);
    const fuelEfficiencyScore = Math.max(0, fuelEfficiency * 10 - idlePenalty);
    const overallScore = Math.max(0, Math.min(100, safetyScore * 0.6 + fuelEfficiencyScore * 0.4));

    const recordId = `drvperf-${Date.now()}-${++this.counter}`;
    const record: DriverPerformanceRecord = {
      recordId, driverId, driverName, period, totalTrips: trips, totalDistanceKm: distanceKm,
      avgSpeedKmh: avgSpeed, hardBrakingEvents: hardBraking, hardAccelerationEvents: hardAcceleration,
      speedingEvents: speeding, idleTimeMinutes: idleMin, fuelEfficiencyScore: Math.min(100, fuelEfficiencyScore),
      safetyScore, overallScore, calculatedAt: Date.now()
    };
    const history = this.records.get(driverId) || [];
    history.push(record);
    this.records.set(driverId, history);
    logger.debug('Driver performance evaluated', { driverId, overallScore });
    return record;
  }

  getTopDrivers(limit = 5): DriverPerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is DriverPerformanceRecord => !!r)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  getHighRiskDrivers(safetyThreshold = 60): DriverPerformanceRecord[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is DriverPerformanceRecord => !!r && r.safetyScore < safetyThreshold)
      .sort((a, b) => a.safetyScore - b.safetyScore);
  }

  getLatest(driverId: string): DriverPerformanceRecord | undefined {
    const history = this.records.get(driverId) || [];
    return history[history.length - 1];
  }
}

export const vehicleFleetManager = new VehicleFleetManager();
export const maintenanceScheduler = new MaintenanceScheduler();
export const fuelAnalyticsEngine = new FuelAnalyticsEngine();
export const driverPerformanceTracker = new DriverPerformanceTracker();

export { VehicleRecord, MaintenanceRecord, FuelConsumptionRecord, DriverPerformanceRecord };
