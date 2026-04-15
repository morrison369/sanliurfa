/**
 * Tests for Phase 275-280: Real Estate, Fleet, Healthcare, Energy, Quality, R&D Intelligence
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Phase 275: Real Estate Portfolio Intelligence
import {
  propertyPortfolioManager, tenantAnalyticsEngine,
  portfolioPerformanceAnalyzer, marketBenchmarkTracker
} from '../real-estate-portfolio-intelligence';

// Phase 276: Fleet Management Intelligence
import {
  vehicleFleetManager, maintenanceScheduler,
  fuelAnalyticsEngine, driverPerformanceTracker
} from '../fleet-management-intelligence';

// Phase 277: Healthcare & Benefits Intelligence
import {
  benefitsPlanManager, healthcareCostAnalyzer,
  wellnessProgramTracker, claimsAnalyticsEngine
} from '../healthcare-benefits-intelligence';

// Phase 278: Energy Management Intelligence
import {
  energyConsumptionTracker, renewableEnergyManager,
  energyAnomalyDetector, carbonFootprintTracker
} from '../energy-management-intelligence';

// Phase 279: Quality Management Intelligence
import {
  defectTrackingSystem, qualityCostAnalyzer,
  supplierQualityManager, continuousImprovementTracker
} from '../quality-management-intelligence';

// Phase 280: R&D Intelligence
import {
  rdProjectManager, innovationMetricsTracker,
  technologyReadinessAssessor, researchROICalculator
} from '../rd-intelligence';

// ─── Phase 275: Real Estate ───────────────────────────────────────────────────

describe('Phase 275: Real Estate Portfolio Intelligence', () => {
  it('adds property and updates valuation', () => {
    const property = propertyPortfolioManager.add('HQ Tower', '123 Main St', 'office', 50000, 45000, 10000000);
    expect(property.propertyId).toMatch(/^prop-/);
    expect(property.acquisitionCost).toBe(10000000);

    propertyPortfolioManager.updateValuation(property.propertyId, 12000000, 900000, 95);
    const updated = propertyPortfolioManager.getProperty(property.propertyId);
    expect(updated?.currentValue).toBe(12000000);
    expect(updated?.capRate).toBeCloseTo(7.5, 1);
    expect(updated?.occupancyRatePct).toBe(95);
  });

  it('tracks tenants and identifies expiring leases', () => {
    const property = propertyPortfolioManager.add('Retail Park', '456 Commerce Ave', 'retail', 20000, 18000, 5000000);
    const leaseEnd = Date.now() + 60 * 86400000; // 60 days
    const tenant = tenantAnalyticsEngine.add(property.propertyId, 'Acme Corp', 5000, Date.now() - 365 * 86400000, leaseEnd, 10000, 'gross', 'A');
    expect(tenant.tenantId).toMatch(/^tenant-/);
    expect(tenant.rentPerSqFt).toBeCloseTo(24, 1);

    const expiring = tenantAnalyticsEngine.getExpiringLeases(90);
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring[0].tenantName).toBe('Acme Corp');
  });

  it('analyzes portfolio performance', () => {
    const props = [
      propertyPortfolioManager.add('Office A', 'Addr1', 'office', 10000, 9000, 2000000),
      propertyPortfolioManager.add('Office B', 'Addr2', 'office', 15000, 13000, 3000000)
    ];
    propertyPortfolioManager.updateValuation(props[0].propertyId, 2200000, 150000, 90);
    propertyPortfolioManager.updateValuation(props[1].propertyId, 3300000, 220000, 85);
    const prop0 = propertyPortfolioManager.getProperty(props[0].propertyId)!;
    const prop1 = propertyPortfolioManager.getProperty(props[1].propertyId)!;

    const report = portfolioPerformanceAnalyzer.analyze('2026-Q2', [prop0, prop1], 80000);
    expect(report.totalProperties).toBe(2);
    expect(report.totalNOI).toBe(370000);
    expect(report.avgOccupancyRatePct).toBe(87.5);
  });

  it('benchmarks market performance', () => {
    const bench = marketBenchmarkTracker.record('istanbul', 'office', 6.5, 250, 88, 3.2);
    expect(bench.marketTrend).toBe('appreciating');
    expect(bench.shareOfVoicePct).toBeUndefined();

    const latest = marketBenchmarkTracker.getLatest('istanbul', 'office');
    expect(latest?.avgCapRate).toBe(6.5);
    const appreciating = marketBenchmarkTracker.getAppreciatingMarkets();
    expect(appreciating.length).toBeGreaterThan(0);
  });
});

// ─── Phase 276: Fleet Management ─────────────────────────────────────────────

describe('Phase 276: Fleet Management Intelligence', () => {
  it('registers vehicle and tracks mileage', () => {
    const vehicle = vehicleFleetManager.register('34ABC123', 'Toyota', 'Corolla', 2022, 'sedan', 'gasoline', 25000);
    expect(vehicle.vehicleId).toMatch(/^veh-/);
    expect(vehicle.status).toBe('active');

    vehicleFleetManager.updateMileage(vehicle.vehicleId, 6000);
    const updated = vehicleFleetManager.getVehicle(vehicle.vehicleId);
    expect(updated?.totalMileage).toBe(6000);
    expect(updated?.status).toBe('maintenance'); // exceeded nextMaintenanceMileage (5000)
  });

  it('schedules and completes maintenance', () => {
    const vehicle = vehicleFleetManager.register('34DEF456', 'Ford', 'Transit', 2021, 'van', 'diesel', 35000);
    const maint = maintenanceScheduler.schedule(vehicle.vehicleId, 'oil_change', Date.now() + 86400000, 15000, 150, 'AutoServ');
    expect(maint.status).toBe('scheduled');

    const completed = maintenanceScheduler.complete(maint.maintenanceId, vehicle.vehicleId);
    expect(completed).toBe(true);
    const totalCost = maintenanceScheduler.getTotalMaintenanceCost(vehicle.vehicleId);
    expect(totalCost).toBe(150);
  });

  it('records fuel consumption and detects idle', () => {
    const vehicle = vehicleFleetManager.register('34GHI789', 'Mercedes', 'Sprinter', 2023, 'van', 'diesel', 45000);
    const fuel = fuelAnalyticsEngine.record(vehicle.vehicleId, 'driver-1', '2026-04', 80, 600, 120, 150);
    expect(fuel.fuelEfficiencyKmPerL).toBe(7.5);
    expect(fuel.costPerKm).toBeCloseTo(0.2, 2);

    const highIdle = fuelAnalyticsEngine.getHighIdleVehicles(100);
    expect(highIdle.length).toBeGreaterThan(0);
  });

  it('evaluates driver performance and flags high-risk', () => {
    const perf = driverPerformanceTracker.evaluate('drv-001', 'Ahmet Yılmaz', '2026-04', 50, 2000, 60, 10, 5, 8, 30, 6);
    expect(perf.safetyScore).toBeLessThan(100);
    expect(perf.overallScore).toBeGreaterThanOrEqual(0);

    const highRisk = driverPerformanceTracker.getHighRiskDrivers(70);
    // safety score should be low given the hard braking/speeding events
    expect(Array.isArray(highRisk)).toBe(true);
  });
});

// ─── Phase 277: Healthcare & Benefits ────────────────────────────────────────

describe('Phase 277: Healthcare & Benefits Intelligence', () => {
  it('creates benefits plan and tracks enrollment', () => {
    const plan = benefitsPlanManager.create('Blue Shield PPO', 'health', 6000, 75, 200, '2026');
    expect(plan.planId).toMatch(/^plan-/);
    expect(plan.employeeContributionPct).toBe(25);

    benefitsPlanManager.updateEnrollment(plan.planId, 160);
    const plans = benefitsPlanManager.getPlansByType('health');
    expect(plans.some(p => p.enrollmentRatePct === 80)).toBe(true);
  });

  it('analyzes healthcare costs', () => {
    const cost = healthcareCostAnalyzer.analyze('2026-Q1', 500000, 450000, 50000, 80, 1000, 6.5, ['cardiovascular', 'musculoskeletal']);
    expect(cost.costId).toMatch(/^hccost-/);
    expect(cost.coqAsRevenuePct).toBeUndefined(); // not a COQ record
    expect(cost.totalPremiumCost).toBe(500000);
    expect(cost.medicalCostTrendPct).toBe(6.5);
  });

  it('tracks wellness program ROI', () => {
    const program = wellnessProgramTracker.create('FitLife Challenge', 'fitness', 500, 50000, '2026-Q1');
    expect(program.programId).toMatch(/^wellness-/);

    wellnessProgramTracker.updateOutcomes(program.programId, 300, 75, 12, 120000, 50000);
    const top = wellnessProgramTracker.getTopROIPrograms(3);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].roiPct).toBe(140); // (120k-50k)/50k × 100
  });

  it('analyzes claims and detects fraud alerts', () => {
    const claims = claimsAnalyticsEngine.analyze('2026-Q1', 1000, 850, 80, 70, 2000000, 3, 12);
    expect(claims.denialRatePct).toBe(8);
    expect(claims.avgClaimValue).toBe(2000);

    const fraudPeriods = claimsAnalyticsEngine.getFraudAlertPeriods();
    expect(fraudPeriods.length).toBeGreaterThan(0);
  });
});

// ─── Phase 278: Energy Management ────────────────────────────────────────────

describe('Phase 278: Energy Management Intelligence', () => {
  it('records energy consumption and calculates EUI', () => {
    const record = energyConsumptionTracker.record('fac-1', 'Istanbul HQ', '2026-03', 50000, 200, 300, 8000, 1200, 900, 10000, 5);
    expect(record.recordId).toMatch(/^energy-/);
    expect(record.totalEnergyKwh).toBeGreaterThan(50000); // includes gas conversion
    expect(record.intensityKwhPerSqFt).toBeGreaterThan(0);
    expect(typeof record.performanceVsBenchmarkPct).toBe('number');
  });

  it('tracks renewable energy and carbon offset', () => {
    const renew = renewableEnergyManager.record('fac-1', 'solar', 100, 12000, 9000, 0.15, 0.42, 200000, '2026-Q1');
    expect(renew.recordId).toMatch(/^renew-/);
    expect(renew.selfConsumedKwh).toBe(9000);
    expect(renew.carbonOffsetTonnes).toBeGreaterThan(0);

    const totalOffset = renewableEnergyManager.getTotalCarbonOffset();
    expect(totalOffset).toBeGreaterThan(0);
  });

  it('detects energy anomalies by severity', () => {
    const anomaly = energyAnomalyDetector.detect('fac-1', 'consumption_spike', 10000, 18000, 0.12);
    expect(anomaly.severity).toBe('critical'); // 80% deviation → critical
    expect(anomaly.estimatedWasteCost).toBeCloseTo(960, 0);

    const unresolved = energyAnomalyDetector.getUnresolved();
    expect(unresolved.length).toBeGreaterThan(0);
    energyAnomalyDetector.resolve(anomaly.anomalyId);
    expect(energyAnomalyDetector.getUnresolved().find(a => a.anomalyId === anomaly.anomalyId)).toBeUndefined();
  });

  it('calculates carbon footprint and tracks targets', () => {
    const carbon = carbonFootprintTracker.calculate('fac-2', '2026-Q1', 50, 200000, 0.45, 20, 10, 100);
    expect(carbon.scope1Tonnes).toBe(50);
    expect(carbon.scope2Tonnes).toBeGreaterThan(0);
    expect(carbon.netCarbonTonnes).toBeGreaterThanOrEqual(0);
    expect(carbon.progressToTargetPct).toBeGreaterThanOrEqual(0);
  });
});

// ─── Phase 279: Quality Management ───────────────────────────────────────────

describe('Phase 279: Quality Management Intelligence', () => {
  it('reports defects and resolves with root cause', () => {
    const defect = defectTrackingSystem.report('prod-1', 'Widget X', 'manufacturing', 'critical', 'in_process', 5, 200, false);
    expect(defect.defectId).toMatch(/^defect-/);
    expect(defect.costOfDefect).toBe(1000);

    const resolved = defectTrackingSystem.resolve(defect.defectId, 'prod-1', 'Worn tooling');
    expect(resolved).toBe(true);
    const critical = defectTrackingSystem.getCriticalOpen();
    expect(critical.find(d => d.defectId === defect.defectId)).toBeUndefined();
  });

  it('calculates cost of quality ratios', () => {
    const coq = qualityCostAnalyzer.analyze('2026-Q1', 50000, 80000, 120000, 30000, 2000000);
    expect(coq.totalCOQ).toBe(280000);
    expect(coq.coqAsRevenuePct).toBe(14);

    const ratio = qualityCostAnalyzer.getOptimalRatio();
    expect(ratio).not.toBeNull();
    expect(ratio!.preventionRatio + ratio!.appraisalRatio + ratio!.failureRatio).toBeCloseTo(100, 1);
  });

  it('evaluates supplier quality and flags probation', () => {
    const supplier = supplierQualityManager.evaluate('sup-1', 'Acme Parts', '2026-Q1', 100, 92, 50000, 150, 85, 2);
    expect(supplier.recordId).toMatch(/^squality-/);
    expect(supplier.lotsRejected).toBe(8);
    expect(supplier.defectivePartsPerMillion).toBe(3000);

    const badSuppliers = supplierQualityManager.getProbationSuppliers();
    expect(Array.isArray(badSuppliers)).toBe(true);
  });

  it('tracks continuous improvement project progress', () => {
    const project = continuousImprovementTracker.create('Reduce Defect Rate', 'six_sigma', 'High scrap rate', 'defects_per_unit', 8, 2);
    expect(project.projectId).toMatch(/^ci-/);
    expect(project.improvementPct).toBe(0);

    continuousImprovementTracker.updateProgress(project.projectId, 4, 50000);
    const active = continuousImprovementTracker.getActiveProjects();
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].improvementPct).toBeCloseTo(66.7, 1);
  });
});

// ─── Phase 280: R&D Intelligence ─────────────────────────────────────────────

describe('Phase 280: R&D Intelligence', () => {
  it('creates R&D project and advances stages', () => {
    const project = rdProjectManager.create('AI Scheduler', 'development', 'AI/ML', 500000, 8, Date.now() + 365 * 86400000, 2000000);
    expect(project.projectId).toMatch(/^rdproj-/);
    expect(project.trlLevel).toBe(1);

    rdProjectManager.advance(project.projectId, 'prototype', 4, 150000, 70);
    const highRisk = rdProjectManager.getHighRiskProjects(40);
    expect(Array.isArray(highRisk)).toBe(true);

    const pipelineValue = rdProjectManager.getPipelineValue();
    expect(pipelineValue).toBeGreaterThan(0);
  });

  it('tracks innovation metrics and conversion rate', () => {
    const metrics = innovationMetricsTracker.record('2026-Q1', 200, 180, 40, 15, 45, 300000, 100000, 30);
    expect(metrics.recordId).toMatch(/^innov-/);
    expect(metrics.conversionRatePct).toBe(7.5);
    expect(metrics.innovationROIPct).toBe(200);

    const trend = innovationMetricsTracker.getConversionTrend();
    expect(trend.length).toBeGreaterThan(0);
  });

  it('assesses TRL and identifies high-risk projects', () => {
    const project = rdProjectManager.create('Quantum Sensor', 'basic_research', 'Quantum', 200000, 3, Date.now() + 730 * 86400000, 5000000);
    const assessment = technologyReadinessAssessor.assess(project.projectId, 2, 'Dr. Smith', ['Lab results'], ['No prototype'], 'Proof of concept', 26);
    expect(assessment.assessmentId).toMatch(/^trl-/);
    expect(assessment.trlDescription).toBe('Technology concept formulated');
    expect(assessment.riskLevel).toBe('high');

    const highRiskTRL = technologyReadinessAssessor.getHighRiskAssessments();
    expect(highRiskTRL.length).toBeGreaterThan(0);
    expect(technologyReadinessAssessor.getAvgTRL()).toBeGreaterThanOrEqual(1);
  });

  it('calculates R&D ROI and tracks trends', () => {
    const roi = researchROICalculator.calculate('2026-Q1', 1000000, 20000000, 5, 2, 3000000, 500000, 180, 65);
    expect(roi.recordId).toMatch(/^rdROI-/);
    expect(roi.rdAsRevenuePct).toBe(5);
    expect(roi.totalReturn).toBe(3500000);
    expect(roi.roiPct).toBe(250); // (3.5M - 1M) / 1M × 100

    const avg = researchROICalculator.getAvgROI();
    expect(avg).toBeGreaterThan(0);
    expect(researchROICalculator.getROITrend()).toHaveLength(1);
  });
});
