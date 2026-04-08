import { describe, it, expect } from 'vitest';
import {
  contractManager,
  templateManager,
  documentManager,
  partyManager,
  complianceManager,
  auditManager,
  findingManager,
  checklistManager,
  privacyPolicyManager,
  consentManager,
  dataSubjectRequestManager,
  processingActivityManager,
  riskManager,
  controlManager,
  mitigationManager,
  riskRegisterManager,
  boardManager,
  meetingManager,
  resolutionManager,
  policyManager,
  legalMetricsManager,
  contractAnalyzer,
  complianceAnalyzer,
  riskAnalytics,
  governanceAnalytics
} from '../index';

describe('Phase 77: Legal & Contract Management', () => {
  it('should create and manage contracts', () => {
    const contract = contractManager.createContract({
      name: 'Service Agreement',
      type: 'service',
      parties: ['company1', 'vendor1'],
      startDate: Date.now(),
      status: 'active',
      value: 50000,
      currency: 'USD',
      createdBy: 'admin'
    });

    expect(contract.id).toBeDefined();
    expect(contract.name).toBe('Service Agreement');

    const retrieved = contractManager.getContract(contract.id);
    expect(retrieved?.status).toBe('active');
  });

  it('should handle contract templates', () => {
    const template = templateManager.createTemplate({
      name: 'Standard NDA',
      type: 'nda',
      description: 'Standard Non-Disclosure Agreement',
      content: 'NDA content here...',
      sections: ['Confidentiality', 'Exceptions', 'Duration']
    });

    expect(template.id).toBeDefined();

    const created = templateManager.createContractFromTemplate(template.id, {
      name: 'Vendor NDA',
      parties: ['our-company', 'vendor'],
      createdBy: 'legal-team'
    });

    expect(created.type).toBe('nda');
  });

  it('should manage contract parties', () => {
    const contract = contractManager.createContract({
      name: 'Partnership',
      type: 'partnership',
      parties: [],
      startDate: Date.now(),
      status: 'active',
      createdBy: 'admin'
    });

    const party = partyManager.addParty({
      contractId: contract.id,
      name: 'Acme Corp',
      type: 'organization',
      email: 'contact@acme.com'
    });

    expect(party.id).toBeDefined();

    const parties = partyManager.getContractParties(contract.id);
    expect(parties).toHaveLength(1);
  });

  it('should track contract lifecycle', () => {
    const contract = contractManager.createContract({
      name: 'Lease Agreement',
      type: 'lease',
      parties: [],
      startDate: Date.now(),
      endDate: Date.now() + 365 * 86400000,
      status: 'active',
      createdBy: 'admin'
    });

    const expiring = contractManager.getExpiringContracts(90);
    expect(Array.isArray(expiring)).toBe(true);

    contractManager.terminateContract(contract.id, 'Early termination');
    const terminated = contractManager.getContract(contract.id);
    expect(terminated?.status).toBe('terminated');
  });
});

describe('Phase 78: Compliance Management & Auditing', () => {
  it('should create compliance requirements', () => {
    const requirement = complianceManager.createRequirement({
      framework: 'soc2',
      requirementId: 'CC7.2',
      title: 'User access controls',
      description: 'Implement access control measures',
      owner: 'security-team',
      dueDate: Date.now() + 90 * 86400000,
      status: 'in_progress'
    });

    expect(requirement.id).toBeDefined();
    expect(requirement.framework).toBe('soc2');

    complianceManager.markCompliant(requirement.id);
    const updated = complianceManager.getRequirement(requirement.id);
    expect(updated?.status).toBe('compliant');
  });

  it('should manage audits and findings', () => {
    const audit = auditManager.createAudit({
      type: 'external',
      framework: 'iso27001',
      startDate: Date.now(),
      status: 'in_progress',
      auditor: 'external-auditor',
      scope: 'Information security systems'
    });

    expect(audit.id).toBeDefined();

    const finding = findingManager.recordFinding({
      auditId: audit.id,
      severity: 'high',
      category: 'access_control',
      description: 'Missing access logs'
    });

    expect(finding.severity).toBe('high');

    findingManager.remediateFinding(finding.id, 'Implemented access logging');
    const remediated = findingManager.getFinding(finding.id);
    expect(remediated?.status).toBe('remediated');
  });

  it('should track compliance checklists', () => {
    const checklist = checklistManager.createChecklist({
      framework: 'hipaa',
      name: 'HIPAA Compliance Checklist',
      items: [
        { id: '1', description: 'Data encryption', completed: false },
        { id: '2', description: 'Access logs', completed: true, completedDate: Date.now() },
        { id: '3', description: 'Audit trail', completed: false }
      ],
      progress: 33,
      dueDate: Date.now() + 60 * 86400000
    });

    const progress = checklistManager.getChecklistProgress(checklist.id);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(3);
  });
});

describe('Phase 79: Data Privacy & GDPR', () => {
  it('should manage privacy policies', () => {
    const policy = privacyPolicyManager.createPolicy({
      version: 1,
      effectiveDate: Date.now(),
      content: 'Privacy policy content...',
      categories: ['personal_data', 'cookies', 'third_parties'],
      lastReviewDate: Date.now(),
      nextReviewDate: Date.now() + 365 * 86400000
    });

    expect(policy.id).toBeDefined();
    expect(policy.version).toBe(1);

    const current = privacyPolicyManager.getCurrentPolicy();
    expect(current?.id).toBe(policy.id);
  });

  it('should handle consent management', () => {
    consentManager.recordConsent({
      dataSubjectId: 'user-123',
      type: 'marketing',
      given: true,
      givenDate: Date.now(),
      basis: 'consent',
      status: 'active'
    });

    const hasConsent = consentManager.checkConsent('user-123', 'marketing');
    expect(hasConsent).toBe(true);

    const status = consentManager.getConsentStatus('user-123');
    expect(status.marketing).toBe(true);
  });

  it('should track data subject requests', () => {
    const request = dataSubjectRequestManager.createRequest({
      subjectId: 'user-456',
      type: 'access',
      description: 'Request for data access',
      status: 'received',
      submittedDate: Date.now(),
      dueDate: Date.now() + 30 * 86400000
    });

    expect(request.id).toBeDefined();
    expect(request.type).toBe('access');

    dataSubjectRequestManager.completeRequest(request.id);
    const completed = dataSubjectRequestManager.getRequest(request.id);
    expect(completed?.status).toBe('completed');
  });

  it('should manage processing activities', () => {
    const activity = processingActivityManager.recordActivity({
      name: 'Customer data processing',
      description: 'Processing of customer contact information',
      basis: 'contract',
      categories: ['contact_info', 'purchase_history'],
      recipients: ['sales-team', 'marketing-team'],
      retentionPeriod: 365
    });

    expect(activity.id).toBeDefined();

    const inventory = processingActivityManager.getDataInventory();
    expect(inventory['contact_info']).toBeDefined();
  });
});

describe('Phase 80: Risk Management & Controls', () => {
  it('should identify and track risks', () => {
    const risk = riskManager.identifyRisk({
      title: 'Data breach',
      description: 'Potential unauthorized access to customer data',
      category: 'technology',
      probability: 'medium',
      impact: 'critical',
      owner: 'ciso',
      identifiedDate: Date.now(),
      status: 'identified'
    });

    expect(risk.id).toBeDefined();

    const score = riskManager.calculateRiskScore(risk.id);
    expect(score).toBeGreaterThan(0);

    const highest = riskManager.getHighestRisks(5);
    expect(Array.isArray(highest)).toBe(true);
  });

  it('should implement and test controls', () => {
    const risk = riskManager.identifyRisk({
      title: 'Test risk',
      description: 'Risk for testing',
      category: 'operational',
      probability: 'low',
      impact: 'moderate',
      owner: 'team',
      identifiedDate: Date.now(),
      status: 'identified'
    });

    const control = controlManager.implementControl({
      riskId: risk.id,
      name: 'Access control',
      type: 'preventive',
      description: 'Implement access restrictions',
      owner: 'security',
      status: 'designed',
      effectiveness: 0
    });

    expect(control.id).toBeDefined();

    controlManager.testControl(control.id, 85);
    const tested = controlManager.getControl(control.id);
    expect(tested?.effectiveness).toBe(85);
  });

  it('should manage risk mitigation', () => {
    const risk = riskManager.identifyRisk({
      title: 'Supply chain disruption',
      description: 'Supplier availability',
      category: 'operational',
      probability: 'medium',
      impact: 'major',
      owner: 'ops',
      identifiedDate: Date.now(),
      status: 'identified'
    });

    const mitigation = mitigationManager.createMitigation({
      riskId: risk.id,
      strategy: 'Diversify suppliers',
      actions: ['Find backup suppliers', 'Establish agreements'],
      targetDate: Date.now() + 90 * 86400000,
      owner: 'procurement'
    });

    expect(mitigation.id).toBeDefined();
    expect(mitigation.status).toBe('planned');

    mitigationManager.completeMitigation(mitigation.id);
    const completed = mitigationManager.getMitigation(mitigation.id);
    expect(completed?.status).toBe('completed');
  });

  it('should generate risk registers', () => {
    const register = riskRegisterManager.generateRegister('2026-Q1');
    expect(register.id).toBeDefined();
    expect(register.period).toBe('2026-Q1');

    riskRegisterManager.approveRegister(register.id, 'ceo');
    const approved = riskRegisterManager.getRegister(register.id);
    expect(approved?.approvedBy).toBe('ceo');
  });
});

describe('Phase 81: Governance & Board Management', () => {
  it('should manage board members', () => {
    const member = boardManager.addBoardMember({
      name: 'John Smith',
      email: 'john@company.com',
      role: 'director',
      appointmentDate: Date.now(),
      expertise: ['Finance', 'Compliance'],
      status: 'active'
    });

    expect(member.id).toBeDefined();
    expect(member.role).toBe('director');

    const composition = boardManager.getBoardComposition();
    expect(composition.director).toBeGreaterThanOrEqual(1);
  });

  it('should schedule and track meetings', () => {
    const meeting = meetingManager.scheduleMeeting({
      type: 'board',
      scheduledDate: Date.now() + 30 * 86400000,
      agenda: ['Q1 Review', 'Strategic Planning', 'Budget Approval'],
      attendees: ['member-1', 'member-2'],
      status: 'scheduled'
    });

    expect(meeting.id).toBeDefined();
    expect(meeting.type).toBe('board');

    meetingManager.recordMinutes(meeting.id, 'Meeting minutes content...');
    const recorded = meetingManager.getMeeting(meeting.id);
    expect(recorded?.status).toBe('completed');
  });

  it('should manage resolutions', () => {
    const meeting = meetingManager.scheduleMeeting({
      type: 'board',
      scheduledDate: Date.now(),
      agenda: [],
      attendees: [],
      status: 'scheduled'
    });

    const resolution = resolutionManager.proposeResolution({
      meetingId: meeting.id,
      title: 'Approve Annual Budget',
      type: 'special',
      description: '2026 Annual budget approval',
      proposedBy: 'cfo'
    });

    expect(resolution.id).toBeDefined();

    resolutionManager.recordVote(resolution.id, 7, 1, 0);
    resolutionManager.approveResolution(resolution.id);
    const approved = resolutionManager.getResolution(resolution.id);
    expect(approved?.status).toBe('approved');
  });

  it('should manage governance policies', () => {
    const policy = policyManager.createPolicy({
      name: 'Code of Conduct',
      category: 'ethics',
      content: 'Code of conduct policy...',
      version: 1,
      effectiveDate: Date.now(),
      lastReviewDate: Date.now(),
      nextReviewDate: Date.now() + 365 * 86400000
    });

    expect(policy.id).toBeDefined();

    const forReview = policyManager.getPoliciesForReview();
    expect(Array.isArray(forReview)).toBe(true);
  });
});

describe('Phase 82: Legal Analytics & Insights', () => {
  it('should track legal metrics', () => {
    legalMetricsManager.recordMetrics({
      period: '2026-Q1',
      totalContracts: 45,
      activeContracts: 38,
      expiringContracts: 5,
      expiredContracts: 2,
      complianceScore: 82,
      riskScore: 35
    });

    const metrics = legalMetricsManager.getMetrics('2026-Q1');
    expect(metrics?.totalContracts).toBe(45);

    const calculated = legalMetricsManager.calculateMetrics(Date.now(), Date.now() + 86400000);
    expect(calculated.period).toBeDefined();
  });

  it('should analyze contracts', () => {
    const analytics = contractAnalyzer.analyzeContracts('2026-Q1');
    expect(analytics.period).toBe('2026-Q1');
    expect(analytics.byType).toBeDefined();

    const value = contractAnalyzer.calculateContractValue('2026-Q1');
    expect(value).toBeGreaterThan(0);

    const opportunities = contractAnalyzer.identifyRenewalOpportunities();
    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should analyze compliance', () => {
    const analysis = complianceAnalyzer.analyzeCompliance('2026-Q1');
    expect(analysis.overallCompliance).toBeGreaterThan(0);

    const gaps = complianceAnalyzer.identifyComplianceGaps();
    expect(Object.keys(gaps).length).toBeGreaterThan(0);

    const progress = complianceAnalyzer.trackRemediationProgress();
    expect(Object.keys(progress).length).toBeGreaterThan(0);
  });

  it('should analyze risks and governance', () => {
    const risks = riskAnalytics.analyzeRisks('2026-Q1');
    expect(risks.totalRisks).toBeGreaterThanOrEqual(0);

    const heatmap = riskAnalytics.getRiskHeatmap();
    expect(Object.keys(heatmap).length).toBeGreaterThan(0);

    const topRisks = riskAnalytics.getTopRisks(5);
    expect(Array.isArray(topRisks)).toBe(true);

    const governance = governanceAnalytics.getGovernanceScorecard();
    expect(governance.overallGovernance).toBeDefined();
  });
});
