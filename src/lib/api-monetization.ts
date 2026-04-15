/**
 * Phase 186: API Monetization
 * API product management, usage tracking, billing engine, access management
 */

import { logger } from './logger';

interface APIProduct {
  productId: string;
  name: string;
  description: string;
  endpoints: string[];
  pricingModel: 'per_call' | 'tiered' | 'flat' | 'freemium';
  basePrice: number;
  tiers?: Array<{ callsUpTo: number; pricePerCall: number }>;
  status: 'active' | 'deprecated' | 'beta';
  createdAt: number;
}

interface APIUsageRecord {
  recordId: string;
  partnerId: string;
  productId: string;
  endpoint: string;
  callCount: number;
  period: string;
  latencyMs: number;
  errorCount: number;
  recordedAt: number;
}

interface APIBill {
  billId: string;
  partnerId: string;
  productId: string;
  period: string;
  callCount: number;
  amount: number;
  currency: string;
  generatedAt: number;
  dueAt: number;
  status: 'pending' | 'paid' | 'overdue';
}

class APIProductManager {
  private products: Map<string, APIProduct> = new Map();
  private counter = 0;

  create(name: string, description: string, endpoints: string[], pricingModel: APIProduct['pricingModel'], basePrice: number, tiers?: APIProduct['tiers']): APIProduct {
    const productId = `api-product-${Date.now()}-${++this.counter}`;
    const product: APIProduct = {
      productId, name, description, endpoints, pricingModel, basePrice, tiers,
      status: 'active', createdAt: Date.now()
    };
    this.products.set(productId, product);
    logger.debug('API product created', { productId, name, pricingModel });
    return product;
  }

  getProduct(productId: string): APIProduct | undefined {
    return this.products.get(productId);
  }

  deprecate(productId: string): boolean {
    const product = this.products.get(productId);
    if (product) { product.status = 'deprecated'; return true; }
    return false;
  }

  listActive(): APIProduct[] {
    return Array.from(this.products.values()).filter(p => p.status === 'active');
  }

  calculatePrice(productId: string, callCount: number): number {
    const product = this.products.get(productId);
    if (!product) return 0;

    if (product.pricingModel === 'flat') return product.basePrice;
    if (product.pricingModel === 'per_call') return callCount * product.basePrice;

    if (product.pricingModel === 'tiered' && product.tiers) {
      for (const tier of product.tiers) {
        if (callCount <= tier.callsUpTo) return callCount * tier.pricePerCall;
      }
      const lastTier = product.tiers[product.tiers.length - 1];
      return callCount * lastTier.pricePerCall;
    }

    if (product.pricingModel === 'freemium') {
      const freeTier = product.tiers?.[0];
      if (freeTier && callCount <= freeTier.callsUpTo) return 0;
      return Math.max(0, callCount - (freeTier?.callsUpTo || 0)) * product.basePrice;
    }

    return 0;
  }
}

class APIUsageTracker {
  private usage: Map<string, APIUsageRecord[]> = new Map();
  private counter = 0;

  record(partnerId: string, productId: string, endpoint: string, latencyMs: number, success: boolean): void {
    const period = new Date().toISOString().substring(0, 7);
    const key = `${partnerId}:${productId}:${period}`;

    if (!this.usage.has(key)) {
      this.usage.set(key, [{
        recordId: `usage-${Date.now()}-${++this.counter}`,
        partnerId, productId, endpoint,
        callCount: 0, period, latencyMs: 0, errorCount: 0, recordedAt: Date.now()
      }]);
    }

    const records = this.usage.get(key)!;
    const record = records[0];
    record.callCount++;
    record.latencyMs = (record.latencyMs * (record.callCount - 1) + latencyMs) / record.callCount;
    if (!success) record.errorCount++;
    record.recordedAt = Date.now();
  }

  getUsage(partnerId: string, productId: string, period?: string): APIUsageRecord | undefined {
    const p = period || new Date().toISOString().substring(0, 7);
    return this.usage.get(`${partnerId}:${productId}:${p}`)?.[0];
  }

  getPartnerUsage(partnerId: string, period?: string): APIUsageRecord[] {
    const p = period || new Date().toISOString().substring(0, 7);
    return Array.from(this.usage.values()).flat().filter(r => r.partnerId === partnerId && r.period === p);
  }

  getTopConsumers(productId: string, period?: string, limit: number = 10): Array<{ partnerId: string; callCount: number }> {
    const p = period || new Date().toISOString().substring(0, 7);
    return Array.from(this.usage.values()).flat()
      .filter(r => r.productId === productId && r.period === p)
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, limit)
      .map(r => ({ partnerId: r.partnerId, callCount: r.callCount }));
  }
}

class APIBillingEngine {
  private bills: Map<string, APIBill> = new Map();
  private counter = 0;

  generateBill(partnerId: string, productId: string, callCount: number, product: APIProduct): APIBill {
    const billId = `bill-${Date.now()}-${++this.counter}`;
    const period = new Date().toISOString().substring(0, 7);
    const amount = product.pricingModel !== 'flat'
      ? callCount * product.basePrice
      : product.basePrice;

    const bill: APIBill = {
      billId, partnerId, productId, period, callCount, amount,
      currency: 'USD', generatedAt: Date.now(),
      dueAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      status: 'pending'
    };
    this.bills.set(billId, bill);
    logger.debug('API bill generated', { billId, partnerId, amount });
    return bill;
  }

  markPaid(billId: string): boolean {
    const bill = this.bills.get(billId);
    if (bill) { bill.status = 'paid'; return true; }
    return false;
  }

  getPartnerBills(partnerId: string): APIBill[] {
    return Array.from(this.bills.values()).filter(b => b.partnerId === partnerId);
  }

  getOverdueBills(): APIBill[] {
    return Array.from(this.bills.values()).filter(b => b.status === 'pending' && b.dueAt <= Date.now());
  }

  getTotalRevenue(period?: string): number {
    return Array.from(this.bills.values())
      .filter(b => b.status === 'paid' && (!period || b.period === period))
      .reduce((sum, b) => sum + b.amount, 0);
  }
}

class APIAccessManager {
  private access: Map<string, { productId: string; quota: number; used: number; tier: string; grantedAt: number }[]> = new Map();

  grantAccess(partnerId: string, productId: string, quota: number, tier: string): void {
    const existing = this.access.get(partnerId) || [];
    const idx = existing.findIndex(a => a.productId === productId);
    if (idx >= 0) { existing[idx].quota = quota; existing[idx].tier = tier; }
    else existing.push({ productId, quota, used: 0, tier, grantedAt: Date.now() });
    this.access.set(partnerId, existing);
    logger.debug('API access granted', { partnerId, productId, quota, tier });
  }

  checkAccess(partnerId: string, productId: string): { allowed: boolean; remaining: number; tier: string } {
    const partnerAccess = this.access.get(partnerId) || [];
    const access = partnerAccess.find(a => a.productId === productId);
    if (!access) return { allowed: false, remaining: 0, tier: 'none' };
    const remaining = access.quota - access.used;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining), tier: access.tier };
  }

  consumeQuota(partnerId: string, productId: string): boolean {
    const partnerAccess = this.access.get(partnerId) || [];
    const access = partnerAccess.find(a => a.productId === productId);
    if (access && access.used < access.quota) { access.used++; return true; }
    return false;
  }

  getAccessSummary(partnerId: string): Array<{ productId: string; quota: number; used: number; tier: string }> {
    return this.access.get(partnerId) || [];
  }
}

export const apiProductManager = new APIProductManager();
export const apiUsageTracker = new APIUsageTracker();
export const apiBillingEngine = new APIBillingEngine();
export const apiAccessManager = new APIAccessManager();

export { APIProduct, APIUsageRecord, APIBill };
