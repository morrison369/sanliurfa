/**
 * Phase 80: Risk Management & Controls
 * Risk identification, assessment, control management, risk mitigation, risk reporting
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type RiskCategory = 'operational' | 'financial' | 'compliance' | 'strategic' | 'technology' | 'reputational';
export type RiskProbability = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type RiskImpact = 'minimal' | 'minor' | 'moderate' | 'major' | 'critical';
export type ControlType = 'preventive' | 'detective' | 'corrective' | 'deterrent';
export type ControlStatus = 'designed' | 'implemented' | 'operating' | 'ineffective';

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  probability: RiskProbability;
  impact: RiskImpact;
  owner: string;
  identifiedDate: number;
  targetResolutionDate?: number;
  status: 'identified' | 'mitigating' | 'mitigated' | 'accepted' | 'residual';
  createdAt: number;
}

export interface RiskControl {
  id: string;
  riskId: string;
  name: string;
  type: ControlType;
  description: string;
  owner: string;
  status: ControlStatus;
  effectiveness: number;
  testDate?: number;
  createdAt: number;
}

export interface RiskMitigation {
  id: string;
  riskId: string;
  strategy: string;
  actions: string[];
  targetDate: number;
  owner: string;
  status: 'planned' | 'in_progress' | 'completed';
  budget?: number;
  createdAt: number;
}

export interface RiskRegister {
  id: string;
  period: string;
  totalRisks: number;
  highRisks: number;
  mitigatedRisks: number;
  generatedDate: number;
  approvedBy?: string;
}

// ==================== RISK MANAGER ====================

export class RiskManager {
  private risks = new Map<string, Risk>();
  private riskCount = 0;

  /**
   * Identify risk
   */
  identifyRisk(risk: Omit<Risk, 'id' | 'createdAt'>): Risk {
    const id = 'risk-' + Date.now() + '-' + this.riskCount++;

    const newRisk: Risk = {
      ...risk,
      id,
      createdAt: Date.now()
    };

    this.risks.set(id, newRisk);
    logger.info('Risk identified', { riskId: id, category: risk.category, title: risk.title });

    return newRisk;
  }

  /**
   * Get risk
   */
  getRisk(riskId: string): Risk | null {
    return this.risks.get(riskId) || null;
  }

  /**
   * List risks
   */
  listRisks(category?: RiskCategory, status?: string): Risk[] {
    let risks = Array.from(this.risks.values());

    if (category) {
      risks = risks.filter(r => r.category === category);
    }

    if (status) {
      risks = risks.filter(r => r.status === status);
    }

    return risks;
  }

  /**
   * Update risk
   */
  updateRisk(riskId: string, updates: Partial<Risk>): void {
    const risk = this.risks.get(riskId);
    if (risk) {
      Object.assign(risk, updates);
      logger.debug('Risk updated', { riskId });
    }
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(riskId: string): number {
    const risk = this.risks.get(riskId);
    if (!risk) return 0;

    const probabilities: Record<RiskProbability, number> = {
      very_low: 1,
      low: 2,
      medium: 3,
      high: 4,
      very_high: 5
    };

    const impacts: Record<RiskImpact, number> = {
      minimal: 1,
      minor: 2,
      moderate: 3,
      major: 4,
      critical: 5
    };

    return probabilities[risk.probability] * impacts[risk.impact];
  }

  /**
   * Get risk matrix
   */
  getRiskMatrix(): Record<string, number> {
    const matrix: Record<string, number> = {};

    Array.from(this.risks.values()).forEach(risk => {
      const key = `${risk.probability}_${risk.impact}`;
      matrix[key] = (matrix[key] || 0) + 1;
    });

    return matrix;
  }

  /**
   * Get highest risks
   */
  getHighestRisks(limit?: number): Risk[] {
    return Array.from(this.risks.values())
      .sort((a, b) => this.calculateRiskScore(b.id) - this.calculateRiskScore(a.id))
      .slice(0, limit || 10);
  }
}

// ==================== CONTROL MANAGER ====================

export class ControlManager {
  private controls = new Map<string, RiskControl>();
  private controlCount = 0;

  /**
   * Implement control
   */
  implementControl(control: Omit<RiskControl, 'id' | 'createdAt'>): RiskControl {
    const id = 'control-' + Date.now() + '-' + this.controlCount++;

    const newControl: RiskControl = {
      ...control,
      id,
      createdAt: Date.now()
    };

    this.controls.set(id, newControl);
    logger.info('Control implemented', { controlId: id, riskId: control.riskId, type: control.type });

    return newControl;
  }

  /**
   * Get control
   */
  getControl(controlId: string): RiskControl | null {
    return this.controls.get(controlId) || null;
  }

  /**
   * Get risk controls
   */
  getRiskControls(riskId: string): RiskControl[] {
    return Array.from(this.controls.values()).filter(c => c.riskId === riskId);
  }

  /**
   * Update control
   */
  updateControl(controlId: string, updates: Partial<RiskControl>): void {
    const control = this.controls.get(controlId);
    if (control) {
      Object.assign(control, updates);
      logger.debug('Control updated', { controlId });
    }
  }

  /**
   * Test control
   */
  testControl(controlId: string, effectiveness: number): void {
    const control = this.controls.get(controlId);
    if (control) {
      control.effectiveness = Math.min(100, effectiveness);
      control.testDate = Date.now();
      logger.info('Control tested', { controlId, effectiveness });
    }
  }

  /**
   * Get control effectiveness
   */
  getControlEffectiveness(): { avgEffectiveness: number; byType: Record<string, number> } {
    const controls = Array.from(this.controls.values());
    const avgEffectiveness = controls.length > 0 ? controls.reduce((sum, c) => sum + c.effectiveness, 0) / controls.length : 0;

    const byType: Record<string, number> = {};
    controls.forEach(c => {
      byType[c.type] = c.effectiveness;
    });

    return { avgEffectiveness: Math.round(avgEffectiveness), byType };
  }
}

// ==================== MITIGATION MANAGER ====================

export class MitigationManager {
  private mitigations = new Map<string, RiskMitigation>();
  private mitigationCount = 0;

  /**
   * Create mitigation
   */
  createMitigation(mitigation: Omit<RiskMitigation, 'id' | 'createdAt'>): RiskMitigation {
    const id = 'mitigation-' + Date.now() + '-' + this.mitigationCount++;

    const newMitigation: RiskMitigation = {
      ...mitigation,
      id,
      createdAt: Date.now()
    };

    this.mitigations.set(id, newMitigation);
    logger.info('Mitigation created', { mitigationId: id, riskId: mitigation.riskId });

    return newMitigation;
  }

  /**
   * Get mitigation
   */
  getMitigation(mitigationId: string): RiskMitigation | null {
    return this.mitigations.get(mitigationId) || null;
  }

  /**
   * Get risk mitigations
   */
  getRiskMitigations(riskId: string): RiskMitigation[] {
    return Array.from(this.mitigations.values()).filter(m => m.riskId === riskId);
  }

  /**
   * Update mitigation
   */
  updateMitigation(mitigationId: string, updates: Partial<RiskMitigation>): void {
    const mitigation = this.mitigations.get(mitigationId);
    if (mitigation) {
      Object.assign(mitigation, updates);
      logger.debug('Mitigation updated', { mitigationId });
    }
  }

  /**
   * Complete mitigation
   */
  completeMitigation(mitigationId: string): void {
    const mitigation = this.mitigations.get(mitigationId);
    if (mitigation) {
      mitigation.status = 'completed';
      logger.info('Mitigation completed', { mitigationId });
    }
  }

  /**
   * Get overdue mitigations
   */
  getOverdueMitigations(): RiskMitigation[] {
    const now = Date.now();
    return Array.from(this.mitigations.values()).filter(m => m.targetDate < now && m.status !== 'completed');
  }
}

// ==================== RISK REGISTER MANAGER ====================

export class RiskRegisterManager {
  private registers = new Map<string, RiskRegister>();
  private registerCount = 0;

  /**
   * Generate register
   */
  generateRegister(period: string): RiskRegister {
    const id = 'register-' + Date.now() + '-' + this.registerCount++;

    const register: RiskRegister = {
      id,
      period,
      totalRisks: 0,
      highRisks: 0,
      mitigatedRisks: 0,
      generatedDate: Date.now()
    };

    this.registers.set(id, register);
    logger.info('Risk register generated', { registerId: id, period });

    return register;
  }

  /**
   * Get register
   */
  getRegister(registerId: string): RiskRegister | null {
    return this.registers.get(registerId) || null;
  }

  /**
   * List registers
   */
  listRegisters(limit?: number): RiskRegister[] {
    return Array.from(this.registers.values())
      .sort((a, b) => b.generatedDate - a.generatedDate)
      .slice(0, limit || 10);
  }

  /**
   * Approve register
   */
  approveRegister(registerId: string, approvedBy: string): void {
    const register = this.registers.get(registerId);
    if (register) {
      register.approvedBy = approvedBy;
      logger.info('Register approved', { registerId, approvedBy });
    }
  }

  /**
   * Get risk trend
   */
  getRiskTrend(months: number): { period: string; highRisks: number }[] {
    return this.listRegisters(months).map(r => ({
      period: r.period,
      highRisks: r.highRisks
    }));
  }
}

// ==================== EXPORTS ====================

export const riskManager = new RiskManager();
export const controlManager = new ControlManager();
export const mitigationManager = new MitigationManager();
export const riskRegisterManager = new RiskRegisterManager();
