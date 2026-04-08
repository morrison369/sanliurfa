import { describe, it, expect, beforeEach } from 'vitest';
import {
  employeeManager,
  employeeProfileManager,
  employmentHistory,
  jobManager,
  applicationTracker,
  candidateManager,
  offerManager,
  onboardingManager,
  trainingManager,
  learningPathManager,
  skillDevelopment,
  performanceReviewManager,
  goalManager,
  feedbackManager,
  appraisalCycleManager,
  salaryManager,
  benefitsManager,
  equityManager,
  payrollManager,
  hrMetricsManager,
  turnoverAnalyzer,
  engagementAnalyzer,
  workforceAnalytics
} from '../index';

describe('Phase 71: Employee Management', () => {
  it('should create and retrieve employee', () => {
    const employee = employeeManager.createEmployee({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: 'active',
      type: 'full_time',
      department: 'engineering',
      title: 'Software Engineer',
      startDate: Date.now()
    });

    expect(employee.id).toBeDefined();
    expect(employee.firstName).toBe('John');

    const retrieved = employeeManager.getEmployee(employee.id);
    expect(retrieved).toEqual(employee);
  });

  it('should manage employee profiles and skills', () => {
    const employee = employeeManager.createEmployee({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      status: 'active',
      type: 'full_time',
      department: 'engineering',
      title: 'Senior Engineer',
      startDate: Date.now()
    });

    const profile = employeeProfileManager.createProfile({
      employeeId: employee.id,
      location: 'New York',
      skills: ['TypeScript', 'React']
    });

    employeeProfileManager.addSkill(employee.id, 'Node.js');

    const updated = employeeProfileManager.getProfile(employee.id);
    expect(updated?.skills).toContain('Node.js');
  });

  it('should record employment events', () => {
    const employee = employeeManager.createEmployee({
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      status: 'active',
      type: 'full_time',
      department: 'sales',
      title: 'Sales Rep',
      startDate: Date.now()
    });

    const record = employmentHistory.recordEvent({
      employeeId: employee.id,
      eventType: 'hire',
      newRole: 'Sales Rep',
      effectiveDate: Date.now(),
      notes: 'Hired from external source'
    });

    const history = employmentHistory.getHistory(employee.id);
    expect(history).toHaveLength(1);
    expect(history[0].eventType).toBe('hire');
  });
});

describe('Phase 72: Recruitment & Talent Acquisition', () => {
  it('should create job posting and manage applications', () => {
    const job = jobManager.createPosting({
      title: 'Senior Engineer',
      department: 'engineering',
      description: 'Looking for experienced engineer',
      status: 'open',
      postedDate: Date.now(),
      openPositions: 2
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe('open');

    const posted = jobManager.getPosting(job.id);
    expect(posted?.title).toBe('Senior Engineer');
  });

  it('should track candidate applications', () => {
    const candidate = candidateManager.createCandidate({
      firstName: 'Alice',
      lastName: 'Wonder',
      email: 'alice@example.com',
      phone: '555-0001',
      location: 'San Francisco',
      yearsExperience: 5,
      skills: ['Python', 'AWS'],
      source: 'linkedin'
    });

    const job = jobManager.createPosting({
      title: 'Data Engineer',
      department: 'engineering',
      description: 'Data pipeline specialist',
      status: 'open',
      postedDate: Date.now(),
      openPositions: 1
    });

    const app = applicationTracker.createApplication({
      candidateId: candidate.id,
      jobId: job.id,
      status: 'new',
      appliedDate: Date.now()
    });

    expect(app.candidateId).toBe(candidate.id);
    applicationTracker.moveToStage(app.id, 'screening');
    const updated = applicationTracker.getApplication(app.id);
    expect(updated?.status).toBe('screening');
  });

  it('should calculate candidate score and create offers', () => {
    const candidate = candidateManager.createCandidate({
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie@example.com',
      phone: '555-0002',
      location: 'Boston',
      yearsExperience: 8,
      skills: ['Java', 'Spring', 'Kubernetes', 'AWS'],
      source: 'referral'
    });

    const score = candidateManager.scoreCandidate(candidate.id);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    const offer = offerManager.createOffer({
      applicationId: 'app-123',
      title: 'Senior Backend Engineer',
      salary: 150000,
      startDate: Date.now() + 86400000 * 30
    });

    expect(offer.status).toBe('pending');
    offerManager.acceptOffer(offer.id);
    const accepted = offerManager.getOffer(offer.id);
    expect(accepted?.status).toBe('accepted');
  });
});

describe('Phase 73: Onboarding & Learning Development', () => {
  it('should create and track onboarding plans', () => {
    const plan = onboardingManager.createPlan({
      employeeId: 'emp-001',
      startDate: Date.now(),
      status: 'in_progress',
      manager: 'manager-001',
      tasks: ['Complete paperwork', 'Setup equipment', 'Team orientation', 'Role training'],
      estimatedEndDate: Date.now() + 86400000 * 30
    });

    expect(plan.tasks).toHaveLength(4);

    const progress = onboardingManager.trackProgress(plan.id);
    expect(progress.totalTasks).toBe(4);
    expect(progress.percentage).toBeGreaterThanOrEqual(0);
  });

  it('should manage training programs and enrollments', () => {
    const program = trainingManager.createProgram({
      title: 'Advanced TypeScript',
      description: 'Learn advanced TS concepts',
      type: 'skill_development',
      duration: 40
    });

    expect(program.id).toBeDefined();

    const enrollment = trainingManager.enrollEmployee('emp-001', program.id);
    expect(enrollment.status).toBe('not_started');

    trainingManager.completeTraining(enrollment.id, 95);
    const cert = trainingManager.getCertificate(enrollment.id);
    expect(cert).toContain('cert-');
  });

  it('should track learning paths and skill development', () => {
    const path = learningPathManager.createPath({
      title: 'Full Stack Development',
      description: 'Complete path from frontend to backend',
      courses: ['React Basics', 'Node.js Fundamentals', 'Database Design'],
      estimatedDuration: 120
    });

    const recommended = learningPathManager.recommendPath('emp-001');
    expect(Array.isArray(recommended)).toBe(true);

    const gaps = skillDevelopment.identifySkillGaps('emp-001');
    expect(Array.isArray(gaps)).toBe(true);
  });
});

describe('Phase 74: Performance & Goals Management', () => {
  it('should create performance reviews', () => {
    const review = performanceReviewManager.createReview({
      employeeId: 'emp-001',
      cycle: 'annual',
      reviewer: 'manager-001',
      rating: 'meets_expectations',
      comments: 'Strong performer, meets all objectives',
      goals: ['Improve code quality', 'Lead mentoring program'],
      startDate: Date.now(),
      endDate: Date.now() + 86400000 * 365
    });

    expect(review.rating).toBe('meets_expectations');

    performanceReviewManager.submitReview(review.id);
    const submitted = performanceReviewManager.getReview(review.id);
    expect(submitted?.submittedDate).toBeDefined();
  });

  it('should manage goals and track progress', () => {
    const goal = goalManager.createGoal({
      employeeId: 'emp-001',
      title: 'Improve API Performance',
      description: 'Reduce response time by 40%',
      targetDate: Date.now() + 86400000 * 90,
      status: 'in_progress',
      progress: 50,
      dueDate: Date.now() + 86400000 * 90
    });

    const progress = goalManager.trackProgress(goal.id);
    expect(progress.progress).toBe(50);

    goalManager.completeGoal(goal.id);
    const completed = goalManager.getGoal(goal.id);
    expect(completed?.status).toBe('completed');
  });

  it('should conduct 360 reviews and summarize feedback', () => {
    feedbackManager.submitFeedback({
      employeeId: 'emp-001',
      fromUserId: 'emp-002',
      type: 'peer',
      category: 'collaboration',
      rating: 4,
      comment: 'Great team player',
      timestamp: Date.now()
    });

    feedbackManager.submitFeedback({
      employeeId: 'emp-001',
      fromUserId: 'manager-001',
      type: 'manager',
      category: 'performance',
      rating: 5,
      comment: 'Exceeds expectations',
      timestamp: Date.now()
    });

    const review360 = feedbackManager.conduct360Review('emp-001');
    expect(review360.rating).toBeGreaterThan(0);
    expect(review360.feedbackByType).toBeDefined();
  });
});

describe('Phase 75: Compensation & Benefits Management', () => {
  it('should create and manage salaries', () => {
    const salary = salaryManager.createSalary({
      employeeId: 'emp-001',
      baseSalary: 100000,
      currency: 'USD',
      payFrequency: 'annual',
      effectiveDate: Date.now()
    });

    expect(salary.baseSalary).toBe(100000);

    const annual = salaryManager.calculateAnnualSalary('emp-001');
    expect(annual).toBe(100000);
  });

  it('should manage benefits and enrollments', () => {
    const benefit = benefitsManager.createBenefit({
      title: 'Health Insurance',
      type: 'health_insurance',
      description: 'Comprehensive health coverage',
      employerContribution: 500,
      employeeContribution: 100
    });

    const enrollment = benefitsManager.enrollEmployee('emp-001', benefit.id);
    expect(enrollment.status).toBe('active');

    const benefits = benefitsManager.getEmployeeBenefits('emp-001');
    expect(benefits).toHaveLength(1);

    const value = benefitsManager.calculateTotalBenefitValue('emp-001');
    expect(value).toBeGreaterThan(0);
  });

  it('should manage equity grants and vesting', () => {
    const equity = equityManager.grantEquity({
      employeeId: 'emp-001',
      type: 'stock_options',
      quantity: 1000,
      grantDate: Date.now(),
      vestingSchedule: '4-year cliff with 1-year cliff',
      vestedQuantity: 0
    });

    expect(equity.quantity).toBe(1000);

    const grants = equityManager.getGrants('emp-001');
    expect(grants).toHaveLength(1);

    const vesting = equityManager.getVestingSchedule(equity.id);
    expect(vesting.totalQuantity).toBe(1000);
  });

  it('should process payroll', () => {
    const payroll = payrollManager.createPayrollRun({
      period: '2026-04',
      startDate: Date.now(),
      endDate: Date.now() + 86400000 * 30,
      employees: ['emp-001', 'emp-002']
    });

    expect(payroll.status).toBe('pending');

    const paycheck = payrollManager.calculatePaycheck('emp-001', '2026-04');
    expect(paycheck.grossPay).toBeGreaterThan(0);
    expect(paycheck.netPay).toBeLessThan(paycheck.grossPay);

    payrollManager.processPayroll(payroll.id);
    const processed = payrollManager.getPayrollRun(payroll.id);
    expect(processed?.status).toBe('processed');
  });
});

describe('Phase 76: HR Analytics & Insights', () => {
  it('should track and compare HR metrics', () => {
    hrMetricsManager.recordMetrics({
      period: '2026-Q1',
      headcount: 150,
      newHires: 12,
      terminations: 2,
      turnoverRate: 1.33,
      avgTenure: 3.5,
      openPositions: 8
    });

    const metrics = hrMetricsManager.getMetrics('2026-Q1');
    expect(metrics?.headcount).toBe(150);

    const calculated = hrMetricsManager.calculateMetrics(Date.now(), Date.now() + 86400000);
    expect(calculated.period).toBeDefined();
  });

  it('should analyze turnover and identify risk', () => {
    const turnover = turnoverAnalyzer.analyze('2026-Q1');
    expect(turnover.period).toBe('2026-Q1');

    const risk = turnoverAnalyzer.predictTurnover('emp-001');
    expect(risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(risk.riskScore).toBeLessThanOrEqual(100);
  });

  it('should calculate engagement scores and identify disengaged employees', () => {
    const engagement = engagementAnalyzer.calculateScore('emp-001');
    expect(engagement.overallScore).toBeGreaterThanOrEqual(0);
    expect(engagement.overallScore).toBeLessThanOrEqual(100);

    const disengaged = engagementAnalyzer.identifyDisengagedEmployees();
    expect(Array.isArray(disengaged)).toBe(true);

    const interventions = engagementAnalyzer.recommendInterventions('emp-001');
    expect(Array.isArray(interventions)).toBe(true);
  });

  it('should provide workforce analytics and planning insights', () => {
    const headcount = workforceAnalytics.headcountAnalysis(Date.now());
    expect(headcount.total).toBeGreaterThan(0);
    expect(headcount.byDepartment).toBeDefined();

    const hiring = workforceAnalytics.hiringSummary('2026-Q1');
    expect(hiring.totalHired).toBeGreaterThanOrEqual(0);

    const diversity = workforceAnalytics.getDiversityMetrics('2026-Q1');
    expect(diversity.totalEmployees).toBeGreaterThan(0);

    const skills = workforceAnalytics.skillGapAnalysis();
    expect(skills.criticalGaps).toBeDefined();

    const succession = workforceAnalytics.successorPlanningAnalysis();
    expect(succession.criticalRoles).toBeDefined();
  });
});
