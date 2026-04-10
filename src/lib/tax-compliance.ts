/**
 * Phase 62: Tax Management & Compliance
 * Tax rate management, tax calculations, compliance monitoring, filing preparation
 */

import { deterministicBoolean, deterministicNumber } from './deterministic';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type TaxType = 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
export type TaxJurisdiction = 'federal' | 'state' | 'local' | 'country';

export interface TaxRate {
  type: TaxType;
  jurisdiction: TaxJurisdiction;
  rate: number;
  effectiveDate: number;
  expiryDate?: number;
}

export interface TaxCalculation {
  transactionId: string;
  taxType: TaxType;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  timestamp: number;
}

export interface TaxObligation {
  type: TaxType;
  dueDate: number;
  estimatedAmount: number;
  status: 'pending' | 'filed' | 'paid';
  jurisdictions: string[];
}

export interface ComplianceRequirement {
  id: string;
  type: string;
  dueDate: number;
  jurisdiction: string;
  status: 'pending' | 'completed' | 'waived';
}

// ==================== TAX CALCULATOR ====================

export class TaxCalculator {
  private rates = new Map<string, TaxRate>();

  /**
   * Set tax rate
   */
  setTaxRate(taxRate: TaxRate): void {
    const key = `${taxRate.type}:${taxRate.jurisdiction}`;
    this.rates.set(key, taxRate);
    logger.info('Tax rate set', { type: taxRate.type, jurisdiction: taxRate.jurisdiction, rate: taxRate.rate });
  }

  /**
   * Get tax rate
   */
  getTaxRate(type: TaxType, jurisdiction: TaxJurisdiction): TaxRate | null {
    const key = `${type}:${jurisdiction}`;
    return this.rates.get(key) || null;
  }

  /**
   * Calculate tax
   */
  calculateTax(amount: number, taxType: TaxType, jurisdiction: TaxJurisdiction): number {
    const rate = this.getTaxRate(taxType, jurisdiction);
    if (!rate) return 0;

    const tax = amount * (rate.rate / 100);
    logger.debug('Tax calculated', { amount, taxType, jurisdiction, tax });

    return tax;
  }

  /**
   * Calculate multiple taxes
   */
  calculateMultipleTaxes(amount: number, jurisdictions: string[]): Record<string, number> {
    const taxes: Record<string, number> = {};

    jurisdictions.forEach(jurisdiction => {
      const salesTax = this.calculateTax(amount, 'sales_tax', jurisdiction as TaxJurisdiction);
      taxes[jurisdiction] = salesTax;
    });

    return taxes;
  }

  /**
   * Get effective rate
   */
  getEffectiveRate(type: TaxType): number {
    let totalRate = 0;
    let count = 0;

    this.rates.forEach(rate => {
      if (rate.type === type) {
        totalRate += rate.rate;
        count++;
      }
    });

    return count > 0 ? totalRate / count : 0;
  }
}

// ==================== TAX REPORTING ====================

export class TaxReporting {
  private calculations: TaxCalculation[] = [];

  /**
   * Record tax calculation
   */
  recordTaxCalculation(calculation: TaxCalculation): void {
    this.calculations.push(calculation);
    logger.debug('Tax calculation recorded', { transactionId: calculation.transactionId });
  }

  /**
   * Get tax summary
   */
  getTaxSummary(type: TaxType, period: string): { totalTaxable: number; totalTax: number; rate: number } {
    const relevant = this.calculations.filter(c => c.taxType === type);

    const totalTaxable = relevant.reduce((sum, c) => sum + c.taxableAmount, 0);
    const totalTax = relevant.reduce((sum, c) => sum + c.taxAmount, 0);
    const rate = totalTaxable > 0 ? (totalTax / totalTaxable) * 100 : 0;

    logger.debug('Tax summary retrieved', { type, period, totalTaxable, totalTax });

    return { totalTaxable, totalTax, rate };
  }

  /**
   * Generate tax report
   */
  generateTaxReport(type: TaxType, period: string): string {
    const summary = this.getTaxSummary(type, period);

    const report = `
    Tax Report: ${type.toUpperCase()}
    Period: ${period}
    Total Taxable: $${summary.totalTaxable.toFixed(2)}
    Total Tax: $${summary.totalTax.toFixed(2)}
    Effective Rate: ${summary.rate.toFixed(2)}%
    `;

    logger.info('Tax report generated', { type, period });

    return report;
  }

  /**
   * Prepare tax filing
   */
  prepareTaxFiling(obligation: TaxObligation): Record<string, any> {
    const filing = {
      type: obligation.type,
      dueDate: new Date(obligation.dueDate).toISOString().split('T')[0],
      estimatedAmount: obligation.estimatedAmount,
      jurisdictions: obligation.jurisdictions,
      readyForFiling: obligation.estimatedAmount > 0
    };

    logger.info('Tax filing prepared', { type: obligation.type });

    return filing;
  }

  /**
   * List upcoming obligations
   */
  listUpcomingObligations(days: number): TaxObligation[] {
    const obligations: TaxObligation[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = today.getTime();
    const deadline = now + days * 24 * 60 * 60 * 1000;

    if (deterministicBoolean(`tax-obligation:${days}:sales-tax`, 0.5)) {
      obligations.push({
        type: 'sales_tax',
        dueDate: now + 15 * 24 * 60 * 60 * 1000,
        estimatedAmount: deterministicNumber(`tax-obligation:${days}:sales-tax:amount`, 1000, 11000),
        status: 'pending',
        jurisdictions: ['federal', 'state']
      });
    }

    if (deterministicBoolean(`tax-obligation:${days}:income-tax`, 0.6)) {
      obligations.push({
        type: 'income_tax',
        dueDate: now + 45 * 24 * 60 * 60 * 1000,
        estimatedAmount: deterministicNumber(`tax-obligation:${days}:income-tax:amount`, 10000, 60000),
        status: 'pending',
        jurisdictions: ['federal']
      });
    }

    return obligations.filter(o => o.dueDate <= deadline);
  }
}

// ==================== COMPLIANCE MONITOR ====================

export class ComplianceMonitor {
  private requirements = new Map<string, ComplianceRequirement>();
  private requirementCount = 0;

  /**
   * Add requirement
   */
  addRequirement(requirement: Omit<ComplianceRequirement, 'id'>): ComplianceRequirement {
    const id = 'req-' + Date.now() + '-' + this.requirementCount++;

    const newRequirement: ComplianceRequirement = {
      ...requirement,
      id
    };

    this.requirements.set(id, newRequirement);
    logger.info('Compliance requirement added', { id, type: requirement.type });

    return newRequirement;
  }

  /**
   * Get requirement
   */
  getRequirement(requirementId: string): ComplianceRequirement | null {
    return this.requirements.get(requirementId) || null;
  }

  /**
   * List requirements
   */
  listRequirements(status?: string): ComplianceRequirement[] {
    if (!status) {
      return Array.from(this.requirements.values());
    }

    return Array.from(this.requirements.values()).filter(r => r.status === status);
  }

  /**
   * Check compliance
   */
  checkCompliance(jurisdiction: string): { compliant: boolean; outstanding: ComplianceRequirement[] } {
    const outstanding = this.listRequirements('pending').filter(r => r.jurisdiction === jurisdiction);
    const compliant = outstanding.length === 0;

    logger.debug('Compliance checked', { jurisdiction, compliant });

    return { compliant, outstanding };
  }

  /**
   * Mark completed
   */
  markCompleted(requirementId: string): void {
    const requirement = this.requirements.get(requirementId);
    if (requirement) {
      requirement.status = 'completed';
      logger.info('Requirement marked completed', { requirementId });
    }
  }
}

// ==================== EXPORTS ====================

const taxCalculator = new TaxCalculator();
const taxReporting = new TaxReporting();
const complianceMonitor = new ComplianceMonitor();

export { taxCalculator, taxReporting, complianceMonitor };
