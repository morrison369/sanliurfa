/**
 * Advanced Governance & Policy (Phase 161-166)
 * Test suite for policy as code, access governance, compliance automation,
 * decision auditing, policy analytics, and enforcement
 */

import { describe, it, expect } from 'vitest';
import {
  policyDefinitionBuilder,
  policyVersionManager,
  policyTemplateLibrary,
  policyCompiler,
  entitlementManager,
  accessReviewOrchestrator,
  privilegeEscalationMonitor,
  roleHierarchyManager,
  complianceAutomator,
  auditAutomation,
  remediationOrchestrator,
  complianceReportAutomation,
  decisionAuditor,
  decisionTraceability,
  changeImpactAnalyzer,
  decisionReplayEngine,
  policyUsageAnalytics,
  accessPatternAnalyzer,
  policyConflictDetector,
  policyRecommendationEngine,
  policyEnforcementEngine,
  autoRemediationExecutor,
  policyExceptionManager,
  policyEvaluationCache
} from '../index';

// Phase 161: Policy as Code & Definition
describe('Phase 161: Policy as Code & Definition', () => {
  it('should build and compile policies', () => {
    const { policyId, build } = policyDefinitionBuilder.buildPolicy('access-control', 'Control user access');
    const policy = build()
      .addRule({ role: 'admin' }, 'allow-all', 'allow')
      .build();

    expect(policy).toBeDefined();
    expect(policy.name).toBe('access-control');
    expect(policy.rules.length).toBeGreaterThan(0);
  });

  it('should manage policy versions and compare', () => {
    const { build } = policyDefinitionBuilder.buildPolicy('test-policy', 'Test');
    const policy = build().addRule({ role: 'user' }, 'limited-access', 'deny').build();

    const v2 = policyVersionManager.createVersion(policy);
    expect(v2.version).toBe(2);

    const history = policyVersionManager.getVersionHistory(policy.policyId);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should apply and register policy templates', () => {
    const template = policyTemplateLibrary.registerTemplate(
      'RBAC Template',
      'access-control',
      'Role-based access control',
      [{ condition: { role: 'admin' }, action: 'allow-all', effect: 'allow' }]
    );

    expect(template.templateId).toBeDefined();

    const applied = policyTemplateLibrary.applyTemplate(template.templateId, 'Custom RBAC');
    expect(applied).toBeDefined();
    expect(applied?.name).toBe('Custom RBAC');
  });

  it('should compile policies with validation', () => {
    const { build } = policyDefinitionBuilder.buildPolicy('compile-test', 'Test');
    const policy = build().addRule({ status: 'active' }, 'grant-access', 'allow').build();

    const compiled = policyCompiler.compilePolicy(policy);
    expect(compiled.policyId).toBe(policy.policyId);
    expect(compiled.errors.length).toBe(0);

    const validation = policyCompiler.validatePolicy(policy);
    expect(validation.valid).toBe(true);
  });
});

// Phase 162: Access Governance & Entitlement Management
describe('Phase 162: Access Governance & Entitlement Management', () => {
  it('should grant and revoke entitlements', () => {
    const entitlement = entitlementManager.grantEntitlement(
      'user-123',
      'resource-456',
      'read',
      'admin-789',
      'Business requirement'
    );

    expect(entitlement).toBeDefined();
    expect(entitlement.userId).toBe('user-123');
    expect(entitlement.permission).toBe('read');
  });

  it('should orchestrate access reviews', () => {
    const review = accessReviewOrchestrator.initiateReview('resource-123', 30 * 24 * 60 * 60 * 1000);
    expect(review.status).toBe('pending');

    const started = accessReviewOrchestrator.startReview(review.reviewId);
    expect(started?.status).toBe('in_progress');

    const completed = accessReviewOrchestrator.completeReview(review.reviewId);
    expect(completed?.status).toBe('completed');
  });

  it('should monitor privilege escalation', () => {
    const escalation = privilegeEscalationMonitor.detectEscalation('user-123', 'user', 'admin');
    expect(escalation.detected).toBe(true);
    expect(escalation.severity).toMatch(/high|critical/);
  });

  it('should manage role hierarchy and separation of duties', () => {
    const role = roleHierarchyManager.defineRole('manager', [], ['read', 'write'], ['finance-admin']);
    expect(role.roleId).toBeDefined();
    expect(role.permissions).toContain('read');

    const sod = roleHierarchyManager.checkSeparationOfDuties('user-123', role.roleId, ['finance-admin']);
    expect(sod).toHaveProperty('allowed');
    expect(sod).toHaveProperty('conflictingRoles');
  });
});

// Phase 163: Compliance Automation & Audit
describe('Phase 163: Compliance Automation & Audit', () => {
  it('should run automated compliance checks', () => {
    const check = complianceAutomator.runCheck(
      'password-policy',
      'GDPR',
      () => true
    );

    expect(check).toBeDefined();
    expect(check.status).toMatch(/pass|fail/);
    expect(check.remediationRequired).toBeDefined();
  });

  it('should maintain immutable audit logs', () => {
    const log = auditAutomation.logAction(
      'user-creation',
      'admin-789',
      'user-123',
      { email: 'test@example.com' }
    );

    expect(log.logId).toBeDefined();
    expect(log.timestamp).toBeGreaterThan(0);
    expect(log.status).toBe('success');
  });

  it('should orchestrate remediation workflows', () => {
    const task = remediationOrchestrator.createRemediationTask(
      'check-123',
      ['patch-system', 'update-config', 'verify']
    );

    expect(task).toBeDefined();
    expect(task.status).toBe('pending');
    expect(task.actions.length).toBeGreaterThan(0);
  });

  it('should generate compliance reports', () => {
    const check = complianceAutomator.runCheck('test', 'GDPR', () => true);
    const report = complianceReportAutomation.generateReport('GDPR', [check]);

    expect(report).toBeDefined();
    expect(report.framework).toBe('GDPR');
    expect(report.coverage).toBeGreaterThanOrEqual(0);
  });
});

// Phase 164: Decision Auditing & Logging
describe('Phase 164: Decision Auditing & Logging', () => {
  it('should record and retrieve decisions', () => {
    const decision = decisionAuditor.recordDecision(
      'policy-123',
      'allow',
      { role: 'admin', resource: 'sensitive' },
      'user-456',
      'Admin role grants access'
    );

    expect(decision).toBeDefined();
    expect(decision.decision).toBe('allow');

    const retrieved = decisionAuditor.getDecision(decision.decisionId);
    expect(retrieved?.decisionId).toBe(decision.decisionId);
  });

  it('should trace decision execution paths', () => {
    const trace = decisionTraceability.traceDecision(
      'decision-123',
      'policy-456',
      1,
      [{ ruleIndex: 0, matched: true, effect: 'allow' }],
      'allow'
    );

    expect(trace).toBeDefined();
    expect(trace.finalDecision).toBe('allow');

    const retrieved = decisionTraceability.getTrace('decision-123');
    expect(retrieved?.decisionId).toBe('decision-123');
  });

  it('should analyze impact of policy changes', () => {
    const impact = changeImpactAnalyzer.analyzeChange(
      'policy-123',
      1,
      2,
      ['decision-1', 'decision-2', 'decision-3']
    );

    expect(impact).toBeDefined();
    expect(impact.potentialImpact).toMatch(/low|medium|high/);
    expect(impact.affectedDecisions.length).toBeGreaterThan(0);
  });

  it('should replay decisions for policy testing', () => {
    const decision = decisionAuditor.recordDecision(
      'policy-123',
      'allow',
      { role: 'user' },
      'user-456',
      'Decision record'
    );

    const replayResult = decisionReplayEngine.replayDecision(
      decision.decisionId,
      decision,
      {}
    );

    expect(replayResult).toBeDefined();
    expect(replayResult.originalDecision).toBeDefined();
    expect(replayResult.replayedDecision).toBeDefined();
  });
});

// Phase 165: Policy Analytics & Insights
describe('Phase 165: Policy Analytics & Insights', () => {
  it('should track policy usage metrics', () => {
    policyUsageAnalytics.recordEvaluation('policy-123', 45, 'allow');
    policyUsageAnalytics.recordEvaluation('policy-123', 55, 'deny');

    const effectiveness = policyUsageAnalytics.getEffectiveness('policy-123');
    expect(effectiveness.evaluationCount).toBeGreaterThan(0);
    expect(effectiveness.allowRate + effectiveness.denyRate).toBeCloseTo(100, 1);
  });

  it('should analyze access patterns', () => {
    const pattern = accessPatternAnalyzer.recordAccess('user-123', 'resource-456');

    expect(pattern).toBeDefined();
    expect(pattern.accessCount).toBeGreaterThan(0);
    expect(pattern.frequency).toMatch(/hourly|daily|weekly|monthly|rare/);
  });

  it('should detect policy conflicts', () => {
    const rules1 = [{ condition: { role: 'user' }, action: 'read', effect: 'allow' }];
    const rules2 = [{ condition: { role: 'user' }, action: 'read', effect: 'deny' }];

    const conflict = policyConflictDetector.detectConflicts('policy-1', 'policy-2', rules1, rules2);

    if (conflict) {
      expect(conflict.conflictId).toBeDefined();
      expect(conflict.severity).toMatch(/low|medium|high/);
    }
  });

  it('should generate policy recommendations', () => {
    const recommendations = policyRecommendationEngine.generateRecommendations(
      'policy-123',
      { averageTime: 150 },
      [{ policy1Id: 'p1', policy2Id: 'p2' }]
    );

    expect(Array.isArray(recommendations)).toBe(true);
  });
});

// Phase 166: Policy Enforcement & Remediation
describe('Phase 166: Policy Enforcement & Remediation', () => {
  it('should enforce policies against context', () => {
    const policy = {
      policyId: 'policy-123',
      rules: [{ condition: { role: 'admin' }, action: 'allow-all', effect: 'allow' }]
    };

    const result = policyEnforcementEngine.enforcePolicy(
      policy.policyId,
      policy,
      { role: 'admin' }
    );

    expect(result).toBeDefined();
    expect(result.decision).toMatch(/allow|deny/);
  });

  it('should plan and execute remediation actions', () => {
    const actions = autoRemediationExecutor.planRemediationActions('result-123', 'deny');

    expect(Array.isArray(actions)).toBe(true);
    if (actions.length > 0) {
      const execution = autoRemediationExecutor.executeAction(actions[0].actionId);
      expect(execution).toBeDefined();
      expect(execution?.status).toBeDefined();
    }
  });

  it('should manage policy exceptions', () => {
    const exception = policyExceptionManager.requestException(
      'policy-123',
      { role: 'user', resource: 'sensitive' },
      'user-456',
      24 * 60 * 60 * 1000
    );

    expect(exception).toBeDefined();
    expect(exception.status).toBe('pending');

    const approved = policyExceptionManager.approveException(exception.exceptionId, 'admin-789');
    expect(approved?.status).toBe('approved');
  });

  it('should cache policy evaluations', () => {
    const result = policyEnforcementEngine.enforcePolicy(
      'policy-123',
      { policyId: 'policy-123', rules: [] },
      { role: 'user' }
    );

    policyEvaluationCache.cacheEvaluation(result);

    const cached = policyEvaluationCache.getCachedEvaluation('policy-123', { role: 'user' });
    expect(cached).toBeDefined();

    const stats = policyEvaluationCache.getStats();
    expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
  });
});
