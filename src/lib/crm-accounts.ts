/**
 * Phase 69: Account & Territory Management
 * Accounts, organization hierarchy, territory assignment, account plans
 */

import { logger } from './logging';
import { communicationTracker } from './crm-interactions';
import { opportunityManager } from './crm-sales-pipeline';

// ==================== TYPES & INTERFACES ====================

export type AccountStatus = 'prospect' | 'customer' | 'inactive' | 'lost';
export type TerritoryType = 'geographic' | 'account_based' | 'vertical' | 'channel';

export interface Account {
  id: string;
  name: string;
  industry: string;
  employees?: number;
  annualRevenue?: number;
  website?: string;
  status: AccountStatus;
  primaryContact?: string;
  owner?: string;
  createdAt: number;
}

export interface Territory {
  id: string;
  name: string;
  type: TerritoryType;
  owner: string;
  accounts: string[];
  criteria: Record<string, any>;
  target: number;
}

export interface AccountPlan {
  accountId: string;
  quarter: string;
  goals: string[];
  strategies: string[];
  risks: string[];
  opportunities: string[];
  owner: string;
  createdAt: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// ==================== ACCOUNT MANAGER ====================

export class AccountManager {
  private accounts = new Map<string, Account>();
  private accountCount = 0;

  /**
   * Create account
   */
  createAccount(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const id = 'account-' + Date.now() + '-' + this.accountCount++;

    const newAccount: Account = {
      ...account,
      id,
      createdAt: Date.now()
    };

    this.accounts.set(id, newAccount);
    logger.info('Account created', { accountId: id, name: account.name, industry: account.industry });

    return newAccount;
  }

  /**
   * Get account
   */
  getAccount(accountId: string): Account | null {
    return this.accounts.get(accountId) || null;
  }

  /**
   * List accounts
   */
  listAccounts(status?: AccountStatus, owner?: string): Account[] {
    let accounts = Array.from(this.accounts.values());

    if (status) {
      accounts = accounts.filter(a => a.status === status);
    }

    if (owner) {
      accounts = accounts.filter(a => a.owner === owner);
    }

    return accounts;
  }

  /**
   * Update account
   */
  updateAccount(accountId: string, updates: Partial<Account>): void {
    const account = this.accounts.get(accountId);
    if (account) {
      Object.assign(account, updates);
      logger.debug('Account updated', { accountId });
    }
  }

  /**
   * Merge accounts
   */
  mergeAccounts(primaryId: string, secondaryId: string): void {
    const primary = this.accounts.get(primaryId);
    const secondary = this.accounts.get(secondaryId);

    if (primary && secondary) {
      this.accounts.delete(secondaryId);
      logger.info('Accounts merged', { primaryId, secondaryId });
    }
  }

  /**
   * Get account health
   */
  getAccountHealth(accountId: string): { score: number; risks: string[]; opportunities: string[] } {
    const account = this.accounts.get(accountId);
    if (!account) {
      return { score: 0, risks: [], opportunities: [] };
    }

    const opportunitiesForAccount = opportunityManager.listOpportunities().filter(opportunity => opportunity.accountId === accountId);
    const openOpportunities = opportunitiesForAccount.filter(opportunity => opportunity.stage !== 'closed');
    const wonOpportunities = opportunitiesForAccount.filter(opportunity => opportunity.status === 'closed_won');
    const communicationCount = account.primaryContact
      ? communicationTracker.getContactCommunication(account.primaryContact, 90).length
      : 0;

    let score = 45;
    const risks: string[] = [];
    const growthOpportunities: string[] = [];

    if (account.status === 'customer') score += 20;
    if ((account.annualRevenue || 0) >= 1_000_000) score += 10;
    if (communicationCount >= 3) score += 10;
    if (wonOpportunities.length > 0) score += 10;

    if (communicationCount === 0) {
      risks.push('Low recent engagement');
      score -= 15;
    }

    if (openOpportunities.length === 0 && account.status === 'customer') {
      growthOpportunities.push('Expansion pipeline is empty');
    }

    if (account.status === 'inactive' || account.status === 'lost') {
      risks.push('Account status is deteriorating');
      score -= 20;
    }

    if ((account.annualRevenue || 0) < 500_000 && account.status === 'customer') {
      growthOpportunities.push('Upsell premium services');
    }

    if (openOpportunities.some(opportunity => opportunity.probability >= 70)) {
      growthOpportunities.push('High-probability expansion deal in pipeline');
    }

    score = round(Math.max(0, Math.min(score, 100)));

    logger.debug('Account health calculated', { accountId, score });

    return { score, risks, opportunities: Array.from(new Set(growthOpportunities)) };
  }

  /**
   * Get account value
   */
  getAccountValue(accountId: string): { mrr: number; arr: number; lifetime: number } {
    const account = this.accounts.get(accountId);
    const opportunitiesForAccount = opportunityManager.listOpportunities().filter(opportunity => opportunity.accountId === accountId);
    const closedWonValue = opportunitiesForAccount
      .filter(opportunity => opportunity.status === 'closed_won')
      .reduce((sum, opportunity) => sum + opportunity.amount, 0);
    const pipelineValue = opportunitiesForAccount
      .filter(opportunity => opportunity.stage !== 'closed')
      .reduce((sum, opportunity) => sum + (opportunity.amount * (opportunity.probability / 100)), 0);
    const arr = round(account?.annualRevenue || closedWonValue || 0);
    const mrr = round(arr / 12);

    return {
      mrr,
      arr,
      lifetime: round(arr * 3 + pipelineValue)
    };
  }
}

// ==================== TERRITORY MANAGER ====================

export class TerritoryManager {
  private territories = new Map<string, Territory>();
  private territoryCount = 0;

  /**
   * Create territory
   */
  createTerritory(territory: Omit<Territory, 'id'>): Territory {
    const id = 'territory-' + Date.now() + '-' + this.territoryCount++;

    const newTerritory: Territory = {
      ...territory,
      id
    };

    this.territories.set(id, newTerritory);
    logger.info('Territory created', { territoryId: id, name: territory.name, type: territory.type });

    return newTerritory;
  }

  /**
   * Get territory
   */
  getTerritory(territoryId: string): Territory | null {
    return this.territories.get(territoryId) || null;
  }

  /**
   * List territories
   */
  listTerritories(owner?: string): Territory[] {
    let territories = Array.from(this.territories.values());

    if (owner) {
      territories = territories.filter(t => t.owner === owner);
    }

    return territories;
  }

  /**
   * Assign territory
   */
  assignTerritory(territoryId: string, owner: string): void {
    const territory = this.territories.get(territoryId);
    if (territory) {
      territory.owner = owner;
      logger.info('Territory assigned', { territoryId, owner });
    }
  }

  /**
   * Get territory accounts
   */
  getTerritoryAccounts(territoryId: string): Account[] {
    const territory = this.territories.get(territoryId);
    if (!territory) {
      return [];
    }

    return territory.accounts
      .map(accountId => accountManager.getAccount(accountId))
      .filter((account): account is Account => account !== null);
  }

  /**
   * Calculate territory metrics
   */
  calculateTerritoryMetrics(territoryId: string): { totalValue: number; accountCount: number; potential: number } {
    const accounts = this.getTerritoryAccounts(territoryId);
    const totalValue = accounts.reduce((sum, account) => sum + accountManager.getAccountValue(account.id).lifetime, 0);
    const potential = accounts.reduce((sum, account) => {
      const growth = accountPlanning.identifyGrowthOpportunities(account.id)
        .reduce((innerSum, opportunity) => innerSum + opportunity.potential, 0);
      return sum + growth;
    }, 0);

    return {
      totalValue: round(totalValue),
      accountCount: accounts.length,
      potential: round(potential)
    };
  }
}

// ==================== ACCOUNT PLANNING ====================

export class AccountPlanning {
  private plans = new Map<string, AccountPlan>();

  /**
   * Create account plan
   */
  createAccountPlan(plan: Omit<AccountPlan, 'createdAt'>): AccountPlan {
    const key = `${plan.accountId}_${plan.quarter}`;

    const newPlan: AccountPlan = {
      ...plan,
      createdAt: Date.now()
    };

    this.plans.set(key, newPlan);
    logger.info('Account plan created', { accountId: plan.accountId, quarter: plan.quarter });

    return newPlan;
  }

  /**
   * Get account plan
   */
  getAccountPlan(accountId: string, quarter: string): AccountPlan | null {
    const key = `${accountId}_${quarter}`;
    return this.plans.get(key) || null;
  }

  /**
   * Update account plan
   */
  updateAccountPlan(accountId: string, quarter: string, updates: Partial<AccountPlan>): void {
    const key = `${accountId}_${quarter}`;
    const plan = this.plans.get(key);

    if (plan) {
      Object.assign(plan, updates);
      logger.debug('Account plan updated', { accountId, quarter });
    }
  }

  /**
   * Get strategic accounts
   */
  getStrategicAccounts(): Account[] {
    return accountManager
      .listAccounts()
      .filter(account => account.status === 'customer')
      .sort((left, right) => accountManager.getAccountValue(right.id).lifetime - accountManager.getAccountValue(left.id).lifetime)
      .slice(0, 10);
  }

  /**
   * Identify growth opportunities
   */
  identifyGrowthOpportunities(accountId: string): Array<{ opportunity: string; potential: number }> {
    const account = accountManager.getAccount(accountId);
    if (!account) {
      return [];
    }

    const opportunities: Array<{ opportunity: string; potential: number }> = [];
    const accountValue = accountManager.getAccountValue(accountId);
    const health = accountManager.getAccountHealth(accountId);
    const recentCommunicationCount = account.primaryContact
      ? communicationTracker.getContactCommunication(account.primaryContact, 90).length
      : 0;

    if (account.status === 'customer' && accountValue.arr > 0) {
      opportunities.push({
        opportunity: 'Upsell additional services',
        potential: round(accountValue.arr * 0.2)
      });
    }

    if (recentCommunicationCount < 2) {
      opportunities.push({
        opportunity: 'Re-engagement campaign',
        potential: round(Math.max(accountValue.mrr * 3, 5000))
      });
    }

    if (health.score >= 75 && (account.employees || 0) >= 100) {
      opportunities.push({
        opportunity: 'Cross-sell to other departments',
        potential: round(Math.max(accountValue.arr * 0.12, 10000))
      });
    }

    logger.debug('Growth opportunities identified', { accountId, count: opportunities.length });

    return opportunities;
  }
}

// ==================== EXPORTS ====================

export const accountManager = new AccountManager();
export const territoryManager = new TerritoryManager();
export const accountPlanning = new AccountPlanning();
