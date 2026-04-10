/**
 * Phase 75: Compensation & Benefits Management
 * Salary management, benefits administration, payroll integration, equity tracking
 */

import { logger } from './logging';
import { employeeManager } from './hr-employees';

// ==================== TYPES & INTERFACES ====================

export type BenefitType = 'health_insurance' | 'dental' | 'vision' | '401k' | 'pto' | 'life_insurance' | 'disability';
export type PayFrequency = 'weekly' | 'biweekly' | 'monthly' | 'annual';
export type EquityType = 'stock_options' | 'rsu' | 'espp' | 'phantom_stock';

export interface Salary {
  id: string;
  employeeId: string;
  baseSalary: number;
  currency: string;
  payFrequency: PayFrequency;
  effectiveDate: number;
  endDate?: number;
  createdAt: number;
}

export interface Benefit {
  id: string;
  title: string;
  type: BenefitType;
  description: string;
  employerContribution: number;
  employeeContribution: number;
  createdAt: number;
}

export interface BenefitEnrollment {
  id: string;
  employeeId: string;
  benefitId: string;
  status: 'active' | 'inactive';
  enrolledDate: number;
  coverage?: string;
  createdAt: number;
}

export interface Equity {
  id: string;
  employeeId: string;
  type: EquityType;
  quantity: number;
  grantDate: number;
  vestingSchedule: string;
  vestedQuantity: number;
  createdAt: number;
}

export interface PayrollRun {
  id: string;
  period: string;
  startDate: number;
  endDate: number;
  employees: string[];
  status: 'pending' | 'processed' | 'paid';
  createdAt: number;
}

export interface Paycheck {
  grossPay: number;
  deductions: number;
  netPay: number;
  benefitDeductions: number;
  taxWithholding: number;
  payrollTax: number;
  currency: string;
  payFrequency: PayFrequency;
  annualizedSalary: number;
  period: string;
}

// ==================== SALARY MANAGER ====================

export class SalaryManager {
  private salaries = new Map<string, Salary[]>();
  private salaryCount = 0;

  /**
   * Create salary
   */
  createSalary(salary: Omit<Salary, 'id' | 'createdAt'>): Salary {
    const id = 'sal-' + Date.now() + '-' + this.salaryCount++;

    const newSalary: Salary = {
      ...salary,
      id,
      createdAt: Date.now()
    };

    const employeeHistory = this.salaries.get(salary.employeeId) || [];
    employeeHistory.push(newSalary);
    this.salaries.set(salary.employeeId, employeeHistory);

    logger.info('Salary created', { salaryId: id, employeeId: salary.employeeId, amount: salary.baseSalary });

    return newSalary;
  }

  /**
   * Get current salary
   */
  getSalary(employeeId: string): Salary | null {
    const history = this.salaries.get(employeeId) || [];
    const now = Date.now();
    return (
      history.find(s => s.effectiveDate <= now && (!s.endDate || s.endDate >= now)) ||
      history[history.length - 1] ||
      null
    );
  }

  /**
   * Get salary history
   */
  getSalaryHistory(employeeId: string): Salary[] {
    return this.salaries.get(employeeId) || [];
  }

  /**
   * Update salary
   */
  updateSalary(employeeId: string, newSalary: number, effectiveDate: number): void {
    const current = this.getSalary(employeeId);
    if (current) {
      current.endDate = effectiveDate - 1;
    }

    this.createSalary({
      employeeId,
      baseSalary: newSalary,
      currency: current?.currency || 'USD',
      payFrequency: current?.payFrequency || 'monthly',
      effectiveDate
    });

    logger.info('Salary updated', { employeeId, newSalary, effectiveDate });
  }

  /**
   * Calculate annual salary
   */
  calculateAnnualSalary(employeeId: string): number {
    const salary = this.getSalary(employeeId);
    if (!salary) return 0;

    switch (salary.payFrequency) {
      case 'weekly':
        return salary.baseSalary * 52;
      case 'biweekly':
        return salary.baseSalary * 26;
      case 'monthly':
        return salary.baseSalary * 12;
      case 'annual':
        return salary.baseSalary;
      default:
        return 0;
    }
  }

  /**
   * Compare salaries
   */
  compareSalaries(department: string): Record<string, any> {
    const employees = employeeManager.listEmployees('active').filter(employee => employee.department === department);
    const annualSalaries = employees
      .map(employee => this.calculateAnnualSalary(employee.id))
      .filter(amount => amount > 0)
      .sort((left, right) => left - right);

    const count = annualSalaries.length;
    const total = annualSalaries.reduce((sum, amount) => sum + amount, 0);
    const medianSalary = count === 0
      ? 0
      : count % 2 === 1
        ? annualSalaries[(count - 1) / 2]
        : (annualSalaries[count / 2 - 1] + annualSalaries[count / 2]) / 2;

    return {
      department,
      averageSalary: count > 0 ? Math.round(total / count) : 0,
      medianSalary: Math.round(medianSalary),
      minSalary: count > 0 ? annualSalaries[0] : 0,
      maxSalary: count > 0 ? annualSalaries[count - 1] : 0,
      count
    };
  }
}

// ==================== BENEFITS MANAGER ====================

export class BenefitsManager {
  private benefits = new Map<string, Benefit>();
  private enrollments = new Map<string, BenefitEnrollment[]>();
  private benefitCount = 0;
  private enrollmentCount = 0;

  /**
   * Create benefit
   */
  createBenefit(benefit: Omit<Benefit, 'id' | 'createdAt'>): Benefit {
    const id = 'ben-' + Date.now() + '-' + this.benefitCount++;

    const newBenefit: Benefit = {
      ...benefit,
      id,
      createdAt: Date.now()
    };

    this.benefits.set(id, newBenefit);
    logger.info('Benefit created', { benefitId: id, title: benefit.title });

    return newBenefit;
  }

  /**
   * Get benefit
   */
  getBenefit(benefitId: string): Benefit | null {
    return this.benefits.get(benefitId) || null;
  }

  /**
   * List benefits
   */
  listBenefits(type?: BenefitType): Benefit[] {
    let benefits = Array.from(this.benefits.values());

    if (type) {
      benefits = benefits.filter(b => b.type === type);
    }

    return benefits;
  }

  /**
   * Enroll employee
   */
  enrollEmployee(employeeId: string, benefitId: string): BenefitEnrollment {
    const id = 'enroll-' + Date.now() + '-' + this.enrollmentCount++;

    const enrollment: BenefitEnrollment = {
      id,
      employeeId,
      benefitId,
      status: 'active',
      enrolledDate: Date.now(),
      createdAt: Date.now()
    };

    const employeeEnrollments = this.enrollments.get(employeeId) || [];
    employeeEnrollments.push(enrollment);
    this.enrollments.set(employeeId, employeeEnrollments);

    logger.info('Employee enrolled in benefit', { enrollmentId: id, employeeId, benefitId });

    return enrollment;
  }

  /**
   * Get employee benefits
   */
  getEmployeeBenefits(employeeId: string): Benefit[] {
    const enrollments = this.enrollments.get(employeeId) || [];
    return enrollments.filter(e => e.status === 'active').map(e => this.benefits.get(e.benefitId)).filter((b) => b !== undefined) as Benefit[];
  }

  /**
   * Calculate total benefit value
   */
  calculateTotalBenefitValue(employeeId: string): number {
    const enrollments = this.enrollments.get(employeeId) || [];
    let total = 0;

    enrollments.forEach(enrollment => {
      if (enrollment.status === 'active') {
        const benefit = this.benefits.get(enrollment.benefitId);
        if (benefit) {
          total += benefit.employerContribution;
        }
      }
    });

    return total;
  }
}

// ==================== EQUITY MANAGER ====================

export class EquityManager {
  private grants = new Map<string, Equity[]>();
  private grantCount = 0;

  /**
   * Grant equity
   */
  grantEquity(equity: Omit<Equity, 'id' | 'createdAt'>): Equity {
    const id = 'eq-' + Date.now() + '-' + this.grantCount++;

    const newEquity: Equity = {
      ...equity,
      id,
      createdAt: Date.now()
    };

    const employeeGrants = this.grants.get(equity.employeeId) || [];
    employeeGrants.push(newEquity);
    this.grants.set(equity.employeeId, employeeGrants);

    logger.info('Equity granted', { equityId: id, employeeId: equity.employeeId, quantity: equity.quantity });

    return newEquity;
  }

  /**
   * Get grants
   */
  getGrants(employeeId: string): Equity[] {
    return this.grants.get(employeeId) || [];
  }

  /**
   * Calculate vested amount
   */
  calculateVestedAmount(employeeId: string): number {
    const grants = this.getGrants(employeeId);
    return grants.reduce((sum, grant) => sum + grant.vestedQuantity, 0);
  }

  /**
   * Get vesting schedule
   */
  getVestingSchedule(equityId: string): Record<string, any> {
    for (const grants of this.grants.values()) {
      const equity = grants.find(e => e.id === equityId);
      if (equity) {
        return {
          equityId,
          vestingSchedule: equity.vestingSchedule,
          vestedQuantity: equity.vestedQuantity,
          totalQuantity: equity.quantity,
          vestingPercentage: (equity.vestedQuantity / equity.quantity) * 100
        };
      }
    }
    return {};
  }

  /**
   * Exercise options
   */
  exerciseOptions(equityId: string, quantity: number): void {
    for (const grants of this.grants.values()) {
      const equity = grants.find(e => e.id === equityId);
      if (equity && equity.vestedQuantity >= quantity) {
        equity.vestedQuantity -= quantity;
        logger.info('Options exercised', { equityId, quantity });
        return;
      }
    }
  }
}

// ==================== PAYROLL MANAGER ====================

export class PayrollManager {
  private payrollRuns = new Map<string, PayrollRun>();
  private payrollCount = 0;

  /**
   * Create payroll run
   */
  createPayrollRun(run: Omit<PayrollRun, 'id' | 'createdAt'>): PayrollRun {
    const id = 'payroll-' + Date.now() + '-' + this.payrollCount++;

    const newRun: PayrollRun = {
      ...run,
      status: run.status || 'pending',
      id,
      createdAt: Date.now()
    };

    this.payrollRuns.set(id, newRun);
    logger.info('Payroll run created', { payrollId: id, period: run.period, employees: run.employees.length });

    return newRun;
  }

  /**
   * Get payroll run
   */
  getPayrollRun(runId: string): PayrollRun | null {
    return this.payrollRuns.get(runId) || null;
  }

  private getPeriodsPerYear(payFrequency: PayFrequency): number {
    switch (payFrequency) {
      case 'weekly':
        return 52;
      case 'biweekly':
        return 26;
      case 'monthly':
        return 12;
      case 'annual':
        return 1;
      default:
        return 12;
    }
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Calculate paycheck
   */
  calculatePaycheck(employeeId: string, period: string): Paycheck {
    const salary = salaryManager.getSalary(employeeId);

    if (!salary) {
      return {
        grossPay: 0,
        deductions: 0,
        netPay: 0,
        benefitDeductions: 0,
        taxWithholding: 0,
        payrollTax: 0,
        currency: 'USD',
        payFrequency: 'monthly',
        annualizedSalary: 0,
        period
      };
    }

    const annualizedSalary = salaryManager.calculateAnnualSalary(employeeId);
    const periodsPerYear = this.getPeriodsPerYear(salary.payFrequency);
    const grossPay = this.roundCurrency(annualizedSalary / periodsPerYear);
    const monthlyBenefits = benefitsManager
      .getEmployeeBenefits(employeeId)
      .reduce((sum, benefit) => sum + benefit.employeeContribution, 0);
    const benefitDeductions = this.roundCurrency((monthlyBenefits * 12) / periodsPerYear);
    const taxWithholding = this.roundCurrency(grossPay * 0.15);
    const payrollTax = this.roundCurrency(grossPay * 0.0765);
    const deductions = this.roundCurrency(benefitDeductions + taxWithholding + payrollTax);
    const netPay = this.roundCurrency(Math.max(grossPay - deductions, 0));

    return {
      grossPay,
      deductions,
      netPay,
      benefitDeductions,
      taxWithholding,
      payrollTax,
      currency: salary.currency,
      payFrequency: salary.payFrequency,
      annualizedSalary,
      period
    };
  }

  /**
   * Process payroll
   */
  processPayroll(runId: string): void {
    const run = this.payrollRuns.get(runId);
    if (run) {
      run.status = 'processed';
      logger.info('Payroll processed', { payrollId: runId });
    }
  }

  /**
   * Generate paystub
   */
  generatePaystub(employeeId: string, period: string): string {
    const paycheck = this.calculatePaycheck(employeeId, period);

    return [
      'Paystub',
      `Employee: ${employeeId}`,
      `Period: ${period}`,
      `Currency: ${paycheck.currency}`,
      `Pay Frequency: ${paycheck.payFrequency}`,
      `Annualized Salary: ${paycheck.annualizedSalary.toFixed(2)}`,
      `Gross Pay: ${paycheck.grossPay.toFixed(2)}`,
      `Tax Withholding: ${paycheck.taxWithholding.toFixed(2)}`,
      `Payroll Tax: ${paycheck.payrollTax.toFixed(2)}`,
      `Benefit Deductions: ${paycheck.benefitDeductions.toFixed(2)}`,
      `Total Deductions: ${paycheck.deductions.toFixed(2)}`,
      `Net Pay: ${paycheck.netPay.toFixed(2)}`,
      `Generated At: ${new Date().toISOString()}`
    ].join('\n');
  }
}

// ==================== EXPORTS ====================

export const salaryManager = new SalaryManager();
export const benefitsManager = new BenefitsManager();
export const equityManager = new EquityManager();
export const payrollManager = new PayrollManager();
