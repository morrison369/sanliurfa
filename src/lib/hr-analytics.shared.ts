import { employeeManager, employeeProfileManager, type DepartmentType, type Employee } from './hr-employees';
import { feedbackManager, goalManager, performanceReviewManager } from './hr-performance';

export interface HRMetrics {
  period: string;
  headcount: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  avgTenure: number;
  openPositions: number;
}

export interface TurnoverAnalysis {
  period: string;
  voluntaryTurnover: number;
  involuntaryTurnover: number;
  topReasons: Record<string, number>;
  riskEmployees: string[];
}

export interface EngagementScore {
  employeeId: string;
  overallScore: number;
  scorecards: Record<string, number>;
  trend: 'improving' | 'declining' | 'stable';
  risks: string[];
}

export interface DiversityMetrics {
  period: string;
  totalEmployees: number;
  byGender: Record<string, number>;
  byEthnicity: Record<string, number>;
  byAge: Record<string, number>;
  byDepartment: Record<string, any>;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getPeriodBounds(period: string): { start: number; end: number } | null {
  const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterMatch) {
    const year = Number.parseInt(quarterMatch[1], 10);
    const quarter = Number.parseInt(quarterMatch[2], 10);
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1).getTime();
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number.parseInt(monthMatch[1], 10);
    const month = Number.parseInt(monthMatch[2], 10) - 1;
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return { start, end };
  }

  return null;
}

export function getEmployeesActiveOn(asOfDate: number): Employee[] {
  return employeeManager
    .listEmployees()
    .filter(employee => employee.startDate <= asOfDate && (!employee.endDate || employee.endDate >= asOfDate));
}

export function getDepartmentSkillRequirements(): Record<DepartmentType, string[]> {
  return {
    engineering: ['TypeScript', 'Testing', 'Cloud Architecture'],
    sales: ['Negotiation', 'CRM', 'Forecasting'],
    marketing: ['Analytics', 'Content Strategy', 'Campaign Management'],
    operations: ['Process Improvement', 'Project Management', 'Reporting'],
    finance: ['Financial Planning', 'Excel', 'Compliance'],
    hr: ['People Operations', 'Coaching', 'Compliance'],
    other: ['Communication', 'Reporting']
  };
}

export function getPerformanceScore(employeeId: string): number {
  const latestReview = performanceReviewManager.getPerformanceHistory(employeeId)[0];
  if (!latestReview) return 55;

  switch (latestReview.rating) {
    case 'exceeds_expectations':
      return 92;
    case 'meets_expectations':
      return 76;
    case 'needs_improvement':
      return 48;
    case 'underperforming':
      return 32;
    default:
      return 55;
  }
}

export function getGoalCompletionScore(employeeId: string): number {
  const goals = goalManager.listGoals(employeeId);
  if (goals.length === 0) return 60;
  const averageProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;
  return clamp(averageProgress, 0, 100);
}

export function getFeedbackScore(employeeId: string): number {
  const feedback = feedbackManager.getFeedback(employeeId);
  if (feedback.length === 0) return 60;
  const averageRating = feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length;
  return clamp(averageRating * 20, 0, 100);
}

export function buildEngagementSnapshot(employeeId: string): Omit<EngagementScore, 'trend'> {
  const employee = employeeManager.getEmployee(employeeId);
  const profile = employeeProfileManager.getProfile(employeeId);
  const tenureDays = employee ? Math.max(1, Math.floor((Date.now() - employee.startDate) / DAY_MS)) : 0;
  const profileSkills = profile?.skills || [];
  const profileLanguages = profile?.languages || [];
  const profileCompleteness = profile
    ? [profile.location, profile.officeLocation, profile.bio, profileSkills.length > 0, profileLanguages.length > 0]
        .filter(Boolean).length / 5
    : 0;

  const scorecards: Record<string, number> = {
    satisfaction: round((getPerformanceScore(employeeId) * 0.55) + (getFeedbackScore(employeeId) * 0.45)),
    alignment: round((getGoalCompletionScore(employeeId) * 0.65) + (employee?.managerId ? 15 : 5)),
    growth: round(clamp(profileSkills.length * 12 + ((profile?.certifications || []).length * 10) + (tenureDays > 365 ? 20 : 10), 0, 100)),
    workLifeBalance: round(clamp(55 + profileCompleteness * 20 + (employee?.status === 'on_leave' ? -10 : 10), 0, 100))
  };

  const overallScore = round(
    Object.values(scorecards).reduce((sum, score) => sum + score, 0) / Object.keys(scorecards).length
  );

  const risks: string[] = [];
  if (scorecards.satisfaction < 55) risks.push('Low satisfaction');
  if (scorecards.alignment < 55) risks.push('Misalignment with goals');
  if (scorecards.growth < 55) risks.push('Limited growth opportunities');
  if (scorecards.workLifeBalance < 55) risks.push('Work-life balance concerns');

  return {
    employeeId,
    overallScore,
    scorecards,
    risks
  };
}
