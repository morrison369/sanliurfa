/**
 * Phase 123: API Marketplace & Monetization
 * API marketplace for third-party integrations with billing and revenue sharing
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type PricingModel = 'free' | 'usage-based' | 'tiered' | 'flat-rate';

export interface APIListing {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  version: string;
  pricing: { model: PricingModel; costPerRequest?: number };
  rating: number;
  reviews: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MarketplaceUsage {
  apiId: string;
  consumerId: string;
  requestCount: number;
  dataTransferred: number;
  cost: number;
  period: string;
}

export interface BillingRecord {
  id: string;
  apiId: string;
  consumerId: string;
  amount: number;
  tax: number;
  total: number;
  period: string;
  status: 'pending' | 'paid' | 'failed';
  createdAt: number;
}

// ==================== MARKETPLACE MANAGER ====================

export class MarketplaceManager {
  private listings = new Map<string, APIListing>();
  private listingCount = 0;
  private reviews = new Map<string, Array<{ rating: number; comment: string; userId: string }>>();

  /**
   * Create listing
   */
  createListing(config: Omit<APIListing, 'id' | 'rating' | 'reviews' | 'createdAt' | 'updatedAt'>): APIListing {
    const id = 'api-listing-' + Date.now() + '-' + this.listingCount++;

    const listing: APIListing = {
      ...config,
      id,
      rating: 0,
      reviews: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.listings.set(id, listing);
    this.reviews.set(id, []);

    logger.info('API listing created', {
      listingId: id,
      name: config.name,
      provider: config.provider,
      category: config.category
    });

    return listing;
  }

  /**
   * Get listing
   */
  getListing(id: string): APIListing | null {
    return this.listings.get(id) || null;
  }

  /**
   * Search listings
   */
  searchListings(query: string, category?: string): APIListing[] {
    const results: APIListing[] = [];

    for (const listing of this.listings.values()) {
      if (listing.enabled) {
        const matchesQuery = listing.name.toLowerCase().includes(query.toLowerCase()) ||
                             listing.description.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = !category || listing.category === category;

        if (matchesQuery && matchesCategory) {
          results.push(listing);
        }
      }
    }

    return results;
  }

  /**
   * Get trending APIs
   */
  getTrendingAPIs(limit: number = 10): APIListing[] {
    const listing = Array.from(this.listings.values())
      .filter(l => l.enabled)
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, limit);

    return listing;
  }

  /**
   * Add review
   */
  addReview(listingId: string, rating: number, comment: string, userId: string): void {
    const listing = this.listings.get(listingId);
    const reviews = this.reviews.get(listingId) || [];

    if (listing && reviews) {
      reviews.push({ rating, comment, userId });

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      listing.rating = Math.round(avgRating * 10) / 10;
      listing.reviews = reviews.length;

      logger.debug('Review added', { listingId, rating, userId });
    }
  }

  /**
   * Get reviews
   */
  getReviews(listingId: string): Array<{ rating: number; comment: string; userId: string }> {
    return this.reviews.get(listingId) || [];
  }

  /**
   * Update listing
   */
  updateListing(id: string, updates: Partial<APIListing>): void {
    const listing = this.listings.get(id);

    if (listing) {
      Object.assign(listing, updates, { updatedAt: Date.now() });

      logger.debug('API listing updated', { listingId: id });
    }
  }

  /**
   * Enable/disable listing
   */
  toggleListing(id: string, enabled: boolean): void {
    const listing = this.listings.get(id);

    if (listing) {
      listing.enabled = enabled;
      listing.updatedAt = Date.now();

      logger.debug('API listing toggled', { listingId: id, enabled });
    }
  }
}

// ==================== API LISTING ====================

export class APIListingManager {
  private favorites = new Map<string, Set<string>>();

  /**
   * Add to favorites
   */
  addToFavorites(userId: string, listingId: string): void {
    if (!this.favorites.has(userId)) {
      this.favorites.set(userId, new Set());
    }

    this.favorites.get(userId)!.add(listingId);

    logger.debug('API added to favorites', { userId, listingId });
  }

  /**
   * Remove from favorites
   */
  removeFromFavorites(userId: string, listingId: string): void {
    const userFavorites = this.favorites.get(userId);

    if (userFavorites) {
      userFavorites.delete(listingId);
    }
  }

  /**
   * Get user favorites
   */
  getUserFavorites(userId: string): string[] {
    return Array.from(this.favorites.get(userId) || new Set());
  }
}

// ==================== BILLING CALCULATOR ====================

export class BillingCalculator {
  /**
   * Calculate bill
   */
  calculate(usage: MarketplaceUsage, pricingModel: PricingModel, config: {
    costPerRequest?: number;
    commissionRate?: number;
    taxRate?: number;
  }): { amount: number; commission: number; revenue: number; tax: number; total: number } {
    let amount = 0;

    switch (pricingModel) {
      case 'usage-based':
        amount = (usage.requestCount * (config.costPerRequest || 0.001));
        break;
      case 'flat-rate':
        amount = 9.99;
        break;
      default:
        amount = 0;
    }

    const tax = amount * (config.taxRate || 0.1);
    const commission = amount * (config.commissionRate || 0.3);
    const revenue = amount - commission;

    return {
      amount,
      commission,
      revenue,
      tax,
      total: amount + tax
    };
  }

  /**
   * Generate invoice
   */
  generateInvoice(usage: MarketplaceUsage, calculation: any): BillingRecord {
    return {
      id: 'invoice-' + Date.now(),
      apiId: usage.apiId,
      consumerId: usage.consumerId,
      amount: calculation.amount,
      tax: calculation.tax,
      total: calculation.total,
      period: usage.period,
      status: 'pending',
      createdAt: Date.now()
    };
  }

  /**
   * Forecast revenue
   */
  forecastRevenue(monthlyUsage: MarketplaceUsage, months: number): number {
    return monthlyUsage.cost * months;
  }
}

// ==================== PARTNER PROGRAM ====================

export class PartnerProgram {
  private partners = new Map<string, { apiId: string; commissionRate: number; revenue: number; setupAt: number }>();
  private partnerCount = 0;

  /**
   * Register partner
   */
  registerPartner(apiId: string, commissionRate: number): string {
    const partnerId = 'partner-' + Date.now() + '-' + this.partnerCount++;

    this.partners.set(partnerId, {
      apiId,
      commissionRate,
      revenue: 0,
      setupAt: Date.now()
    });

    logger.info('Partner registered', { partnerId, apiId, commissionRate });

    return partnerId;
  }

  /**
   * Track revenue
   */
  trackRevenue(apiId: string, consumerId: string, amount: number): number {
    let totalRevenue = 0;

    for (const partner of this.partners.values()) {
      if (partner.apiId === apiId) {
        partner.revenue += amount;
        totalRevenue += amount;
      }
    }

    logger.debug('Revenue tracked', { apiId, consumerId, amount, totalRevenue });

    return totalRevenue;
  }

  /**
   * Get partner dashboard
   */
  getPartnerDashboard(partnerId: string): { revenue: number; apiCount: number; consumerCount: number } | null {
    const partner = this.partners.get(partnerId);

    if (!partner) return null;

    return {
      revenue: partner.revenue,
      apiCount: 1, // Simplified
      consumerCount: 1 // Simplified
    };
  }

  /**
   * Get partner earnings
   */
  getPartnerEarnings(partnerId: string): { total: number; pending: number; paid: number } {
    const partner = this.partners.get(partnerId);

    if (!partner) return { total: 0, pending: 0, paid: 0 };

    return {
      total: partner.revenue,
      pending: partner.revenue * 0.3, // 30% pending
      paid: partner.revenue * 0.7 // 70% paid
    };
  }
}

// ==================== EXPORTS ====================

export const marketplaceManager = new MarketplaceManager();
export const apiListing = new APIListingManager();
export const billingCalculator = new BillingCalculator();
export const partnerProgram = new PartnerProgram();
