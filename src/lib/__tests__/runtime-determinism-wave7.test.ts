import { describe, expect, it } from 'vitest';
import {
  complianceManager,
  isolationEnforcer,
  tenantIsolationMonitor,
  tenantManager
} from '../multi-tenancy';
import {
  anomalyDetector,
  insightEngine,
  predictiveAnalytics
} from '../platform-intelligence';
import {
  policyCompiler,
  policyDefinitionBuilder
} from '../policy-as-code';
import { policyConflictDetector } from '../policy-analytics';

describe('Runtime determinism wave 7', () => {
  it('keeps tenant metric and compliance outputs deterministic for the same tenant', () => {
    const metricsA = tenantManager.getTenantMetrics('tenant-1');
    const metricsB = tenantManager.getTenantMetrics('tenant-1');

    expect(metricsA).toEqual(metricsB);
    expect(isolationEnforcer.verifyIsolation('tenant-1')).toBe(
      isolationEnforcer.verifyIsolation('tenant-1')
    );
    expect(complianceManager.validateTenantCompliance('tenant-1', 'GDPR')).toBe(
      complianceManager.validateTenantCompliance('tenant-1', 'GDPR')
    );
    expect(tenantIsolationMonitor.validateDataSeparation('tenant-1')).toBe(
      tenantIsolationMonitor.validateDataSeparation('tenant-1')
    );
  });

  it('keeps platform intelligence scoring and forecasts deterministic for the same inputs', () => {
    const insight = {
      id: 'insight-fixed-1',
      type: 'opportunity' as const,
      severity: 'high' as const,
      title: 'Growth opportunity detected',
      description: 'Account expansion potential remains high',
      recommendedAction: 'Contact customer success',
      affectedEntity: 'account-1',
      generatedAt: 1704067200000,
      createdAt: 1704067200000
    };

    expect(insightEngine.scoreInsightRelevance(insight, 'user-1')).toBe(
      insightEngine.scoreInsightRelevance(insight, 'user-1')
    );

    const metricForecastA = predictiveAnalytics.forecastMetric('revenue', 5);
    const metricForecastB = predictiveAnalytics.forecastMetric('revenue', 5);
    expect(metricForecastA.id).toBe(metricForecastB.id);
    expect(metricForecastA.accuracy).toBe(metricForecastB.accuracy);
    expect(metricForecastA.predictions.map(item => item.value)).toEqual(
      metricForecastB.predictions.map(item => item.value)
    );

    const demandForecastA = predictiveAnalytics.forecastDemand('widget', 4);
    const demandForecastB = predictiveAnalytics.forecastDemand('widget', 4);
    expect(demandForecastA.id).toBe(demandForecastB.id);
    expect(demandForecastA.predictions.map(item => item.value)).toEqual(
      demandForecastB.predictions.map(item => item.value)
    );

    expect(predictiveAnalytics.predictCustomerChurn('customer-1')).toBe(
      predictiveAnalytics.predictCustomerChurn('customer-1')
    );
    expect(predictiveAnalytics.predictRevenueOpportunity('account-1')).toBe(
      predictiveAnalytics.predictRevenueOpportunity('account-1')
    );
    expect(predictiveAnalytics.predictiveScoring('tenant', 'tenant-1')).toBe(
      predictiveAnalytics.predictiveScoring('tenant', 'tenant-1')
    );

    const anomaliesA = anomalyDetector.detectAnomalies('latency', 0.2).map(anomaly => ({
      id: anomaly.id,
      metric: anomaly.metric,
      value: anomaly.value,
      severity: anomaly.severity,
      expectedRange: anomaly.expectedRange
    }));
    const anomaliesB = anomalyDetector.detectAnomalies('latency', 0.2).map(anomaly => ({
      id: anomaly.id,
      metric: anomaly.metric,
      value: anomaly.value,
      severity: anomaly.severity,
      expectedRange: anomaly.expectedRange
    }));

    expect(anomaliesA).toEqual(anomaliesB);

    const baselineA = anomalyDetector.compareAgainstBaseline('latency', 180);
    const baselineB = anomalyDetector.compareAgainstBaseline('latency', 180);
    expect(baselineA && {
      id: baselineA.id,
      metric: baselineA.metric,
      value: baselineA.value,
      severity: baselineA.severity,
      expectedRange: baselineA.expectedRange
    }).toEqual(baselineB && {
      id: baselineB.id,
      metric: baselineB.metric,
      value: baselineB.value,
      severity: baselineB.severity,
      expectedRange: baselineB.expectedRange
    });
  });

  it('keeps policy conflict metrics and compiled hashes deterministic', () => {
    const rules1 = [{ condition: { region: 'eu' }, action: 'read', effect: 'allow' as const }];
    const rules2 = [{ condition: { region: 'eu' }, action: 'read', effect: 'deny' as const }];

    const conflictA = policyConflictDetector.detectConflicts('policy-a', 'policy-b', rules1, rules2);
    const conflictB = policyConflictDetector.detectConflicts('policy-a', 'policy-b', rules1, rules2);

    expect(conflictA && {
      policy1Id: conflictA.policy1Id,
      policy2Id: conflictA.policy2Id,
      conflictType: conflictA.conflictType,
      severity: conflictA.severity,
      affectedDecisions: conflictA.affectedDecisions
    }).toEqual(conflictB && {
      policy1Id: conflictB.policy1Id,
      policy2Id: conflictB.policy2Id,
      conflictType: conflictB.conflictType,
      severity: conflictB.severity,
      affectedDecisions: conflictB.affectedDecisions
    });

    const builder = policyDefinitionBuilder.buildPolicy('Tenant Access', 'Tenant read policy');
    const policy = builder.addRule({ tenantId: 'tenant-1' }, 'read', 'allow').build();

    const compiledA = policyCompiler.compilePolicy(policy);
    const compiledB = policyCompiler.compilePolicy(policy);

    expect(compiledA.hash).toBe(compiledB.hash);
    expect(compiledA.errors).toEqual(compiledB.errors);
  });
});
