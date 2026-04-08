/**
 * Advanced Security & Zero Trust (Phase 155-160)
 * Test suite for supply chain security, threat modeling, secrets management,
 * security automation, compliance, and incident response
 */

import { describe, it, expect } from 'vitest';
import {
  dependencyScanner,
  vulnerabilityTracker,
  sbomGenerator,
  licenseCompliance,
  threatModeler,
  attackSurfaceAnalyzer,
  riskAssessment,
  mitigationPlanner,
  secretsVault,
  secretRotationManager,
  secretInjector,
  secretAuditor,
  securityScanOrchestrator,
  policyEnforcer,
  incidentAutoResponder,
  securityCheckRunner,
  complianceMapper,
  auditTrailManager,
  policyManager,
  complianceReporter,
  incidentDetector,
  incidentOrchestrator,
  forensicAnalyzer,
  postIncidentReviewer
} from '../index';

// Phase 155: Supply Chain Security
describe('Phase 155: Supply Chain Security', () => {
  it('should scan dependencies and identify vulnerabilities', () => {
    const scan = dependencyScanner.scan('package.json');
    expect(scan).toBeDefined();
    expect(Array.isArray(scan.dependencies)).toBe(true);
    expect(scan.count).toBeGreaterThan(0);
    expect(scan.transitive).toBeGreaterThanOrEqual(0);
  });

  it('should generate SBOM in multiple formats', () => {
    const dependencies = [
      { name: 'express', version: '4.18.2', type: 'direct' as const }
    ];
    const sbom = sbomGenerator.generateSBOM('myapp', dependencies, 'cyclonedx');
    expect(sbom).toBeDefined();
    expect(sbom.format).toBe('cyclonedx');
    expect(Array.isArray(sbom.components)).toBe(true);
    expect(sbom.metadata).toHaveProperty('timestamp');
  });

  it('should check license compliance', () => {
    const deps = [{ name: 'express', version: '4.18.2', type: 'direct' as const }];
    const result = licenseCompliance.checkLicenses(deps);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('compliant');
    expect(result).toHaveProperty('incompatible');
    expect(result).toHaveProperty('warnings');
  });

  it('should track vulnerabilities with severity scoring', () => {
    const dep = { name: 'express', version: '4.17.0', type: 'direct' as const };
    const vulns = vulnerabilityTracker.track(dep);
    expect(Array.isArray(vulns)).toBe(true);
    if (vulns.length > 0) {
      expect(vulns[0]).toHaveProperty('severity');
      expect(vulns[0]).toHaveProperty('cvsScore');
    }
  });
});

// Phase 156: Threat Modeling & Risk Assessment
describe('Phase 156: Threat Modeling & Risk Assessment', () => {
  it('should identify threats using STRIDE methodology', () => {
    const threats = threatModeler.identifyThreats('payment-service');
    expect(Array.isArray(threats)).toBe(true);
    expect(threats.length).toBeGreaterThan(0);
    expect(threats[0]).toHaveProperty('category');
    expect(['spoofing', 'tampering', 'elevation_of_privilege']).toContain(threats[0].category);
  });

  it('should map attack surface with entry points', () => {
    const surface = attackSurfaceAnalyzer.mapAttackSurface('api');
    expect(surface).toBeDefined();
    expect(Array.isArray(surface.entryPoints)).toBe(true);
    expect(Array.isArray(surface.trustBoundaries)).toBe(true);
    expect(surface.entryPoints.length).toBeGreaterThan(0);
  });

  it('should assess and score risks', () => {
    const risk = riskAssessment.scoreRisk('sql-injection', 0.3, 0.9);
    expect(risk).toBeDefined();
    expect(risk.riskScore).toBeGreaterThan(0);
    expect(risk.severity).toMatch(/low|medium|high|critical/);
    expect(risk).toHaveProperty('priority');
  });

  it('should plan mitigations for threats', () => {
    const mitigation = mitigationPlanner.planMitigation('threat-001', 'spoofing');
    expect(mitigation).toBeDefined();
    expect(mitigation).toHaveProperty('strategy');
    expect(Array.isArray(mitigation.controls)).toBe(true);
    expect(mitigation).toHaveProperty('effectiveness');
  });
});

// Phase 157: Secrets Management & Rotation
describe('Phase 157: Secrets Management & Rotation', () => {
  it('should securely store and retrieve secrets', () => {
    const secret = secretsVault.storeSecret('api-key', 'secret-value-123');
    expect(secret).toBeDefined();
    expect(secret.name).toBe('api-key');
    expect(secret.encrypted).toBe(true);
    expect(secret.version).toBe(1);
  });

  it('should schedule and track secret rotation', () => {
    const rotation = secretRotationManager.scheduleRotation('db-password', 30, 'rolling');
    expect(rotation).toBeDefined();
    expect(rotation.secretName).toBe('db-password');
    expect(rotation.intervalDays).toBe(30);
    expect(rotation).toHaveProperty('nextRotation');
  });

  it('should inject secrets into applications', () => {
    const injection = secretInjector.injectSecret({
      secretName: 'api-key',
      injectionMethod: 'environment',
      target: 'app-service'
    });
    expect(injection.injected).toBe(true);
    expect(injection.method).toBe('environment');
  });

  it('should audit all secret access', () => {
    const log = secretAuditor.logAccess('api-key', 'user-123', 'read', true);
    expect(log).toBeDefined();
    expect(log.secretName).toBe('api-key');
    expect(log.action).toBe('read');
    expect(log.authorized).toBe(true);
  });
});

// Phase 158: Security Automation & Response
describe('Phase 158: Security Automation & Response', () => {
  it('should run automated security scans', async () => {
    const result = await securityScanOrchestrator.runScans('application', ['sast', 'dast']);
    expect(result).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('passed');
  });

  it('should define and enforce security policies', () => {
    const policy = policyEnforcer.definePolicy({
      name: 'no-hardcoded-secrets',
      condition: 'secrets-in-code',
      severity: 'critical',
      enabled: true,
      routingTargets: ['security-team']
    });
    expect(policy).toBeDefined();
    expect(policy.id).toBeDefined();
  });

  it('should orchestrate automated incident response', async () => {
    const response = await incidentAutoResponder.respond('malware-detected', 'server-123');
    expect(response.initiated).toBe(true);
    expect(Array.isArray(response.actions)).toBe(true);
    expect(response.actions.length).toBeGreaterThan(0);
  });

  it('should run scheduled security checks', () => {
    const result = securityCheckRunner.runScheduledChecks(['ssl-certificate-valid', 'firewall-enabled']);
    expect(result).toBeDefined();
    expect(result.totalChecks).toBeGreaterThan(0);
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('failed');
  });
});

// Phase 159: Compliance Frameworks & Standards
describe('Phase 159: Compliance Frameworks & Standards', () => {
  it('should map compliance requirements', () => {
    const mapping = complianceMapper.mapRequirements('GDPR', 'data-protection');
    expect(mapping).toBeDefined();
    expect(Array.isArray(mapping.requirements)).toBe(true);
    expect(Array.isArray(mapping.controls)).toBe(true);
  });

  it('should maintain immutable audit trail', () => {
    const entry = auditTrailManager.logAction('user-123', 'create', 'resource-456', { name: 'test' });
    expect(entry).toBeDefined();
    expect(entry.entryId).toBeDefined();
    expect(entry.timestamp).toBeGreaterThan(0);
  });

  it('should define and enforce policies', () => {
    const policy = policyManager.definePolicy('access-control', 'Role-based access control', [], ['admin', 'user']);
    expect(policy).toBeDefined();
    expect(policy.policyId).toBeDefined();
    expect(policy.version).toBe(1);
  });

  it('should generate compliance reports', () => {
    const report = complianceReporter.generateReport('GDPR', { start: Date.now() - 30 * 24 * 60 * 60 * 1000, end: Date.now() });
    expect(report).toBeDefined();
    expect(report.framework).toBe('GDPR');
    expect(report).toHaveProperty('coverage');
    expect(Array.isArray(report.gaps)).toBe(true);
  });
});

// Phase 160: Security Incident Response & Forensics
describe('Phase 160: Security Incident Response & Forensics', () => {
  it('should detect security incidents', () => {
    const incident = incidentDetector.detectIncident({
      severity: 'high',
      affectedAssets: ['server-1', 'server-2']
    });
    expect(incident).toBeDefined();
    expect(incident.incidentId).toBeDefined();
    expect(incident.status).toBe('detected');
  });

  it('should orchestrate incident response', async () => {
    const incident = incidentDetector.detectIncident({ severity: 'critical' });
    const response = await incidentOrchestrator.respond(incident);
    expect(response).toBeDefined();
    expect(response.status).toBe('in_progress');
    expect(Array.isArray(response.actions)).toBe(true);
  });

  it('should collect and preserve forensic evidence', () => {
    const evidence = forensicAnalyzer.collectEvidence('incident-123', 'log', 'syslog', 'log-data');
    expect(evidence).toBeDefined();
    expect(evidence.evidenceId).toBeDefined();
    expect(evidence.preserved).toBe(true);
    expect(evidence.hash).toBeDefined();
  });

  it('should conduct post-incident review and extract lessons', () => {
    const incident = incidentDetector.detectIncident({ severity: 'high' });
    const timeline = {
      incidentId: incident.incidentId,
      events: [],
      initialCompromise: Date.now() - 60 * 60 * 1000,
      detection: Date.now()
    };
    const review = postIncidentReviewer.conduct(incident, timeline);
    expect(review).toBeDefined();
    expect(review.reviewId).toBeDefined();
    expect(review).toHaveProperty('rootCause');
    expect(Array.isArray(review.lessonsLearned)).toBe(true);
  });
});
